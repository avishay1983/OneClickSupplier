import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from db.json_store import JsonStore
import json

# Setup temp data dir
test_dir = "./backend/data/test_upsert"
os.makedirs(test_dir, exist_ok=True)
store = JsonStore(test_dir)

table = "test_settings"
table_path = os.path.join(test_dir, f"{table}.json")

# 1. Initial Insert
initial_data = [
    {"setting_key": "k1", "setting_value": "v1", "id": "1"},
    {"setting_key": "k2", "setting_value": "v2", "id": "2"}
]
with open(table_path, "w") as f:
    json.dump(initial_data, f)

print("Starting test...")

try:
    # 2. Upsert on setting_key
    res = store.table(table).upsert({"setting_key": "k1", "setting_value": "updated_v1"}, on_conflict="setting_key").execute()
    print("Upsert success!")
    
    # 3. Verify
    with open(table_path, "r") as f:
        final_data = json.load(f)
    print(f"Final data: {final_data}")
    
    if len(final_data) == 2 and final_data[0]["setting_value"] == "updated_v1":
        print("TEST PASSED!")
    else:
        print("TEST FAILED: Data mismatch or duplicate created.")

except Exception as e:
    print(f"TEST FAILED with error: {e}")
