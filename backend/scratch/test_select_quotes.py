import requests
import json

BASE_URL = "http://localhost:8000"

def test_select_quotes():
    payload = {
        "operation": "select",
        "columns": "*, vendor_requests!inner(vendor_name, vendor_email, handler_name, handler_email)",
        "order_by": "created_at",
        "order_desc": True
    }
    
    print(f"Testing select quotes...")
    res = requests.post(f"{BASE_URL}/api/data/vendor_quotes", json=payload)
    print(f"Status: {res.status_code}")
    print(f"Response: {json.dumps(res.json(), indent=2)}")

if __name__ == "__main__":
    test_select_quotes()
