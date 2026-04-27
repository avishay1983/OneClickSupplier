import os

workspace = "c:/Users/avish/.gemini/antigravity/scratch/lovableOneClickSupplier"
source_path = os.path.join(workspace, "src/components/dashboard/ContractSigningDialog.tsx")
dest_path = os.path.join(workspace, "src/components/crm/QuoteSigningDialog.tsx")

with open(source_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Make basic string replacements
content = content.replace("ContractSigningDialog", "QuoteSigningDialog")
content = content.replace("vendorRequestId", "quoteId")
content = content.replace("contractFilePath", "file_path")
content = content.replace("contract_file_path", "file_path")
content = content.replace("ceoSigned", "vpApproved")
content = content.replace("ceo_signed", "vp_approved")
content = content.replace("ceoSignedAt", "vpApprovedAt")
content = content.replace("ceo_signed_at", "vp_approved_at")
content = content.replace("ceoSignedBy", "vpApprovedBy")
content = content.replace("ceo_signed_by", "vp_approved_by")
content = content.replace("procurementSigned", "procurementApproved")
content = content.replace("procurement_manager_signed", "procurement_manager_approved")
content = content.replace("procurementSignedAt", "procurementApprovedAt")
content = content.replace("procurement_manager_signed_at", "procurement_manager_approved_at")
content = content.replace("procurementSignedBy", "procurementApprovedBy")
content = content.replace("procurement_manager_signed_by", "procurement_manager_approved_by")
content = content.replace("vendor_requests", "vendor_quotes")
content = content.replace("signerRole === 'ceo'", "signerRole === 'vp'")
content = content.replace("setUserRole('ceo')", "setUserRole('vp')")
content = content.replace("setSignerRole('ceo')", "setSignerRole('vp')")
content = content.replace("userRole === 'ceo'", "userRole === 'vp'")
content = content.replace("userRole = 'ceo'", "userRole = 'vp'")
content = content.replace("signerRole !== 'ceo'", "signerRole !== 'vp'")
content = content.replace("import { Download", "import { Download") # placeholder

# Fix the fact that quotes don't have "requires_vp_approval" field.
content = content.replace("data.requires_vp_approval !== false", "true")
content = content.replace("requiresVpApproval: boolean;", "requiresVpApproval: true;")
content = content.replace("requires_vp_approval", "status")

with open(dest_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Created {dest_path}")
