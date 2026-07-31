#!/usr/bin/env python3
from __future__ import annotations

import json
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
    "docs/product/README.md",
    "docs/product/source-structure-discipline.md",
    "docs/graduation/README.md",
    "docs/graduation/approved-design-baseline.yaml",
    "docs/graduation/source-manifest.json",
    "package.json",
    "package-lock.json",
    "src/app/page.tsx",
    "scripts/guards/run-guards.mjs",
    "tests/system-simulation/governance-console-foundation.test.mjs",
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
    (
        "private workspace endpoint",
        re.compile(r"https?://openproject\.mfshaf7\.dev", re.IGNORECASE),
    ),
    ("private key material", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("unresolved placeholder", re.compile(r"\bCHECK:")),
)
CONTENT_SCAN_EXCLUSIONS = {"scripts/validate_repository.py"}
EXPECTED_SOURCE_MANIFEST = {
    "prototype_id": "governance-operations-console",
    "source_app_commit": "aa12fdbb9b4f7b16c8ac2d2229c4dd4f6c95ec98",
    "source_app_tree": "28647acecce1709f408f5b8b1f6e3f944cb46104",
    "source_docs_commit": "32bbd95561a3ded8701cfa089bf6f1a68a879e2c",
    "source_docs_tree": "50c049a6846b2f90a27f425b1d61b7daf1e22e1c",
    "approved_baseline_blob": "e2b52ad598354364e82dd966c24e9fd6518018b2",
}


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

    manifest_path = REPO_ROOT / "docs/graduation/source-manifest.json"
    if manifest_path.is_file():
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            errors.append(f"invalid source manifest: {exc}")
        else:
            if manifest.get("schema_version") != 1:
                errors.append("source manifest schema_version must be 1")
            for key, expected_value in EXPECTED_SOURCE_MANIFEST.items():
                if manifest.get(key) != expected_value:
                    errors.append(
                        f"source manifest {key} must remain {expected_value!r}"
                    )
            transfer = manifest.get("transfer") or {}
            if transfer.get("application_file_count") != 1107:
                errors.append(
                    "source manifest application_file_count must remain 1107"
                )
            if transfer.get("included_application_file_count") != 1106:
                errors.append(
                    "source manifest included_application_file_count must remain 1106"
                )
            if transfer.get("product_record_file_count") != 49:
                errors.append(
                    "source manifest product_record_file_count must remain 49"
                )

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
