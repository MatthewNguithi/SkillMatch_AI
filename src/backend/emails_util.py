import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_otp_email(receiver_email: str, otp_code: str, user_name: str):
    # These should ideally be set in your .env file
    sender_email = os.getenv("SMTP_EMAIL", "your_gmail_address@gmail.com") 
    sender_password = os.getenv("SMTP_PASSWORD", "your_16_digit_app_password")

    message = MIMEMultipart("alternative")
    message["Subject"] = "SkillMatch - Verify your account"
    message["From"] = sender_email
    message["To"] = receiver_email

    text = f"""
    Hi {user_name},

    Welcome to SkillMatch! Your verification code is: {otp_code}

    This code will expire in 10 minutes. 

    If you did not request this, please ignore this email.
    """
    message.attach(MIMEText(text, "plain"))

    try:
        # Connect to Gmail's secure SMTP server
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, receiver_email, message.as_string())
            print(f"OTP sent successfully to {receiver_email}")
    except Exception as e:
        print(f"Error sending OTP email: {e}")