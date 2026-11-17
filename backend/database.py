from sqlalchemy import URL, create_engine, event, inspect
from sqlalchemy.orm import declarative_base, sessionmaker

from backend.config import METADATA_DIR

METADATA_DIR.mkdir(parents=True, exist_ok=True)
engine = create_engine(URL.create("sqlite", database=str(METADATA_DIR / "database.db")))


@event.listens_for(engine, "connect")
def set_sqlite_options(connection, _):
    connection.execute("PRAGMA foreign_keys=ON")
    connection.execute("PRAGMA busy_timeout=10000")


SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
Base = declarative_base()


def init_db():
    with engine.begin() as connection:
        Base.metadata.create_all(connection)
        columns = inspect(connection).get_columns("sessions")
        if all(column["name"] != "owner_id" for column in columns):
            connection.exec_driver_sql(
                "ALTER TABLE sessions ADD COLUMN owner_id INTEGER REFERENCES accounts(id)"
            )
        connection.exec_driver_sql(
            "CREATE INDEX IF NOT EXISTS ix_sessions_owner_id ON sessions (owner_id)"
        )


def get_db():
    with SessionLocal() as db:
        yield db
