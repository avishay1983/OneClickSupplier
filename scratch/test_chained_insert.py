import requests
import json
import uuid

BASE_URL = "http://localhost:8000"

def test_insert_select_single():
    # 1. Simulate frontend sham's chained call: insert().select('id').single()
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
    
    print(f"Testing insert + select + single for quote_id: {quote_id}...")
    res = requests.post(f"{BASE_URL}/api/data/vendor_quotes", json=payload)
    print(f"Response Status: {res.status_code}")
    
    data = res.json().get("data", {})
    print(f"Returned Data: {json.dumps(data, indent=2)}")
    
    if isinstance(data, dict) and data.get("id") == quote_id and data.get("quote_secure_token"):
        print("SUCCESS: Received single object with ID and Token.")
    else:
        print("FAILED: Did not receive expected single object structure.")

if __name__ == "__main__":
    test_insert_select_single()
