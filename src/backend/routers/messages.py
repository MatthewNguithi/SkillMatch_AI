from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from model import Message, User, Student, Employer
from dependencies import require_roles

router = APIRouter(prefix="/messages", tags=["Messages"])

class SendMessageRequest(BaseModel):
    receiver_id: int
    content: str
    job_title: Optional[str] = "General Inquiry"

class MessageResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    job_title: Optional[str]
    content: str
    is_read: bool
    created_at: str

    class Config:
        from_attributes = True

# 1. Send a Message
@router.post("/send")
def send_message(
    request: SendMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["student", "employer", "admin"]))
):
    if not request.content.strip():
        raise HTTPException(status_code=400, detail="Message content cannot be empty.")

    receiver = db.query(User).filter(User.id == request.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Recipient not found.")

    new_msg = Message(
        sender_id=current_user.id,
        receiver_id=request.receiver_id,
        job_title=request.job_title,
        content=request.content.strip()
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    return {"status": "success", "message": "Message sent successfully.", "data": new_msg}

# 2. Get Chat Thread between Current User & Target User
@router.get("/thread/{other_user_id}")
def get_chat_thread(
    other_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["student", "employer", "admin"]))
):
    messages = db.query(Message).filter(
        or_(
            and_(Message.sender_id == current_user.id, Message.receiver_id == other_user_id),
            and_(Message.sender_id == other_user_id, Message.receiver_id == current_user.id)
        )
    ).order_by(Message.created_at.asc()).all()

    # Mark incoming unread messages as read
    db.query(Message).filter(
        Message.sender_id == other_user_id,
        Message.receiver_id == current_user.id,
        Message.is_read == False
    ).update({"is_read": True})
    db.commit()

    return {"messages": messages}

# 3. Get Active Conversations (Inbox Summary)
@router.get("/inbox")
def get_user_inbox(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["student", "employer", "admin"]))
):
    # Fetch all distinct user IDs the current user has exchanged messages with
    sent_to = db.query(Message.receiver_id).filter(Message.sender_id == current_user.id)
    rec_from = db.query(Message.sender_id).filter(Message.receiver_id == current_user.id)
    contact_ids = list(set([u[0] for u in sent_to.union(rec_from).all()]))

    inbox = []
    for contact_id in contact_ids:
        # Get latest message
        latest_msg = db.query(Message).filter(
            or_(
                and_(Message.sender_id == current_user.id, Message.receiver_id == contact_id),
                and_(Message.sender_id == contact_id, Message.receiver_id == current_user.id)
            )
        ).order_by(Message.created_at.desc()).first()

        # Fetch contact profile name
        contact_user = db.query(User).filter(User.id == contact_id).first()
        contact_name = "User"
        if contact_user:
            if contact_user.role == "student":
                st = db.query(Student).filter(Student.user_id == contact_id).first()
                contact_name = st.full_name if st else contact_user.email
            elif contact_user.role == "employer":
                emp = db.query(Employer).filter(Employer.user_id == contact_id).first()
                contact_name = emp.company_name if emp else contact_user.email

        unread_count = db.query(Message).filter(
            Message.sender_id == contact_id,
            Message.receiver_id == current_user.id,
            Message.is_read == False
        ).count()

        inbox.append({
            "contact_id": contact_id,
            "contact_name": contact_name,
            "job_title": latest_msg.job_title if latest_msg else "",
            "last_message": latest_msg.content if latest_msg else "",
            "last_updated": latest_msg.created_at if latest_msg else None,
            "unread_count": unread_count
        })

    inbox.sort(key=lambda x: x["last_updated"] or "", reverse=True)
    return {"inbox": inbox}

# 4. Get Total Unread Message Count
@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["student", "employer", "admin"]))
):
    count = db.query(Message).filter(
        Message.receiver_id == current_user.id,
        Message.is_read == False
    ).count()
    return {"unread_count": count}