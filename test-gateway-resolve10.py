import sys
sys.path.append("/home/ahlfs/.hermes/hermes-agent")
from gateway.platforms.api_server import APIServerAdapter, _apply_runtime_agent_overrides
from gateway.run import GatewayRunner
from types import SimpleNamespace
from run_agent import AIAgent

orig_resolve_runtime_agent_kwargs = None

def mock_init_agent(self, **kwargs):
    print("INIT_AGENT CALLED WITH:")
    for k, v in kwargs.items():
        if k in ('api_key', 'base_url', 'provider', 'model'):
            print(f"  {k}: {v}")
    raise RuntimeError("STOP")

import agent.agent_init
agent.agent_init.init_agent = mock_init_agent

import gateway.run
orig_resolve_runtime = gateway.run._resolve_runtime_agent_kwargs
def mock_resolve_runtime(*args, **kwargs):
    res = orig_resolve_runtime(*args, **kwargs)
    return res
gateway.run._resolve_runtime_agent_kwargs = mock_resolve_runtime

GatewayRunner._load_gateway_config = lambda: {}
GatewayRunner._session_model_overrides = {}

try:
    server = APIServerAdapter(config=SimpleNamespace(extra={}))
    server._last_resolved_model = {}

    agent_inst = server._create_agent(
        session_id="test1",
        requested_model="cx/gpt-5.4-mini",
        session_model="cx/gpt-5.4-mini",
        requested_provider="custom:ai.sicloud.biz.id",
        confirmed_runtime_lock=True # <---- THE FIX
    )
except Exception as e:
    print(f"Error: {e}")
