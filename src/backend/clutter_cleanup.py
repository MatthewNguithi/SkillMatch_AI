from datetime import datetime, timedelta, timezone
from typing import Optional

from applications import JobApplication
from model import SavedMatch

DECLINE_RETENTION_HOURS = 6


def _normalize_utc(ts: Optional[datetime]) -> Optional[datetime]:
    if not ts:
        return None
    if ts.tzinfo is None:
        return ts.replace(tzinfo=timezone.utc)
    return ts.astimezone(timezone.utc)


def _is_expired_timestamp(
    ts: Optional[datetime], retention_hours: int = DECLINE_RETENTION_HOURS
) -> bool:
    normalized = _normalize_utc(ts)
    if not normalized:
        return False
    cutoff = datetime.now(timezone.utc) - timedelta(hours=retention_hours)
    return normalized < cutoff


def is_expired_decline(
    saved: SavedMatch, retention_hours: int = DECLINE_RETENTION_HOURS
) -> bool:
    """Return True if a declined match record is older than retention_hours."""
    if (saved.rsvp_status or "").lower() != "declined":
        return False
    ts = (
        getattr(saved, "rsvp_updated_at", None)
        or getattr(saved, "updated_at", None)
        or getattr(saved, "created_at", None)
    )
    return _is_expired_timestamp(ts, retention_hours=retention_hours)


def is_expired_student_item(
    saved: SavedMatch,
    app_row: Optional[JobApplication],
    lifecycle_status: str,
    retention_hours: int = DECLINE_RETENTION_HOURS,
) -> bool:
    """Return True if a student's declined invite or withdrawn application has expired."""
    status = (lifecycle_status or "").lower()
    if status == "declined":
        return is_expired_decline(saved, retention_hours=retention_hours)

    if status == "withdrawn":
        ts = None
        if app_row is not None:
            ts = getattr(app_row, "updated_at", None) or getattr(
                app_row, "created_at", None
            )
        if not ts:
            ts = getattr(saved, "updated_at", None) or getattr(
                saved, "created_at", None
            )
        return _is_expired_timestamp(ts, retention_hours=retention_hours)

    return False