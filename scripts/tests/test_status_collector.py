"""Status checks are scheduled independently of visitor requests."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("status_collector", Path(__file__).parents[2] / "deploy/collect-status.py")
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)


class Response:
    status = 200

    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    def read(self, limit):
        return json.dumps(self.payload).encode()


class StatusCollectorTest(unittest.TestCase):
    def test_health_payloads_and_connection_failures(self):
        self.assertEqual(collector.check_service("api", lambda *a, **k: Response({"status": "healthy"})), "operational")
        self.assertEqual(collector.check_service("sync", lambda *a, **k: Response({"ready": True, "started": True})), "operational")
        self.assertEqual(collector.check_service("sync", lambda *a, **k: Response({"ready": False, "started": True})), "disrupted")
        self.assertEqual(collector.check_service("api", lambda *a, **k: Response({})), "disrupted")
        with patch.object(collector, "urlopen", side_effect=TimeoutError):
            self.assertEqual(collector.check_service("api", collector.urlopen), "disrupted")

    def test_atomic_snapshot_contains_only_public_state(self):
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / "status.json"
            destination.write_text('old snapshot')
            with patch.object(collector, "check_service", side_effect=lambda service: "operational") as check:
                collector.collect(destination)
            self.assertEqual(check.call_count, 2)
            snapshot = json.loads(destination.read_text())
            self.assertEqual(set(snapshot), {"checked_at", "services"})
            self.assertEqual(snapshot["services"], {"api": "operational", "sync": "operational"})
            self.assertFalse(destination.with_suffix('.tmp').exists())


if __name__ == "__main__":
    unittest.main()
