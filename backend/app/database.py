from sqlmodel import SQLModel, create_engine, Session

DATABASE_URL = "sqlite:///./we_platform.db"

engine = create_engine(
    DATABASE_URL, echo=False, connect_args={"check_same_thread": False}
)


def init_db():
    """Create database tables."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """Dependency that provides a database session."""
    with Session(engine) as session:
        yield session 