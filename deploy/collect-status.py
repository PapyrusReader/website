#!/usr/bin/env python3
"""Publish one shared status snapshot for the public website."""
import json
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

ENDPOINTS = {
    "api": "https://api.papyrus-reader.com/health",
    "sync": "https://sync.papyrus-reader.com/probes/readiness",
}


def check_service(service, opener=urlopen):
    try:
        request = Request(ENDPOINTS[service], headers={"User-Agent": "PapyrusStatus/1.0", "Cache-Control": "no-cache"})
        with opener(request, timeout=8) as response:
            data = json.loads(response.read(65536))
            healthy = data.get("status") == "healthy" if service == "api" else data.get("ready") is True and data.get("started") is True
            return "operational" if response.status == 200 and healthy else "disrupted"
    except Exception:
        return "disrupted"


def collect(destination):
    with ThreadPoolExecutor(max_workers=2) as pool:
        states = dict(zip(ENDPOINTS, pool.map(check_service, ENDPOINTS)))
    snapshot = {"checked_at": datetime.now(timezone.utc).isoformat(), "services": states}
    destination = Path(destination)
    temporary = destination.with_suffix(".tmp")
    temporary.write_text(json.dumps(snapshot) + "\n")
    temporary.chmod(0o644)
    os.replace(temporary, destination)


if __name__ == "__main__":
    collect("/var/lib/papyrus-status/status.json")
