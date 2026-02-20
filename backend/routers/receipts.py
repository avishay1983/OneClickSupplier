from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, Body
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, date
import os
from database import get_supabase_admin
from utils.email import send_email_via_smtp

router = APIRouter(prefix="/api/receipts", tags=["receipts"])

# --- Models ---

class ReceiptResponse(BaseModel):
    id: str
    name: str # file name
    file_path: str
    uploaded_at: str
    amount: float
    currency: str = "ILS"
    description: Optional[str] = None
    status: str
    receipt_date: str

class UpdateStatusRequest(BaseModel):
    receiptId: str
    status: str # approved, rejected
    rejectionReason: Optional[str] = None
    token: str # vendor token (or admin token? usually admin does this. But for now let's assume admin uses this API or we verify usage)
    # Actually, status updates are likely done by the System Admin / Procurement Manager on the dashboard.
    # The dashboard uses the functionality. If this is an internal API, we might need different auth.
    # For MVP, assuming the "App" calls this.

class SendLinkRequest(BaseModel):
    vendorId: Optional[str] = None
    email: Optional[str] = None # If we want to send by email directly
    token: Optional[str] = None # If we have the token

# --- Helpers ---

async def get_vendor_by_token(token: str):
    supabase = get_supabase_admin()
    response = supabase.table("vendor_requests").select("id, vendor_name, vendor_email, status, secure_token").eq("secure_token", token).maybe_single().execute()
    vendor = response.data
    
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
        
    return vendor

# --- Endpoints ---

@router.get("/")
async def list_receipts(token: str):
    """
    List all receipts from 'vendor_receipts' table.
    """
    vendor = await get_vendor_by_token(token)
    supabase = get_supabase_admin()
    
    response = supabase.table("vendor_receipts").select("*").eq("vendor_request_id", vendor["id"]).order("created_at", desc=True).execute()
    receipts = response.data if response.data else []
    
    return {"success": True, "receipts": receipts}

@router.post("/upload")
async def upload_receipt(
    token: str = Form(...),
    file: UploadFile = File(...),
    amount: float = Form(...), # Now required
    receipt_date: str = Form(...), # YYYY-MM-DD
    description: Optional[str] = Form(None)
):
    vendor = await get_vendor_by_token(token)
    supabase = get_supabase_admin()
    
    # Upload to Storage
    try:
        file_ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
        timestamp = int(datetime.utcnow().timestamp() * 1000)
        file_path = f"receipts/{vendor['id']}/{timestamp}_{file.filename}"
        
        content = await file.read()
        
        # Upload
        supabase.storage.from_("vendor_documents").upload(
            file_path,
            content,
            content_type=file.content_type
        )
        
        # Insert into vendor_receipts
        receipt_data = {
            "vendor_request_id": vendor["id"],
            "file_path": file_path,
            "file_name": file.filename,
            "amount": amount,
            "receipt_date": receipt_date,
            "description": description,
            "status": "pending"
        }
        
        supabase.table("vendor_receipts").insert(receipt_data).execute()
        
        return {"success": True, "message": "Receipt uploaded successfully"}
        
    except Exception as e:
        print(f"Error uploading receipt: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class DeleteReceiptRequest(BaseModel):
    token: str
    receiptId: str
    filePath: str

@router.post("/delete")
async def delete_receipt(request: DeleteReceiptRequest):
    vendor = await get_vendor_by_token(request.token)
    supabase = get_supabase_admin()
    
    try:
        # Delete from DB
        supabase.table("vendor_receipts").delete().eq("id", request.receiptId).eq("vendor_request_id", vendor["id"]).execute()
        
        # Delete from Storage
        # Note: bucket is still vendor_documents as per upload
        supabase.storage.from_("vendor_documents").remove([request.filePath])
        
        return {"success": True}
        
    except Exception as e:
        print(f"Error deleting receipt: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# New: Send Receipts Link
@router.post("/send-link")
async def send_receipts_link(request: SendLinkRequest):
    supabase = get_supabase_admin()
    
    vendor = None
    if request.token:
        vendor = await get_vendor_by_token(request.token)
    elif request.vendorId:
         res = supabase.table("vendor_requests").select("*").eq("id", request.vendorId).maybe_single().execute()
         vendor = res.data
    
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Generate Link
    token = vendor["secure_token"]
    frontend_url = os.environ.get("FRONTEND_URL", "https://6422d882-b11f-4b09-8a0b-47925031a58e.lovableproject.com")
    link = f"{frontend_url}/vendor-onboarding?token={token}&step=receipts" 
    # Or maybe a dedicated /vendor-receipts/{token} route? 
    # Based on "send-receipts-link" implementation in edge functions likely goes to onboarding or dedicated page.
    # Let's assume onboarding step for now or similar.
    
    # Send Email
    email_html = f"""
    <div dir="rtl" style="font-family: Arial, sans-serif;">
        <h2>שלום {vendor['vendor_name']},</h2>
        <p>נא להעלות את החשבוניות הנדרשות למערכת ספקים.</p>
        <p>לחץ על הקישור הבא לכניסה:</p>
        <a href="{link}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
            מעבר להעלאת חשבוניות
        </a>
        <p>תודה,<br>צוות ביטוח ישיר</p>
    </div>
    """
    
    try:
        send_email_via_smtp(vendor['vendor_email'], "בקשה להעלאת חשבוניות - ביטוח ישיר", email_html)
        
        # Update timestamp
        supabase.table("vendor_requests").update({
            "receipts_link_sent_at": datetime.utcnow().isoformat()
        }).eq("id", vendor["id"]).execute()
        
        return {"success": True, "message": "Link sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending email: {str(e)}")

# New: Update Receipt Status
@router.post("/status")
async def update_receipt_status(request: UpdateStatusRequest):
    # This endpoint is likely called by an Admin manager
    supabase = get_supabase_admin()
    
    try:
        # Update DB
        update_data = {
            "status": request.status,
            "reviewed_at": datetime.utcnow().isoformat()
        }
        if request.rejectionReason:
            update_data["rejection_reason"] = request.rejectionReason
            
        print(f"Updating receipt {request.receiptId} with data: {update_data}")
        
        # Split into update and select because chaining .select() after .update() is not supported in this client version
        supabase.table("vendor_receipts").update(update_data).eq("id", request.receiptId).execute()
        
        # Fetch updated record with vendor details
        res = supabase.table("vendor_receipts").select("*, vendor_requests(vendor_email, vendor_name)").eq("id", request.receiptId).single().execute()
        
        if not res.data:
            raise HTTPException(status_code=404, detail="Receipt not found")
            
        receipt = res.data
        vendor = receipt["vendor_requests"]
        
        # Send Email Notification
        subject = f"עדכון סטטוס חשבונית - {request.status}"
        status_hebrew = "אושרה" if request.status == "approved" else "נדחתה"
        
        email_html = f"""
        <div dir="rtl" style="font-family: Arial, sans-serif;">
            <h2>שלום {vendor['vendor_name']},</h2>
            <p>החשבונית שהעלית (סכום: {receipt['amount']}) <strong>{status_hebrew}</strong>.</p>
            {f'<p>סיבת דחייה: {request.rejectionReason}</p>' if request.status == 'rejected' else ''}
            <p>תודה,<br>צוות ביטוח ישיר</p>
        </div>
        """
        
        send_email_via_smtp(vendor['vendor_email'], subject, email_html)
        
        return {"success": True}
        
    except Exception as e:
        print(f"Error updating status: {e}")
        raise HTTPException(status_code=500, detail=str(e))
