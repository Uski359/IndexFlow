from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class DatasetMetadata(BaseModel):
    name: str = Field(..., description="Friendly dataset name")
    dataset_type: str = Field(..., pattern="^(on-chain|off-chain)$")
    source: Optional[str] = None
    tags: List[str] = Field(default_factory=list, min_items=1)


class ValidationRequest(BaseModel):
    metadata: DatasetMetadata
    expected_schema: Optional[Dict[str, str]] = Field(
        default=None, description="Key-value pairs of column => expected type"
    )
    records: Optional[List[Dict[str, Any]]] = Field(
        default=None, description="Sample records in JSON format"
    )
    csv_payload: Optional[str] = Field(
        default=None,
        description="CSV payload string. Either records or csv_payload is required."
    )
    sql_query: Optional[str] = Field(
        default=None, description="SQL statement used to derive Proof of SQL hash"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "metadata": {
                        "name": "Layer2 Gas Costs",
                        "dataset_type": "on-chain",
                        "source": "https://api.optimism.io",
                        "tags": ["layer2", "gas"]
                    },
                    "expected_schema": {
                        "network": "string",
                        "gas_spent": "numeric",
                        "timestamp": "datetime"
                    },
                    "records": [
                        {"network": "Optimism", "gas_spent": 120345, "timestamp": "2024-01-01T00:00:00Z"}
                    ],
                    "sql_query": "SELECT * FROM gas_usage"
                }
            ]
        }
    }


class ValidationResponse(BaseModel):
    valid: bool
    dataset_hash: str
    sql_hash: Optional[str] = None
    issues: List[str] = Field(default_factory=list)
    inferred_schema: Dict[str, str]
    row_count: int


class ProofRequest(ValidationRequest):
    dataset_id: str = Field(..., min_length=3)
    validator: str = Field(..., pattern="^0x[a-fA-F0-9]{40}$")
    chain_id: Optional[int] = Field(
        default=None, ge=0, description="EVM chain ID associated with the proof"
    )
    block_number: Optional[int] = Field(
        default=None, ge=0, description="Optional block height used for Proof of Indexing context"
    )


class ProofResponse(BaseModel):
    dataset_id: str
    validator: str
    dataset_hash: str
    poi_hash: str
    sql_hash: Optional[str] = None
    row_count: int
    warnings: List[str] = Field(default_factory=list)
    generated_at: datetime


class ProofSubmissionStatus(str, Enum):
    queued = "queued"
    processing = "processing"
    submitted = "submitted"
    failed = "failed"


class ProofSubmissionRequest(BaseModel):
    dataset_id: str = Field(..., min_length=3)
    validator: str = Field(..., pattern="^0x[a-fA-F0-9]{40}$")
    poi_hash: str = Field(..., pattern="^0x[a-fA-F0-9]{64}$")
    sql_hash: Optional[str] = Field(default=None, pattern="^0x[a-fA-F0-9]{64}$")
    target_block: Optional[int] = Field(default=None, ge=0)
    chain_id: Optional[int] = Field(default=None, ge=0)
    notes: Optional[str] = Field(default=None, max_length=240)


class ProofSubmissionResponse(BaseModel):
    job_id: str
    dataset_id: str
    validator: str
    poi_hash: str
    sql_hash: Optional[str] = None
    status: ProofSubmissionStatus
    queued_at: datetime
    target_block: Optional[int] = None
    chain_id: Optional[int] = None
    notes: Optional[str] = None
    tx_hash: Optional[str] = None
    error: Optional[str] = None


class ProofJobUpdateRequest(BaseModel):
    status: ProofSubmissionStatus
    tx_hash: Optional[str] = Field(default=None, pattern="^0x[a-fA-F0-9]{64}$")
    error: Optional[str] = Field(default=None, max_length=240)


class HashRequest(BaseModel):
    payload: str
    algorithm: str = Field(default="sha256", pattern="^(sha256|keccak256)$")


class HashResponse(BaseModel):
    digest: str
    algorithm: str

