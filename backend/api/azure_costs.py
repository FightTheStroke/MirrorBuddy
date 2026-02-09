from datetime import date, timedelta, datetime
import httpx
import asyncio
from azure.identity import ClientSecretCredential, AzureCliCredential
from .config import get_settings
from .models import (
    CostByService,
    DailyCost,
    CostSummary,
    CostForecast,
    CostDrilldown,
    ServiceDrilldown,
    MeterDetail,
    ModelUsage,
)


class CostCache:
    """Simple in-memory cache with TTL."""

    def __init__(self, ttl_seconds: int = 300):  # 5 min default
        self.ttl = ttl_seconds
        self._cache: dict[str, tuple[datetime, any]] = {}

    def get(self, key: str):
        if key in self._cache:
            timestamp, value = self._cache[key]
            if (datetime.now() - timestamp).total_seconds() < self.ttl:
                return value
            del self._cache[key]
        return None

    def set(self, key: str, value: any):
        self._cache[key] = (datetime.now(), value)


class AzureCostService:
    def __init__(self):
        settings = get_settings()
        self.subscription_id = settings.azure_subscription_id
        self._cache = CostCache(ttl_seconds=300)  # Cache for 5 minutes

        if settings.use_service_principal:
            self.credential = ClientSecretCredential(
                tenant_id=settings.azure_tenant_id,
                client_id=settings.azure_client_id,
                client_secret=settings.azure_client_secret,
            )
        else:
            # Use local az login credentials
            self.credential = AzureCliCredential()

        self._token = None

    async def _get_token(self) -> str:
        if self._token is None:
            token = self.credential.get_token("https://management.azure.com/.default")
            self._token = token.token
        return self._token

    async def _query_costs(self, query_body: dict, max_retries: int = 3) -> dict:
        token = await self._get_token()
        url = (
            f"https://management.azure.com/subscriptions/{self.subscription_id}"
            f"/providers/Microsoft.CostManagement/query?api-version=2023-11-01"
        )
        import asyncio

        for attempt in range(max_retries):
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=query_body,
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=30.0,
                )
                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", 60))
                    if attempt < max_retries - 1:
                        await asyncio.sleep(retry_after)
                        continue
                response.raise_for_status()
                return response.json()
        return {}

    async def get_cost_summary(self, days: int = 30) -> CostSummary:
        cache_key = f"costs_{days}"
        cached = self._cache.get(cache_key)
        if cached:
            return cached

        end_date = date.today()
        start_date = end_date - timedelta(days=days)

        # Query costs by service
        service_query = {
            "type": "ActualCost",
            "timeframe": "Custom",
            "timePeriod": {
                "from": start_date.isoformat(),
                "to": end_date.isoformat(),
            },
            "dataset": {
                "granularity": "None",
                "aggregation": {"totalCost": {"name": "Cost", "function": "Sum"}},
                "grouping": [{"type": "Dimension", "name": "ServiceName"}],
            },
        }
        service_result = await self._query_costs(service_query)

        # Query daily costs
        daily_query = {
            "type": "ActualCost",
            "timeframe": "Custom",
            "timePeriod": {
                "from": start_date.isoformat(),
                "to": end_date.isoformat(),
            },
            "dataset": {
                "granularity": "Daily",
                "aggregation": {"totalCost": {"name": "Cost", "function": "Sum"}},
            },
        }
        daily_result = await self._query_costs(daily_query)

        # Parse service costs
        costs_by_service = []
        total_cost = 0.0
        for row in service_result.get("properties", {}).get("rows", []):
            cost = row[0]
            service_name = row[1]
            currency = row[2] if len(row) > 2 else "USD"
            costs_by_service.append(
                CostByService(service_name=service_name, cost=cost, currency=currency)
            )
            total_cost += cost

        # Parse daily costs
        daily_costs = []
        for row in daily_result.get("properties", {}).get("rows", []):
            cost = row[0]
            date_val = row[1]
            # Azure returns date as YYYYMMDD integer
            if isinstance(date_val, int):
                date_str = str(date_val)
                day_date = date(
                    int(date_str[:4]), int(date_str[4:6]), int(date_str[6:8])
                )
            else:
                day_date = date.fromisoformat(str(date_val)[:10])
            daily_costs.append(DailyCost(date=day_date, cost=cost))

        # Sort by cost descending
        costs_by_service.sort(key=lambda x: x.cost, reverse=True)
        daily_costs.sort(key=lambda x: x.date)

        result = CostSummary(
            subscription_id=self.subscription_id,
            subscription_name=get_settings().azure_subscription_name,
            period_start=start_date,
            period_end=end_date,
            total_cost=total_cost,
            costs_by_service=costs_by_service,
            daily_costs=daily_costs,
        )
        self._cache.set(cache_key, result)
        return result

    async def get_forecast(self) -> CostForecast:
        cache_key = "forecast"
        cached = self._cache.get(cache_key)
        if cached:
            return cached

        end_of_month = date.today().replace(day=28) + timedelta(days=4)
        end_of_month = end_of_month.replace(day=1) - timedelta(days=1)

        query = {
            "type": "ActualCost",
            "timeframe": "MonthToDate",
            "dataset": {
                "granularity": "None",
                "aggregation": {"totalCost": {"name": "Cost", "function": "Sum"}},
            },
        }
        result = await self._query_costs(query)

        rows = result.get("properties", {}).get("rows", [])
        current_cost = rows[0][0] if rows else 0.0

        # Simple linear forecast
        today = date.today()
        days_elapsed = today.day
        days_in_month = end_of_month.day
        estimated_total = (
            (current_cost / days_elapsed) * days_in_month if days_elapsed > 0 else 0
        )

        forecast = CostForecast(
            subscription_id=self.subscription_id,
            forecast_period_end=end_of_month,
            estimated_total=round(estimated_total, 2),
        )
        self._cache.set(cache_key, forecast)
        return forecast

    async def get_cost_drilldown(self, days: int = 30) -> CostDrilldown:
        """Get detailed cost breakdown with meter-level granularity."""
        cache_key = f"drilldown_{days}"
        cached = self._cache.get(cache_key)
        if cached:
            return cached

        end_date = date.today()
        start_date = end_date - timedelta(days=days)

        # Query with full detail
        query = {
            "type": "ActualCost",
            "timeframe": "Custom",
            "timePeriod": {
                "from": start_date.isoformat(),
                "to": end_date.isoformat(),
            },
            "dataset": {
                "granularity": "None",
                "aggregation": {"totalCost": {"name": "Cost", "function": "Sum"}},
                "grouping": [
                    {"type": "Dimension", "name": "ServiceName"},
                    {"type": "Dimension", "name": "MeterCategory"},
                    {"type": "Dimension", "name": "MeterSubcategory"},
                    {"type": "Dimension", "name": "Meter"},
                    {"type": "Dimension", "name": "ResourceId"},
                ],
            },
        }
        result = await self._query_costs(query)
        rows = result.get("properties", {}).get("rows", [])

        # Group by service
        services_dict: dict[str, list[MeterDetail]] = {}
        ai_meters: list[tuple[str, str, float]] = []  # (meter, subcategory, cost)
        total_cost = 0.0

        for row in rows:
            cost = float(row[0]) if row[0] else 0.0
            if cost < 0.001:
                continue

            service = row[1] or "Unknown"
            meter_cat = row[2] or ""
            meter_sub = row[3] or ""
            meter = row[4] or ""
            resource_id = row[5] or ""
            resource_name = resource_id.split("/")[-1] if resource_id else None
            currency = row[6] if len(row) > 6 else "USD"

            total_cost += cost

            meter_detail = MeterDetail(
                meter_name=meter,
                meter_category=meter_cat,
                meter_subcategory=meter_sub,
                cost=round(cost, 4),
                currency=currency,
                resource_name=resource_name,
                resource_id=resource_id if resource_id else None,
            )

            if service not in services_dict:
                services_dict[service] = []
            services_dict[service].append(meter_detail)

            # Track AI/OpenAI meters for model breakdown
            if "Foundry" in service or "OpenAI" in service:
                ai_meters.append((meter, meter_sub, cost))

        # Build service drilldowns
        services = []
        for service_name, meters in services_dict.items():
            service_total = sum(m.cost for m in meters)
            meters_sorted = sorted(meters, key=lambda x: x.cost, reverse=True)
            services.append(
                ServiceDrilldown(
                    service_name=service_name,
                    total_cost=round(service_total, 2),
                    meters=meters_sorted,
                )
            )
        services.sort(key=lambda x: x.total_cost, reverse=True)

        # Parse AI model usage
        ai_models = self._parse_ai_models(ai_meters)

        # Generate insights
        insights = self._generate_insights(services, ai_models, total_cost)

        result = CostDrilldown(
            subscription_id=self.subscription_id,
            subscription_name=get_settings().azure_subscription_name,
            period_start=start_date,
            period_end=end_date,
            total_cost=round(total_cost, 2),
            services=services,
            ai_models=ai_models,
            insights=insights,
        )
        self._cache.set(cache_key, result)
        return result

    def _parse_ai_models(
        self, ai_meters: list[tuple[str, str, float]]
    ) -> list[ModelUsage]:
        """Parse AI meter names to identify specific models and usage types."""
        models = []
        total_ai = sum(m[2] for m in ai_meters)
        if total_ai == 0:
            return models

        # Model name patterns (matched against Azure billing meter names)
        # Order matters: more specific patterns first to avoid false positives
        model_mapping = {
            "gpt rt aud": ("gpt-realtime", "audio"),
            "gpt rt txt": ("gpt-realtime", "text"),
            "gpt-5.2": ("gpt-5.2", "text"),
            "gpt-5-nano": ("gpt-5-nano", "text"),
            "gpt-5-mini": ("gpt-5-mini", "text"),
            "gpt-5": ("gpt-5", "text"),
            "gpt-4o-mini": ("gpt-4o-mini", "text"),
            "gpt-4o": ("gpt-4o", "text"),
            "gpt-35": ("gpt-3.5-turbo", "text"),
        }

        for meter, subcategory, cost in ai_meters:
            meter_lower = meter.lower()

            # Determine model and type
            model_name = "unknown"
            model_type = "text"

            for pattern, (name, mtype) in model_mapping.items():
                if pattern.lower() in meter_lower:
                    model_name = name
                    model_type = mtype
                    break

            # Refine type based on meter name
            if "outp" in meter_lower:
                model_type = f"{model_type}_output"
            elif "inp" in meter_lower:
                if "cchd" in meter_lower or "cached" in meter_lower:
                    model_type = f"{model_type}_cached_input"
                else:
                    model_type = f"{model_type}_input"

            # Audio specifics
            if "aud" in meter_lower:
                if "outp" in meter_lower:
                    model_type = "audio_output"
                elif "cchd" in meter_lower:
                    model_type = "audio_cached_input"
                else:
                    model_type = "audio_input"

            models.append(
                ModelUsage(
                    model_name=model_name,
                    model_type=model_type,
                    cost=round(cost, 4),
                    percentage_of_ai=round((cost / total_ai) * 100, 1),
                )
            )

        models.sort(key=lambda x: x.cost, reverse=True)
        return models

    def _generate_insights(
        self,
        services: list[ServiceDrilldown],
        ai_models: list[ModelUsage],
        total: float,
    ) -> list[str]:
        """Generate actionable cost insights."""
        insights = []

        if total == 0:
            return ["No costs recorded for this period."]

        # Find top service
        if services:
            top_service = services[0]
            pct = (top_service.total_cost / total) * 100
            insights.append(
                f"{top_service.service_name} is {pct:.0f}% of total costs (${top_service.total_cost:.2f})"
            )

        # AI-specific insights
        if ai_models:
            total_ai = sum(m.cost for m in ai_models)
            ai_pct = (total_ai / total) * 100

            # Voice vs text
            voice_cost = sum(m.cost for m in ai_models if "audio" in m.model_type)
            text_cost = sum(
                m.cost
                for m in ai_models
                if "text" in m.model_type and "audio" not in m.model_type
            )

            if voice_cost > 0:
                voice_pct = (voice_cost / total_ai) * 100
                insights.append(
                    f"Voice/Realtime API: ${voice_cost:.2f} ({voice_pct:.0f}% of AI costs)"
                )
                if voice_pct > 80:
                    insights.append(
                        "Consider gpt-realtime-mini for 80-90% voice cost savings"
                    )

            if text_cost > 0:
                text_pct = (text_cost / total_ai) * 100
                insights.append(
                    f"Text API: ${text_cost:.2f} ({text_pct:.0f}% of AI costs)"
                )

            # Cache effectiveness
            cached_cost = sum(m.cost for m in ai_models if "cached" in m.model_type)
            if cached_cost > 0:
                insights.append(
                    f"Prompt caching active: ${cached_cost:.2f} in cached requests"
                )

        return insights
