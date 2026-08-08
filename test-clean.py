import sys
sys.path.append("/home/ahlfs/.hermes/hermes-agent")
from gateway.platforms.api_server import APIServerAdapter
class MockAdapter(APIServerAdapter):
    def __init__(self):
        pass
a = MockAdapter()
print(a._clean_runtime_id("custom:ai.sicloud.biz.id", max_len=80))
