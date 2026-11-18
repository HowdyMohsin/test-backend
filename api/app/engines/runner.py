"""Child process entry point: python -m app.engines.runner '<json spec>'.

Running every conversion in its own process means a crashing codec can never take the API down,
and a stuck job can be killed cleanly by the worker.
"""
from __future__ import annotations

import json
import sys
import traceback

from .common import EngineError, emit


def main() -> int:
    spec = json.loads(sys.argv[1])
    try:
        from .pipeline import run

        emit({"t": "result", **run(spec)})
        return 0
    except EngineError as e:
        emit({"t": "error", "code": e.code, "message": e.message})
    except MemoryError:
        emit({"t": "error", "code": "memory", "message": "This file is too large to process."})
    except Exception:  # noqa: BLE001 - last line of defence, details go to stderr only
        traceback.print_exc(file=sys.stderr)
        emit({"t": "error", "code": "internal", "message": "Something went wrong while converting this file."})
    return 1


if __name__ == "__main__":
    sys.exit(main())
