import sys

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.content import ContentItem, ContentVersion
from app.models.project import Project
from app.models.user import User

DEMO_EMAIL = "demo@editorial.ai"
DEMO_PASSWORD = "demo-password-1"


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

        project = db.scalar(select(Project).where(Project.owner_id == user.id))
        if project is None:
            project = Project(
                name="Sample Study Bible",
                description="Demonstration project for the editorial workflow.",
                translation="ESV",
                style_guide="Write warm, pastoral, and doctrinally precise. Avoid speculation.",
                owner_id=user.id,
            )
            db.add(project)
            db.flush()
            print(f"Created sample project: {project.name}")

        if not db.scalar(
            select(ContentItem).where(ContentItem.project_id == project.id)
        ):
            item = ContentItem(
                project_id=project.id,
                title="God So Loved the World",
                passage="John 3:16-17",
                content_type="study_note",
            )
            db.add(item)
            db.flush()
            db.add(
                ContentVersion(
                    content_item_id=item.id,
                    version_number=1,
                    body="For God so loved the world, that he gave his only Son...",
                    change_note="Initial placeholder draft",
                )
            )
            print(f"Created sample content item: {item.title}")

        db.commit()


if __name__ == "__main__":
    seed()
    sys.exit(0)
