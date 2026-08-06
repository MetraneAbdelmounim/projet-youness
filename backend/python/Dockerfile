# syntax=docker/dockerfile:1
#
# Build context is the REPOSITORY ROOT, matching backend/Dockerfile, so both
# images share one context and one .dockerignore.
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    TZ=America/Toronto

# iputils-ping backs the reachability probe; tzdata keeps timestamps local.
RUN apt-get update \
 && apt-get install -y --no-install-recommends iputils-ping tzdata \
 && rm -rf /var/lib/apt/lists/*

COPY backend/python/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Chromium is only needed for the network-config refresh action.
RUN playwright install --with-deps chromium

COPY backend/python/ .

# Run as an unprivileged user.
RUN useradd --create-home --uid 10001 appuser \
 && chown -R appuser /app /home/appuser
USER appuser

EXPOSE 8000

# A production ASGI server. The previous image ran `flask run`, the
# single-threaded development server, which serialised every request.
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
