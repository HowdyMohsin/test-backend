"""Pydantic v1 API schemas (frozen contract, spec 4.4)."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------- public ---


class HealthResponse(BaseModel):
    status: str = "ok"
    queue_depth: int = 0
    version: str = "2.1.0"


class SettingFieldSchema(BaseModel):
    key: str
    label: str
    type: str
    default: object = None
    min: float | None = None
    max: float | None = None
    options: list[str] = []
    help: str = ""


class FormatSchema(BaseModel):
    slug: str
    name: str
    category: str
    subgroup: str | None = None
    extensions: list[str]
    mime: str
    flags: list[str]
    output_settings: list[SettingFieldSchema]


class PairSchema(BaseModel):
    slug: str
    from_format: str = Field(alias="from")
    to_format: str = Field(alias="to")
    label: str | None = None
    status: str = "live"
    plans: list[str] = []

    model_config = {"populate_by_name": True}


class CategorySchema(BaseModel):
    id: str
    formats: list[str]


class PresetSchema(BaseModel):
    id: str
    name: str
    category: str  # image | audio | video
    settings: dict = {}


class FormatsResponse(BaseModel):
    categories: list[CategorySchema]
    formats: list[FormatSchema]
    pairs: list[PairSchema]
    presets: list[PresetSchema] = []
    popular: list[str] = []


class SiteMaintenanceSchema(BaseModel):
    on: bool = False
    message: str = ""


class SiteAnnouncementSchema(BaseModel):
    text: str
    link: str = ""
    expires_at: datetime | None = None


class SiteResponse(BaseModel):
    maintenance: SiteMaintenanceSchema = SiteMaintenanceSchema()
    announcement: SiteAnnouncementSchema | None = None
    public_counter: int | None = None


class PlanSchema(BaseModel):
    id: str
    name: str
    price_cents: int
    limits: dict


class PlansResponse(BaseModel):
    plans: list[PlanSchema]
    messages: dict[str, str]


class UsageSchema(BaseModel):
    used: int
    limit: int
    resets_at: datetime


class BannerSchema(BaseModel):
    kind: str  # info | warning | pro
    text: str


class MeUserSchema(BaseModel):
    id: str
    email: str | None = None
    anonymous: bool = False


class MeResponse(BaseModel):
    user: MeUserSchema
    plan: str
    usage: UsageSchema
    banner: BannerSchema | None = None


class AdsResponse(BaseModel):
    slot: str
    code: str = ""


class UploadResponse(BaseModel):
    upload_id: UUID
    detected_format: str
    size: int
    expires_at: datetime


class ConvertRequest(BaseModel):
    upload_id: UUID
    to: str
    settings: dict = {}


class ConvertResponse(BaseModel):
    job_id: UUID


class JobErrorSchema(BaseModel):
    code: str
    message: str


class JobResponse(BaseModel):
    id: UUID
    status: str
    progress: float = 0.0
    queue_position: int | None = None
    download_url: str | None = None
    error: JobErrorSchema | None = None


class ZipRequest(BaseModel):
    job_ids: list[UUID] = Field(max_length=100)


class ZipResponse(BaseModel):
    download_url: str
    expires_at: datetime


# ----------------------------------------------------------------- admin ---


class AdminLoginRequest(BaseModel):
    email: str
    password: str


class AdminUserSchema(BaseModel):
    id: UUID
    email: str
    role: str
    allowed_tabs: list[str] = []
    disabled: bool = False


class AdminMeResponse(BaseModel):
    user: AdminUserSchema
    tabs: list[str]


class FormatStateSchema(BaseModel):
    key: str
    visible: bool = True
    plans: list[str] = ["anonymous", "free", "pro"]
    status: str = "testing"
    note: str = ""


class FormatStateUpdate(BaseModel):
    visible: bool | None = None
    plans: list[str] | None = None
    status: str | None = None
    note: str | None = None


class PlanUpdate(BaseModel):
    name: str | None = None
    price_cents: int | None = None
    limits: dict | None = None


class MessageUpdate(BaseModel):
    text: str


class UserAdminSchema(BaseModel):
    id: UUID
    email: str | None = None
    firebase_uid: str | None = None
    plan_id: str
    banned: bool
    created_at: datetime


class UserPlanUpdate(BaseModel):
    plan_id: str


class TeamCreate(BaseModel):
    email: str
    password: str
    role: str = "admin"
    allowed_tabs: list[str] = []


class TeamUpdate(BaseModel):
    role: str | None = None
    allowed_tabs: list[str] | None = None
    disabled: bool | None = None


class AdSlotSchema(BaseModel):
    id: str
    code: str = ""
    enabled: bool = True


class AdSlotUpdate(BaseModel):
    code: str | None = None
    enabled: bool | None = None


class SettingUpdate(BaseModel):
    value: dict


class JobAdminSchema(BaseModel):
    id: UUID
    owner_key: str
    pair_slug: str
    status: str
    progress: float
    error_code: str | None = None
    plan_id: str
    created_at: datetime
    finished_at: datetime | None = None


class ReportSummary(BaseModel):
    day: str
    conversions: int
    failed: int
    input_mb: float


class SelfcheckTrigger(BaseModel):
    pair: str | None = None
