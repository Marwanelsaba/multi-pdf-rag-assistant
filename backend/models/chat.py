import json
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from backend.database import Base


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)

    session_id = Column(
        Integer,
        ForeignKey("sessions.id"),
        nullable=False,
        index=True
    )

    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)

    sources = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    def set_sources(self, sources):
        self.sources = json.dumps(sources)

    def get_sources(self):
        if not self.sources:
            return []
        return json.loads(self.sources)