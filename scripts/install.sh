#!/usr/bin/env sh
# Usage: curl -fsSL https://raw.githubusercontent.com/spenserhale/ynab-toolkit/main/scripts/install.sh | sh
set -eu
REPO="spenserhale/ynab-toolkit"
VERSION="${YNAB_TOOLKIT_VERSION:-latest}"
INSTALL_DIR="${YNAB_TOOLKIT_INSTALL:-$HOME/.local/bin}"
os=$(uname -s | tr '[:upper:]' '[:lower:]'); arch=$(uname -m)
case "$os" in darwin|linux) ;; *) echo "Unsupported OS: $os"; exit 1 ;; esac
case "$arch" in x86_64|amd64) arch=x64 ;; arm64|aarch64) arch=arm64 ;; *) echo "Unsupported arch: $arch"; exit 1 ;; esac
asset="ynab-${os}-${arch}"
if [ "$VERSION" = latest ]; then base="https://github.com/${REPO}/releases/latest/download"; else base="https://github.com/${REPO}/releases/download/${VERSION}"; fi
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
curl -fsSL -o "$tmp/$asset" "$base/$asset"; curl -fsSL -o "$tmp/$asset.sha256" "$base/$asset.sha256"
(cd "$tmp" && shasum -a 256 -c "$asset.sha256")
mkdir -p "$INSTALL_DIR"; mv "$tmp/$asset" "$INSTALL_DIR/ynab"; chmod +x "$INSTALL_DIR/ynab"
echo "Installed ynab to $INSTALL_DIR/ynab"
case ":$PATH:" in *":$INSTALL_DIR:"*) ;; *) echo "Add to PATH: export PATH=\"$INSTALL_DIR:\$PATH\"" ;; esac
