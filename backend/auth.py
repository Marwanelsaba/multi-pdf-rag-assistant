import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, StringConstraints
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.config import AUTH_ENABLED, REGISTRATION_ENABLED, SECURE_COOKIE
from backend.database import get_db
from backend.models.account import Account, Login
from backend.models.session import Session as ChatSession

router = APIRouter(prefix="/auth", tags=["Authentication"])
COOKIE = "rag_login"
LOGIN_TTL = timedelta(days=7)


class Credentials(BaseModel):
    username: Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^[a-zA-Z0-9_.-]{3,40}$")]
    password: str = Field(min_length=12, max_length=256)


def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def hash_password(password, salt):
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**15, r=8, p=1, maxmem=64 * 1024**2)
    return f"{salt.hex()}:{digest.hex()}"


def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


def lookup_login(request, db):
    token = request.cookies.get(COOKIE, "")
    if len(token) != 43:
        return None
    return db.query(Login).filter(
        Login.token_hash == token_hash(token), Login.expires_at > now()
    ).first()


def current_owner(request: Request, db: Session = Depends(get_db, scope="function")):
    if not AUTH_ENABLED:
        return None
    login = lookup_login(request, db)
    if login is None:
        raise HTTPException(401, "Sign in to access this workspace.")
    return login.account_id


def session_for_owner(db, session_id, owner_id):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id, ChatSession.owner_id == owner_id
    ).first()
    if session is None:
        raise HTTPException(404, "Session not found.")
    return session


def start_login(account, db, response):
    token = secrets.token_urlsafe(32)
    db.query(Login).filter(Login.expires_at <= now()).delete()
    db.add(Login(token_hash=token_hash(token), account_id=account.id, expires_at=now() + LOGIN_TTL))
    db.commit()
    response.set_cookie(
        COOKIE, token, max_age=int(LOGIN_TTL.total_seconds()),
        httponly=True, secure=SECURE_COOKIE, samesite="strict", path="/",
    )
    return {"username": account.username}


@router.get("/status")
def auth_status(request: Request, response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    login = lookup_login(request, db) if AUTH_ENABLED else None
    return {
        "enabled": AUTH_ENABLED,
        "registration_enabled": AUTH_ENABLED and REGISTRATION_ENABLED,
        "username": db.get(Account, login.account_id).username if login else None,
    }


@router.post("/register", status_code=201)
def register(credentials: Credentials, response: Response, db: Session = Depends(get_db)):
    if not AUTH_ENABLED or not REGISTRATION_ENABLED:
        raise HTTPException(403, "Account registration is disabled.")
    account = Account(
        username=credentials.username.lower(),
        password_hash=hash_password(credentials.password, secrets.token_bytes(16)),
    )
    db.add(account)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "That username is already in use.") from None
    return start_login(account, db, response)


@router.post("/login")
def login(credentials: Credentials, response: Response, db: Session = Depends(get_db)):
    if not AUTH_ENABLED:
        raise HTTPException(403, "Account sign-in is disabled.")
    account = db.query(Account).filter_by(username=credentials.username.lower()).first()
    salt = bytes.fromhex(account.password_hash.split(":")[0]) if account else bytes(16)
    candidate = hash_password(credentials.password, salt)
    if account is None or not hmac.compare_digest(account.password_hash, candidate):
        raise HTTPException(401, "Invalid username or password.")
    return start_login(account, db, response)


@router.post("/logout", status_code=204)
def logout(request: Request, db: Session = Depends(get_db)):
    login = lookup_login(request, db)
    if login:
        db.delete(login)
        db.commit()
    response = Response(status_code=204)
    response.delete_cookie(COOKIE, path="/", secure=SECURE_COOKIE, httponly=True, samesite="strict")
    return response
