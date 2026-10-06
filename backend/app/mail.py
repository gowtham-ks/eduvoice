"""
Minimal mail sending over SMTP (works with a Gmail app password, no domain
verification needed). If SMTP isn't configured, emails are logged instead of
sent, so local development and tests never need real credentials.
"""
import logging
import smtplib
from email.mime.text import MIMEText

from .config import settings

logger = logging.getLogger("eduvoice.mail")


def send_mail(to: str, subject: str, html: str) -> None:
    if not settings.smtp_host:
        logger.info("MAIL (not sent, SMTP unconfigured) to=%s subject=%s\n%s", to, subject, html)
        return
    msg = MIMEText(html, "html")
    msg["Subject"] = subject
    msg["From"] = settings.mail_from
    msg["To"] = to
    try:
        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.mail_from, [to], msg.as_string())
    except Exception:
        # A mail failure should never break signup/approval; it just means the
        # person doesn't get the email and can be told to contact the admin.
        logger.exception("Could not send mail to %s", to)


def verify_email_mail(to: str, link: str) -> None:
    send_mail(to, "Verify your EduVoice email", f'''
      <p>Confirm this is your email address to continue creating your EduVoice account.</p>
      <p><a href="{link}">Verify my email</a></p>
      <p>This link expires in 24 hours. If you didn't request this, ignore this email.</p>
    ''')


def pending_approval_admin_mail(to: str, name: str, email: str, role: str) -> None:
    send_mail(to, "EduVoice: new account awaiting approval", f'''
      <p>{name} ({email}) verified their email and is waiting for approval as a <b>{role}</b>.</p>
      <p>Open the admin dashboard to approve or reject this account.</p>
    ''')


def approved_mail(to: str, link: str) -> None:
    send_mail(to, "Your EduVoice account is active", f'''
      <p>Your account has been approved. You can now sign in.</p>
      <p><a href="{link}">Sign in to EduVoice</a></p>
    ''')


def rejected_mail(to: str) -> None:
    send_mail(to, "About your EduVoice signup", '''
      <p>Your EduVoice account request was not approved. If you think this is a mistake, contact your administrator.</p>
    ''')


def invite_mail(to: str, name: str, username: str, temp_password: str, link: str) -> None:
    send_mail(to, "Your EduVoice account", f'''
      <p>Hi {name}, an account was created for you on EduVoice.</p>
      <p><b>Username:</b> {username}<br><b>Temporary password:</b> {temp_password}</p>
      <p>Sign in and you'll be asked to set your own password right away: <a href="{link}">{link}</a></p>
    ''')
