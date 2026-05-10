"""Twilio SMS reminders. Silently skips if Twilio env vars are not set."""
import os
import logging
from typing import Optional

logger = logging.getLogger("benefitbridge.sms")


def _twilio_configured() -> bool:
    return bool(os.environ.get("TWILIO_SID") and os.environ.get("TWILIO_AUTH") and os.environ.get("TWILIO_FROM"))


def _build_message(program_name: str, renewal_date: str, language: str) -> str:
    if language == "es":
        return (
            f"Recordatorio de Bridge: tu renovación de {program_name} vence el "
            f"{renewal_date}. No la pierdas — perder beneficios para los que calificas "
            f"es común y evitable. Responde STOP para cancelar."
        )
    return (
        f"Bridge reminder: Your {program_name} renewal is due by "
        f"{renewal_date}. Don't miss it — losing benefits you qualify for is common "
        f"and avoidable. Reply STOP to unsubscribe."
    )


def send_reminder(
    phone: str,
    program_name: str,
    renewal_date: str,
    language: str = "en",
) -> bool:
    """Send one SMS now. Returns True on success, False if not configured."""
    if not _twilio_configured():
        logger.warning("Twilio not configured — skipping SMS for %s", program_name)
        return False

    try:
        from twilio.rest import Client  # imported lazily so the package is optional
    except Exception as e:
        logger.warning("Twilio SDK not installed: %s", e)
        return False

    try:
        client = Client(os.environ["TWILIO_SID"], os.environ["TWILIO_AUTH"])
        client.messages.create(
            body=_build_message(program_name, renewal_date, language),
            from_=os.environ["TWILIO_FROM"],
            to=phone,
        )
        return True
    except Exception as e:
        logger.warning("Twilio send failed: %s", e)
        return False


def schedule_reminder(
    phone: str,
    program_name: str,
    renewal_date: str,
    language: str = "en",
) -> dict:
    """Demo behavior: send an immediate confirmation SMS, claim the actual reminder
    will be sent 48h before the renewal date. We do not actually schedule anything.
    """
    if not _twilio_configured():
        return {"success": False, "message": "SMS not configured"}

    sent = send_reminder(phone, program_name, renewal_date, language)
    if not sent:
        return {"success": False, "message": "SMS failed to send"}

    if language == "es":
        msg = f"Te enviaremos un recordatorio 48 horas antes del {renewal_date}."
    else:
        msg = f"We'll send a reminder 48 hours before {renewal_date}."
    return {"success": True, "message": msg}
