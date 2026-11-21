#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Checks all generated ZUGFeRD PDFs for PDF/A-3b conformance with veraPDF (Docker image verapdf/cli).
set -euo pipefail
dir="$(cd "$(dirname "$0")/../.." && pwd)/.cache/generated/zugferd"
ls "$dir"/*.pdf >/dev/null
out=$(docker run --rm -v "$dir:/data" verapdf/cli:latest --flavour 3b --format text /data)
echo "$out"
if echo "$out" | grep -qv '^PASS'; then
  echo "veraPDF: at least one file is not PDF/A-3b compliant" >&2
  exit 1
fi
echo "veraPDF: all files are PDF/A-3b compliant"
