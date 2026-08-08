import sys
sys.path.append("/home/ahlfs/.hermes/hermes-agent")
from gateway.platforms.api_server import APIServerAdapter
from gateway.run import GatewayRunner
from types import SimpleNamespace
from run_agent import AIAgent

orig_resolve = None
def mock_resolve(provider, target_model, required):
    global orig_resolve
    print(f"CALLING _resolve_provider_runtime WITH provider={provider}, target_model={target_model}")
    res = orig_resolve(provider, target_model=target_model, required=required)
    print(f"RESOLVE RETURNED: {res}")
    return res

class TestAdapter(APIServerAdapter):
    def _create_agent(self, *args, **kwargs):
        # We need to inject mock inside the method scope because it defines _resolve_provider_runtime locally.
        # But wait, we can't easily patch local functions...
        pass

# Let's just modify the source file temporarily to print
