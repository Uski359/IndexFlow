import asyncio
import logging
from typing import Optional

from .config import settings
from .schemas import ProofSubmissionStatus
from .storage import (
    fetch_next_job,
    mark_job_failed,
    mark_job_submitted,
    requeue_job
)

logger = logging.getLogger(__name__)

_worker_task: Optional[asyncio.Task] = None
_stop_event: Optional[asyncio.Event] = None


async def _worker_loop(stop_event: asyncio.Event) -> None:
    while not stop_event.is_set():
        job = fetch_next_job(settings.worker_max_retries)
        if not job:
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=settings.worker_poll_interval)
            except asyncio.TimeoutError:
                continue
            continue

        job_id = job['job_id']
        logger.info("Processing proof submission job", extra={"job_id": job_id})

        try:
            await asyncio.sleep(settings.worker_submission_delay)
            mark_job_submitted(job_id)
            logger.info("Proof submission job completed", extra={"job_id": job_id})
        except Exception as exc:  # pragma: no cover - safeguard
            logger.exception("Proof submission job failed", extra={"job_id": job_id})
            mark_job_failed(job_id, str(exc))
            retries = (job.get('retries') or 0) + 1
            if retries < settings.worker_max_retries:
                await asyncio.sleep(settings.worker_retry_delay)
                requeue_job(job_id)
            else:
                logger.error(
                    "Proof submission job exhausted retries",
                    extra={"job_id": job_id, "status": ProofSubmissionStatus.failed.value}
                )


async def start_worker() -> None:
    global _worker_task, _stop_event
    if _worker_task and not _worker_task.done():
        return

    _stop_event = asyncio.Event()
    _worker_task = asyncio.create_task(_worker_loop(_stop_event))


async def stop_worker() -> None:
    if _stop_event:
        _stop_event.set()
    if _worker_task:
        await _worker_task
