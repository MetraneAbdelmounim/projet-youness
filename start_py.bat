@echo off
REM Polling service + control API on http://127.0.0.1:8000
cd backend\python
python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
