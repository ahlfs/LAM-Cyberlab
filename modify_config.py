import sys
from pathlib import Path
from ruamel.yaml import YAML

config_path = Path.home() / ".hermes/config.yaml"
yaml = YAML()
yaml.preserve_quotes = True

with open(config_path, "r") as f:
    config = yaml.load(f)

if "custom_providers" in config:
    providers = config["custom_providers"]
    # Filter out the unwanted providers
    new_providers = []
    for p in providers:
        name = p.get("name", "").lower()
        if "v1.iyhapi.app" in name or "9router.rkhyg" in name:
            print(f"Removing provider: {p.get('name')}")
            continue
        new_providers.append(p)
    config["custom_providers"] = new_providers

    with open(config_path, "w") as f:
        yaml.dump(config, f)
    print("Updated config.yaml successfully.")
else:
    print("No custom_providers found.")

