from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import get_settings
from .models import CostSummary, CostForecast, CostDrilldown, HealthCheck
from .azure_costs import AzureCostService


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app.state.cost_service = AzureCostService()
    yield
    # Shutdown
    pass


settings = get_settings()
app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthCheck)
async def health_check():
    return HealthCheck(status="healthy", version=settings.api_version)


@app.get("/api/v1/costs", response_model=CostSummary)
async def get_costs(days: int = Query(default=30, ge=1, le=365)):
    """
    Get Azure cost summary for the specified number of days.

    - **days**: Number of days to look back (1-365, default: 30)
    """
    try:
        return await app.state.cost_service.get_cost_summary(days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/costs/forecast", response_model=CostForecast)
async def get_forecast():
    """
    Get estimated Azure costs for the current month.
    """
    try:
        return await app.state.cost_service.get_forecast()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/costs/current-month", response_model=CostSummary)
async def get_current_month_costs():
    """
    Get Azure costs for the current month.
    """
    from datetime import date

    today = date.today()
    days_in_month = today.day

    try:
        return await app.state.cost_service.get_cost_summary(days_in_month)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/costs/drilldown", response_model=CostDrilldown)
async def get_cost_drilldown(days: int = Query(default=30, ge=1, le=365)):
    """
    Get detailed Azure cost breakdown with meter-level granularity.

    Returns:
    - Full breakdown by service and meter
    - AI model usage breakdown (voice vs text, by model)
    - Auto-generated cost insights and recommendations

    - **days**: Number of days to look back (1-365, default: 30)
    """
    try:
        return await app.state.cost_service.get_cost_drilldown(days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
