"""verse anchoring, footnotes and cross-references

Revision ID: a3b7c9d1e2f4
Revises: 74818eecb0e8
Create Date: 2026-08-12 23:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a3b7c9d1e2f4'
down_revision: Union[str, None] = '74818eecb0e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('content_items', sa.Column('verse_start_book', sa.String(length=50), nullable=True))
    op.add_column('content_items', sa.Column('verse_start_chapter', sa.Integer(), nullable=True))
    op.add_column('content_items', sa.Column('verse_start_verse', sa.Integer(), nullable=True))
    op.add_column('content_items', sa.Column('verse_end_book', sa.String(length=50), nullable=True))
    op.add_column('content_items', sa.Column('verse_end_chapter', sa.Integer(), nullable=True))
    op.add_column('content_items', sa.Column('verse_end_verse', sa.Integer(), nullable=True))
    op.add_column('content_versions', sa.Column('footnotes', sa.JSON(), nullable=True))
    op.add_column('content_versions', sa.Column('cross_refs', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('content_versions', 'cross_refs')
    op.drop_column('content_versions', 'footnotes')
    op.drop_column('content_items', 'verse_end_verse')
    op.drop_column('content_items', 'verse_end_chapter')
    op.drop_column('content_items', 'verse_end_book')
    op.drop_column('content_items', 'verse_start_verse')
    op.drop_column('content_items', 'verse_start_chapter')
    op.drop_column('content_items', 'verse_start_book')
