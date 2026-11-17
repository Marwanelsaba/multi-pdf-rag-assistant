import hashlib
import logging
from threading import RLock
from uuid import UUID

from sqlalchemy import select

from backend.config import UPLOAD_DIR
from backend.models.document import ArtifactCleanup, Document
from backend.services.vectordb_service import get_collection

logger = logging.getLogger(__name__)
# The local app runs one API worker. Serialize writes spanning SQLite, disk and Chroma.
storage_lock = RLock()


def upload_path(uid):
    return UPLOAD_DIR / f"{UUID(uid)}.pdf"


def legacy_path(filename):
    path = (UPLOAD_DIR / filename).resolve()
    return path if path.parent == UPLOAD_DIR else None


def existing_pdf(document):
    path = upload_path(document.document_uid)
    if path.is_file():
        return path
    legacy = legacy_path(document.filename)
    if legacy and legacy.is_file():
        with legacy.open("rb") as file:
            if hashlib.file_digest(file, "sha256").hexdigest() == document.file_hash:
                return legacy
    return None


def stage_artifact_cleanup(documents, db):
    db.add_all([
        ArtifactCleanup(document_uid=document.document_uid, filename=document.filename)
        for document in documents
    ])


def retry_artifact_cleanup(db):
    for item in db.query(ArtifactCleanup).all():
        uid = item.document_uid
        paths = [upload_path(uid)]
        legacy = legacy_path(item.filename)
        if legacy and not db.scalar(select(Document.id).where(Document.filename == item.filename).limit(1)):
            paths.append(legacy)
        try:
            for path in paths:
                path.unlink(missing_ok=True)
            get_collection().delete(where={"document_uid": uid})
        except Exception:
            logger.exception("Artifact cleanup will be retried for %s", uid)
        else:
            db.delete(item)
    db.commit()
