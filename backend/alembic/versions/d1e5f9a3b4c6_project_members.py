"""project member roles

Revision ID: d1e5f9a3b4c6
Revises: c9d4e7f1a2b3
Create Date: 2026-08-14 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd1e5f9a3b4c6'
down_revision: Union[str, None] = 'c9d4e7f1a2b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'project_members',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.String(length=50), server_default='editor', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('project_id', 'user_id', name='uq_project_member'),
    )

    connection = op.get_bind()
    projects = connection.execute(
        sa.text("SELECT id, owner_id FROM projects ORDER BY id")
    ).fetchall()
    for project_id, owner_id in projects:
        connection.execute(
            sa.text(
                "INSERT INTO project_members (project_id, user_id, role) "
                "VALUES (:project_id, :user_id, 'admin')"
            ),
            {"project_id": project_id, "user_id": owner_id},
        )


def downgrade() -> None:
    op.drop_table('project_members')
