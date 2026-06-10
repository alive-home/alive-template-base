#!/usr/bin/env bash
# Local dev stack without Docker: api (bun --hot, :3001) + web (vite, :3000).
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$root"

command -v bun >/dev/null || { echo "bun is required → https://bun.sh" >&2; exit 1; }

if [[ ! -f .env ]]; then
	sed "s|^AUTH_SECRET=.*|AUTH_SECRET=$(openssl rand -base64 32)|" .env.example >.env
	echo "created .env from .env.example (AUTH_SECRET generated)"
fi

# Export root .env to both apps. PORT stays unset on purpose: the api
# defaults it to 3001 and vite would otherwise bind the web app to it too.
set -a
# shellcheck source=/dev/null
source .env
set +a
unset PORT

for port in 3000 3001; do
	if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
		echo "port $port is already in use" >&2
		exit 1
	fi
done

bun install

# turbo runs both persistent dev tasks (api + web) in parallel with
# prefixed output; ctrl-C tears both down.
exec bun run dev
