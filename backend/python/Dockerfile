# syntax=docker/dockerfile:1
#
# Build context is the REPOSITORY ROOT, matching backend/Dockerfile, so both
# images share one context and one .dockerignore.
#
# Pinned to bookworm (Debian 12) deliberately. The unsuffixed `python:3.12-slim`
# now resolves to trixie (Debian 13), which Playwright does not recognise: it
# falls back to an Ubuntu 20.04 dependency list and fails on packages that do
# not exist there (ttf-unifont, ttf-ubuntu-font-family). Debian 12 is on
# Playwright's supported list, so `--with-deps` resolves cleanly.
FROM python:3.12-slim-bookworm

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    TZ=America/Toronto \
    # Install browsers to a shared path rather than the installing user's home.
    # `playwright install` runs as root but the container runs as appuser, so a
    # browser left in /root/.cache is invisible at runtime — the build succeeds
    # and the refresh action fails only when someone clicks it.
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# iputils-ping backs the reachability probe; tzdata keeps timestamps local.
RUN apt-get update \
 && apt-get install -y --no-install-recommends iputils-ping tzdata \
 && rm -rf /var/lib/apt/lists/*

COPY backend/python/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Chromium is only needed for the network-config refresh action.
RUN playwright install --with-deps chromium \
 && chmod -R a+rX /ms-playwright

COPY backend/python/ .

# Run as an unprivileged user.
RUN useradd --create-home --uid 10001 appuser \
 && chown -R appuser /app /home/appuser
USER appuser

EXPOSE 8000

# A production ASGI server. The previous image ran `flask run`, the
# single-threaded development server, which serialised every request.
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
