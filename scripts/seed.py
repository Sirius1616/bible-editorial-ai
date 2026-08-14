import sys

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.content import ContentItem, ContentVersion
from app.models.project import Project
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember

DEMO_EMAIL = "demo@editorial.ai"
DEMO_PASSWORD = "demo-password-1"
COEDITOR_EMAIL = "coeditor@editorial.ai"


def seed() -> None:
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == DEMO_EMAIL))
        if user is None:
            user = User(
                email=DEMO_EMAIL,
                hashed_password=hash_password(DEMO_PASSWORD),
                full_name="Demo Editor",
                role="editor",
            )
            db.add(user)
            db.flush()
            print(f"Created demo user: {DEMO_EMAIL} / {DEMO_PASSWORD}")

        coeditor = db.scalar(select(User).where(User.email == COEDITOR_EMAIL))
        if coeditor is None:
            coeditor = User(
                email=COEDITOR_EMAIL,
                hashed_password=hash_password(DEMO_PASSWORD),
                full_name="Sarah Coeditor",
                role="editor",
            )
            db.add(coeditor)
            db.flush()
            print(f"Created co-editor user: {COEDITOR_EMAIL} / {DEMO_PASSWORD}")

        workspace = db.scalar(select(Workspace).where(Workspace.owner_id == user.id))
        if workspace is None:
            workspace = Workspace(name="Demo Editor's Workspace", owner_id=user.id)
            db.add(workspace)
            db.flush()
            db.add(
                WorkspaceMember(workspace_id=workspace.id, user_id=user.id, role="owner")
            )
            print(f"Created demo workspace: {workspace.name}")

        if not db.scalar(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == workspace.id,
                WorkspaceMember.user_id == coeditor.id,
            )
        ):
            db.add(
                WorkspaceMember(
                    workspace_id=workspace.id, user_id=coeditor.id, role="member"
                )
            )
            print(f"Invited co-editor into {workspace.name}")

        project = db.scalar(
            select(Project)
            .where(Project.owner_id == user.id)
            .order_by(Project.id)
            .limit(1)
        )
        if project is None:
            project = Project(
                name="Sample Study Bible",
                description="Demonstration project for the editorial workflow.",
                translation="ESV",
                style_guide="Write warm, pastoral, and doctrinally precise. Avoid speculation.",
                owner_id=user.id,
                workspace_id=workspace.id,
            )
            db.add(project)
            db.flush()
            print(f"Created sample project: {project.name}")

        if not db.scalar(
            select(ContentItem).where(ContentItem.project_id == project.id)
        ):
            items = [
                (
                    "God So Loved the World",
                    "John 3:16-17",
                    "study_note",
                    "in_review",
                    "John", 3, 16, "John", 3, 17,
                    "The original Greek word monogenes is better rendered 'only Son'.",
                    ["John 1:14", "1 John 4:9"],
                ),
                (
                    "Faith and Works",
                    "James 2:14-26",
                    "study_note",
                    "in_progress",
                    "James", 2, 14, "James", 2, 26,
                    "Compare Paul on justification in Romans 4.",
                    ["Romans 4:1-5", "Genesis 15:6"],
                ),
                (
                    "Morning by Morning",
                    "Psalm 30:5",
                    "devotional",
                    "qa",
                    "Psalm", 30, 5, None, None, None,
                    None,
                    ["Psalm 5:3", "Lamentations 3:22-23"],
                ),
                (
                    "Grace in Action",
                    "Ephesians 2:8-10",
                    "study_note",
                    "ready",
                    "Ephesians", 2, 8, "Ephesians", 2, 10,
                    "Grace is God's gift, not a wage earned.",
                    ["Romans 11:6", "Titus 3:4-7"],
                ),
                (
                    "The Shepherd's Psalm",
                    "Psalm 23",
                    "devotional",
                    "assigned",
                    "Psalm", 23, 1, "Psalm", 23, 6,
                    None,
                    ["John 10:11", "Isaiah 40:11"],
                ),
                (
                    "Light of the World",
                    "John 8:12",
                    "reference_entry",
                    "archived",
                    "John", 8, 12, None, None, None,
                    None,
                    ["John 1:4-5", "Matthew 5:14"],
                ),
            ]
            for item_data in items:
                (
                    title,
                    passage,
                    content_type,
                    status,
                    start_book, start_chapter, start_verse,
                    end_book, end_chapter, end_verse,
                    footnote,
                    cross_refs,
                ) = item_data
                item = ContentItem(
                    project_id=project.id,
                    title=title,
                    passage=passage,
                    content_type=content_type,
                    status=status,
                    verse_start_book=start_book,
                    verse_start_chapter=start_chapter,
                    verse_start_verse=start_verse,
                    verse_end_book=end_book,
                    verse_end_chapter=end_chapter,
                    verse_end_verse=end_verse,
                )
                db.add(item)
                db.flush()
                db.add(
                    ContentVersion(
                        content_item_id=item.id,
                        version_number=1,
                        body=f"{title} — initial draft for the sample project.",
                        change_note="Initial placeholder draft",
                        footnotes=[
                            {"number": 1, "text": footnote}
                        ] if footnote else [],
                        cross_refs=cross_refs,
                    )
                )
            print(f"Created sample content items: {len(items)}")

        db.commit()


if __name__ == "__main__":
    seed()
    sys.exit(0)
