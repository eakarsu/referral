#!/bin/sh
set -eu
: "${DATABASE_URL:?DATABASE_URL required}"
: "${BACKUP_FILE:?BACKUP_FILE required}"
[ ! -e "$BACKUP_FILE" ] || { echo 'BACKUP_FILE already exists; refusing to overwrite it' >&2; exit 1; }
umask 077
pg_dump --format=custom --no-owner --no-acl --file="$BACKUP_FILE" "$DATABASE_URL"
printf 'Backup written to %s\n' "$BACKUP_FILE"
