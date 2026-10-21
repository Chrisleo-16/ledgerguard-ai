"""Pluggable LLM layer.
Provider auto-selection: ANTHROPIC_API_KEY -> Claude (official SDK, tool-use structured output);
else OPENAI_API_KEY -> any OpenAI-compatible endpoint (JSON mode); else None -> deterministic fallbacks.
Override with LLM_PROVIDER=anthropic|openai|none. Every caller validates output server-side."""
from __future__ import annotations
import json, logging, os, re
import httpx
from . import config

log = logging.getLogger("llm")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
DEFAULT_MODELS = {"anthropic": "claude-sonnet-5-5", "openai": "gpt-4o-mini"}

def provider() -> str:
    p = os.getenv("LLM_PROVIDER", "").lower()
    if p in ("anthropic", "openai", "none"):
        return p
    if ANTHROPIC_API_KEY: return "anthropic"
    if config.OPENAI_API_KEY: return "openai"
    return "none"

def model() -> str:
    return os.getenv("LLM_MODEL") or DEFAULT_MODELS.get(provider(), "")

def enabled() -> bool:
    return provider() != "none"

last_model: str | None = None  # model id reported by the provider on the most recent successful call

def provider_name() -> str:
    p = provider()
    return "deterministic-fallback" if p == "none" else f"{p}:{model()}"

_anthropic_client = None
def _anthropic():
    global _anthropic_client
    if _anthropic_client is None:
        import anthropic
        _anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY, max_retries=3, timeout=90)
    return _anthropic_client

GENERIC_SCHEMA = {"type": "object", "additionalProperties": True}

def _extract_json(text: str) -> dict | None:
    m = re.search(r"\{.*\}", text or "", re.S)
    if not m: return None
    try: return json.loads(m.group(0))
    except Exception: return None

def _anthropic_json(system: str, user: str, schema: dict | None, max_tokens: int) -> dict | None:
    global last_model
    import anthropic
    tool = {"name": "respond", "description": "Return the structured result.", "input_schema": schema or GENERIC_SCHEMA}
    kw = dict(model=model(), max_tokens=max_tokens, system=system + "\nAlways answer by calling the `respond` tool exactly once.",
              messages=[{"role": "user", "content": user}], tools=[tool])
    try:
        resp = _anthropic().messages.create(**kw, tool_choice={"type": "tool", "name": "respond"})
    except anthropic.BadRequestError:  # e.g. forced tool_choice not allowed with thinking: let the model choose
        resp = _anthropic().messages.create(**kw, tool_choice={"type": "auto"})
    last_model = resp.model
    for block in resp.content:
        if block.type == "tool_use" and block.name == "respond":
            return dict(block.input)
    return _extract_json("".join(getattr(b, "text", "") for b in resp.content))

def _openai_json(system: str, user: str, temperature: float) -> dict | None:
    global last_model
    r = httpx.post(f"{config.OPENAI_BASE_URL.rstrip('/')}/chat/completions",
                   headers={"Authorization": f"Bearer {config.OPENAI_API_KEY}"},
                   json={"model": model(), "temperature": temperature, "response_format": {"type": "json_object"},
                         "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}, timeout=60)
    r.raise_for_status()
    body = r.json(); last_model = body.get("model", model())
    return json.loads(body["choices"][0]["message"]["content"])

def chat_json(system: str, user: str, temperature: float = 0.2, schema: dict | None = None, max_tokens: int = 2048) -> dict | None:
    """Structured JSON from the configured provider, or None (callers then use deterministic fallbacks)."""
    p = provider()
    if p == "none": return None
    try:
        return _anthropic_json(system, user, schema, max_tokens) if p == "anthropic" else _openai_json(system, user, temperature)
    except Exception as e:  # never break the demo on LLM failure
        log.warning("LLM call failed (%s), using fallback: %s", p, type(e).__name__)
        return None
