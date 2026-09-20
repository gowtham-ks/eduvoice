from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_SECRET = "change-me-in-production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"  # "production" turns on strict checks
    database_url: str = "sqlite:///./eduvoice.db"
    jwt_secret: str = _DEFAULT_SECRET
    jwt_expire_minutes: int = 60
    cookie_secure: bool = False
    frontend_origin: str = "http://localhost:3000"
    # Signing key: base64 of the PEM (for hosts with no persistent disk). Dev falls back to a key file.
    signing_key_pem_b64: str = ""
    signing_key_path: str = "./signing_key.pem"
    # Privacy thresholds
    min_responses: int = 5          # hide all stats below this many responses
    min_comments_visible: int = 10  # hide free-text comments below this many
    use_hf_models: bool = False

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def sqlalchemy_url(self) -> str:
        """Accepts the postgres:// and postgresql:// URLs that Neon/Supabase/Render hand out."""
        url = self.database_url
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url[len(prefix):]
        return url

    def check_production(self) -> None:
        problems = []
        if self.jwt_secret == _DEFAULT_SECRET or len(self.jwt_secret) < 32:
            problems.append("JWT_SECRET must be set to a random string of at least 32 characters")
        if not self.signing_key_pem_b64:
            problems.append("SIGNING_KEY_PEM_B64 must be set (run: python -m app.bootstrap genkey)")
        if self.sqlalchemy_url.startswith("sqlite"):
            problems.append("DATABASE_URL must point to PostgreSQL (SQLite is not persistent on serverless hosts)")
        if not self.cookie_secure:
            problems.append("COOKIE_SECURE must be true")
        if problems:
            raise RuntimeError("Unsafe production configuration:\n - " + "\n - ".join(problems))


settings = Settings()
