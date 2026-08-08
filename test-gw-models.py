import requests
res = requests.get("http://127.0.0.1:8642/v1/models", headers={"Authorization": "Bearer 86d68a01f0db38e3e2f323ee7faf15775c727e798cf516aee93627c68d1a7560"})
models = res.json().get("data", [])
for m in models:
    if "tamandata" in m["id"]:
        print(m)
