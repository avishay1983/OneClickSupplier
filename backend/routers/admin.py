from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from db import get_db
import uuid
from utils.email import send_email_via_smtp
import os

router = APIRouter(prefix="/api/admin", tags=["admin"])

# --- Models ---

class VendorRequestCreate(BaseModel):
    vendor_name: str
    vendor_email: str
    handler_name: Optional[str] = None
    handler_email: Optional[str] = None
    vendor_type: Optional[str] = "general"
    expires_in_days: Optional[int] = 7
    requires_vp_approval: Optional[bool] = True
    skip_manager_approval: Optional[bool] = False

class AdminStats(BaseModel):
    total_requests: int
    pending_vendor: int
    waiting_approval: int
    approved: int
    completed_migrations: int # Just for the progress bar demo

# --- Endpoints ---

@router.get("/requests")
async def list_requests(
    status: Optional[str] = None,
    handler: Optional[str] = None,
    search: Optional[str] = None
):
    """
    List vendor requests with filtering.
    Replaces: supabase.from('vendor_requests').select('*')
    """
    db = get_db()
    
    query = db.table("vendor_requests").select("*").order("created_at", desc=True)
    
    if status and status != 'all':
        query = query.eq("status", status)
        
    if handler and handler != 'all':
        query = query.eq("handler_name", handler)
        
    if search:
        # Supabase doesn't have a simple "OR" ILIKE across columns easily in one chained call without filter()
        # utilizing "or" filter string:
        query = query.or_(f"vendor_name.ilike.%{search}%,vendor_email.ilike.%{search}%")
        
    response = query.execute()
    requests = response.data if response.data else []
    
    return {"success": True, "requests": requests}

@router.post("/requests")
async def create_request(request: VendorRequestCreate):
    """
    Create a new vendor request and send email.
    Replaces: supabase.from('vendor_requests').insert(...)
    """
    db = get_db()
    
    secure_token = str(uuid.uuid4())
    # Calculate expiry
    # Note: Python datetime to ISO
    # expires_in_days defaults to 7 if not provided
    expires_in_days = request.expires_in_days if request.expires_in_days else 7
    # Simple timestamp math
    # In a real app use timedelta
    from datetime import timedelta
    expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
    
    # Prepare DB data
    db_data = {
        "vendor_name": request.vendor_name,
        "vendor_email": request.vendor_email,
        "secure_token": secure_token,
        "status": "with_vendor",
        "payment_terms": "שוטף + 60",
        "expires_at": expires_at.isoformat(),
        "handler_name": request.handler_name,
        "handler_email": request.handler_email,
        "vendor_type": request.vendor_type,
        "requires_vp_approval": request.requires_vp_approval,
        "requires_contract_signature": True
    }
    
    # Auto-approve logic
    if request.skip_manager_approval:
        db_data.update({
            "procurement_manager_approved": True,
            "procurement_manager_approved_at": datetime.utcnow().isoformat(),
            "procurement_manager_approved_by": "ללא צורך באישור",
            "vp_approved": True,
            "vp_approved_at": datetime.utcnow().isoformat(),
            "vp_approved_by": "ללא צורך באישור"
        })
        
    try:
        res = db.table("vendor_requests").insert(db_data).execute()
        
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to create request in DB")
            
        # Send Email
        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:8080")
        link = f"{frontend_url}/vendor/{secure_token}"
        
        email_html = f"""<!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
        <meta charset="UTF-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; text-align: right; margin: 0; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="background: #1a2b5f; color: white; padding: 25px; text-align: center;">
        <img src="https://www.555.co.il/resources/images/BY737X463.png" alt="ביטוח ישיר" style="max-width: 150px; height: auto; margin-bottom: 10px;" />
        <h1 style="margin: 0; font-size: 22px; color: white;">הזמנה לרישום ספק</h1>
        </div>
        <div style="padding: 30px;">
        <p style="margin: 12px 0; font-size: 18px;">שלום {request.vendor_name},</p>
        <p style="margin: 12px 0;">הוזמנת להירשם כספק במערכת <strong>"ספק בקליק"</strong> של ביטוח ישיר.</p>
        <div style="background: #f0f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0;"><strong>מה נדרש ממך:</strong></p>
        <ul style="margin: 0; padding-right: 20px; color: #444;">
        <li style="margin-bottom: 6px;">מילוי פרטי הספק (שם, כתובת, פרטי בנק)</li>
        <li style="margin-bottom: 6px;">העלאת מסמכים נדרשים</li>
        <li>אימות באמצעות קוד חד-פעמי</li>
        </ul>
        </div>
        <p style="margin: 12px 0;">אנא לחץ על הכפתור למטה למילוי הפרטים:</p>
        <div style="text-align: center; margin: 25px 0;">
        <a href="{link}" style="display: inline-block; background: #2563eb; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">מעבר לטופס הרישום</a>
        </div>
        <div style="background: #fef9c3; border: 1px solid #facc15; border-radius: 6px; padding: 12px; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #854d0e;">⚠️ הקישור הזה הוא אישי ומאובטח. אנא אל תשתף אותו עם אחרים.</p>
        </div>
        <p style="margin: 12px 0;">במידה ויש לך שאלות, אנא פנה לאיש הקשר שלך בחברה.</p>
        <p style="margin: 20px 0 5px 0;">תודה,</p>
        <p style="margin: 0; font-weight: bold; color: #1a2b5f;">צוות ביטוח ישיר</p>
        </div>
        <div style="text-align: center; padding: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
        <p style="margin: 0;">© ביטוח ישיר - כל הזכויות שמורות</p>
        <p style="margin: 5px 0 0 0;">הודעה זו נשלחה באופן אוטומטי ממערכת הקמת ספקים.</p>
        </div>
        </div>
        </body>
        </html>"""
        
        email_sent = False
        email_error_msg = None
        try:
            send_email_via_smtp(request.vendor_email, "הזמנה לרישום ספק - ביטוח ישיר", email_html)
            email_sent = True
        except Exception as email_err:
            email_error_msg = str(email_err)
            print(f"Email failed but request was created: {email_error_msg}")
        
        return {
            "success": True, 
            "data": res.data[0],
            "email_sent": email_sent,
            "email_error": email_error_msg
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating request: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_dashboard_stats():
    """
    Get stats for the dashboard and migration progress.
    """
    db = get_db()
    
    # Simple counts
    # Note: efficient counting in Supabase/Postgrest usually requires head=true and count=exact
    # The python client method: .select("*", count="exact").execute().count
    
    try:
        total = db.table("vendor_requests").select("*", count="exact", head=True).execute().count
        pending = db.table("vendor_requests").select("*", count="exact", head=True).eq("status", "with_vendor").execute().count
        waiting = db.table("vendor_requests").select("*", count="exact", head=True).eq("status", "submitted").execute().count
        approved = db.table("vendor_requests").select("*", count="exact", head=True).eq("status", "approved").execute().count
        
        # Mock migration stats for the progress bar
        # 7 out of 10 services migrated
        completed_migrations = 7 
        
        return {
            "total_requests": total,
            "pending_vendor": pending,
            "waiting_approval": waiting,
            "approved": approved,
            "completed_migrations": completed_migrations
        }
    except Exception as e:
        print(f"Error fetching stats: {e}")
        return {
            "total_requests": 0,
            "pending_vendor": 0,
            "waiting_approval": 0,
            "approved": 0,
            "completed_migrations": 7
        }
