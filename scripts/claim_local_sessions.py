"""Assign existing unowned sessions to one named local account."""
import argparse

from backend.database import SessionLocal, init_db
from backend.models.account import Account
from backend.models.chat import ChatMessage  # Registers the SQLite table.
from backend.models.document import Document  # Registers the SQLite table.
from backend.models.session import Session


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("username")
    args = parser.parse_args()
    init_db()
    with SessionLocal() as db:
        account = db.query(Account).filter_by(username=args.username.lower()).first()
        if account is None:
            parser.error("Create the account in the app before claiming sessions.")
        count = db.query(Session).filter(Session.owner_id.is_(None)).update({"owner_id": account.id})
        db.commit()
        print(f"Assigned {count} local session(s) to {account.username}.")


if __name__ == "__main__":
    main()
