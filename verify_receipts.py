import asyncio
import httpx
import os
from database import get_supabase_admin
from datetime import datetime

# Adjust URL if needed
BASE_URL = "http://127.0.0.1:8000"

async def verify():
    print("Starting verification...")
    supabase = get_supabase_admin()
    
    # 1. Create Test Vendor
    print("Creating test vendor...")
    vendor_email = f"test_vendor_{int(datetime.now().timestamp())}@example.com"
    import uuid
    token = str(uuid.uuid4())
    
    try:
        data = {
            "vendor_name": "Test Vendor",
            "vendor_email": vendor_email,
            "secure_token": token,
            "status": "approved" # Must be approved for receipts
        }
        res = supabase.table("vendor_requests").insert(data).execute()
        vendor = res.data[0]
        print(f"Vendor created: {vendor['id']}")
    except Exception as e:
        print(f"Failed to create vendor: {e}")
        return

    # 2. List Receipts (Empty)
    print("Listing receipts (should be empty)...")
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{BASE_URL}/api/receipts/", params={"token": token})
        print(f"List status: {res.status_code}")
        print(f"List response: {res.json()}")
        assert res.status_code == 200
        assert len(res.json()["receipts"]) == 0

    # 3. Upload Receipt
    print("Uploading receipt...")
    dummy_file_content = b"fake receipt content"
    files = {"file": ("receipt.txt", dummy_file_content, "text/plain")}
    data = {"token": token, "amount": "100", "description": "Test Receipt"}
    
    async with httpx.AsyncClient() as client:
        res = await client.post(f"{BASE_URL}/api/receipts/upload", data=data, files=files)
        print(f"Upload status: {res.status_code}")
        print(f"Upload response: {res.json()}")
        assert res.status_code == 200

    # 4. List Receipts (Should have 1)
    print("Listing receipts (should have 1)...")
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{BASE_URL}/api/receipts/", params={"token": token})
        data = res.json()
        print(f"List response: {data}")
        assert len(data["receipts"]) == 1
        receipt = data["receipts"][0]
        receipt_id = receipt["id"]
        file_path = receipt["file_path"]

    # 5. Delete Receipt
    print(f"Deleting receipt {receipt_id}...")
    delete_payload = {
        "token": token,
        "receiptId": receipt_id,
        "filePath": file_path
    }
    async with httpx.AsyncClient() as client:
        res = await client.post(f"{BASE_URL}/api/receipts/delete", json=delete_payload)
        print(f"Delete status: {res.status_code}")
        print(f"Delete response: {res.json()}")
        assert res.status_code == 200

    # 6. List Receipts (Empty again)
    print("Listing receipts (should be empty)...")
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{BASE_URL}/api/receipts/", params={"token": token})
        assert len(res.json()["receipts"]) == 0
        
    print("Initial clean up...")
    # Clean up vendor
    supabase.table("vendor_requests").delete().eq("id", vendor['id']).execute()
    print("Verification passed!")

if __name__ == "__main__":
    asyncio.run(verify())
