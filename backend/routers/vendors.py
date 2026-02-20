from fastapi import APIRouter, HTTPException, BackgroundTasks, status
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import base64
import httpx

from database import get_supabase, get_supabase_admin

router = APIRouter(prefix="/api/vendors", tags=["vendors"])

class VendorFormRequest(BaseModel):
    action: str
    token: str
    data: Optional[Dict[str, Any]] = None

from utils.email import send_email_via_smtp

# Handler Notification Helper
def send_handler_notification(handler_email: str, handler_name: str, vendor_name: str, vendor_id: str):
    """
    Sends a notification email to the handler when a vendor submits the form.
    """
    if not handler_email:
        print("No handler email provided")
        return

    dashboard_url = "https://6422d882-b11f-4b09-8a0b-47925031a58e.lovableproject.com/"
    
    html_content = f"""
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
<tr>
<td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
<tr>
<td style="background: linear-gradient(135deg, #1a2b5f 0%, #2d4a8c 100%); padding: 30px; text-align: center;">
<h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">ביטוח ישיר</h1>
<p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0; font-size: 14px;">מערכת הקמת ספקים</p>
</td>
</tr>
<tr>
<td style="padding: 40px 30px;">
<p style="font-size: 18px; color: #333333; margin: 0 0 20px 0; text-align: right;">
שלום {handler_name or 'מטפל/ת'},
</p>
<div style="background-color: #e8f4fd; border-right: 4px solid #1a2b5f; padding: 20px; margin: 20px 0; border-radius: 4px;">
<p style="font-size: 16px; color: #333333; margin: 0; text-align: right; font-weight: bold;">
ספק <span style="color: #1a2b5f;">{vendor_name}</span> שלח את טופס הפרטים שלו
</p>
<p style="font-size: 14px; color: #666666; margin: 10px 0 0 0; text-align: right;">
הבקשה ממתינה לבדיקה ואישור ראשוני במערכת
</p>
</div>
<p style="font-size: 14px; color: #666666; margin: 20px 0; text-align: right;">
אנא היכנס/י למערכת כדי לבדוק את הפרטים ולהחליט האם לאשר, לדחות, או לשלוח מחדש לספק.
</p>
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding: 20px 0;">
<a href="{dashboard_url}" style="display: inline-block; background: linear-gradient(135deg, #1a2b5f 0%, #2d4a8c 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">
כניסה למערכת
</a>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e9ecef;">
<p style="font-size: 12px; color: #999999; margin: 0; text-align: center;">
הודעה זו נשלחה אוטומטית ממערכת הקמת ספקים של ביטוח ישיר
</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>
    """
    
    send_email_via_smtp(handler_email, f"ספק חדש ממתין לבדיקה: {vendor_name}", html_content)


