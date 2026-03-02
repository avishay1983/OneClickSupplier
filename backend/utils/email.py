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
    gmail_user = os.environ.get("GMAIL_USER")
    gmail_password = os.environ.get("GMAIL_APP_PASSWORD")

    if not gmail_user or not gmail_password:
        raise ValueError("Gmail credentials not set in environment variables (GMAIL_USER / GMAIL_APP_PASSWORD)")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = Header(subject, 'utf-8')
    msg["From"] = gmail_user
    msg["To"] = to_email

    html_part = MIMEText(html_content, "html", "utf-8")
    msg.attach(html_part)

    # Try standard connection first (best practice)
    hosts_to_try = ["smtp.gmail.com"]
    
    # If on Render or having issues, we might want to try the IP directly
    # but we'll only do it as a fallback because of SSL certificate verification
    try:
        smtp_ip = _resolve_ipv4("smtp.gmail.com")
        if smtp_ip != "smtp.gmail.com":
            hosts_to_try.append(smtp_ip)
    except:
        pass

    err_ssl = ""
    err_starttls = ""

    for host in hosts_to_try:
        is_ip = host != "smtp.gmail.com"
        
        # Method 1: SSL on port 465
        try:
            print(f"Trying SMTP_SSL to {host}:465...")
            context = ssl.create_default_context()
            if is_ip:
                context.check_hostname = False
                context.verify_mode = ssl.CERT_NONE # Insecure but necessary if we MUST use IP
            
            with smtplib.SMTP_SSL(host, 465, timeout=30, context=context) as server:
                server.login(gmail_user, gmail_password)
                server.send_message(msg)
            print(f"Email sent successfully to {to_email} via SSL:465 (host: {host})")
            return True
        except Exception as e:
            err_ssl += f"[{host}]: {str(e)} | "
            print(f"SSL:465 failed for {host}: {e}")

        # Method 2: STARTTLS on port 587
        try:
            print(f"Trying SMTP STARTTLS to {host}:587...")
            context = ssl.create_default_context()
            if is_ip:
                context.check_hostname = False
                context.verify_mode = ssl.CERT_NONE
                
            with smtplib.SMTP(host, 587, timeout=30) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(gmail_user, gmail_password)
                server.send_message(msg)
            print(f"Email sent successfully to {to_email} via STARTTLS:587 (host: {host})")
            return True
        except Exception as e:
            err_starttls += f"[{host}]: {str(e)} | "
            print(f"STARTTLS:587 failed for {host}: {e}")

    raise Exception(f"All SMTP methods failed. SSL:465 errors: {err_ssl} | STARTTLS:587 errors: {err_starttls}")
