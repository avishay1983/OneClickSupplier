from backend.db import get_db
import json
import os

def test_query():
    db = get_db()
    token = "96d510b7-d064-4124-982e-06d5c01f79ca"
    print(f"Testing query for token: {token}")
    try:
        response = db.table("vendor_quotes").select("*, vendor_requests(vendor_name, vendor_email, handler_name, handler_email)").eq("quote_secure_token", token).maybe_single().execute()
        print(f"Response Data: {response.data}")
    except Exception as e:
        import traceback
        print(f"QUERY FAILED: {e}")
        print(traceback.format_exc())

if __name__ == "__main__":
    test_query()
