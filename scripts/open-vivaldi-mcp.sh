#!/usr/bin/env bash
# Opens Vivaldi with remote debugging for Playwright MCP (main profile).
# Using 'open' so macOS launches Vivaldi as the proper app (fixes FIDO/Bluetooth warnings).

USER_DATA_DIR="${HOME}/Library/Application Support/Vivaldi"
open -a "Vivaldi" --args --remote-debugging-port=9222 --user-data-dir="$USER_DATA_DIR"
