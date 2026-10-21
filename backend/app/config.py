import os
from pathlib import Path

def _load_env():
    p = Path(__file__).resolve().parents[2] / ".env"
    if p.exists():
        for line in p.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())
_load_env()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ledgerguard.db")
if DATABASE_URL.startswith("postgres://"):  # Render/Heroku style -> SQLAlchemy psycopg3 driver
    DATABASE_URL = "postgresql+psycopg://" + DATABASE_URL[len("postgres://"):]
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = "postgresql+psycopg://" + DATABASE_URL[len("postgresql://"):]
PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID", "")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET", "")
PAYPAL_BASE_URL = os.getenv("PAYPAL_BASE_URL", "https://api-m.sandbox.paypal.com")
PAYPAL_WEBHOOK_ID = os.getenv("PAYPAL_WEBHOOK_ID", "")
PAYPAL_MODE = os.getenv("PAYPAL_MODE") or ("sandbox" if PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET else "mock")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
MERCHANT_NAME = os.getenv("MERCHANT_NAME", "Chrisben Evans Leo")
MERCHANT_EMAIL = os.getenv("MERCHANT_EMAIL", "")
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
if os.getenv("FRONTEND_HOST"):  # set by render.yaml from the frontend service's RENDER_EXTERNAL_HOSTNAME
    CORS_ORIGINS.append("https://" + os.getenv("FRONTEND_HOST").strip())
SEED_DEMO_IF_EMPTY = os.getenv("SEED_DEMO_IF_EMPTY", "true").lower() in ("1", "true", "yes")
