from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL, 
    connect_args={"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
)

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if settings.DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def auto_migrate_db():
    """Ensure newly added columns exist on existing SQLite tables."""
    if not settings.DATABASE_URL.startswith("sqlite"):
        return

    try:
        dbapi_conn = engine.raw_connection()
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA table_info(investigations)")
        rows = cursor.fetchall()
        col_names = {row[1] for row in rows}

        new_columns = [
            ("assigned_user_id", "INTEGER REFERENCES users(id) ON DELETE SET NULL"),
            ("siem_source", "VARCHAR"),
            ("mitre_tactics", "TEXT"),
            ("mitre_techniques", "TEXT"),
            ("threat_intel", "TEXT")
        ]

        for col_name, col_type in new_columns:
            if col_name not in col_names:
                try:
                    cursor.execute(f"ALTER TABLE investigations ADD COLUMN {col_name} {col_type}")
                except Exception:
                    pass

        # Check columns in security_events table
        cursor.execute("PRAGMA table_info(security_events)")
        sec_rows = cursor.fetchall()
        sec_col_names = {row[1] for row in sec_rows}
        sec_new_cols = [
            ("risk_score", "INTEGER DEFAULT 50"),
            ("ip_address", "VARCHAR"),
            ("username", "VARCHAR")
        ]
        for col_name, col_type in sec_new_cols:
            if col_name not in sec_col_names:
                try:
                    cursor.execute(f"ALTER TABLE security_events ADD COLUMN {col_name} {col_type}")
                except Exception:
                    pass
        dbapi_conn.commit()
        cursor.close()
        dbapi_conn.close()
    except Exception:
        pass

