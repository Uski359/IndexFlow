from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, Optional

from .config import settings
from .schemas import ProofSubmissionStatus


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def get_connection():
    conn = sqlite3.connect(settings.proof_db_path, detect_types=sqlite3.PARSE_DECLTYPES)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS proof_jobs (
                job_id TEXT PRIMARY KEY,
                dataset_id TEXT NOT NULL,
                validator TEXT NOT NULL,
                poi_hash TEXT NOT NULL,
                sql_hash TEXT,
                status TEXT NOT NULL,
                queued_at TEXT NOT NULL,
                target_block INTEGER,
                chain_id INTEGER,
                notes TEXT,
                tx_hash TEXT,
                error TEXT,
                retries INTEGER NOT NULL DEFAULT 0,
                last_attempt TEXT
            );
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS proof_jobs_status_idx ON proof_jobs (status, queued_at)"
        )
        conn.commit()


def _row_to_job(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        'job_id': row['job_id'],
        'dataset_id': row['dataset_id'],
        'validator': row['validator'],
        'poi_hash': row['poi_hash'],
        'sql_hash': row['sql_hash'],
        'status': ProofSubmissionStatus(row['status']),
        'queued_at': row['queued_at'],
        'target_block': row['target_block'],
        'chain_id': row['chain_id'],
        'notes': row['notes'],
        'tx_hash': row['tx_hash'],
        'error': row['error'],
        'retries': row['retries'],
        'last_attempt': row['last_attempt']
    }


def insert_job(job: Dict[str, Any]) -> Dict[str, Any]:
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO proof_jobs (
                job_id,
                dataset_id,
                validator,
                poi_hash,
                sql_hash,
                status,
                queued_at,
                target_block,
                chain_id,
                notes,
                tx_hash,
                error,
                retries,
                last_attempt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                job['job_id'],
                job['dataset_id'],
                job['validator'],
                job['poi_hash'],
                job['sql_hash'],
                job['status'],
                job['queued_at'],
                job['target_block'],
                job['chain_id'],
                job['notes'],
                job['tx_hash'],
                job['error'],
                job.get('retries', 0),
                job.get('last_attempt')
            )
        )
        conn.commit()
        row = conn.execute("SELECT * FROM proof_jobs WHERE job_id = ?", (job['job_id'],)).fetchone()
    return _row_to_job(row)


def list_jobs() -> Iterable[Dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM proof_jobs ORDER BY queued_at DESC"
        ).fetchall()
    return [_row_to_job(row) for row in rows]


def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM proof_jobs WHERE job_id = ?", (job_id,)).fetchone()
    return _row_to_job(row) if row else None


def update_job_status(
    job_id: str,
    status: ProofSubmissionStatus,
    tx_hash: Optional[str],
    error: Optional[str]
) -> Dict[str, Any]:
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE proof_jobs
            SET status = ?, tx_hash = ?, error = ?, last_attempt = ?
            WHERE job_id = ?
            """,
            (status.value, tx_hash, error, _utcnow(), job_id)
        )
        conn.commit()
        row = conn.execute("SELECT * FROM proof_jobs WHERE job_id = ?", (job_id,)).fetchone()
    if not row:
        raise KeyError(job_id)
    return _row_to_job(row)


def mark_job_submitted(job_id: str, tx_hash: Optional[str] = None) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE proof_jobs
            SET status = ?, tx_hash = ?, error = NULL, last_attempt = ?
            WHERE job_id = ?
            """,
            (ProofSubmissionStatus.submitted.value, tx_hash, _utcnow(), job_id)
        )
        conn.commit()


def mark_job_failed(job_id: str, error: str) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE proof_jobs
            SET status = ?, error = ?, retries = retries + 1, last_attempt = ?
            WHERE job_id = ?
            """,
            (ProofSubmissionStatus.failed.value, error, _utcnow(), job_id)
        )
        conn.commit()


def requeue_job(job_id: str) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE proof_jobs
            SET status = ?, error = NULL
            WHERE job_id = ?
            """,
            (ProofSubmissionStatus.queued.value, job_id)
        )
        conn.commit()


def fetch_next_job(max_retries: int) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        conn.execute('BEGIN IMMEDIATE')
        row = conn.execute(
            """
            SELECT *
            FROM proof_jobs
            WHERE (status = ? OR (status = ? AND retries < ?))
            ORDER BY queued_at ASC
            LIMIT 1
            """,
            (ProofSubmissionStatus.queued.value, ProofSubmissionStatus.failed.value, max_retries)
        ).fetchone()

        if not row:
            conn.commit()
            return None

        conn.execute(
            """
            UPDATE proof_jobs
            SET status = ?, last_attempt = ?
            WHERE job_id = ?
            """,
            (ProofSubmissionStatus.processing.value, _utcnow(), row['job_id'])
        )
        conn.commit()
    job = _row_to_job(row)
    job['status'] = ProofSubmissionStatus.processing
    return job
