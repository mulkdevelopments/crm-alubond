#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/backend/.env"
BACKUP_DIR="${ROOT_DIR}/backups"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT_FILE="${BACKUP_DIR}/alubond_crm_prod_${TIMESTAMP}.sql"
OUTPUT_GZ="${OUTPUT_FILE}.gz"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "Error: pg_dump not found. Install PostgreSQL client tools and try again." >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Error: ${ENV_FILE} not found." >&2
  exit 1
fi

DATABASE_URL="$(
  node -e "
    const fs = require('fs');
    const line = fs
      .readFileSync(process.argv[1], 'utf8')
      .split('\n')
      .find((entry) => entry.startsWith('DATABASE_URL=') && !entry.startsWith('# DATABASE'));
    if (!line) process.exit(2);
    const raw = line.slice('DATABASE_URL='.length).trim();
    const url = new URL(raw);
    url.searchParams.delete('schema');
    process.stdout.write(url.toString());
  " "${ENV_FILE}"
)" || {
  echo "Error: DATABASE_URL is missing in ${ENV_FILE}." >&2
  exit 1
}

mkdir -p "${BACKUP_DIR}"

echo "Backing up database to ${OUTPUT_GZ} ..."
pg_dump "${DATABASE_URL}" --no-owner --no-acl --format=plain --file="${OUTPUT_FILE}"
gzip -f "${OUTPUT_FILE}"

ls -lh "${OUTPUT_GZ}"
echo "Done."
