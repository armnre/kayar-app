#!/usr/bin/env bash
# Builds a clean, self-contained source archive of the KAYAR project.
#   ./scripts/make-zip.sh            → kayar-full-source.zip (+ a copy in public/ for download)
# Secrets and generated files are never included.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-kayar-full-source.zip}"

rm -f "$OUT"
zip -r -q "$OUT" \
  src server docs scripts \
  index.html package.json package-lock.json tsconfig.json vite.config.ts \
  KAYAR.md README.md .gitignore \
  -x 'server/.env' \
  -x 'server/kayar.db*' \
  -x 'server/uploads/*' \
  -x 'server/dist/*' \
  -x 'server/dist' \
  -x 'node_modules/*' \
  -x 'dist/*' \
  -x '*/.DS_Store' \
  -x '*.zip'

# ship the archive with the built frontend too, so it is downloadable from the running server
mkdir -p public
cp -f "$OUT" public/kayar-full-source.zip
echo "✓ $OUT ($(du -h "$OUT" | cut -f1)) — also copied to public/ for http download"
unzip -l "$OUT" | tail -3
