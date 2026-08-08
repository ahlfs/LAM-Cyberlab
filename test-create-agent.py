import sys
sys.path.append("/home/ahlfs/.hermes/hermes-agent")
from gateway.platforms.api_server import APIServerAdapter
from gateway.run import GatewayRunner

GatewayRunner._load_gateway_config = lambda: {}
GatewayRunner._session_model_overrides = {}

server = APIServerAdapter()
server._last_resolved_model = {}

agent = server._create_agent(
    session_id="test1",
    requested_model="cx/gpt-5.5",
    session_model="cx/gpt-5.5"
)
print("Agent model:", getattr(agent, "model", None))
print("Agent provider:", getattr(agent, "provider", None))
print("Runtime dict:", getattr(agent, "_hermes_api_runtime", None))
print("LiteLLM base_url:", getattr(agent, "base_url", None))
