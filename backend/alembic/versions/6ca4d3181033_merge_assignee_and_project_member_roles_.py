"""merge assignee and project_member_roles heads

Revision ID: 6ca4d3181033
Revises: a1b2c3d4e5f6, d1e5f9a3b4c6
Create Date: 2026-08-27 02:08:27.155741

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '6ca4d3181033'
down_revision: Union[str, None] = ('a1b2c3d4e5f6', 'd1e5f9a3b4c6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
