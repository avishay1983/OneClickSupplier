import json
import os

file_path = "c:\\Users\\avish\\.gemini\\antigravity\\scratch\\lovableOneClickSupplier\\backend\\data\\app_settings.json"

if os.path.exists(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    # Keep track of unique keys and only the latest one (last in file)
    unique_settings = {}
    for item in data:
        key = item.get("setting_key")
        if key:
            unique_settings[key] = item
    
    deduplicated = list(unique_settings.values())
    
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(deduplicated, f, ensure_ascii=False, indent=2)
    
    print(f"Deduplicated app_settings.json. Original: {len(data)}, New: {len(deduplicated)}")
else:
    print("File not found.")
