#!/usr/bin/env bash
set -euo pipefail

OUTPUT=""
FAILED=0

run_check() {
  local label="$1"
  shift
  local out=""
  if ! out="$("$@" 2>&1)"; then
    OUTPUT+="=== ${label} FAILED ==="$'\n'"${out}"$'\n'$'\n'
    FAILED=1
  fi
}

run_check "typecheck (monorepo)" pnpm -r exec tsc -p tsconfig.json --noEmit
run_check "evaluator tests (@ff/domain)" \
  pnpm --filter @ff/domain exec vitest run --passWithNoTests 'src/**/*evaluate*.test.ts'

if [[ "$FAILED" -eq 1 ]]; then
  msg="Los checks fallaron. Corrige los errores y vuelve a verificar:"$'\n\n'"${OUTPUT}"
  jq -n --arg msg "$msg" '{ "followup_message": $msg }'
  exit 0
fi

echo '{}'
exit 0
