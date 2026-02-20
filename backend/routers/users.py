from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from fastapi.responses import JSONResponse, HTMLResponse, RedirectResponse
from database import get_supabase_admin
from datetime import datetime
from pydantic import BaseModel, EmailStr
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
import os
from urllib.parse import urlencode
from typing import Optional, List

router = APIRouter(prefix="/api/users", tags=["users"])

# helper to load env with default
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://6422d882-b11f-4b09-8a0b-47925031a58e.lovableproject.com")

def create_html_response(title: str, message: str, success: bool) -> str:
    bg_color = "#22c55e" if success else "#ef4444"
    icon = "✓" if success else "✗"
    
    return f"""
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>{title}</title>
      <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
          font-family: Arial, sans-serif;
          background: linear-gradient(135deg, #1a2b5f 0%, #2d4a8c 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          direction: rtl;
        }}
        .card {{
          background: white;
          border-radius: 16px;
          padding: 40px;
          max_width: 500px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }}
        .icon {{
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: {bg_color};
          color: white;
          font-size: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }}
        h1 {{
          color: #1a2b5f;
          margin-bottom: 16px;
          font-size: 28px;
        }}
        p {{
          color: #666;
          font-size: 16px;
          line-height: 1.6;
        }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">{icon}</div>
        <h1>{title}</h1>
        <p>{message}</p>
      </div>
    </body>
    </html>
    """

