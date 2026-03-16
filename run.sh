#!/usr/bin/env bash
# Run project with Bun using full path (use if bun is not on your PATH)
BUN="$HOME/.bun/bin/bun"
if [[ ! -x "$BUN" ]]; then
  echo "Bun not found at $BUN. Install Node.js from https://nodejs.org and run: npm install && npm run dev"
  exit 1
fi
if [[ ! -d node_modules ]]; then
  echo "Installing dependencies..."
  "$BUN" install || exit 1
fi
case "${1:-dev}" in
  install) "$BUN" install ;;
  dev)     "$BUN" run dev ;;
  build)   "$BUN" run build ;;
  start)   "$BUN" run start ;;
  *)       "$BUN" "$@" ;;
esac
