FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    ROLE=both

# System deps: FFmpeg, libvips, libheif, LibRaw, Ghostscript, fonts.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        libvips-tools \
        libvips-dev \
        libheif-dev \
        libraw-dev \
        ghostscript \
        fonts-dejavu-core \
        curl \
        ca-certificates \
        gcc \
    && rm -rf /var/lib/apt/lists/*

# resvg (SVG render) + vtracer (raster->SVG) prebuilt binaries.
RUN curl -fsSL -o /tmp/resvg.tar.gz \
        https://github.com/RazrFalcon/resvg/releases/download/v0.45.1/resvg-linux-x86_64.tar.gz \
    && tar -xzf /tmp/resvg.tar.gz -C /tmp \
    && mv /tmp/resvg /usr/local/bin/resvg \
    && chmod +x /usr/local/bin/resvg \
    && rm -f /tmp/resvg.tar.gz \
    && curl -fsSL -o /tmp/vtracer.tar.gz \
        https://github.com/visioncortex/vtracer/releases/download/0.6.4/vtracer-x86_64-unknown-linux-musl.tar.gz \
    && tar -xzf /tmp/vtracer.tar.gz -C /tmp \
    && mv /tmp/vtracer /usr/local/bin/vtracer \
    && chmod +x /usr/local/bin/vtracer \
    && rm -f /tmp/vtracer.tar.gz

WORKDIR /code

# Python deps first (better layer caching).
COPY pyproject.toml ./
RUN pip install --upgrade pip && pip install .

# App code.
COPY alembic.ini ./
COPY app ./app
COPY migrations ./migrations
COPY seed ./seed

# Non-root user + data dirs (spec 4.7).
RUN useradd -m -u 10001 app \
    && mkdir -p /data/uploads /data/jobs /data/samples \
    && chown -R app:app /data /code
USER app

EXPOSE 8000

COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
