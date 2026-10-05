"""Verify and atomically activate a static website release without restarting Caddy."""

import argparse
import fcntl
import hashlib
import json
import os
import re
import shutil
import tarfile
import tempfile
from pathlib import Path


def install(archive: Path, revision: str, checksum: str, root: Path) -> None:
    if not re.fullmatch(r"[0-9a-f]{40}", revision):
        raise ValueError("Expected a Git commit SHA")
    if not re.fullmatch(r"[0-9a-f]{64}", checksum):
        raise ValueError("Expected a SHA-256 checksum")
    if hashlib.sha256(archive.read_bytes()).hexdigest() != checksum:
        raise ValueError("Website archive checksum mismatch")
    releases = root / "releases"
    releases.mkdir(parents=True, exist_ok=True)
    with (root / ".deployment.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        staging = Path(tempfile.mkdtemp(prefix=".staging-", dir=releases))
        try:
            with tarfile.open(archive, "r:gz") as source:
                for member in source.getmembers():
                    path = Path(member.name)
                    if path.is_absolute() or ".." in path.parts or not (member.isfile() or member.isdir()):
                        raise ValueError("Website archive contains an unsafe entry")
                source.extractall(staging, filter="data")
            metadata = json.loads((staging / "version.json").read_text())
            if metadata["revision"] != revision:
                raise ValueError("Website artifact revision does not match the build")
            for required in ("index.html", "css/style.css", "js/main.js"):
                if not (staging / required).is_file():
                    raise ValueError(f"Website artifact is missing {required}")
            (staging / ".artifact-sha256").write_text(checksum + "\n")
            for path in [staging, *staging.rglob("*")]:
                path.chmod(0o755 if path.is_dir() else 0o644)
            release = releases / revision
            if release.exists():
                if (release / ".artifact-sha256").read_text().strip() != checksum:
                    raise ValueError("An existing release has different contents")
            else:
                staging.rename(release)
            link = root / ".current-next"
            link.unlink(missing_ok=True)
            link.symlink_to(f"releases/{revision}")
            os.replace(link, root / "current")
            print(f"Activated website commit {revision}")
        finally:
            if staging.exists():
                shutil.rmtree(staging)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("archive", type=Path)
    parser.add_argument("revision")
    parser.add_argument("checksum")
    parser.add_argument("--root", type=Path, default=Path("/srv/apps/papyrus/deploy/website"))
    args = parser.parse_args()
    install(args.archive, args.revision, args.checksum, args.root)


if __name__ == "__main__":
    main()
