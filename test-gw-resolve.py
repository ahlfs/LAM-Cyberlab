import asyncio
from hermes_cli.config import load_config
from hermes_cli.agent.capabilities import resolve_runtime_provider

async def run():
    cfg = load_config()
    print("with provider: Local (localhost:20128)")
    print(await resolve_runtime_provider("tamandata/cx/gpt-5.4-mini", "Local (localhost:20128)", cfg))
    print("without provider:")
    print(await resolve_runtime_provider("tamandata/cx/gpt-5.4-mini", None, cfg))

asyncio.run(run())
