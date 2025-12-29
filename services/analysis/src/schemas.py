from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime
from uuid import UUID


class ImportBatchCreate(BaseModel):
    immich_user_id: str
    asset_ids: List[str]


class ImportBatchResponse(BaseModel):
    batch_id: UUID
    status: str

    class Config:
        from_attributes = True


class AnalysisStatus(BaseModel):
    status: str
    progress_percent: float
    eta_seconds: Optional[int]
    total_assets: int
    analyzed_assets: int
    skipped_assets: int

    class Config:
        from_attributes = True


class QualityScoreResponse(BaseModel):
    immich_asset_id: str
    blur_score: Optional[float]
    exposure_score: Optional[float]
    overall_quality: Optional[float]
    is_corrupted: bool

    class Config:
        from_attributes = True


class BurstSequenceResponse(BaseModel):
    immich_asset_ids: List[str]
    recommended_asset_id: Optional[str]

    class Config:
        from_attributes = True


class TriageCategory(BaseModel):
    category_type: str
    count: int
    estimated_savings_bytes: Optional[int]
    badge_color: Literal["green", "yellow", "orange"]


class TriageDashboard(BaseModel):
    categories: List[TriageCategory]
    total_assets: int
    analyzed_assets: int

    class Config:
        from_attributes = True


class TriageActionRequest(BaseModel):
    asset_id: str
    action_type: Literal["delete", "keep", "organize"]


class TriageActionsApply(BaseModel):
    actions: List[TriageActionRequest]


class TriageActionsResponse(BaseModel):
    applied_count: int
    failed_count: int
    errors: Optional[List[str]]
