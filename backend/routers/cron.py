from fastapi import APIRouter, HTTPException, Depends
from database import get_supabase_admin
from datetime import datetime, timedelta
from utils.email import send_email_via_smtp
import os

router = APIRouter(prefix="/api/cron", tags=["cron"])

# Helper for Hebrew encoding in subject - SMTP utils usually handle this, 
# but if we need special handling for "reminder time" string we can format it here.

@router.post("/send-expiry-reminder")
async def send_expiry_reminder():
    print("send-expiry-reminder job started", flush=True)
    supabase = get_supabase_admin()
    
    try:
        # 1. Get Settings
        settings_response = supabase.table("app_settings").select("setting_key, setting_value").execute()
        settings_map = {item['setting_key']: item['setting_value'] for item in settings_response.data or []}
        
        reminder_hours = int(settings_map.get("expiry_reminder_hours", 24))
        
        # 2. Find Expiring Requests
        now = datetime.utcnow()
        # Note: Deno used specific time logic.
        # "expires_at" is likely ISO string.
        # We want: 
        # - status IN ('with_vendor', 'resent')
        # - expiry_reminder_sent_at IS NULL
        # - expires_at IS NOT NULL
        # - expires_at <= (now + reminder_hours) AND expires_at > now
        
        reminder_threshold = now + timedelta(hours=reminder_hours)
        
        response = supabase.table("vendor_requests")\
            .select("id, vendor_name, vendor_email, secure_token, expires_at")\
            .in_("status", ["with_vendor", "resent"])\
            .filter("expiry_reminder_sent_at", "is", "null")\
            .not_.is_("expires_at", "null")\
            .lte("expires_at", reminder_threshold.isoformat())\
            .gt("expires_at", now.isoformat())\
            .execute()
            
        expiring_requests = response.data or []
        print(f"Found {len(expiring_requests)} requests expiring within {reminder_hours} hours")
        
        sent_count = 0
        error_count = 0
        error_details = []
        
        frontend_url = os.environ.get("FRONTEND_URL", "https://oneclicksupplier.onrender.com")
        
        for req in expiring_requests:
            try:
                expires_at = datetime.fromisoformat(req["expires_at"].replace('Z', '+00:00'))
                # Calculate hours remaining safely (both UTC)
                # Ensure now is timezone aware if expires_at is
                if expires_at.tzinfo is None:
                     # Assume UTC if not specified
                     expires_at = expires_at.replace(tzinfo=None) # match 'now' which is naive UTC from utcnow()
                     # time_diff = expires_at - now
                else:
                     # make now aware
                     from datetime import timezone
                     # Make now aware if needed, or make expires_at naive
                     # Simplest: use naive UTC for calc
                     expires_at = expires_at.astimezone(timezone.utc).replace(tzinfo=None)

                # Simple diff
                # Let's stick to simple naive UTC if possible as supabase usually returns ISO
                # Actually Supabase returns timestamptz properly usually.
                # Let's use simple string calc or just naive conversion for approximate display.
                
                # Re-parse as naive for simplicity if matching utcnow()
                # expires_at_naive = datetime.fromisoformat(req["expires_at"].replace('Z', '')) 
                hours_remaining = (expires_at - now).total_seconds() / 3600
                
                time_text = f"{int(hours_remaining)} שעות" if hours_remaining <= 24 else f"{int(hours_remaining/24)} ימים"
                
                form_link = f"{frontend_url}/vendor-onboarding?token={req['secure_token']}"
                
                email_html = f"""
                <div dir="rtl" style="font-family: Arial, sans-serif;">
                    <div style="background-color: #fff3cd; color: #856404; padding: 15px; border-radius: 5px; margin-bottom: 20px; border: 1px solid #ffeeba;">
                        <strong>שים לב:</strong> הקישור לטופס הספק יפוג בעוד {time_text}.
                    </div>
                    <h2>שלום {req['vendor_name']},</h2>
                    <p>זוהי תזכורת שהקישור למילוי פרטי הספק שלך עומד לפוג.</p>
                    <p>אנא מלא את הטופס בהקדם האפשרי להשלמת הרישום.</p>
                    <a href="{form_link}" style="display: inline-block; padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                        מלא את הטופס עכשיו
                    </a>
                    <p>תודה,<br>צוות ביטוח ישיר</p>
                </div>
                """
                
                subject = f"תזכורת: הקישור לטופס הספק יפוג בעוד {time_text}"
                
                send_email_via_smtp(req["vendor_email"], subject, email_html)
                
                # Update DB
                supabase.table("vendor_requests").update({
                    "expiry_reminder_sent_at": datetime.utcnow().isoformat()
                }).eq("id", req["id"]).execute()
                
                sent_count += 1
                print(f"Reminder sent to {req['vendor_email']}", flush=True)
                
            except Exception as e:
                print(f"Error sending reminder to {req.get('vendor_email')}: {e}", flush=True)
                error_count += 1
                error_details.append(str(e))
                
        return {
            "success": True, 
            "sent": sent_count, 
            "errors": error_count, 
            "checked": len(expiring_requests),
            "error_details": error_details
        }
        
    except Exception as e:
        print(f"Error in send-expiry-reminder: {e}")
        raise HTTPException(status_code=500, detail=str(e))