@router.get("/approve")
async def approve_user(
    token: str = Query(..., description="Approval token"),
    action: str = Query(..., regex="^(approve|reject)$"),
    format: str = Query("html", regex="^(json|html)$"),
    is_admin: bool = Query(False, alias="isAdmin")
):
    """
    Approves or rejects a user based on a token.
    This corresponds to the `approve-user` Edge Function.
    """
    try:
        supabase = get_supabase_admin()
        
        # Find the pending approval
        response = supabase.table("pending_approvals").select("*").eq("approval_token", token).eq("status", "pending").maybe_single().execute()
        approval = response.data
        
        if not approval:
            error_msg = "Request not found or already processed"
            if format == "json":
                return JSONResponse(
                    status_code=status.HTTP_404_NOT_FOUND,
                    content={"success": False, "error": error_msg}
                )
            return HTMLResponse(
                content=create_html_response("שגיאה", "הבקשה לא נמצאה או כבר טופלה", False),
                status_code=status.HTTP_404_NOT_FOUND
            )

        if action == "approve":
            # Update profile to approved
            supabase.table("profiles").update({
                "is_approved": True,
                "approved_at": datetime.now().isoformat()
            }).eq("id", approval['user_id']).execute()
            
            # Set user role
            role = "admin" if is_admin else "user"
            supabase.table("user_roles").upsert({
                "user_id": approval['user_id'],
                "role": role
            }, on_conflict="user_id,role").execute()
            
            print(f"User {approval.get('user_email')} approved with role: {role}")
            
            # Update pending approval status
            supabase.table("pending_approvals").update({"status": "approved"}).eq("id", approval['id']).execute()
            
            if format == "json":
                return {"success": True, "message": "User approved", "role": role}
            
            user_name = approval.get('user_name') or approval.get('user_email')
            admin_text = " כמנהל מערכת" if is_admin else ""
            return HTMLResponse(
                content=create_html_response(
                    "הרישום אושר!",
                    f"המשתמש {user_name} אושר בהצלחה{admin_text} וכעת יכול להתחבר למערכת.",
                    True
                )
            )
            
        else: # action == "reject"
            # Update status
            supabase.table("pending_approvals").update({"status": "rejected"}).eq("id", approval['id']).execute()
            
            # Delete user from auth
            try:
                supabase.auth.admin.delete_user(approval['user_id'])
            except Exception as e:
                print(f"Error deleting user: {e}")
                
            print(f"User {approval.get('user_email')} rejected")
            
            if format == "json":
                return {"success": True, "message": "User rejected"}
                
            user_name = approval.get('user_name') or approval.get('user_email')
            return HTMLResponse(
                content=create_html_response(
                    "הרישום נדחה",
                    f"הרישום של {user_name} נדחה והמשתמש הוסר מהמערכת.",
                    True
                )
            )

    except Exception as e:
        print(f"Error in approve-user: {e}")
        error_msg = str(e)
        if format == "json":
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"success": False, "error": error_msg}
            )
        return HTMLResponse(
            content=create_html_response("שגיאה", "שגיאת מערכת", False),
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# --- Shared Email Logic ---

def send_email_via_smtp(to_email: str, subject: str, html_content: str, attachment: dict = None):
    gmail_user = os.environ.get("GMAIL_USER")
    gmail_password = os.environ.get("GMAIL_APP_PASSWORD")
    
    if not gmail_user or not gmail_password:
        raise ValueError("Gmail credentials not configured")

    msg = MIMEMultipart("mixed") if attachment else MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = gmail_user
    msg["To"] = to_email

    msg.attach(MIMEText(html_content, "html"))
    
    if attachment:
        part = MIMEApplication(attachment['content'], Name=attachment['filename'])
        part['Content-Disposition'] = f'attachment; filename="{attachment["filename"]}"'
        msg.attach(part)

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(gmail_user, gmail_password)
        server.sendmail(gmail_user, to_email, msg.as_string())

# --- Send Approval Request Logic ---

class SendApprovalEmailRequest(BaseModel):
    userId: str
    userEmail: EmailStr
    userName: str | None = None

@router.post("/send-approval-request")
async def send_approval_request(request: SendApprovalEmailRequest):
    """
    Sends an approval request email to the admin.
    """
    try:
        supabase = get_supabase_admin()
        
        # Check environment variables
        admin_email = os.environ.get("ADMIN_EMAIL")
        if not admin_email:
             return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"success": False, "error": "ADMIN_EMAIL not configured"}
            )

        print(f"Processing approval request for: {request.userEmail}, userId: {request.userId}")

        # Find pending approval
        response = supabase.table("pending_approvals").select("approval_token")\
            .eq("status", "pending")\
            .or_(f"user_id.eq.{request.userId},user_email.ilike.{request.userEmail}")\
            .maybe_single()\
            .execute()
            
        approval = response.data

        if not approval:
            print(f"No pending approval found for user: {request.userId} {request.userEmail}")
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={"success": False, "message": "No pending approval found"}
            )

        # Build links
        api_base_url = os.environ.get("API_BASE_URL", "http://localhost:8000")
        
        approve_link = f"{api_base_url}/api/users/approve?token={approval['approval_token']}&action=approve"
        reject_link = f"{api_base_url}/api/users/approve?token={approval['approval_token']}&action=reject"

        email_html = f"""
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
        <meta charset="UTF-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; text-align: right; margin: 0; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="background: #1a2b5f; color: white; padding: 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">בקשת הרשמה חדשה</h1>
        </div>
        <div style="padding: 30px;">
        <p style="margin: 12px 0;">שלום,</p>
        <p style="margin: 12px 0;">התקבלה בקשת הרשמה חדשה למערכת הקמת ספקים:</p>
        <div style="background: #f0f4f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 8px 0;"><strong>שם:</strong> {request.userName or 'לא צוין'}</p>
        <p style="margin: 8px 0;"><strong>אימייל:</strong> {request.userEmail}</p>
        </div>
        <p style="margin: 12px 0;">לחץ על אחד הכפתורים למטה לאישור או דחייה:</p>
        <div style="text-align: center; margin: 25px 0;">
        <a href="{approve_link}" style="display: inline-block; background: #22c55e; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">אשר רישום</a>
        <a href="{reject_link}" style="display: inline-block; background: #ef4444; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">דחה רישום</a>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">הודעה זו נשלחה באופן אוטומטי ממערכת הקמת ספקים.</p>
        </div>
        </div>
        </body>
        </html>
        """
        
        admin_emails = [admin_email]
        # Optionally add backup email if needed? The original code had "avishay.elankry@gmail.com" hardcoded
        # admin_emails.append("avishay.elankry@gmail.com") 
        
        subject_text = f"בקשת הרשמה חדשה - {request.userName or request.userEmail}"
        
        for email in admin_emails:
            try:
                send_email_via_smtp(email, subject_text, email_html)
                print(f"Approval email sent to: {email}")
            except Exception as e:
                print(f"Error sending to {email}: {e}")

        return {"success": True}

    except Exception as e:
        print(f"Error sending approval email: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "error": str(e)}
        )

# --- Handle Manager Approval Logic ---

