#!/usr/bin/env python3
"""Rebuild creator catalog + Hebrew quest presentation.

Optional SoftKitty refresh (needs local Unity project):
  python scripts/export_softkitty_items.py
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent


def run(name: str) -> None:
    path = SCRIPTS / name
    print(f"==> {name}")
    subprocess.check_call([sys.executable, str(path)])


def main() -> None:
    run("build_catalog.py")
    run("build_presentation.py")
    print("All presentation builds finished.")


if __name__ == "__main__":
    main()
