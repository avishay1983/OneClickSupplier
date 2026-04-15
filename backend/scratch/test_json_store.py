import sys
import os
import json
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

sys.stdout.reconfigure(encoding='utf-8')
from db.json_store import JsonStore
store = JsonStore('backend/data')
q = store.table('vendor_quotes').select("*, vendor_requests!inner(vendor_name, vendor_email, handler_name, handler_email)")
res = q.execute()
print(json.dumps(res.data, indent=2))
