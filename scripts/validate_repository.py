#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re
import subprocess
import sys


REPO_ROOT = Path(__file__).resolve().parents[1]
REQUIRED_PATHS = (
    "README.md",
    "AGENTS.md",
    ".gitignore",
    ".github/CODEOWNERS",
    ".github/pull_request_template.md",
    ".github/workflows/validate.yaml",
    "docs/security-and-data-boundaries.md",
)
FORBIDDEN_PATH_PARTS = {
    ".next",
    "node_modules",
    "coverage",
    "dist",
    "out",
    "tmp",
}
FORBIDDEN_FILE_PATTERNS = (
    re.compile(r"(^|/)\.env($|\.)"),
    re.compile(r"\.(?:key|pem|p12|pfx)$", re.IGNORECASE),
    re.compile(r"\.tsbuildinfo$"),
)
FORBIDDEN_CONTENT_PATTERNS = (
    ("operator-local Unix path", re.compile(r"/home/[^/\s]+/projects/")),
    ("operator-local Windows path", re.compile(r"[A-Za-z]:\\\\Users\\\\")),
    ("private key material", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("unresolved placeholder", re.compile(r"\bCHECK:")),
)
CONTENT_SCAN_EXCLUSIONS = {"scripts/validate_repository.py"}


def tracked_paths() -> list[str]:
    result = subprocess.run(
        ["git", "ls-files"],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return [line for line in result.stdout.splitlines() if line]


def main() -> int:
    errors: list[str] = []

    for rel_path in REQUIRED_PATHS:
        if not (REPO_ROOT / rel_path).is_file():
            errors.append(f"missing required file: {rel_path}")

    for rel_path in tracked_paths():
        path_parts = set(Path(rel_path).parts)
        forbidden_parts = sorted(path_parts & FORBIDDEN_PATH_PARTS)
        if forbidden_parts:
            errors.append(
                f"disposable path is tracked: {rel_path} "
                f"({', '.join(forbidden_parts)})"
            )
        if any(pattern.search(rel_path) for pattern in FORBIDDEN_FILE_PATTERNS):
            errors.append(f"secret or disposable file is tracked: {rel_path}")

        if rel_path in CONTENT_SCAN_EXCLUSIONS:
            continue
        path = REPO_ROOT / rel_path
        try:
            content = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for label, pattern in FORBIDDEN_CONTENT_PATTERNS:
            if pattern.search(content):
                errors.append(f"{rel_path}: contains {label}")

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    print(
        "repository valid: "
        f"required_files={len(REQUIRED_PATHS)} "
        f"tracked_files={len(tracked_paths())}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
