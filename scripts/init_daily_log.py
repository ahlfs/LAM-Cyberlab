#!/usr/bin/env python3
"""AI Second Brain — Init Daily Log (Agent-OS pattern)

Creates a new daily log file in 07-Daily/ for operational tracking.
If the file already exists, does nothing.
Intended to be run by cron or ops-watch agent every morning.

Env vars:
    SECOND_BRAIN_VAULT     vault path (default: ~/obsidian/memo)
"""
import datetime
import os
import sys
from pathlib import Path

VAULT_ROOT = Path(
    os.environ.get("SECOND_BRAIN_VAULT", "~/obsidian/memo")
).expanduser().resolve()
DAILY_DIR = VAULT_ROOT / "07-Daily"

TEMPLATE = """---
date: {date}
status: active
---

# Daily Log: {date}

## 🎯 Goals for Today
- [ ] 

## 📝 Activity Log
- (agents will append their work here)

## 🐛 Problems & Fixes
- 
"""

def main():
    if not DAILY_DIR.exists():
        DAILY_DIR.mkdir(parents=True, exist_ok=True)
        
    today = datetime.date.today().isoformat()
    log_file = DAILY_DIR / f"{today}.md"
    
    if log_file.exists():
        print(f"Daily log already exists: {log_file}", file=sys.stderr)
        return 0
        
    log_file.write_text(TEMPLATE.format(date=today), encoding="utf-8")
    print(f"Created daily log: {log_file}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
