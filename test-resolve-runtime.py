import sys
sys.path.append("/home/ahlfs/.hermes/hermes-agent")
from hermes_cli.runtime_provider import resolve_runtime_provider
try:
    print(resolve_runtime_provider(requested="", target_model="kr/minimax-m2.5"))
except Exception as e:
    print(f"Error: {e}")
