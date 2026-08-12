"""inline and verse-level comment anchors, threads and resolve

Revision ID: f5e6d7c8b9a0
Revises: a3b7c9d1e2f4
Create Date: 2026-08-13 00:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f5e6d7c8b9a0'
down_revision: Union[str, None] = 'a3b7c9d1e2f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('comments', sa.Column('parent_id', sa.Integer(), nullable=True))
    op.add_column('comments', sa.Column('resolved', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('comments', sa.Column('anchor_type', sa.String(length=20), nullable=True))
    op.add_column('comments', sa.Column('anchor_start', sa.Text(), nullable=True))
    op.add_column('comments', sa.Column('anchor_end', sa.Text(), nullable=True))
    op.add_column('comments', sa.Column('anchor_text', sa.Text(), nullable=True))
    op.create_foreign_key('fk_comments_parent_id', 'comments', 'comments', ['parent_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_comments_parent_id', 'comments', type_='foreignkey')
    op.drop_column('comments', 'anchor_text')
    op.drop_column('comments', 'anchor_end')
    op.drop_column('comments', 'anchor_start')
    op.drop_column('comments', 'anchor_type')
    op.drop_column('comments', 'resolved')
    op.drop_column('comments', 'parent_id')