async def send_vendor_approval_email(vendor: dict):
    receipts_link = f"{FRONTEND_URL}/vendor-receipts/{vendor.get('secure_token')}"
    status_link = f"{FRONTEND_URL}/vendor-status/{vendor.get('secure_token')}"
    
    html_body = f"""
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.8; direction: rtl; text-align: right; background-color: #f5f5f5; margin: 0; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        .header {{ background: #1a2b5f; color: white; padding: 20px; text-align: center; }}
        .logo {{ font-size: 24px; font-weight: bold; }}
        .content {{ padding: 30px; }}
        .success-icon {{ text-align: center; font-size: 48px; margin-bottom: 16px; }}
        .button {{ display: inline-block; background: #1a2b5f; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 5px; }}
        .button-secondary {{ background: #2563eb; }}
        .footer {{ text-align: center; margin-top: 20px; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #eee; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">ספק בקליק - ביטוח ישיר</div>
          <h1 style="margin: 10px 0 0 0; font-size: 20px;">בקשתך אושרה!</h1>
        </div>
        <div class="content">
          <div class="success-icon">✅</div>
          <p style="text-align: right; margin: 12px 0;">שלום {vendor.get('vendor_name')},</p>
          <p style="text-align: right; margin: 12px 0;">
            שמחים לבשר לך שבקשתך להצטרף כספק של ביטוח ישיר <strong>אושרה בהצלחה!</strong>
          </p>
          <p style="text-align: right; margin: 12px 0;">
            מעתה תוכל להעלות קבלות להתחשבנות דרך הקישור הבא:
          </p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="{receipts_link}" class="button">העלאת קבלות</a>
            <a href="{status_link}" class="button button-secondary">מעקב סטטוס</a>
          </div>
          <p style="text-align: right; margin: 12px 0;">
            שמור על קישור זה - תוכל להשתמש בו בכל פעם שתרצה להעלות קבלות חדשות.
          </p>
        </div>
        <div class="footer">
          <p>© ביטוח ישיר - כל הזכויות שמורות</p>
          <p>הודעה זו נשלחה באופן אוטומטי ממערכת הקמת ספקים.</p>
        </div>
      </div>
    </body>
    </html>
    """
    
    send_email_via_smtp(vendor.get('vendor_email'), "בקשתך אושרה - ברוכים הבאים לביטוח ישיר!", html_body)

    supabase = get_supabase_admin()
    supabase.table("vendor_requests").update({
        "receipts_link_sent_at": datetime.now().isoformat()
    }).eq("id", vendor.get("id")).execute()


@router.get("/manager-approval")
async def handle_manager_approval(
    action: str = Query(..., regex="^(approve|reject)$"),
    role: str = Query(..., regex="^(procurement_manager|vp)$"),
    vendorId: str = Query(...)
):
    """
    Handles approval or rejection by a manager (Procurement or VP).
    """
    try:
        supabase = get_supabase_admin()
        
        def create_redirect_url(status_code: str, title: str, message: str) -> str:
            params = {
                "status": status_code,
                "title": title,
                "message": message
            }
            return f"{FRONTEND_URL}/manager-approval-result?{urlencode(params)}"

        response = supabase.table("vendor_requests").select("*").eq("id", vendorId).maybe_single().execute()
        vendor_request = response.data
        
        if not vendor_request:
            return RedirectResponse(create_redirect_url("error", "שגיאה", "בקשת הספק לא נמצאה"))

        role_label = "מנהל רכש" if role == 'procurement_manager' else 'סמנכ"ל'
        approved_field = 'procurement_manager_approved' if role == 'procurement_manager' else 'vp_approved'
        approved_at_field = 'procurement_manager_approved_at' if role == 'procurement_manager' else 'vp_approved_at'
        approved_by_field = 'procurement_manager_approved_by' if role == 'procurement_manager' else 'vp_approved_by'
        
        vendor_name = vendor_request.get('vendor_name')
        
        if vendor_request.get(approved_field) is not None:
             status_text = "אושר" if vendor_request.get(approved_field) else "נדחה"
             return RedirectResponse(
                 create_redirect_url(
                     "info",
                     "כבר טופל",
                     f'הספק "{vendor_name}" כבר {status_text} על ידי {role_label}'
                 )
             )

        if action == "approve":
            supabase.table("vendor_requests").update({
                approved_field: True,
                approved_at_field: datetime.now().isoformat(),
                approved_by_field: role_label
            }).eq("id", vendorId).execute()
            
            requires_vp_approval = vendor_request.get('requires_vp_approval') is not False 
            
            procurement_approved = True if role == 'procurement_manager' else (vendor_request.get('procurement_manager_approved') is True)
            vp_approved = True if role == 'vp' else (vendor_request.get('vp_approved') is True)
            
            is_fully_approved = (procurement_approved and vp_approved) if requires_vp_approval else procurement_approved
            
            if is_fully_approved:
                supabase.table("vendor_requests").update({"status": "approved"}).eq("id", vendorId).execute()
                print(f"Vendor {vendorId} status updated to approved")
                
                try:
                    await send_vendor_approval_email(vendor_request)
                    print(f"Approval email sent to vendor {vendor_request.get('vendor_email')}")
                except Exception as e:
                    print(f"Error sending vendor email: {e}")
            
            return RedirectResponse(
                create_redirect_url(
                    "success",
                    "אושר בהצלחה!",
                    f'הספק "{vendor_name}" אושר על ידי {role_label}'
                )
            )

        else: # action == "reject"
             supabase.table("vendor_requests").update({
                approved_field: False,
                approved_at_field: datetime.now().isoformat(),
                approved_by_field: role_label
            }).eq("id", vendorId).execute()
             
             return RedirectResponse(
                 create_redirect_url(
                     "rejected",
                     "נדחה",
                     f'הספק "{vendor_name}" נדחה על ידי {role_label}'
                 )
             )

    except Exception as e:
        print(f"Error in handle-manager-approval: {e}")
        return RedirectResponse(f"{FRONTEND_URL}/manager-approval-result?status=error&title=Error&message=System+Error")

