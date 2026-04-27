import asyncio
import httpx
import uuid
from datetime import datetime
from database import get_supabase_admin

BASE_URL = "http://127.0.0.1:8000"

async def verify_full_flow():
    print("Starting End-to-End Verification...")
    supabase = get_supabase_admin()
    
    # 1. Setup: Create a new vendor request (simulating initial request)
    vendor_email = f"e2e_vendor_{int(datetime.now().timestamp())}@example.com"
    token = str(uuid.uuid4())
    print(f"Creating vendor request for {vendor_email}...")
    
    try:
        data = {
            "vendor_name": "E2E Test Vendor",
            "vendor_email": vendor_email,
            "secure_token": token,
            "status": "pending", # Initial status
            "created_at": datetime.now().isoformat()
        }
        res = supabase.table("vendor_requests").insert(data).execute()
        vendor_id = res.data[0]['id']
        print(f"Vendor created with ID: {vendor_id}")
    except Exception as e:
        print(f"Failed to create vendor: {e}")
        return

    async with httpx.AsyncClient() as client:
        # 2. Vendor Submits Form
        print("\n[Step 1] Vendor submitting form...")
        submit_payload = {
            "action": "submit",
            "token": token,
            "data": {
                "company_id": "512345678",
                "phone": "0501234567"
            }
        }
        res = await client.post(f"{BASE_URL}/api/vendors/form", json=submit_payload)
        print(f"Submit status: {res.status_code}")
        assert res.status_code == 200
        
        # Verify status changed to 'first_review' (or whatever logic dictates, vendors.py sets it to 'first_review')
        vendor_check = supabase.table("vendor_requests").select("status").eq("id", vendor_id).execute()
        print(f"Vendor status after submit: {vendor_check.data[0]['status']}")
        assert vendor_check.data[0]['status'] == "first_review"

        # 3. Manager Approves Vendor
        print("\n[Step 2] Manager approving vendor...")
        # Using the manager-approval endpoint
        # /api/users/manager-approval?action=approve&role=procurement_manager&vendorId=...
        
        # Procurement Manager Approval
        res = await client.get(f"{BASE_URL}/api/users/manager-approval", params={
            "action": "approve",
            "role": "procurement_manager",
            "vendorId": vendor_id
        })
        print(f"Procurement approval status: {res.status_code}") # Should differ based on redirect, usually 307
        
        # VP Approval (if required, let's assume default might need it or just check if status became approved)
        # Check if status is approved
        vendor_check = supabase.table("vendor_requests").select("status, procurement_manager_approved").eq("id", vendor_id).execute()
        print(f"Status after procurement approval: {vendor_check.data[0]}")
        
        if vendor_check.data[0]['status'] != 'approved':
            print("Needing VP approval...")
            res = await client.get(f"{BASE_URL}/api/users/manager-approval", params={
                "action": "approve",
                "role": "vp",
                "vendorId": vendor_id
            })
            print(f"VP approval status: {res.status_code}")
            
        # Verify Final Approval
        vendor_check = supabase.table("vendor_requests").select("status").eq("id", vendor_id).execute()
        final_status = vendor_check.data[0]['status']
        print(f"Final Vendor Status: {final_status}")
        assert final_status == "approved"

        # 4. Vendor Uploads Receipt
        print("\n[Step 3] Approved vendor uploading receipt...")
        dummy_file = b"E2E Receipt Content"
        files = {"file": ("e2e_receipt.png", dummy_file, "image/png")}
        data = {"token": token, "amount": "500", "description": "E2E Test", "receipt_date": datetime.now().strftime("%Y-%m-%d")}
        
        res = await client.post(f"{BASE_URL}/api/receipts/upload", data=data, files=files)
        print(f"Upload status: {res.status_code}")
        print(f"Upload response: {res.json()}")
        assert res.status_code == 200

        # 5. List Receipts
        print("\n[Step 4] Listing receipts...")
        res = await client.get(f"{BASE_URL}/api/receipts/", params={"token": token})
        receipts = res.json()["receipts"]
        print(f"Receipts found: {len(receipts)}")
        assert len(receipts) > 0
        print(f"Receipt ID: {receipts[0]['id']}")

    # Cleanup
    print("\nCleaning up...")
    supabase.table("vendor_requests").delete().eq("id", vendor_id).execute()
    # Note: Documents cascade delete usually or stay. For simulation we leave them or delete manually if we tracked them.
    print("E2E Verification Complete!")

if __name__ == "__main__":
    asyncio.run(verify_full_flow())
