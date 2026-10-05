"""Exercise version-triggered releases against a disposable Git repository."""

import json
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).parents[1] / "release-gate.py"


class ReleaseGateTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.repo = Path(self.directory.name)
        self.git("init", "--quiet")
        self.git("config", "user.name", "Test")
        self.git("config", "user.email", "test@example.com")
        self.git("config", "commit.gpgsign", "false")
        self.commit("1.0.0")
        self.base = self.git("rev-parse", "HEAD").strip()

    def git(self, *args):
        return subprocess.check_output(["git", *args], cwd=self.repo, text=True)

    def commit(self, version):
        (self.repo / "package.json").write_text(json.dumps({"version": version}))
        self.git("add", "package.json")
        self.git("commit", "--quiet", "--allow-empty", "-m", "Update website")

    def gate(self, *args):
        return subprocess.run(["python3", str(SCRIPT), *args], cwd=self.repo, capture_output=True, text=True)

    def test_unchanged_version_skips_and_increase_releases(self):
        self.commit("1.0.0")
        result = self.gate("--base", self.base)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("release=false", result.stdout)
        self.commit("1.0.1")
        result = self.gate("--base", self.base)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("release=true", result.stdout)
        self.assertIn("tag=v1.0.1", result.stdout)

    def test_manual_retry_accepts_its_tag_but_rejects_reusing_another_commit(self):
        self.git("tag", "v1.0.0")
        result = self.gate("--manual")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.commit("1.0.0")
        result = self.gate("--manual")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("another commit", result.stderr)

    def test_decreasing_or_invalid_version_is_rejected(self):
        for version in ("0.9.0", "01.0.0", "1.0.0-beta"):
            with self.subTest(version=version):
                self.commit(version)
                result = self.gate("--base", self.base)
                self.assertNotEqual(result.returncode, 0)


if __name__ == "__main__":
    unittest.main()
