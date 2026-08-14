#!/usr/bin/env python3
"""Cliente para a API do agente no PC do Thiago (via túnel).
Uso: python3 scripts/remote.py <action> '<json de args>' [--shot /tmp/x.png]"""
import json, sys, base64, urllib.request

BASE = "https://stale-ends-punch.loca.lt"
TID = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('-') else None

def execute(action: str, args: dict, shot_path: str | None = None):
    payload = {"task_id": TID, "action": action, **args}
    req = urllib.request.Request(
        f"{BASE}/execute",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.loads(r.read().decode())
    shot = data.pop("screenshot_base64", None)
    if shot and shot_path:
        with open(shot_path, "wb") as f:
            f.write(base64.b64decode(shot))
    print(json.dumps(data, ensure_ascii=False, indent=2)[:6000])
    return data

if __name__ == "__main__":
    action = sys.argv[2]
    args = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
    shot = None
    if "--shot" in sys.argv:
        shot = sys.argv[sys.argv.index("--shot") + 1]
    execute(action, args, shot)