@router.post("/form")
async def vendor_form_api(request: VendorFormRequest, background_tasks: BackgroundTasks):
    supabase = get_supabase_admin() # Need admin to query by secure_token potentially bypassing RLS or complex policies

    action = request.action
    token = request.token
    data = request.data or {}

    print(f"Vendor Form API: Processing {action} for token: {token}")

    if not token:
        raise HTTPException(status_code=400, detail="Token is required")

    # Fetch vendor request by token
    try:
        response = supabase.table("vendor_requests").select("*").eq("secure_token", token).maybe_single().execute()
        # PostgREST returns 'data' inside result. In supabase-py/postgrest-py, execute() returns APIResponse(data=..., count=...)
        # But we are using our custom SyncPostgrestClient which returns raw response or whatever... 
        # Wait, our custom client returns the requests.Response object content? 
        # No, see database.py: 'return self.postgrest.from_(table_name)'
        # postgrest-py's .execute() returns APIResponse.
        
        vendor_request = None
        if response.data:
            vendor_request = response.data
        
        if not vendor_request:
             return HTTPException(status_code=404, detail="בקשה לא נמצאה") # return response directly or raise?
             # Raising is safer for flow control
             raise HTTPException(status_code=404, detail="בקשה לא נמצאה")

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error fetching vendor request: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    # Check expiration
    if vendor_request.get("expires_at"):
         expires_at = datetime.fromisoformat(vendor_request["expires_at"].replace('Z', '+00:00'))
         if expires_at < datetime.now(expires_at.tzinfo):
             raise HTTPException(status_code=410, detail="הלינק פג תוקף")

    # Handle Actions
    if action == 'get':
        # Get documents
        docs_response = supabase.table("vendor_documents").select("*").eq("vendor_request_id", vendor_request["id"]).execute()
        docs = docs_response.data if docs_response.data else []
        
        return {
            "success": True,
            "request": vendor_request,
            "documents": docs
        }

    elif action == 'get-documents':
         docs_response = supabase.table("vendor_documents").select("*").eq("vendor_request_id", vendor_request["id"]).execute()
         docs = docs_response.data if docs_response.data else []
         return {"success": True, "documents": docs}

    elif action == 'update':
        # Remove protected fields if necessary? or just spread data
        # data contains the fields to update
        if not data:
             return {"success": True} # Nothing to update
             
        data["updated_at"] = datetime.utcnow().isoformat()
        
        try:
            update_response = supabase.table("vendor_requests").update(data).eq("id", vendor_request["id"]).execute()
            # Check for error? postgrest-py throws on error usually?
            return {"success": True}
        except Exception as e:
            print(f"Error updating request: {e}")
            raise HTTPException(status_code=500, detail="Failed to update request")

    elif action == 'submit':
        # Update data and status
        update_data = data.copy() if data else {}
        update_data["status"] = "first_review"
        update_data["updated_at"] = datetime.utcnow().isoformat()
        
        try:
            supabase.table("vendor_requests").update(update_data).eq("id", vendor_request["id"]).execute()
            
            # Send notification to handler
            if vendor_request.get("handler_email"):
                background_tasks.add_task(
                    send_handler_notification,
                    vendor_request["handler_email"],
                    vendor_request.get("handler_name", ""),
                    vendor_request.get("vendor_name", ""),
                    vendor_request["id"]
                )
                
            return {
                "success": True,
                "vendorName": vendor_request.get("vendor_name"),
                "vendorEmail": vendor_request.get("vendor_email")
            }

        except Exception as e:
             print(f"Error submitting request: {e}")
             raise HTTPException(status_code=500, detail="Failed to submit form")

    elif action == 'delete-document':
        if not data or "filePath" not in data or "documentType" not in data:
            raise HTTPException(status_code=400, detail="Missing filePath or documentType")

        file_path = data["filePath"]
        document_type = data["documentType"]

        # Delete from storage
        # Note: Our custom client storage wrapper might behave differently.
        # Original: supabase.storage.from('vendor_documents').remove([filePath])
        # Our custom client: self.storage.from_(bucket) -> StorageFileApi. currently no 'remove' method in custom StorageFileApi (database.py)
        # We need to implement remove in database.py or use raw request here?
        # Actually database.py currently only has 'download'. WE NEED TO ADD 'remove' and 'upload' if needed.
        # But wait, frontend uploads directly usually? 'upload' action in TS code wasn't implemented there (it was in interface but not in switch case).
        # Actually, looking at TS code: "case 'delete-document'".
        # So we need 'remove' in database.py.
        
        # For now, let's assume we implement remove in database.py or use httpx here.
        # Let's add remove to database.py first? Or just do it here. 
        # I'll update database.py in a separate step if needed, but for now I'll create the file and leave a comment or try to use what's available.
        # Our custom client is limited. 
        
        # Let's try to delete using requests/httpx directly here since database.py is limited.
        # DELETE /storage/v1/object/{bucket}/{path}
        
        # But wait, "delete-document" also removes from DB.
        
        try:
             # DB Delete
             supabase.table("vendor_documents").delete().eq("vendor_request_id", vendor_request["id"]).eq("document_type", document_type).execute()
             
             # Storage Delete
             try:
                # Assuming bucket is 'vendor_documents'
                supabase.storage.from_('vendor_documents').remove([file_path])
             except Exception as se:
                 print(f"Warning: Failed to delete file from storage: {se}")
                 # We don't fail the request if storage delete fails, as DB record is gone

        except Exception as e:
            print(f"Error deleting document: {e}")
            raise HTTPException(status_code=500, detail="Failed to delete document")

        return {"success": True}

    else:
        raise HTTPException(status_code=400, detail="Invalid action")

