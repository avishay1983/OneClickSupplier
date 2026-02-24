import os
import ssl
import socket
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header


def _resolve_ipv4(hostname: str) -> str:
    """Resolve hostname to an IPv4 address to avoid IPv6 issues on Render."""
    try:
        results = socket.getaddrinfo(hostname, None, socket.AF_INET)
        if results:
            ipv4 = results[0][4][0]
            print(f"Resolved {hostname} -> {ipv4} (IPv4)")
            return ipv4
    except Exception as e:
        print(f"IPv4 resolution failed for {hostname}: {e}")
    return hostname


def send_email_via_smtp(to_email: str, subject: str, html_content: str):
    """
    Sends an email using Gmail SMTP.
    Forces IPv4 to avoid 'Network is unreachable' errors on Render.
    Tries SSL (port 465) first, then STARTTLS (port 587) as fallback.
    """
    log_file = "email_debug.log"
    def log(msg):
        print(msg)
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(f"{datetime.now().isoformat()} - {msg}\n")

    from datetime import datetime
    log(f"Starting send_email_via_smtp to {to_email}")

    gmail_user = os.environ.get("GMAIL_USER")
    gmail_password = os.environ.get("GMAIL_APP_PASSWORD")

    if not gmail_user or not gmail_password:
        log("ERROR: Gmail credentials not set")
        raise ValueError("Gmail credentials not set in environment variables (GMAIL_USER / GMAIL_APP_PASSWORD)")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = Header(subject, 'utf-8')
    msg["From"] = gmail_user
    msg["To"] = to_email

    html_part = MIMEText(html_content, "html", "utf-8")
    msg.attach(html_part)

    # Resolve to IPv4 to avoid Render IPv6 issues
    smtp_host = _resolve_ipv4("smtp.gmail.com")

    # Method 1: SSL on port 465
    try:
        log(f"Trying SMTP_SSL to {smtp_host}:465...")
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(smtp_host, 465, timeout=30, context=context) as server:
            server.login(gmail_user, gmail_password)
            server.send_message(msg)
        log(f"Email sent successfully to {to_email} via SSL:465")
        return True
    except Exception as e1:
        log(f"SSL:465 failed: {e1}")

    # Method 2: STARTTLS on port 587
    try:
        log(f"Trying SMTP STARTTLS to {smtp_host}:587...")
        context = ssl.create_default_context()
        with smtplib.SMTP(smtp_host, 587, timeout=30) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(gmail_user, gmail_password)
            server.send_message(msg)
        log(f"Email sent successfully to {to_email} via STARTTLS:587")
        return True
    except Exception as e2:
        log(f"STARTTLS:587 also failed: {e2}")
        raise Exception(f"All SMTP methods failed. SSL:465 error: {e1} | STARTTLS:587 error: {e2}")

