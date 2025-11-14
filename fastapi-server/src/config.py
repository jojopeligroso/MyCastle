"""Configuration management for FastAPI MCP Server."""
import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    env: str = "development"
    debug: bool = True
    log_level: str = "info"

    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    # JWT
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 60

    # Database
    database_url: str

    # CORS
    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    # MCP
    mcp_server_name: str = "mycastle-fastapi-mcp"
    mcp_server_version: str = "1.0.0"
    mcp_max_tools_per_server: int = 10

    # OpenAI
    openai_api_key: str = ""

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.env == "production"


# Global settings instance
settings = Settings()
