import pytest
from sqlalchemy import create_engine, inspect
from alembic.config import Config as AlembicConfig
from alembic import command
import tempfile
import os


def test_migration_creates_tables():
    """Test that migration creates required tables."""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp:
        db_path = tmp.name

    try:
        engine = create_engine(f"sqlite:///{db_path}")

        # Run migrations
        alembic_cfg = AlembicConfig("alembic.ini")
        alembic_cfg.set_main_option("sqlalchemy.url", f"sqlite:///{db_path}")
        command.upgrade(alembic_cfg, "head")

        # Verify tables exist
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        assert "duplicate_groups" in tables
        assert "duplicate_members" in tables

        # Verify duplicate_groups columns
        columns = {col['name']: col for col in inspector.get_columns("duplicate_groups")}
        assert "group_id" in columns
        assert "duplicate_type" in columns
        assert "created_at" in columns

        # Verify duplicate_members columns
        columns = {col['name']: col for col in inspector.get_columns("duplicate_members")}
        assert "id" in columns
        assert "group_id" in columns
        assert "file_path" in columns
        assert "file_hash" in columns
        assert "perceptual_hash" in columns
        assert "similarity_score" in columns
        assert "file_size" in columns
        assert "created_at" in columns

        # Verify indexes exist
        indexes = inspector.get_indexes("duplicate_members")
        index_names = [idx['name'] for idx in indexes]
        assert "ix_duplicate_member_group" in index_names
        assert "ix_duplicate_member_hash" in index_names

        # Verify foreign key
        fks = inspector.get_foreign_keys("duplicate_members")
        assert len(fks) == 1
        assert fks[0]['referred_table'] == 'duplicate_groups'

        # Verify unique constraint on file_path
        unique_constraints = inspector.get_unique_constraints("duplicate_members")
        file_path_is_unique = (
            any('file_path' in idx.get('column_names', []) and idx.get('unique', False)
                for idx in indexes) or
            any('file_path' in uc.get('column_names', [])
                for uc in unique_constraints)
        )
        assert file_path_is_unique, "file_path should have unique constraint"

    finally:
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
        assert "duplicate_groups" not in tables
        assert "duplicate_members" not in tables

    finally:
        if os.path.exists(db_path):
            os.remove(db_path)
