import re

with open('/home/ahlfs/.hermes/hermes-agent/gateway/platforms/api_server.py', 'r') as f:
    content = f.read()

# Inside _create_agent
# find: current_provider = _clean_request_string(runtime_kwargs.get("provider"))
# replace with: 
# current_provider = _clean_request_string(runtime_kwargs.get("provider"))
# print(f"DEBUG: current_provider={current_provider}, session_row_model={session_row_model}, requested_provider={requested_provider}")

content = content.replace(
    'current_provider = _clean_request_string(runtime_kwargs.get("provider"))',
    'current_provider = _clean_request_string(runtime_kwargs.get("provider"))\n            print(f"DEBUG current_provider={current_provider}, requested_provider={requested_provider}, session_row_model={session_row_model}")'
)

# find: _apply_runtime_agent_overrides(runtime_kwargs, provider_runtime)
# replace with: 
# print(f"DEBUG provider_runtime={provider_runtime}")
# _apply_runtime_agent_overrides(runtime_kwargs, provider_runtime)

content = content.replace(
    '_apply_runtime_agent_overrides(runtime_kwargs, provider_runtime)',
    'print(f"DEBUG provider_runtime={provider_runtime}")\n                _apply_runtime_agent_overrides(runtime_kwargs, provider_runtime)'
)

with open('/home/ahlfs/.hermes/hermes-agent/gateway/platforms/api_server_patched.py', 'w') as f:
    f.write(content)
