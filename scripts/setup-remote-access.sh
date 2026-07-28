#!/usr/bin/env bash
set -euo pipefail

# Configure Caddy as a reverse proxy in front of LAM Cyberlab, giving it a
# custom domain with automatic HTTPS (Let's Encrypt via Caddy's built-in
# ACME client — no manual certificate handling).
#
# Run this yourself in a terminal (it needs root to install packages and
# write /etc/caddy/Caddyfile) — same pattern as install-dashboard-service.sh.
# The workspace itself never triggers this from the web UI: an authenticated
# workspace session already has full terminal access, so a scoped setup
# script you run explicitly isn't a bigger attack surface than what already
# exists, but auto-running root-level provisioning from a web button would
# needlessly widen it.
#
# Usage:
#   sudo ./scripts/setup-remote-access.sh --domain example.com [--port 3000]
#   sudo ./scripts/setup-remote-access.sh --remove --domain example.com
#
# Architecture: Caddy binds 0.0.0.0:443 and reverse-proxies to
# 127.0.0.1:$PORT. The workspace itself can — and should — stay on
# HOST=127.0.0.1; Caddy is the only thing exposed directly to the internet.
# This is a separate, complementary path to Settings → Remote Access →
# "Expose to internet" (which binds the workspace itself to 0.0.0.0 for
# direct IP access, no domain/TLS). Use one or the other, not both.

DOMAIN=""
PORT="${PORT:-3000}"
REMOVE=0
MARKER_START="# >>> lam-cyberlab remote-access managed block (auto-generated, do not edit) >>>"
MARKER_END="# <<< lam-cyberlab remote-access managed block <<<"
CADDYFILE="/etc/caddy/Caddyfile"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)
      DOMAIN="$2"
      shift 2
      ;;
    --port)
      PORT="$2"
      shift 2
      ;;
    --remove)
      REMOVE=1
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$DOMAIN" ]]; then
  echo "Usage: sudo $0 --domain <domain> [--port 3000] [--remove]" >&2
  exit 1
fi

if [[ "$EUID" -ne 0 ]]; then
  echo "This script needs root (it installs packages and writes $CADDYFILE)." >&2
  echo "Re-run with: sudo $0 --domain $DOMAIN --port $PORT" >&2
  exit 1
fi

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "This script targets Linux VPS deployments only (the primary use case for" >&2
  echo "custom-domain remote access). For other platforms, install Caddy manually:" >&2
  echo "  https://caddyserver.com/docs/install" >&2
  exit 1
fi

install_caddy_if_missing() {
  if command -v caddy >/dev/null 2>&1; then
    echo "Caddy already installed ($(caddy version))."
    return
  fi

  if ! command -v apt-get >/dev/null 2>&1; then
    echo "Caddy isn't installed and this script only automates apt-based installs" >&2
    echo "(Debian/Ubuntu). Install it manually, then re-run this script:" >&2
    echo "  https://caddyserver.com/docs/install" >&2
    exit 1
  fi

  echo "→ Installing Caddy (official apt repo)…"
  apt-get update -y -qq
  apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https curl gnupg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --yes --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y -qq
  apt-get install -y -qq caddy
  echo "  Caddy installed ($(caddy version)) ✓"
}

write_managed_block() {
  mkdir -p "$(dirname "$CADDYFILE")"
  touch "$CADDYFILE"

  local tmp
  tmp="$(mktemp)"
  awk -v start="$MARKER_START" -v end="$MARKER_END" '
    $0 == start { skipping = 1; next }
    $0 == end { skipping = 0; next }
    !skipping { print }
  ' "$CADDYFILE" > "$tmp"

  if [[ "$REMOVE" -eq 1 ]]; then
    mv "$tmp" "$CADDYFILE"
    echo "Removed the managed block for $DOMAIN from $CADDYFILE."
    return
  fi

  {
    cat "$tmp"
    echo ""
    echo "$MARKER_START"
    echo "$DOMAIN {"
    echo "	reverse_proxy 127.0.0.1:$PORT"
    echo "}"
    echo "$MARKER_END"
  } > "$CADDYFILE.new"
  mv "$CADDYFILE.new" "$CADDYFILE"
  rm -f "$tmp"
  echo "Wrote reverse proxy block for $DOMAIN → 127.0.0.1:$PORT to $CADDYFILE"
}

reload_caddy() {
  if ! caddy validate --config "$CADDYFILE" --adapter caddyfile; then
    echo "Caddyfile failed validation — not reloading. Check $CADDYFILE." >&2
    exit 1
  fi

  systemctl enable caddy >/dev/null 2>&1 || true
  if systemctl is-active --quiet caddy; then
    systemctl reload caddy
  else
    systemctl restart caddy
  fi
  echo "Caddy reloaded ✓"
}

install_caddy_if_missing
write_managed_block
reload_caddy

if [[ "$REMOVE" -eq 1 ]]; then
  echo "Done. $DOMAIN is no longer proxied."
else
  echo ""
  echo "Done. Once DNS for $DOMAIN points at this server's public IP,"
  echo "it will be reachable at:"
  echo ""
  echo "  https://$DOMAIN"
  echo ""
  echo "Caddy requests and renews the TLS certificate automatically on first request."
fi
