import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
  proof_db_path: str = os.environ.get('PROOF_DB_PATH', './proof_jobs.db')
  validator_api_key: str | None = os.environ.get('VALIDATOR_API_KEY')
  worker_poll_interval: float = float(os.environ.get('WORKER_POLL_INTERVAL', '5'))
  worker_retry_delay: float = float(os.environ.get('WORKER_RETRY_DELAY', '30'))
  worker_submission_delay: float = float(os.environ.get('WORKER_SUBMISSION_DELAY', '2'))
  worker_max_retries: int = int(os.environ.get('WORKER_MAX_RETRIES', '5'))


settings = Settings()
