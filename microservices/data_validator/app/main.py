import hashlib
from datetime import datetime, timezone
from typing import List

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
    HashRequest,
    HashResponse,
    ProofJobUpdateRequest,
    ProofRequest,
    ProofResponse,
    ProofSubmissionRequest,
    ProofSubmissionResponse,
    ValidationRequest,
    ValidationResponse
)
from .services import (
    compute_dataset_hash,
    compute_sql_hash,
    infer_schema,
    load_records,
    validate_schema,
    generate_proof,
    enqueue_proof_submission,
    get_proof_job,
    list_proof_jobs,
    update_proof_job
)
from .config import settings
from .storage import init_db
from .worker import start_worker, stop_worker

app = FastAPI(
    title="IndexFlow Data Validator",
    version="0.1.0",
    description="Microservice responsible for validating dataset samples and producing deterministic hashes."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)


def require_api_key(x_api_key: str = Header(None)):
    if settings.validator_api_key and x_api_key != settings.validator_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key


@app.on_event("startup")
async def on_startup():
    init_db()
    await start_worker()


@app.on_event("shutdown")
async def on_shutdown():
    await stop_worker()


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok"}


@app.post("/validate", response_model=ValidationResponse, tags=["validation"])
async def validate_dataset(payload: ValidationRequest):
    try:
        records, warnings = load_records(payload)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    inferred_schema = infer_schema(records)
    issues = validate_schema(payload.expected_schema, inferred_schema)
    issues.extend(warnings)

    dataset_hash = compute_dataset_hash(records)
    sql_hash = compute_sql_hash(payload.sql_query)

    return ValidationResponse(
        valid=len(issues) == 0,
        dataset_hash=dataset_hash,
        sql_hash=sql_hash,
        issues=issues,
        inferred_schema=inferred_schema,
        row_count=len(records)
    )


@app.post("/hash", response_model=HashResponse, tags=["hashing"])
async def hash_payload(payload: HashRequest):
    if not payload.payload:
        raise HTTPException(status_code=400, detail="Payload cannot be empty.")

    if payload.algorithm == "sha256":
        digest = hashlib.sha256(payload.payload.encode("utf-8")).hexdigest()
    else:
        digest = hashlib.sha3_256(payload.payload.encode("utf-8")).hexdigest()

    return HashResponse(digest=digest, algorithm=payload.algorithm)


@app.post("/proof/generate", response_model=ProofResponse, tags=["proofs"])
async def proof_generate(payload: ProofRequest, _: str = Depends(require_api_key)):
    try:
        result = generate_proof(payload)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    return ProofResponse(
        dataset_id=payload.dataset_id,
        validator=payload.validator.lower(),
        dataset_hash=result["dataset_hash"],
        poi_hash=result["poi_hash"],
        sql_hash=result["sql_hash"],
        row_count=result["row_count"],
        warnings=result["warnings"],
        generated_at=datetime.now(timezone.utc)
    )


@app.post("/proof/schedule", response_model=ProofSubmissionResponse, tags=["proofs"])
async def proof_schedule(payload: ProofSubmissionRequest, _: str = Depends(require_api_key)):
    job = enqueue_proof_submission(payload)
    return ProofSubmissionResponse(**job)


@app.get("/proof/jobs", response_model=List[ProofSubmissionResponse], tags=["proofs"])
async def proof_jobs(_: str = Depends(require_api_key)):
    jobs = list_proof_jobs()
    return [ProofSubmissionResponse(**job) for job in jobs]


@app.get("/proof/jobs/{job_id}", response_model=ProofSubmissionResponse, tags=["proofs"])
async def proof_job_detail(job_id: str, _: str = Depends(require_api_key)):
    job = get_proof_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return ProofSubmissionResponse(**job)


@app.patch("/proof/jobs/{job_id}", response_model=ProofSubmissionResponse, tags=["proofs"])
async def proof_job_update(
    job_id: str,
    payload: ProofJobUpdateRequest,
    _: str = Depends(require_api_key)
):
    try:
        job = update_proof_job(job_id, payload.status, payload.tx_hash, payload.error)
    except KeyError:
        raise HTTPException(status_code=404, detail="Job not found.") from None
    return ProofSubmissionResponse(**job)
