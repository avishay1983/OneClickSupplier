import requests
import json
import uuid

BASE_URL = "http://localhost:8000"

def test_full_flow():
    # 1. Insert quote
    quote_id = str(uuid.uuid4())
    payload = {
        "operation": "insert",
        "body": {
            "id": quote_id,
            "vendor_request_id": "511f946f-514e-4e1c-b828-8faf618ac2cb",
            "status": "pending_vendor"
        },
        "columns": "id, quote_secure_token",
        "single": True
    }
    
    print(f"1. Inserting quote {quote_id}...")
    res = requests.post(f"{BASE_URL}/api/data/vendor_quotes", json=payload)
    print(f"   Status: {res.status_code}")
    data = res.json().get("data", {})
    print(f"   Data: {json.dumps(data, indent=2)}")
    
    if res.status_code != 200 or not data:
        print("FAILED at insert step")
        return

    # 2. Send email with Hebrew vendor name (this was crashing!)
    print(f"\n2. Sending quote request email...")
    email_payload = {
        "quoteId": quote_id,
        "vendorEmail": "avishay.elankry@gmail.com",
        "vendorName": "\u05de\u05e9\u05d4",
        "handlerName": "\u05d0\u05d1\u05d9\u05e9\u05d9"
    }
    res = requests.post(f"{BASE_URL}/api/vendors/send-quote-request", json=email_payload)
    print(f"   Status: {res.status_code}")
    print(f"   Response: {res.text}")
    
    if res.status_code == 200:
        print("\nSUCCESS! Email sent!")
    else:
        print(f"\nFAILED with status {res.status_code}")

if __name__ == "__main__":
    test_full_flow()
