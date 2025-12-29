import sys
import os
import pytest
from sqlalchemy import create_engine, inspect
import tempfile
import subprocess

# Set DATABASE_URL environment variable before importing any project code
os.environ["DATABASE_URL"] = "sqlite:///:memory:"


def test_migrations_run_successfully():
    # Use a file-based SQLite database for testing migrations
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp_file:
        test_db_path = tmp_file.name

    try:
        test_db_url = f"sqlite:///{test_db_path}"

        # Run alembic upgrade using subprocess to avoid module shadowing
        env = os.environ.copy()
        env["DATABASE_URL"] = test_db_url

        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd=os.getcwd(),
            env=env,
            capture_output=True,
            text=True
        )

        # Check if alembic command succeeded
        assert result.returncode == 0, f"Alembic upgrade failed: {result.stderr}"

        # Now verify tables exist
        engine = create_engine(test_db_url)
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        assert "import_batches" in tables
        assert "asset_quality_scores" in tables
        assert "burst_sequences" in tables
        assert "triage_actions" in tables

        engine.dispose()
    finally:
        # Clean up the temporary database file
        if os.path.exists(test_db_path):
            os.unlink(test_db_path)


def test_migrations_upgrade_downgrade():
    """Test that migrations can upgrade to head and downgrade to base."""
    # Use a file-based SQLite database for testing migrations
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp_file:
        test_db_path = tmp_file.name

    try:
        test_db_url = f"sqlite:///{test_db_path}"

        # Run alembic upgrade using subprocess
        env = os.environ.copy()
        env["DATABASE_URL"] = test_db_url

        # Upgrade to head
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd=os.getcwd(),
            env=env,
            capture_output=True,
            text=True
        )
        assert result.returncode == 0, f"Alembic upgrade failed: {result.stderr}"

        # Verify tables exist after upgrade
        engine = create_engine(test_db_url)
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        assert "import_batches" in tables
        assert "asset_quality_scores" in tables
        assert "burst_sequences" in tables
        assert "triage_actions" in tables

        engine.dispose()

        # Downgrade to base
        result = subprocess.run(
            ["alembic", "downgrade", "base"],
            cwd=os.getcwd(),
            env=env,
            capture_output=True,
            text=True
        )
        assert result.returncode == 0, f"Alembic downgrade failed: {result.stderr}"

        # Verify tables are removed after downgrade
        engine = create_engine(test_db_url)
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        assert "import_batches" not in tables
        assert "asset_quality_scores" not in tables
        assert "burst_sequences" not in tables
        assert "triage_actions" not in tables

        engine.dispose()
    finally:
        # Clean up the temporary database file
        if os.path.exists(test_db_path):
            os.unlink(test_db_path)