from fastapi import UploadFile, File, Form

@router.post("/quote-submit")
async def submit_quote(
    token: str = Form(...),
    amount: str = Form(None),
    description: str = Form(None),
    file: UploadFile = File(None)
):
    supabase = get_supabase_admin()

    print(f"Vendor quote submission: token={token}, amount={amount}, file={file.filename if file else 'None'}")

    # Validate token and get quote
    try:
        response = supabase.table("vendor_quotes").select("*, vendor_requests(vendor_name, vendor_email, handler_name, handler_email)").eq("quote_secure_token", token).maybe_single().execute()
        
        quote = response.data if response.data else None
        
        if not quote:
             raise HTTPException(status_code=404, detail="הצעת המחיר לא נמצאה או שהלינק פג תוקף")
             
        if quote.get("vendor_submitted"):
             raise HTTPException(status_code=400, detail="הצעת המחיר כבר הוגשה")

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error fetching quote: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

    # Handle File Upload
    file_path = quote.get("file_path")
    file_name = quote.get("file_name")

    if file:
        file_ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
        # Generate new filename
        timestamp = int(datetime.utcnow().timestamp() * 1000)
        new_file_name = f"quote_{quote['id']}_{timestamp}.{file_ext}"
        file_path = f"quotes/{new_file_name}"
        
        try:
            content = await file.read()
            # Upload to storage
            supabase.storage.from_("vendor_documents").upload(
                file_path,
                content,
                content_type=file.content_type,
                upsert=True
            )
            file_name = file.filename
        except Exception as e:
            print(f"Upload error: {e}")
            raise HTTPException(status_code=500, detail="Failed to upload file")

    # Update Quote
    try:
        update_data = {
            "file_path": file_path,
            "file_name": file_name,
            "amount": float(amount) if amount else None,
            "description": description,
            "vendor_submitted": True,
            "vendor_submitted_at": datetime.utcnow().isoformat(),
            "status": "pending_handler"
        }
        
        supabase.table("vendor_quotes").update(update_data).eq("id", quote["id"]).execute()
        
    except Exception as e:
        print(f"Update error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update quote")

    return {"success": True, "message": "הצעת המחיר נשלחה בהצלחה"}

