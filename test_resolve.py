import sys
import json
sys.path.append("/home/ahlfs/.hermes/hermes-agent")
from hermes_cli.runtime_provider import resolve_runtime_provider
try:
    print("antigravity ->", resolve_runtime_provider(requested="antigravity"))
except Exception as e:
    print("antigravity ERROR:", e)

try:
    print("custom:antigravity ->", resolve_runtime_provider(requested="custom:antigravity"))
except Exception as e:
    print("custom:antigravity ERROR:", e)
