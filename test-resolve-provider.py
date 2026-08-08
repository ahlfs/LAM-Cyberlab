from hermes_cli.runtime_provider import resolve_runtime_provider
try:
    print(resolve_runtime_provider(requested="Local (localhost:20128)", target_model="tamandata/cx/gpt-5.4"))
except Exception as e:
    print("Error:", e)
