from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from backend.database import Base


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True)
    username = Column(String(40), unique=True, nullable=False)
    password_hash = Column(String, nullable=False)


class Login(Base):
    __tablename__ = "logins"

    token_hash = Column(String(64), primary_key=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
