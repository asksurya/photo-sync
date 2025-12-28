import pytest
from sqlalchemy import create_engine, inspect
from alembic.config import Config as AlembicConfig
from alembic import command
import tempfile
import os


def test_migration_creates_tables():
    """Test that migration creates required tables."""
    # Create temporary database
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp:
        db_path = tmp.name

    try:
        # Create engine
        engine = create_engine(f"sqlite:///{db_path}")

        # Run migrations
        alembic_cfg = AlembicConfig("alembic.ini")
        alembic_cfg.set_main_option("sqlalchemy.url", f"sqlite:///{db_path}")
        command.upgrade(alembic_cfg, "head")

        # Verify tables exist
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        assert "file_groups" in tables
        assert "group_members" in tables

        # Verify file_groups columns
        columns = {col['name']: col for col in inspector.get_columns("file_groups")}
        assert "group_id" in columns
        assert "group_type" in columns
        assert "created_at" in columns

        # Verify group_members columns
        columns = {col['name']: col for col in inspector.get_columns("group_members")}
        assert "id" in columns
        assert "group_id" in columns
        assert "file_path" in columns
        assert "file_type" in columns
        assert "is_primary" in columns
        assert "file_size" in columns
        assert "created_at" in columns

    finally:
        # Cleanup
        if os.path.exists(db_path):
            os.remove(db_path)


def test_migration_downgrade():
    """Test that migration can be rolled back."""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp:
        db_path = tmp.name

    try:
        engine = create_engine(f"sqlite:///{db_path}")
        alembic_cfg = AlembicConfig("alembic.ini")
        alembic_cfg.set_main_option("sqlalchemy.url", f"sqlite:///{db_path}")

        # Upgrade
        command.upgrade(alembic_cfg, "head")

        # Verify tables exist
        inspector = inspect(engine)
        assert len(inspector.get_table_names()) >= 2

        # Downgrade
        command.downgrade(alembic_cfg, "base")

        # Verify tables removed
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        assert "file_groups" not in tables
        assert "group_members" not in tables

    finally:
        if os.path.exists(db_path):
            os.remove(db_path)
