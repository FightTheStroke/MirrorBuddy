from pydantic import BaseModel
from datetime import date


class CostByService(BaseModel):
    service_name: str
    cost: float
    currency: str = "USD"


class DailyCost(BaseModel):
    date: date
    cost: float
    currency: str = "USD"


class CostSummary(BaseModel):
    subscription_id: str
    subscription_name: str
    period_start: date
    period_end: date
    total_cost: float
    currency: str = "USD"
    costs_by_service: list[CostByService]
    daily_costs: list[DailyCost]


class CostForecast(BaseModel):
    subscription_id: str
    forecast_period_end: date
    estimated_total: float
    currency: str = "USD"


class HealthCheck(BaseModel):
    status: str
    version: str


# Drill-down models for detailed cost analysis
class MeterDetail(BaseModel):
    """Detailed meter information for a specific Azure service usage."""
    meter_name: str
    meter_category: str
    meter_subcategory: str
    cost: float
    currency: str = "USD"
    resource_name: str | None = None
    resource_id: str | None = None


class ServiceDrilldown(BaseModel):
    """Detailed breakdown of costs for a single Azure service."""
    service_name: str
    total_cost: float
    currency: str = "USD"
    meters: list[MeterDetail]


class ModelUsage(BaseModel):
    """AI model usage breakdown."""
    model_name: str
    model_type: str  # "text", "audio_input", "audio_output", "cached"
    cost: float
    currency: str = "USD"
    percentage_of_ai: float


class CostDrilldown(BaseModel):
    """Complete drill-down of Azure costs with full detail."""
    subscription_id: str
    subscription_name: str
    period_start: date
    period_end: date
    total_cost: float
    currency: str = "USD"
    services: list[ServiceDrilldown]
    ai_models: list[ModelUsage]  # Specific breakdown for AI/OpenAI costs
    insights: list[str]  # Auto-generated cost insights
