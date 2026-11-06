#!/usr/bin/env bash
set -euo pipefail
python -m pip install -U pip
python -m pip install sports-skills feedparser requests
python -m pip install curl-cffi beautifulsoup4 lxml httpx || true
# EasySoccerData from GitHub if PyPI metadata fails
python -m pip install "git+https://github.com/manucabral/EasySoccerData.git" || \
  echo "EasySoccerData install failed — Sofascore live will be disabled until fixed"
echo "Done. Optional: export API_FOOTBALL_KEY=..."
