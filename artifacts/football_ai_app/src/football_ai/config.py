from pydantic_settings import BaseSettings, SettingsConfigDict


def _normalize_database_url(url: str) -> str:
    """Render and Heroku expose postgres:// — SQLAlchemy+psycopg need postgresql+psycopg://."""
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://") :]
    if url.startswith("postgresql://") and "+psycopg" not in url:
        return "postgresql+psycopg://" + url[len("postgresql://") :]
    return url


class Settings(BaseSettings):
    database_url: str = "sqlite:///./football_ai.db"
    app_env: str = "development"
    # Comma-separated. In production set to your Render static site URL(s).
    cors_origins: str = (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:8501,http://127.0.0.1:8501"
    )
    model_version: str = "dixon-coles-baseline-v0.2"
    default_rho: float = -0.13

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def sqlalchemy_url(self) -> str:
        return _normalize_database_url(self.database_url)


settings = Settings()
