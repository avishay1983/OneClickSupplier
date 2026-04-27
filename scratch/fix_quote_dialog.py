import os

workspace = "c:/Users/avish/.gemini/antigravity/scratch/lovableOneClickSupplier"
dest_path = os.path.join(workspace, "src/components/crm/QuoteSigningDialog.tsx")

with open(dest_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace settings key
content = content.replace("car_manager_email", "procurement_manager_email")

# Replace Edge function endpoint with fastAPI endpoint
# Replace send-manager-approval with fetch API logic
# We'll just replace the whole signing completion logic manually using another script or just replacing string blocks.
