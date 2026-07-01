#!/usr/bin/env bash
set -euo pipefail

input=$(cat)
command=$(echo "$input" | jq -r '.command // empty')

deny() {
  local reason="$1"
  jq -n \
    --arg reason "$reason" \
    --arg cmd "$command" \
    '{
      "permission": "deny",
      "user_message": ("Comando bloqueado por política del proyecto: " + $reason),
      "agent_message": ("El hook beforeShellExecution bloqueó: " + $cmd + ". " + $reason)
    }'
  exit 0
}

is_dev_database_url() {
  local url="$1"
  [[ "$url" == "file:./local.db" ]] && return 0
  [[ "$url" == *"packages/db/local.db"* ]] && return 0
  [[ "$url" == *":memory:"* ]] && return 0
  [[ "$url" == "file::memory:"* ]] && return 0
  return 1
}

extract_database_url() {
  local raw=""
  if [[ "$command" =~ DATABASE_URL=([^[:space:];|&]+) ]]; then
    raw="${BASH_REMATCH[1]}"
    raw="${raw//\'/}"
    raw="${raw//\"/}"
    printf '%s' "$raw"
  fi
}

# rm -rf / rm -fr — bloquear cualquier variante, sin excepciones
if echo "$command" | grep -qE '\brm\s+(-[^\s]*r[^\s]*\s+-[^\s]*f|-[^\s]*rf\b|-[^\s]*fr\b|--recursive\s+--force)'; then
  deny "no se permite rm -rf/--recursive --force."
fi

# Borrar o truncar archivos .db
if echo "$command" | grep -qE '\b(rm|unlink)\s+[^\n;|&]*\.db\b'; then
  deny "no se permite borrar archivos .db."
fi
if echo "$command" | grep -qE '>\s*[^\s;|&]*\.db\b'; then
  deny "no se permite truncar archivos .db."
fi
if echo "$command" | grep -qE '\btruncate\s+[^\n;|&]*\.db\b'; then
  deny "no se permite truncar archivos .db."
fi

# Migraciones / drizzle-kit push solo contra base de desarrollo
if echo "$command" | grep -qE '(drizzle-kit\s+(migrate|push)|db:(migrate|push))'; then
  db_url="$(extract_database_url)"
  if [[ -n "$db_url" ]] && ! is_dev_database_url "$db_url"; then
    deny "migraciones/push solo permitidas contra la base de desarrollo (packages/db/local.db o :memory:)."
  fi
fi

echo '{"permission":"allow"}'
exit 0
