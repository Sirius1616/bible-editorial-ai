"""add account soft-delete columns

Revision ID: 14015f70b19f
Revises: 891548148aa6
Create Date: 2026-09-19 05:02:02.629629

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '14015f70b19f'
down_revision: Union[str, None] = '891548148aa6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column(
            'is_active',
            sa.Boolean(),
            server_default=sa.true(),
            nullable=False,
        ),
    )
    op.add_column(
        'users',
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('users', 'deleted_at')
    op.drop_column('users', 'is_active')
