"""Shared pytest configuration and markers."""
from __future__ import annotations

import os

import pytest


def pytest_configure(config: pytest.Config) -> None:
    config.addinivalue_line("markers", "integration: tests that require PostgreSQL")
    config.addinivalue_line("markers", "unit: pure unit tests (no external services)")


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    """Skip integration tests unless RUN_INTEGRATION=1 or --integration is passed."""
    run_integration = os.environ.get("RUN_INTEGRATION", "").lower() in {"1", "true", "yes"}
    if run_integration:
        return
    skip = pytest.mark.skip(reason="Integration tests disabled (set RUN_INTEGRATION=1)")
    for item in items:
        if "integration" in item.keywords:
            item.add_marker(skip)