# --- Send Manager Approval Logic ---

class SendManagerApprovalRequest(BaseModel):
    vendorRequestId: str
    targetRole: Optional[str] = None # 'procurement_manager' or 'vp'
    forceResend: Optional[bool] = False

@router.post("/send-manager-approval")
async def send_manager_approval(request: SendManagerApprovalRequest):
    """
    Sends approval request emails to managers (VP/Procurement) with PDF contracts attached if available.
    """
    try:
        supabase = get_supabase_admin()
        
        # Fetch vendor request
        response = supabase.table("vendor_requests").select("*").eq("id", request.vendorRequestId).maybe_single().execute()
        vendor_request = response.data
        
        if not vendor_request:
            return JSONResponse(status_code=404, content={"success": False, "error": "Vendor request not found"})

        # Fetch settings
        settings_response = supabase.table("app_settings").select("setting_key, setting_value").execute()
        settings_map = {item['setting_key']: item['setting_value'] for item in settings_response.data}
        
        procurement_email = settings_map.get("car_manager_email")
        procurement_name = settings_map.get("car_manager_name", "מנהל רכש")
        vp_email = settings_map.get("vp_email")
        vp_name = settings_map.get("vp_name", 'סמנכ"ל')

        if not procurement_email and not vp_email:
             return JSONResponse(status_code=500, content={"success": False, "error": "No approval email addresses configured"})

        # Download contract if exists
        contract_attachment = None
        if vendor_request.get('requires_contract_signature') and vendor_request.get('contract_file_path'):
            try:
                # Note: supabase-py storage download returns a byte stream
                # We need to verify how supabase storage download works in python
                # storage.from_().download() returns byte string directly
                file_data = supabase.storage.from_("vendor_documents").download(vendor_request['contract_file_path'])
                contract_attachment = {
                    "filename": f"contract_{vendor_request.get('vendor_name')}.pdf",
                    "content": file_data
                }
                print("Contract downloaded successfully")
            except Exception as e:
                print(f"Error downloading contract: {e}")
        
        # Update sent time
        supabase.table("vendor_requests").update({"approval_email_sent_at": datetime.now().isoformat()}).eq("id", request.vendorRequestId).execute()

        emails_sent = 0
        has_contract = contract_attachment is not None
        requires_vp_approval = vendor_request.get('requires_vp_approval') is not False
        vp_has_signed = vendor_request.get('ceo_signed') is True
        
        can_send_to_procurement = (not requires_vp_approval) or (not has_contract) or vp_has_signed
        
        def generate_email_html(recipient_name: str):
            signing_link = f"{FRONTEND_URL}/?tab=signatures"
            
            action_section = ""
            if has_contract:
                action_section = f"""
                <div style="background: #f0f9ff; border: 2px solid #0369a1; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                    <h3 style="margin: 0 0 15px 0; color: #0369a1;">נדרשת חתימה דיגיטלית</h3>
                    <p style="margin: 10px 0; color: #333;">החוזה מצורף למייל זה.</p>
                    <p style="margin: 10px 0; color: #333;">אנא פתח את הקובץ המצורף, חתום עליו דיגיטלית, וצרף את הקובץ החתום במערכת.</p>
                    <a href="{signing_link}" style="display: inline-block; background: #0369a1; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px;">היכנס למערכת לחתימה</a>
                </div>
                """
            else:
                action_section = f"""
                <div style="background: #f0fdf4; border: 2px solid #16a34a; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                    <p style="margin: 10px 0; color: #333;">אנא היכנס למערכת לאישור הבקשה.</p>
                    <a href="{signing_link}" style="display: inline-block; background: #16a34a; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px;">היכנס למערכת</a>
                </div>
                """

            return f"""<!DOCTYPE html>
            <html dir="rtl" lang="he">
            <head>
            <meta charset="UTF-8">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; text-align: right; margin: 0; padding: 20px; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="background: #1a2b5f; color: white; padding: 20px; text-align: right;">
            <h1 style="margin: 0; text-align: center; color: white;">{ 'חוזה לחתימה - הקמת ספק' if has_contract else 'אישור הקמת ספק' }</h1>
            </div>
            <div style="padding: 30px;">
            <p style="margin: 12px 0;">שלום {recipient_name},</p>
            <p style="margin: 12px 0;">{ 'ספק חדש דורש את חתימתך על החוזה המצורף.' if has_contract else 'ספק חדש השלים את מילוי טופס הקמת הספק ומחכה לאישורך.' }</p>
            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #1a2b5f;">פרטי הספק:</h3>
            <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>שם הספק:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">{vendor_request.get('vendor_name')}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>מייל:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">{vendor_request.get('vendor_email')}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>ח.פ/ע.מ:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">{vendor_request.get('company_id') or '-'}</td></tr>
            </table>
            </div>
            {action_section}
            <p style="margin-top: 30px; font-size: 12px; color: #666;">הודעה זו נשלחה באופן אוטומטי ממערכת הקמת ספקים.</p>
            </div>
            </div>
            </body>
            </html>"""

        # Logic for sending to Procurement Manager
        should_send_procurement = False
        if request.targetRole == 'procurement_manager':
            should_send_procurement = (request.forceResend or (vendor_request.get('procurement_manager_approved') is None and vendor_request.get('procurement_manager_signed') is not True)) and procurement_email and can_send_to_procurement
        elif not request.targetRole:
            should_send_procurement = procurement_email and vendor_request.get('procurement_manager_approved') is None and vendor_request.get('procurement_manager_signed') is not True and can_send_to_procurement

        if should_send_procurement:
            try:
                subject = f"הצעת מחיר לחתימה - {vendor_request.get('vendor_name')}" if has_contract else f"אישור הקמת ספק - {vendor_request.get('vendor_name')}"
                send_email_via_smtp(procurement_email, subject, generate_email_html(procurement_name), contract_attachment)
                print("Email sent to procurement manager")
                emails_sent += 1
            except Exception as e:
                print(f"Error sending to procurement: {e}")

        # Logic for sending to VP
        should_send_vp = False
        if requires_vp_approval:
             if request.targetRole == 'vp':
                 should_send_vp = (request.forceResend or (vendor_request.get('vp_approved') is None and vendor_request.get('ceo_signed') is not True)) and vp_email
             elif not request.targetRole:
                 should_send_vp = vp_email and vendor_request.get('vp_approved') is None and vendor_request.get('ceo_signed') is not True
        
        if should_send_vp:
             try:
                subject = f"הצעת מחיר לחתימה - {vendor_request.get('vendor_name')}" if has_contract else f"אישור הקמת ספק - {vendor_request.get('vendor_name')}"
                send_email_via_smtp(vp_email, subject, generate_email_html(vp_name), contract_attachment)
                print("Email sent to VP")
                emails_sent += 1
             except Exception as e:
                print(f"Error sending to VP: {e}")

        return {"success": True, "emailsSent": emails_sent}

    except Exception as e:
        print(f"Error in send-manager-approval: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

