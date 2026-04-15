import requests
import json
import uuid

BASE_URL = "http://localhost:8000"

def test_quote_flow():
    # 1. Insert a quote via generic data router
    quote_id = str(uuid.uuid4())
    payload = {
        "operation": "insert",
        "body": {
            "id": quote_id,
            "vendor_request_id": "511f946f-514e-4e1c-b828-8faf618ac2cb",
            "status": "pending_vendor",
            "vendor_submitted": False
        }
    }
    
    print(f"Testing insert to vendor_quotes for ID: {quote_id}...")
    res = requests.post(f"{BASE_URL}/api/data/vendor_quotes", json=payload)
    print(f"Insert Response: {res.status_code}")
    print(res.json())
    
    if res.status_code != 200:
        return

    # 2. Check if token was generated
    print("\nChecking if token exists...")
    res = requests.post(f"{BASE_URL}/api/data/vendor_quotes", json={
        "operation": "select",
        "filters": [{"type": "eq", "column": "id", "value": quote_id}],
        "single": True
    })
    data = res.json().get("data", {})
    token = data.get("quote_secure_token")
    print(f"Generated Token: {token}")
    
    if not token:
        print("FAILED: Token was not generated automatically!")
        return

    # 3. Trigger email
    print("\nTriggering email...")
    email_payload = {
        "quoteId": quote_id,
        "vendorEmail": "avishay.elankry@gmail.com",
        "vendorName": "Moshe Test",
        "handlerName": "Antigravity Admin"
    }
    res = requests.post(f"{BASE_URL}/api/vendors/send-quote-request", json=email_payload)
    print(f"Email Response: {res.status_code}")
    print(res.json())

if __name__ == "__main__":
    test_quote_flow()
