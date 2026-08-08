import sys
sys.path.append("/home/ahlfs/.hermes/hermes-agent")
from gateway.platforms.api_server import APIServerAdapter
from gateway.run import GatewayRunner

GatewayRunner._load_gateway_config = lambda: {}
GatewayRunner._session_model_overrides = {}

try:
    server = APIServerAdapter(config={})
    server._last_resolved_model = {}

    agent = server._create_agent(
        session_id="test1",
        requested_model="cx/gpt-5.4-mini",
        session_model="cx/gpt-5.4-mini",
        provider="custom:ai.sicloud.biz.id"
    )
    print("Agent model:", getattr(agent, "model", None))
    print("Agent provider:", getattr(agent, "provider", None))
    print("Agent base_url:", getattr(agent, "base_url", None))
except Exception as e:
    print(f"Error: {e}")
