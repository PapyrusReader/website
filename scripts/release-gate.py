"""Decide whether a website version should be built and deployed."""

import argparse
import json
import os
import re
import subprocess
from pathlib import Path


def version_parts(value: str) -> tuple[int, ...]:
    if not re.fullmatch(r"(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)", value):
        raise ValueError("Website version must be MAJOR.MINOR.PATCH")
    return tuple(map(int, value.split(".")))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base")
    parser.add_argument("--manual", action="store_true")
    args = parser.parse_args()
    version = json.loads(Path("package.json").read_text())["version"]
    current = version_parts(version)
    release = args.manual
    if not args.manual:
        if not args.base or not re.fullmatch(r"[0-9a-f]{40}", args.base):
            raise ValueError("A push requires its previous commit SHA")
        if args.base == "0" * 40:
            release = True
        else:
            previous = json.loads(subprocess.check_output(
                ["git", "show", f"{args.base}:package.json"], text=True
            ))["version"]
            old = version_parts(previous)
            if current < old:
                raise ValueError("Website version cannot decrease")
            release = current > old
    tag = f"v{version}"
    existing = subprocess.run(
        ["git", "rev-parse", "--verify", f"refs/tags/{tag}^{{commit}}"],
        capture_output=True, text=True,
    )
    if release and existing.returncode == 0:
        head = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
        if existing.stdout.strip() != head:
            raise ValueError("This website version belongs to another commit; bump the version")
    output = f"version={version}\ntag={tag}\nrelease={str(release).lower()}\n"
    if os.environ.get("GITHUB_OUTPUT"):
        with Path(os.environ["GITHUB_OUTPUT"]).open("a") as target:
            target.write(output)
    print(output, end="")


if __name__ == "__main__":
    main()
