from __future__ import annotations

import hashlib
import io
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple
from uuid import uuid4

import pandas as pd

from .schemas import (
    ProofRequest,
    ProofSubmissionRequest,
    ProofSubmissionStatus,
    ValidationRequest
)
from .storage import insert_job, list_jobs, get_job, update_job_status

TYPE_MAPPING = {
    "int64": "integer",
    "float64": "numeric",
    "bool": "boolean",
    "datetime64[ns]": "datetime",
    "object": "string"
}


def load_records(request: ValidationRequest) -> Tuple[List[Dict], List[str]]:
    warnings: List[str] = []
    if request.records:
        records = request.records
    elif request.csv_payload:
        df = pd.read_csv(io.StringIO(request.csv_payload))
        records = df.to_dict(orient="records")
    else:
        raise ValueError("Either records or csv_payload must be provided")

    if len(records) == 0:
        warnings.append("Dataset contains no rows.")
    if len(records) > 5000:
        warnings.append("Validation ran on truncated sample of 5000 rows.")
        records = records[:5000]

    return records, warnings


def infer_schema(records: List[Dict]) -> Dict[str, str]:
    if not records:
        return {}

    frame = pd.DataFrame(records)
    schema: Dict[str, str] = {}
    for column in frame.columns:
        dtype = str(frame[column].dtype)
        schema[column] = TYPE_MAPPING.get(dtype, "string")
    return schema


def validate_schema(expected: Dict[str, str] | None, inferred: Dict[str, str]) -> List[str]:
    if not expected:
        return []

    issues: List[str] = []
    for column, expected_type in expected.items():
        if column not in inferred:
            issues.append(f"Missing column: {column}")
            continue
        if inferred[column] != expected_type:
            issues.append(f"Type mismatch for {column}: expected {expected_type}, got {inferred[column]}")

    for column in inferred:
        if column not in expected:
            issues.append(f"Unexpected column encountered: {column}")
    return issues


def compute_dataset_hash(records: List[Dict]) -> str:
    digest = hashlib.sha256()
    for record in records:
        digest.update(json.dumps(record, sort_keys=True).encode("utf-8"))
    return digest.hexdigest()


def compute_sql_hash(sql_query: str | None) -> str | None:
    if not sql_query:
        return None
    normalized = " ".join(sql_query.split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def generate_proof(request: ProofRequest) -> Dict[str, Any]:
    records, warnings = load_records(request)
    dataset_hash = compute_dataset_hash(records)
    context = {
        "dataset_hash": dataset_hash,
        "validator": request.validator.lower(),
        "chain_id": request.chain_id or 0,
        "block_number": request.block_number or 0
    }
    poi_digest = hashlib.sha3_256(json.dumps(context, sort_keys=True).encode("utf-8")).hexdigest()
    sql_hash = compute_sql_hash(request.sql_query)

    return {
        "dataset_hash": f"0x{dataset_hash}",
        "poi_hash": f"0x{poi_digest}",
        "sql_hash": f"0x{sql_hash}" if sql_hash else None,
        "row_count": len(records),
        "warnings": warnings
    }


def _normalize_job(job: Dict[str, Any]) -> Dict[str, Any]:
    normalized = dict(job)
    if isinstance(normalized.get("status"), str):
        normalized["status"] = ProofSubmissionStatus(normalized["status"])
    if isinstance(normalized.get("queued_at"), str):
        normalized["queued_at"] = datetime.fromisoformat(normalized["queued_at"])
    if isinstance(normalized.get("last_attempt"), str):
        normalized["last_attempt"] = datetime.fromisoformat(normalized["last_attempt"])
    if "retries" not in normalized or normalized["retries"] is None:
        normalized["retries"] = 0
    return normalized


def enqueue_proof_submission(payload: ProofSubmissionRequest) -> Dict[str, Any]:
    job_id = f"job-{uuid4().hex}"
    queued_at = datetime.now(timezone.utc).isoformat()
    job = {
        "job_id": job_id,
        "dataset_id": payload.dataset_id,
        "validator": payload.validator.lower(),
        "poi_hash": payload.poi_hash.lower(),
        "sql_hash": payload.sql_hash.lower() if payload.sql_hash else None,
        "status": ProofSubmissionStatus.queued.value,
        "queued_at": queued_at,
        "target_block": payload.target_block,
        "chain_id": payload.chain_id,
        "notes": payload.notes,
        "tx_hash": None,
        "error": None,
        "retries": 0,
        "last_attempt": None
    }
    stored = insert_job(job)
    return _normalize_job(stored)


def list_proof_jobs() -> List[Dict[str, Any]]:
    return [_normalize_job(job) for job in list_jobs()]


def get_proof_job(job_id: str) -> Dict[str, Any] | None:
    job = get_job(job_id)
    return _normalize_job(job) if job else None


def update_proof_job(
    job_id: str,
    status: ProofSubmissionStatus,
    tx_hash: str | None,
    error: str | None
) -> Dict[str, Any]:
    job = update_job_status(job_id, status, tx_hash, error)
    return _normalize_job(job)
