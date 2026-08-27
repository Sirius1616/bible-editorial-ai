"""add assignee_id to content_items

Revision ID: a1b2c3d4e5f6
Revises: f5e6d7c8b9a0
Create Date: 2026-08-21 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f5e6d7c8b9a0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'content_items',
        sa.Column('assignee_id', sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        'fk_content_items_assignee_id_users',
        'content_items',
        'users',
        ['assignee_id'],
        ['id'],
    )


def downgrade() -> None:
    op.drop_constraint('fk_content_items_assignee_id_users', 'content_items', type_='foreignkey')
    op.drop_column('content_items', 'assignee_id')
