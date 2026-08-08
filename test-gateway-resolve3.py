import sys
sys.path.append("/home/ahlfs/.hermes/hermes-agent")
from gateway.platforms.api_server import _resolve_request_runtime_agent_kwargs

try:
    res = _resolve_request_runtime_agent_kwargs("custom:ai.sicloud.biz.id", target_model="cx/gpt-5.4-mini")
    print("RES:", res)
except Exception as e:
    print(f"Error: {e}")
