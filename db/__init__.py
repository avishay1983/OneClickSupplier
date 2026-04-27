"""
Database module — provides get_db() to access the JSON-based data store.

Usage:
    from db import get_db
    db = get_db()
    result = db.table("vendor_requests").select("*").execute()
"""

import os
from .json_store import JsonStore

_db: JsonStore = None

def get_db() -> JsonStore:
    """Get the singleton JsonStore instance."""
    global _db
    if _db is None:
        data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
        _db = JsonStore(data_dir)
    return _db
