"""workspaces, workspace members, invitations and project scoping

Revision ID: c9d4e7f1a2b3
Revises: f5e6d7c8b9a0
Create Date: 2026-08-14 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c9d4e7f1a2b3'
down_revision: Union[str, None] = 'f5e6d7c8b9a0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'workspaces',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'workspace_members',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workspace_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.String(length=50), server_default='member', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('workspace_id', 'user_id', name='uq_workspace_member'),
    )
    op.create_table(
        'invitations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workspace_id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), server_default='member', nullable=False),
        sa.Column('token', sa.String(length=100), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token', name='uq_invitations_token'),
    )
    op.create_index(op.f('ix_invitations_email'), 'invitations', ['email'], unique=False)
    op.add_column('projects', sa.Column('workspace_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_projects_workspace_id', 'projects', 'workspaces', ['workspace_id'], ['id'])

    connection = op.get_bind()
    users = connection.execute(
        sa.text("SELECT id, full_name FROM users ORDER BY id")
    ).fetchall()
    for user_id, full_name in users:
        workspace_id = connection.execute(
            sa.text(
                "INSERT INTO workspaces (name, owner_id) VALUES (:name, :owner_id) RETURNING id"
            ),
            {"name": f"{full_name or 'Editor'}'s Workspace", "owner_id": user_id},
        ).scalar_one()
        connection.execute(
            sa.text(
                "INSERT INTO workspace_members (workspace_id, user_id, role) "
                "VALUES (:workspace_id, :user_id, 'owner')"
            ),
            {"workspace_id": workspace_id, "user_id": user_id},
        )
        connection.execute(
            sa.text("UPDATE projects SET workspace_id = :workspace_id WHERE owner_id = :owner_id"),
            {"workspace_id": workspace_id, "owner_id": user_id},
        )


def downgrade() -> None:
    op.drop_constraint('fk_projects_workspace_id', 'projects', type_='foreignkey')
    op.drop_column('projects', 'workspace_id')
    op.drop_index(op.f('ix_invitations_email'), table_name='invitations')
    op.drop_table('invitations')
    op.drop_table('workspace_members')
    op.drop_table('workspaces')
