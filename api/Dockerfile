# Ubuntu 24.04 matches the environment this code was tested on (libvips 8.15, FFmpeg 6.1, libheif 1.17, Python 3.12).
# Works on amd64 (your PC) and arm64 (Oracle Ampere) from the same file.
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PATH="/opt/venv/bin:$PATH"

RUN apt-get update && apt-get install -y --no-install-recommends \
  python3.12 \
  python3.12-venv \
  python3-pip \
  python3.12-dev \
  build-essential \
  ffmpeg \
  libvips42t64 \
  libheif1 \
  libheif-plugin-libde265 \
  libheif-plugin-aomdec \
  libheif-plugin-aomenc \
  libheif-plugin-x265 \
  libopenjp2-7 \
  tini \
  ca-certificates \
  curl \
  && rm -rf /var/lib/apt/lists/*

RUN python3.12 -m venv /opt/venv

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN useradd -u 10001 -m qic && mkdir -p /data && chown -R qic:qic /data /app

USER qic

ENV DATA_DIR=/data

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --retries=5 CMD curl -fsS http://localhost:8000/v1/health || exit 1

ENTRYPOINT ["tini", "--", "sh", "/app/docker-entrypoint.sh"]
