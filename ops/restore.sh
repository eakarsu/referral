#!/bin/sh
set -eu
: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL required}"
: "${BACKUP_FILE:?BACKUP_FILE required}"
: "${ALLOW_RESTORE:?Set ALLOW_RESTORE=YES for an empty disposable restore target}"
[ "$ALLOW_RESTORE" = YES ] || { echo 'ALLOW_RESTORE must be YES' >&2; exit 1; }
[ -r "$BACKUP_FILE" ] || { echo 'BACKUP_FILE is not readable' >&2; exit 1; }
database_name=$(psql "$RESTORE_DATABASE_URL" -Atqc 'select current_database()')
case "$database_name" in *_restore|*_test) ;; *) echo 'Restore target database name must end in _restore or _test' >&2; exit 1;; esac
[ "$(psql "$RESTORE_DATABASE_URL" -Atqc "select count(*) from pg_catalog.pg_tables where schemaname='public'")" = 0 ] || { echo 'Restore target must have an empty public schema' >&2; exit 1; }
pg_restore --no-owner --no-acl --exit-on-error --dbname="$RESTORE_DATABASE_URL" "$BACKUP_FILE"
printf 'Restore completed into %s\n' "$database_name"
