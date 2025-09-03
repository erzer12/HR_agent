# backend/models.py

from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict

# --- Job Management Models ---
class JobUpdate(BaseModel):
    """Pydantic model for updating a job's title or description."""
    title: Optional[str] = None
    jobDescription: Optional[str] = None

# --- Email & Scheduling Models ---
class EmailDraftRequest(BaseModel):
    """Model for the request to draft emails."""
    jobId: str
    interviewDatetime: str  # ISO 8601 format string
    candidateIds: List[str]

class EmailSendRequest(BaseModel):
    """Model for the request to send emails and create calendar events."""
    jobId: str
    interviewDatetime: str
    candidateIds: List[str]
    # userGoogleTokens is removed from here for security.
    # The backend will retrieve the tokens from Firestore.

class DraftedEmail(BaseModel):
    """Model for a single drafted email to be returned to the frontend."""
    candidateName: str
    candidateEmail: EmailStr
    subject: str
    body: str

# --- Google Auth Models ---
class AuthURL(BaseModel):
    """Model for the response containing the Google authorization URL."""
    url: str
