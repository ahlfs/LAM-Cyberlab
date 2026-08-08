import sys
sys.path.append("/home/ahlfs/.hermes/hermes-agent")
from agent.credential_pool import CredentialPool

pool = CredentialPool()
print("Custom models:")
for provider in pool.custom_providers:
    print(provider.name, provider.models)

