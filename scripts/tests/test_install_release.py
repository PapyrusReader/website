"""Check release activation and rejection without touching a live website."""

import hashlib
import importlib.util
import io
import json
import tarfile
import tempfile
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("installer", Path(__file__).parents[1] / "install-release.py")
installer = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(installer)


class InstallReleaseTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.base = Path(self.directory.name)
        self.root = self.base / "website"
        self.revision = "a" * 40

    def archive(self, revision=None, extra=None):
        path = self.base / "website.tar.gz"
        files = {
            "index.html": "<html>Website</html>",
            "css/style.css": "body {}",
            "js/main.js": "console.log('website')",
            "version.json": json.dumps({"version": "1.0.0", "revision": revision or self.revision}),
        }
        with tarfile.open(path, "w:gz") as target:
            for name, value in files.items():
                entry = tarfile.TarInfo(name)
                payload = value.encode()
                entry.size = len(payload)
                target.addfile(entry, io.BytesIO(payload))
            if extra:
                target.addfile(extra)
        return path, hashlib.sha256(path.read_bytes()).hexdigest()

    def test_activation_retains_previous_release_and_supports_retry(self):
        archive, checksum = self.archive()
        installer.install(archive, self.revision, checksum, self.root)
        installer.install(archive, self.revision, checksum, self.root)
        previous = (self.root / "current").resolve()
        revision = "b" * 40
        archive, checksum = self.archive(revision)
        installer.install(archive, revision, checksum, self.root)
        self.assertEqual((self.root / "current").readlink(), Path("releases") / revision)
        self.assertTrue((previous / "index.html").exists())
        self.assertEqual((self.root / "current/index.html").stat().st_mode & 0o777, 0o644)

    def test_bad_checksum_does_not_replace_current_site(self):
        archive, checksum = self.archive()
        installer.install(archive, self.revision, checksum, self.root)
        previous = (self.root / "current").readlink()
        with self.assertRaisesRegex(ValueError, "checksum"):
            installer.install(archive, "b" * 40, "0" * 64, self.root)
        self.assertEqual((self.root / "current").readlink(), previous)

    def test_wrong_revision_is_not_activated(self):
        archive, checksum = self.archive()
        with self.assertRaisesRegex(ValueError, "revision"):
            installer.install(archive, "b" * 40, checksum, self.root)
        self.assertFalse((self.root / "current").exists())

    def test_traversal_and_symlinks_are_rejected(self):
        traversal = tarfile.TarInfo("../outside")
        symlink = tarfile.TarInfo("link")
        symlink.type = tarfile.SYMTYPE
        symlink.linkname = "/etc/passwd"
        for entry in (traversal, symlink):
            with self.subTest(entry=entry.name):
                archive, checksum = self.archive(extra=entry)
                with self.assertRaisesRegex(ValueError, "unsafe"):
                    installer.install(archive, self.revision, checksum, self.root)
        self.assertFalse((self.base / "outside").exists())
        self.assertFalse((self.root / "current").exists())


if __name__ == "__main__":
    unittest.main()
