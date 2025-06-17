#!/usr/bin/env bash

set -e

host=$1

until PGPASSWORD=${POSTGRES_PASSWORD} psql -h "$host" -U "$POSTGRES_USER" -c '\l'; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

>&2 echo "Postgres is up - executing command"
exec "${@:2}"
