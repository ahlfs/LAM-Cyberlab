import yaml
from hermes_cli.runtime_provider import resolve_runtime_provider
try:
    res = resolve_runtime_provider(requested="Local (localhost:20128)", target_model="tamandata/cx/gpt-5.4")
    print(res)
except Exception as e:
    print("Error:", e)