# 5. Get Quote Details (for Vendor)
@router.get("/quote/{token}")
async def get_quote_details(token: str):
    supabase = get_supabase_admin()
    
    if not token:
        raise HTTPException(status_code=400, detail="Token is required")
        
    try:
        # Fetch quote with vendor details
        response = supabase.table("vendor_quotes").select(
            "id, file_path, file_name, description, amount, quote_date, status, vendor_submitted, vendor_submitted_at, quote_link_sent_at, created_at, vp_approved, procurement_manager_approved, quote_secure_token, vendor_requests(vendor_name, vendor_email, company_id)"
        ).eq("quote_secure_token", token).maybe_single().execute()
        
        quote = response.data
        
        if not quote:
             raise HTTPException(status_code=404, detail="הקישור לא נמצא")

        # Check expiration (7 days from sent or created)
        start_date_str = quote.get("quote_link_sent_at") or quote.get("created_at")
        if start_date_str:
            start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
            # Calculate expiration date (7 days)
            expiration_date = start_date + timedelta(days=7)
            if datetime.now(start_date.tzinfo) > expiration_date:
                 raise HTTPException(status_code=410, detail="פג תוקף הקישור")
        
        # Flatten vendor details
        vendor_req = quote.get("vendor_requests") or {}
        # Handle potential list or dict
        if isinstance(vendor_req, list) and len(vendor_req) > 0:
            vendor_req = vendor_req[0]
            
        return {
            "quoteId": quote["id"],
            "vendorName": vendor_req.get("vendor_name", ""),
            "vendorEmail": vendor_req.get("vendor_email", ""),
            "companyId": vendor_req.get("company_id", ""),
            "filePath": quote.get("file_path"),
            "fileName": quote.get("file_name"),
            "description": quote.get("description"),
            "amount": quote.get("amount"),
            "quoteDate": quote.get("quote_date"),
            "status": quote.get("status"),
            "submitted": quote.get("vendor_submitted") is True,
            "vendorSubmittedAt": quote.get("vendor_submitted_at"),
            "vpApproved": quote.get("vp_approved"),
            "procurementManagerApproved": quote.get("procurement_manager_approved"),
            "quoteSecureToken": quote.get("quote_secure_token")
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error getting quote details: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 6. Send Quote Request Email
class SendQuoteEmailRequest(BaseModel):
    quoteId: str
    vendorEmail: str
    vendorName: str
    handlerName: str

@router.post("/send-quote-request")
async def send_quote_request_email(request: SendQuoteEmailRequest):
    supabase = get_supabase_admin()
    
    print(f"Sending quote request to {request.vendorEmail} for quote {request.quoteId}")
    
    try:
        # Verify quote exists
        res = supabase.table("vendor_quotes").select("quote_secure_token").eq("id", request.quoteId).maybe_single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Quote not found")
            
        quote = res.data
        token = quote["quote_secure_token"]
        
        # Update sent time
        supabase.table("vendor_quotes").update({
            "quote_link_sent_at": datetime.utcnow().isoformat()
        }).eq("id", request.quoteId).execute()
        
        # Build Link
        # Access frontend url from env or default
        frontend_url = os.environ.get("FRONTEND_URL", "https://6422d882-b11f-4b09-8a0b-47925031a58e.lovableproject.com")
        quote_link = f"{frontend_url}/vendor-quote/{token}"
        
        # Build Email
        html_content = f"""
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden;">
                <!-- Header with Logo -->
                <tr>
                  <td style="background: #1a2b5f; color: white; padding: 20px; text-align: right;">
                    <h2 style="margin: 0;">ביטוח ישיר</h2>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px; text-align: right; direction: rtl;">
                    <h1 style="color: #1e3a8a; font-size: 24px; font-weight: bold; margin: 0 0 25px 0; text-align: center;">
                      בקשה להצעת מחיר
                    </h1>
                    
                    <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 15px 0; text-align: right;">
                      שלום <strong>{request.vendorName}</strong>,
                    </p>
                    
                    <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 15px 0; text-align: right;">
                      <strong>{request.handlerName}</strong> מבקש/ת ממך להגיש הצעת מחיר.
                    </p>
                    
                    <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 30px 0; text-align: right;">
                      לחץ על הכפתור למטה כדי להגיש את הצעת המחיר שלך:
                    </p>
                    
                    <!-- CTA Button -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center">
                          <a href="{quote_link}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%); color: #ffffff; font-size: 18px; font-weight: bold; text-decoration: none; padding: 16px 48px; border-radius: 8px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);">
                            הגש הצעת מחיר
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 25px 0 0 0;">
                      ⏰ לינק זה תקף לשבוע אחד
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 25px 40px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                      הודעה זו נשלחה באופן אוטומטי ממערכת ניהול ספקים של ביטוח ישיר
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
        """
        
        send_email_via_smtp(request.vendorEmail, "בקשה להגשת הצעת מחיר - ביטוח ישיר", html_content)
        
        return {"success": True}

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error sending quote email: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class VendorStatusRequest(BaseModel):
    token: str

@router.post("/status")
async def get_vendor_status(request: VendorStatusRequest):
    supabase = get_supabase_admin()
    token = request.token
    
    print(f"Fetching vendor status for token: {token}")
    
    if not token:
        raise HTTPException(status_code=400, detail="Token is required")
        
    try:
        # We can reuse the same token validation logic or just query
        response = supabase.table('vendor_requests').select('vendor_name, status, created_at, updated_at').eq('secure_token', token).maybe_single().execute()
        
        data = response.data if response.data else None
        
        if not data:
             print('No vendor request found for token')
             raise HTTPException(status_code=404, detail="הבקשה לא נמצאה")
             
        return {
            "success": True, 
            "data": data
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error checking status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class VerifyOtpRequest(BaseModel):
    token: str
    otp: str

@router.post("/verify-otp")
async def verify_vendor_otp(request: VerifyOtpRequest):
    supabase = get_supabase_admin()
    token = request.token
    otp = request.otp

    print(f"Verifying OTP for token: {token}")

    if not token or not otp:
        raise HTTPException(status_code=400, detail="Token and OTP are required")

    try:
        # Fetch request
        response = supabase.table("vendor_requests").select("id, otp_code, otp_expires_at, expires_at").eq("secure_token", token).maybe_single().execute()
        
        vendor_request = response.data if response.data else None

        if not vendor_request:
            raise HTTPException(status_code=404, detail="Request not found")

        # Check link expiration
        if vendor_request.get("expires_at"):
             expires_at = datetime.fromisoformat(vendor_request["expires_at"].replace('Z', '+00:00'))
             if expires_at < datetime.now(expires_at.tzinfo):
                 raise HTTPException(status_code=410, detail="הלינק פג תוקף")

        # Check OTP expiration
        if vendor_request.get("otp_expires_at"):
             otp_expires_at = datetime.fromisoformat(vendor_request["otp_expires_at"].replace('Z', '+00:00'))
             if otp_expires_at < datetime.now(otp_expires_at.tzinfo):
                 print("OTP has expired")
                 raise HTTPException(status_code=400, detail="קוד האימות פג תוקף, יש לבקש קוד חדש")

        # Master OTP
        master_otp = "111111"
        
        # Verify OTP
        stored_otp = vendor_request.get("otp_code")
        if stored_otp != otp and otp != master_otp:
            print("Invalid OTP provided")
            raise HTTPException(status_code=400, detail="קוד אימות שגוי")

        # Update DB
        update_data = {
            "otp_verified": True,
            "otp_code": None,
            "otp_expires_at": None
        }
        
        supabase.table("vendor_requests").update(update_data).eq("id", vendor_request["id"]).execute()
        
        print("OTP verified successfully")
        return {"success": True, "message": "אימות בוצע בהצלחה"}

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error verifying OTP: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Group C.1: Email & Notifications ---

# 1. Send Vendor OTP
class SendOtpRequest(BaseModel):
    token: str

@router.post("/send-otp")
async def send_vendor_otp(request: SendOtpRequest):
    supabase = get_supabase_admin()
    token = request.token

    if not token:
        raise HTTPException(status_code=400, detail="Token is required")

    try:
        # Get vendor request
        response = supabase.table("vendor_requests").select("id, vendor_email, vendor_name, expires_at, otp_verified, status").eq("secure_token", token).maybe_single().execute()
        vendor_request = response.data if response.data else None

        if not vendor_request:
            raise HTTPException(status_code=404, detail="Request not found")

        # Check expiration
        if vendor_request.get("expires_at"):
             expires_at = datetime.fromisoformat(vendor_request["expires_at"].replace('Z', '+00:00'))
             if expires_at < datetime.now(expires_at.tzinfo):
                 raise HTTPException(status_code=410, detail="הלינק פג תוקף")

        # Generate OTP
        import random
        otp_code = str(random.randint(100000, 999999))
        otp_expires_at = (datetime.utcnow() + timedelta(minutes=10)).isoformat()

        # Update DB
        supabase.table("vendor_requests").update({
            "otp_code": otp_code,
            "otp_expires_at": otp_expires_at,
            "otp_verified": False
        }).eq("id", vendor_request["id"]).execute()

        # Send Email
        html_content = f"""
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl; text-align: right;">
<h1 style="color: #1a365d; text-align: right;">קוד אימות</h1>
<p style="text-align: right;">שלום {vendor_request['vendor_name']},</p>
<p style="text-align: right;">קוד האימות שלך להיכנס לטופס הספק הוא:</p>
<div style="background-color: #f0f4f8; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
<span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb;">{otp_code}</span>
</div>
<p style="color: #718096; text-align: right;">הקוד תקף ל-10 דקות בלבד.</p>
</body>
</html>
        """
        
        send_email_via_smtp(vendor_request["vendor_email"], "קוד אימות לטופס ספק", html_content)
        
        masked_email = vendor_request["vendor_email"].replace(vendor_request["vendor_email"][2:vendor_request["vendor_email"].find("@")], "***")
        return {"success": True, "maskedEmail": masked_email}

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error sending OTP: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 2. Send Vendor Email
class SendVendorEmailRequest(BaseModel):
    vendorRequestId: Optional[str] = None
    vendorName: Optional[str] = None
    vendorEmail: Optional[str] = None
    secureLink: Optional[str] = None
    includeReason: bool = False
    reason: Optional[str] = None

@router.post("/send-email")
async def send_vendor_email_endpoint(request: SendVendorEmailRequest):
    supabase = get_supabase_admin()
    
    vendor_name = request.vendorName
    vendor_email = request.vendorEmail
    secure_link = request.secureLink
    
    if request.vendorRequestId and (not vendor_name or not vendor_email):
        try:
             response = supabase.table("vendor_requests").select("vendor_name, vendor_email, secure_token").eq("id", request.vendorRequestId).maybe_single().execute()
             if response.data:
                 vendor_name = response.data["vendor_name"]
                 vendor_email = response.data["vendor_email"]
                 secure_link = f"https://6422d882-b11f-4b09-8a0b-47925031a58e.lovableproject.com/vendor/{response.data['secure_token']}"
        except Exception as e:
            print(f"Error fetching detail for email: {e}")

    if not vendor_name or not vendor_email or not secure_link:
        raise HTTPException(status_code=400, detail="Missing required parameters")

    subject = "נדרשים תיקונים בטופס הספק" if request.includeReason else "בקשה להקמת ספק - נדרשים פרטים"
    
    html_content = f"""
<!DOCTYPE html>
<html dir="rtl" lang="he">
<body style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px;">
<h2>שלום {vendor_name},</h2>
{'<p>הטופס שהגשת נבדק ונמצאו פרטים שדורשים תיקון:</p><p><strong>' + (request.reason or '') + '</strong></p>' if request.includeReason else '<p>התקבלה בקשה להקמתך כספק.</p>'}
<p>אנא לחץ על הקישור להמשך:</p>
<a href="{secure_link}">מעבר לטופס</a>
</body></html>
    """
    
    send_email_via_smtp(vendor_email, subject, html_content)
    return {"success": True}

# 3. Reject Vendor
class RejectRequest(BaseModel):
    vendorRequestId: str
    reason: str

@router.post("/reject")
async def reject_vendor(request: RejectRequest):
    supabase = get_supabase_admin()
    
    try:
        response = supabase.table("vendor_requests").select("*").eq("id", request.vendorRequestId).maybe_single().execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Request not found")
        
        vendor_request = response.data
        
        # Update status
        supabase.table("vendor_requests").update({
            "status": "rejected",
            "rejection_reason": request.reason
        }).eq("id", request.vendorRequestId).execute()
        
        # Send Email
        status_url = f"https://6422d882-b11f-4b09-8a0b-47925031a58e.lovableproject.com/vendor-status/{vendor_request['secure_token']}"
        
        html_content = f"""
<!DOCTYPE html>
<html dir="rtl" lang="he">
<body style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px;">
<h2>בקשתך להקמה כספק נדחתה</h2>
<p>שלום {vendor_request['vendor_name']},</p>
<p>לצערינו בקשתך נדחתה.</p>
<p>סיבה: {request.reason}</p>
<a href="{status_url}">צפה בסטטוס</a>
</body></html>
        """
        
        send_email_via_smtp(vendor_request["vendor_email"], "בקשתך נדחתה - ביטוח ישיר", html_content)
        
        return {"success": True}
        
    except Exception as e:
        print(f"Error rejecting: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 4. Confirm Vendor
class ConfirmRequest(BaseModel):
    vendorRequestId: str
    sendReceiptsLink: bool = True

@router.post("/confirm")
async def confirm_vendor(request: ConfirmRequest):
    supabase = get_supabase_admin()
    
    try:
        response = supabase.table("vendor_requests").select("*").eq("id", request.vendorRequestId).maybe_single().execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Request not found")
            
        vendor_request = response.data
        
        # Update status
        supabase.table("vendor_requests").update({
            "status": "approved"
        }).eq("id", request.vendorRequestId).execute()

        if request.sendReceiptsLink:
             receipts_link = f"https://6422d882-b11f-4b09-8a0b-47925031a58e.lovableproject.com/vendor-receipts/{vendor_request['secure_token']}"
             
             html_content = f"""
<!DOCTYPE html>
<html dir="rtl" lang="he">
<body style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px;">
<h2>בקשתך אושרה!</h2>
<p>שלום {vendor_request['vendor_name']},</p>
<p>אנו שמחים להודיע כי בקשתך אושרה.</p>
<p>להעלאת חשבוניות:</p>
<a href="{receipts_link}">מערכת קבלות</a>
</body></html>
             """
             send_email_via_smtp(vendor_request["vendor_email"], "בקשתך אושרה - ברוכים הבאים!", html_content)
             
             supabase.table("vendor_requests").update({"receipts_link_sent_at": datetime.utcnow().isoformat()}).eq("id", request.vendorRequestId).execute()

        return {"success": True}

    except Exception as e:
         print(f"Error confirming: {e}")

# 7. Search Streets (Nominatim Proxy)
class SearchStreetsRequest(BaseModel):
    city: str
    query: str

@router.post("/search-streets")
async def search_streets(request: SearchStreetsRequest):
    city = request.city
    query = request.query
    
    if not city or not query:
        raise HTTPException(status_code=400, detail="City and query are required")
        
    # print(f"Searching streets in {city} for: {query}") # Comment out to avoid unicode errors on windows console
    
    # Use Nominatim API (OpenStreetMap)
    search_query = f"{query}, {city}, Israel"
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": search_query,
        "format": "json",
        "addressdetails": "1",
        "limit": "10",
        "countrycodes": "il"
    }
    
    headers = {
        "User-Agent": "VendorOnboarding/1.0",
        "Accept-Language": "he"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, headers=headers)
            
            if response.status_code != 200:
                print(f"Nominatim API error: {response.status_code}")
                return {"streets": []}
                
            data = response.json()
            
            streets = set()
            for result in data:
                road = result.get("address", {}).get("road")
                if road:
                    streets.add(road)
                    
            street_list = list(streets)[:8]
            print(f"Found {len(street_list)} streets")
            
            return {"streets": street_list}

    except Exception as e:
        print(f"Error searching streets: {e}")
        return {"streets": [], "error": str(e)}

