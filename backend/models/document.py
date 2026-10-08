from datetime import datetime
import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from backend.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)

    document_uid = Column(
        String,
        unique=True,
        nullable=False,
        index=True,
        default=lambda: str(uuid.uuid4())
    )

    filename = Column(String, nullable=False)
    file_hash = Column(String, nullable=False, index=True)
    page_count = Column(Integer, nullable=False, default=0)
    chunk_count = Column(Integer, nullable=False, default=0)

    session_id = Column(
        Integer,
        ForeignKey("sessions.id"),
        nullable=False,
        index=True
    )

    upload_date = Column(DateTime, default=datetime.utcnow)