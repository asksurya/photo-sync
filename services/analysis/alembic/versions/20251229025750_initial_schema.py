"""initial_schema

Revision ID: 20251229025750
Revises:
Create Date: 2025-12-29 02:57:50

"""
from alembic import op
import sqlalchemy as sa
import sys
import os

# Add parent directory to path for importing GUID type
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from src.models import GUID, StringArray

# revision identifiers, used by Alembic.
revision = '20251229025750'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create import_batches table
    op.create_table('import_batches',
    sa.Column('id', GUID, nullable=False),
    sa.Column('immich_user_id', sa.String(length=255), nullable=False),
    sa.Column('created_at', sa.TIMESTAMP(), nullable=True),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('total_assets', sa.Integer(), nullable=False),
    sa.Column('analyzed_assets', sa.Integer(), nullable=True, server_default='0'),
    sa.Column('skipped_assets', sa.Integer(), nullable=True, server_default='0'),
    sa.Column('error_message', sa.Text(), nullable=True),
    sa.CheckConstraint("status IN ('processing', 'complete', 'failed')", name='check_status'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_import_batches_immich_user_id'), 'import_batches', ['immich_user_id'], unique=False)
    op.create_index(op.f('ix_import_batches_status'), 'import_batches', ['status'], unique=False)

    # Create asset_quality_scores table
    op.create_table('asset_quality_scores',
    sa.Column('id', GUID, nullable=False),
    sa.Column('immich_asset_id', sa.String(length=255), nullable=False),
    sa.Column('import_batch_id', GUID, nullable=True),
    sa.Column('blur_score', sa.Float(), nullable=True),
    sa.Column('exposure_score', sa.Float(), nullable=True),
    sa.Column('overall_quality', sa.Float(), nullable=True),
    sa.Column('is_corrupted', sa.Boolean(), nullable=True, server_default=sa.text('false')),
    sa.Column('analyzed_at', sa.TIMESTAMP(), nullable=True),
    sa.CheckConstraint("blur_score IS NULL OR (blur_score >= 0 AND blur_score <= 100)", name='check_blur_score'),
    sa.CheckConstraint("exposure_score IS NULL OR (exposure_score >= 0 AND exposure_score <= 100)", name='check_exposure_score'),
    sa.CheckConstraint("overall_quality IS NULL OR (overall_quality >= 0 AND overall_quality <= 100)", name='check_overall_quality'),
    sa.ForeignKeyConstraint(['import_batch_id'], ['import_batches.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('immich_asset_id', 'import_batch_id', name='uq_asset_per_batch')
    )
    op.create_index(op.f('ix_asset_quality_scores_immich_asset_id'), 'asset_quality_scores', ['immich_asset_id'], unique=False)
    op.create_index(op.f('ix_asset_quality_scores_import_batch_id'), 'asset_quality_scores', ['import_batch_id'], unique=False)
    op.create_index(op.f('ix_asset_quality_scores_overall_quality'), 'asset_quality_scores', ['overall_quality'], unique=False)

    # Create burst_sequences table
    op.create_table('burst_sequences',
    sa.Column('id', GUID, nullable=False),
    sa.Column('import_batch_id', GUID, nullable=True),
    sa.Column('immich_asset_ids', StringArray, nullable=False),
    sa.Column('recommended_asset_id', sa.String(length=255), nullable=True),
    sa.Column('created_at', sa.TIMESTAMP(), nullable=True),
    sa.ForeignKeyConstraint(['import_batch_id'], ['import_batches.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_burst_sequences_import_batch_id'), 'burst_sequences', ['import_batch_id'], unique=False)
    op.create_index(op.f('ix_burst_sequences_recommended_asset_id'), 'burst_sequences', ['recommended_asset_id'], unique=False)

    # Create triage_actions table
    op.create_table('triage_actions',
    sa.Column('id', GUID, nullable=False),
    sa.Column('import_batch_id', GUID, nullable=True),
    sa.Column('action_type', sa.String(length=20), nullable=False),
    sa.Column('immich_asset_id', sa.String(length=255), nullable=False),
    sa.Column('applied', sa.Boolean(), nullable=True, server_default=sa.text('false')),
    sa.Column('applied_at', sa.TIMESTAMP(), nullable=True),
    sa.Column('user_overridden', sa.Boolean(), nullable=True, server_default=sa.text('false')),
    sa.CheckConstraint("action_type IN ('delete', 'keep', 'organize')", name='check_action_type'),
    sa.ForeignKeyConstraint(['import_batch_id'], ['import_batches.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_triage_actions_applied'), 'triage_actions', ['applied'], unique=False)
    op.create_index(op.f('ix_triage_actions_immich_asset_id'), 'triage_actions', ['immich_asset_id'], unique=False)
    op.create_index(op.f('ix_triage_actions_import_batch_id'), 'triage_actions', ['import_batch_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_triage_actions_import_batch_id'), table_name='triage_actions')
    op.drop_index(op.f('ix_triage_actions_immich_asset_id'), table_name='triage_actions')
    op.drop_index(op.f('ix_triage_actions_applied'), table_name='triage_actions')
    op.drop_table('triage_actions')

    op.drop_index(op.f('ix_burst_sequences_recommended_asset_id'), table_name='burst_sequences')
    op.drop_index(op.f('ix_burst_sequences_import_batch_id'), table_name='burst_sequences')
    op.drop_table('burst_sequences')

    op.drop_index(op.f('ix_asset_quality_scores_overall_quality'), table_name='asset_quality_scores')
    op.drop_index(op.f('ix_asset_quality_scores_import_batch_id'), table_name='asset_quality_scores')
    op.drop_index(op.f('ix_asset_quality_scores_immich_asset_id'), table_name='asset_quality_scores')
    op.drop_table('asset_quality_scores')

    op.drop_index(op.f('ix_import_batches_status'), table_name='import_batches')
    op.drop_index(op.f('ix_import_batches_immich_user_id'), table_name='import_batches')
    op.drop_table('import_batches')
