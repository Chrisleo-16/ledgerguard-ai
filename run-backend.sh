#!/usr/bin/env bash
set -e; cd "$(dirname "$0")/backend"
[ -d .venv ] || { python3 -m venv .venv && .venv/bin/pip install -r requirements.txt; }
[ -f ledgerguard.db ] || .venv/bin/python -m app.seed
exec .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
