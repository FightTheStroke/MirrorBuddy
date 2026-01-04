from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Azure Cost Management credentials (optional for local dev - uses az login)
    azure_tenant_id: str | None = None
    azure_client_id: str | None = None
    azure_client_secret: str | None = None
    azure_subscription_id: str  # Required - from AZURE_SUBSCRIPTION_ID env var
    azure_subscription_name: str = "Azure Subscription"  # Optional display name

    # API settings
    api_title: str = "Convergio Cost API"
    api_version: str = "1.0.0"
    cors_origins: list[str] = ["*"]

    @property
    def use_service_principal(self) -> bool:
        return all([self.azure_tenant_id, self.azure_client_id, self.azure_client_secret])

    class Config:
        env_file = "../.env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
