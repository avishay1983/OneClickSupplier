"""
Local File Storage — replaces Supabase Storage bucket operations.

Same-ish API as supabase.storage.from_('bucket').upload/download/remove/getPublicUrl

Usage:
    storage = LocalStorage("./uploads")
    storage.from_("vendor_documents").upload("path/to/file.pdf", file_bytes)
    content = storage.from_("vendor_documents").download("path/to/file.pdf")
    storage.from_("vendor_documents").remove(["path/to/file.pdf"])
"""

import os
import shutil
from typing import Optional

UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "uploads")


class BucketApi:
    """Mimics supabase.storage.from_('bucket_name') API."""

    def __init__(self, base_dir: str, bucket: str):
        self.bucket_dir = os.path.join(base_dir, bucket)
        os.makedirs(self.bucket_dir, exist_ok=True)

    def upload(self, path: str, file_data: bytes, file_options: dict = None):
        """Upload a file to the local bucket directory."""
        full_path = os.path.join(self.bucket_dir, path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as f:
            f.write(file_data)
        return {"Key": path}

    def download(self, path: str) -> Optional[bytes]:
        """Download a file from the local bucket directory."""
        full_path = os.path.join(self.bucket_dir, path)
        if not os.path.exists(full_path):
            return None
        with open(full_path, "rb") as f:
            return f.read()

    def remove(self, paths: list):
        """Remove files from the local bucket directory."""
        for path in paths:
            full_path = os.path.join(self.bucket_dir, path)
            if os.path.exists(full_path):
                os.remove(full_path)
        return {"message": "ok"}

    def get_public_url(self, path: str) -> dict:
        """Generate a local URL for the file."""
        url = f"/api/files/vendor_documents/{path}"
        return {"publicUrl": url}


class LocalStorage:
    """Mimics supabase.storage interface."""

    def __init__(self, base_dir: str = None):
        self.base_dir = base_dir or UPLOADS_DIR
        os.makedirs(self.base_dir, exist_ok=True)

    def from_(self, bucket: str) -> BucketApi:
        """Get a bucket API. Same as supabase.storage.from_('bucket')."""
        return BucketApi(self.base_dir, bucket)


# Singleton
_storage_instance: Optional[LocalStorage] = None


def get_storage() -> LocalStorage:
    """Get the singleton LocalStorage instance."""
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = LocalStorage()
    return _storage_instance
