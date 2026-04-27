import os
import httpx
# We use direct clients because supabase-py has build issues on this environment
from postgrest import SyncPostgrestClient
from gotrue import SyncGoTrueClient
from dotenv import load_dotenv

load_dotenv()

class StorageFileApi:
    def __init__(self, url: str, headers: dict, bucket: str):
        self.url = url
        self.headers = headers
        self.bucket = bucket

    
    def remove(self, paths: list):
        url = f"{self.url}/storage/v1/object/{self.bucket}"
        response = httpx.request("DELETE", url, headers=self.headers, json={"prefixes": paths})
        if response.status_code != 200:
             raise Exception(f"Failed to delete file: {response.status_code} {response.text}")
        return response.json()

    def upload(self, path: str, file_content: bytes, content_type: str = "application/octet-stream", upsert: bool = False):
        url = f"{self.url}/storage/v1/object/{self.bucket}/{path}"
        headers = self.headers.copy()
        headers["Content-Type"] = content_type
        headers["x-upsert"] = "true" if upsert else "false"
        response = httpx.post(url, headers=headers, content=file_content)
        if response.status_code != 200:
            raise Exception(f"Failed to upload file: {response.status_code} {response.text}")
        return response.json()

    def download(self, path: str):
        url = f"{self.url}/storage/v1/object/{self.bucket}/{path}"
        response = httpx.get(url, headers=self.headers)
        if response.status_code != 200:
            raise Exception(f"Failed to download file: {response.status_code} {response.text}")
        return response.content

class StorageClient:
    def __init__(self, url: str, headers: dict):
        self.url = url
        self.headers = headers

    def from_(self, bucket: str):
        return StorageFileApi(self.url, self.headers, bucket)

class SupabaseClient:
    def __init__(self, url: str, key: str):
        self.url = url
        self.key = key
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json"
        }
        self.postgrest = SyncPostgrestClient(f"{url}/rest/v1", headers=self.headers)
        self.auth = SyncGoTrueClient(
            url=f"{url}/auth/v1",
            headers=self.headers
        )
        self.storage = StorageClient(url, self.headers)

    def table(self, table_name: str):
        return self.postgrest.from_(table_name)

# --- Lazy initialization ---
# Don't crash at import time; initialize on first use
_supabase = None
_supabase_admin = None

def get_supabase() -> SupabaseClient:
    global _supabase
    if _supabase is None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_KEY")
        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables")
        _supabase = SupabaseClient(url, key)
    return _supabase

def get_supabase_admin() -> SupabaseClient:
    global _supabase_admin
    if _supabase_admin is None:
        url = os.environ.get("SUPABASE_URL")
        service_key = os.environ.get("SERVICE_ROLE_KEY")
        if not url or not service_key:
            raise ValueError("SUPABASE_URL and SERVICE_ROLE_KEY must be set in environment variables")
        _supabase_admin = SupabaseClient(url, service_key)
    return _supabase_admin
