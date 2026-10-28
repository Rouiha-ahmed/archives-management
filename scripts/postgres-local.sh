#!/usr/bin/env bash

set -euo pipefail

postgres_host="${PGHOST:-127.0.0.1}"
postgres_port="${PGPORT:-5432}"

find_postgres_command() {
  local command_name="$1"
  local candidate

  if command -v "$command_name" >/dev/null 2>&1; then
    command -v "$command_name"
    return 0
  fi

  for candidate in \
    "/Applications/Postgres.app/Contents/Versions/latest/bin/$command_name" \
    "/opt/homebrew/opt/postgresql@17/bin/$command_name" \
    "/usr/local/opt/postgresql@17/bin/$command_name" \
    "/opt/homebrew/opt/postgresql@18/bin/$command_name" \
    "/usr/local/opt/postgresql@18/bin/$command_name"; do
    if [[ -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  return 1
}

pg_isready_path="$(find_postgres_command pg_isready || true)"

if [[ -z "$pg_isready_path" ]]; then
  echo "PostgreSQL tools were not found. Install PostgreSQL 17 with: brew install postgresql@17" >&2
  exit 1
fi

is_ready() {
  "$pg_isready_path" -q -h "$postgres_host" -p "$postgres_port"
}

wait_until_ready() {
  local attempt
  for attempt in {1..30}; do
    if is_ready; then
      echo "PostgreSQL is accepting connections on ${postgres_host}:${postgres_port}."
      return 0
    fi
    sleep 1
  done

  echo "PostgreSQL did not become ready within 30 seconds." >&2
  return 1
}

wait_until_stopped() {
  local attempt
  for attempt in {1..30}; do
    if ! is_ready; then
      echo "PostgreSQL has stopped. Database files were preserved."
      return 0
    fi
    sleep 1
  done

  echo "PostgreSQL is still accepting connections after 30 seconds." >&2
  return 1
}

installed_brew_formula() {
  local formula prefix
  if ! command -v brew >/dev/null 2>&1; then
    return 1
  fi

  for formula in postgresql@17 postgresql@18 postgresql; do
    prefix="$(brew --prefix "$formula" 2>/dev/null || true)"
    if [[ -n "$prefix" && -x "$prefix/bin/postgres" ]]; then
      printf '%s\n' "$formula"
      return 0
    fi
  done

  return 1
}

uses_postgres_app() {
  ps -ax -o command= | grep -E '[P]ostgres\.app/.*/bin/postgres' >/dev/null 2>&1
}

start_postgres() {
  local formula
  if is_ready; then
    echo "PostgreSQL is already accepting connections on ${postgres_host}:${postgres_port}."
    return 0
  fi

  if [[ -d /Applications/Postgres.app ]]; then
    echo "Starting PostgreSQL with Postgres.app..."
    open -a Postgres
  else
    formula="$(installed_brew_formula || true)"
    if [[ -z "$formula" ]]; then
      echo "No native PostgreSQL server was found. Install one with: brew install postgresql@17" >&2
      exit 1
    fi
    echo "Starting the Homebrew ${formula} service..."
    brew services start "$formula"
  fi

  wait_until_ready
}

stop_postgres() {
  local formula
  if ! is_ready; then
    echo "PostgreSQL is already stopped on ${postgres_host}:${postgres_port}."
    return 0
  fi

  if uses_postgres_app; then
    echo "Stopping Postgres.app..."
    osascript -e 'quit app "Postgres"'
  else
    formula="$(installed_brew_formula || true)"
    if [[ -z "$formula" ]]; then
      echo "PostgreSQL is running, but its native service manager could not be identified." >&2
      echo "Stop it with the same tool that originally started it; no data should be deleted." >&2
      exit 1
    fi
    echo "Stopping the Homebrew ${formula} service..."
    brew services stop "$formula"
  fi

  wait_until_stopped
}

status_postgres() {
  if is_ready; then
    echo "PostgreSQL is accepting connections on ${postgres_host}:${postgres_port}."
    return 0
  fi

  echo "PostgreSQL is not accepting connections on ${postgres_host}:${postgres_port}." >&2
  return 1
}

case "${1:-status}" in
  start) start_postgres ;;
  stop) stop_postgres ;;
  status) status_postgres ;;
  *)
    echo "Usage: $0 {start|stop|status}" >&2
    exit 2
    ;;
esac
