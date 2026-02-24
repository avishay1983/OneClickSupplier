import os
import ssl
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

def test_email():
    gmail_user = os.environ.get("GMAIL_USER")
    gmail_password = os.environ.get("GMAIL_APP_PASSWORD")
    to_email = gmail_user # Send to self for testing
    
    print(f"Testing email sending from {gmail_user} to {to_email}...")
    
    msg = MIMEMultipart()
    msg["Subject"] = "Test Email from OneClickSupplier Local"
    msg["From"] = gmail_user
    msg["To"] = to_email
    msg.attach(MIMEText("This is a test email to verify SMTP settings.", "plain"))
    
    try:
        print("Connecting to smtp.gmail.com:465 (SSL)...")
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10, context=context) as server:
            server.login(gmail_user, gmail_password)
            server.send_message(msg)
        print("Success: Email sent via SSL!")
        return True
    except Exception as e:
        print(f"Error via SSL:465: {e}")
        
    try:
        print("Connecting to smtp.gmail.com:587 (STARTTLS)...")
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=10) as server:
            server.starttls()
            server.login(gmail_user, gmail_password)
            server.send_message(msg)
        print("Success: Email sent via STARTTLS!")
        return True
    except Exception as e:
        print(f"Error via STARTTLS:587: {e}")
        
    return False

if __name__ == "__main__":
    test_email()
