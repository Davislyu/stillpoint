#!/usr/bin/env bash
# Applies the migration to a throwaway database and runs the isolation tests.
# The migration runs as a non-superuser role (like Supabase's `postgres`), so
# RLS applies to it the way it does in production.
# Usage: PGURI=postgres://user@localhost/postgres ./supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")"
DB="stillpoint_test_$$"
psql "$PGURI" -qc "create database $DB" >/dev/null
trap 'psql "$PGURI" -qc "drop database if exists $DB" >/dev/null' EXIT
URI="${PGURI%/*}/$DB"
psql "$URI" -q -v ON_ERROR_STOP=1 -f supabase_shim.sql 2>/dev/null
psql "$URI" -q -v ON_ERROR_STOP=1 -c "do \$\$ begin if not exists (select 1 from pg_roles where rolname='app_owner') then create role app_owner nologin; end if; end \$\$;
  grant create, usage on schema public to app_owner; grant usage on schema auth to app_owner;
  grant select, insert, update, delete, references, trigger on auth.users to app_owner;
  alter publication supabase_realtime owner to app_owner;" >/dev/null
( echo "set role app_owner;"; cat ../migrations/*.sql ) | psql "$URI" -q -v ON_ERROR_STOP=1 2>&1 | grep -v "wal_level\|HINT" || true
psql "$URI" -q -v ON_ERROR_STOP=1 -t -f rls.test.sql 2>&1 | sed -E -e 's/^psql:[^ ]+ NOTICE:  //' -e 's/^NOTICE:  //' -e '/^ *[0-9a-f-]{36}$/d' -e '/^\s*$/d' -e 's/^ *//'
