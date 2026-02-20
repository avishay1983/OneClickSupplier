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
        # DELETE /storage/v1/object/{bucket}
        # Body: { prefixes: [path1, path2] }
        url = f"{self.url}/storage/v1/object/{self.bucket}"
        response = httpx.request("DELETE", url, headers=self.headers, json={"prefixes": paths})
        if response.status_code != 200:
             # It seems DELETE returns 200 on success with deleted objects list
             raise Exception(f"Failed to delete file: {response.status_code} {response.text}")
        return response.json()

    def upload(self, path: str, file_content: bytes, content_type: str = "application/octet-stream", upsert: bool = False):
        # POST /storage/v1/object/{bucket}/{path}
        url = f"{self.url}/storage/v1/object/{self.bucket}/{path}"
        
        # Headers for upload
        headers = self.headers.copy()
        headers["Content-Type"] = content_type
        headers["x-upsert"] = "true" if upsert else "false"
        
        response = httpx.post(url, headers=headers, content=file_content)
        if response.status_code != 200:
            raise Exception(f"Failed to upload file: {response.status_code} {response.text}")
        return response.json()

    def download(self, path: str):
        # GET /storage/v1/object/public/{bucket}/{path} or authorized?
        # Standard download is /storage/v1/object/{bucket}/{path}
        # But for signed/private, we need auth header which we have.
        # Note: 'authenticated' download logic implies we send the Bearer token.
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
        
        # PostgREST
        self.postgrest = SyncPostgrestClient(f"{url}/rest/v1", headers=self.headers)
        
        # GoTrue
        self.auth = SyncGoTrueClient(
            url=f"{url}/auth/v1",
            headers=self.headers
        )
        
        # Storage
        self.storage = StorageClient(url, self.headers)

    def table(self, table_name: str):
        return self.postgrest.from_(table_name)

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
service_key: str = os.environ.get("SERVICE_ROLE_KEY")

if not url or not key:
    raise ValueError("Supabase URL and Key must be set in .env")

# Standard client
supabase = SupabaseClient(url, key)

# Admin client
supabase_admin = None
if service_key:
    supabase_admin = SupabaseClient(url, service_key)

def get_supabase() -> SupabaseClient:
    return supabase

def get_supabase_admin() -> SupabaseClient:
    if not supabase_admin:
        raise ValueError("SERVICE_ROLE_KEY not set in .env")
    return supabase_admin

