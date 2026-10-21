import os, sys, pathlib
os.environ["DATABASE_URL"] = "sqlite:///./test_ledgerguard.db"
os.environ["PAYPAL_MODE"] = "mock"
os.environ["OPENAI_API_KEY"] = ""
os.environ["LLM_PROVIDER"] = "none"  # tests are deterministic; live AI is tested manually
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import pytest
from fastapi.testclient import TestClient

@pytest.fixture()
def client():
    from app import seed
    seed.run()
    from app.main import app
    with TestClient(app) as c:
        yield c
