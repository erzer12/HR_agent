# backend/app.py

from datetime import datetime, timedelta
from typing import List

from fastapi import FastAPI, File, Form, UploadFile, HTTPException, BackgroundTasks, Request, Response
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from google_auth_oauthlib.flow import Flow

# Import services
from services import resume_processing, email_agent, calendar
import services.firestore_client as db

# Import Pydantic models and config
from models import JobUpdate, EmailDraftRequest, EmailSendRequest, DraftedEmail, AuthURL
import config

# --- FastAPI App Initialization ---
app = FastAPI(
    title="ResumeRank API",
    description="Backend for the ResumeRank application.",
    version="1.0.0"
)

# --- CORS Middleware ---
# This allows the frontend (running on http://localhost:9002) to communicate with this backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Background Task Definition ---
async def process_resumes_task(job_id: str, job_description: str, resumes: List[UploadFile]):
    """Background task to read, process, and store resume data."""
    try:
        for resume in resumes:
            content_bytes = await resume.read()
            # Try decoding with utf-8, fallback to latin-1 for broader compatibility
            try:
                content = content_bytes.decode('utf-8')
            except UnicodeDecodeError:
                content = content_bytes.decode('latin-1')

            candidate_data = resume_processing.process_resume(job_description, content)
            db.add_candidate(job_id, candidate_data)

        db.update_job_status(job_id, 'completed')
    except Exception as e:
        print(f"Error during background resume processing for job {job_id}: {e}")
        db.update_job_status(job_id, 'failed')


# --- API Endpoints ---

@app.get("/api")
def root():
    return {"message": "ResumeRank API is running"}

# === Job Management ===
@app.post("/api/jobs", status_code=201)
async def create_job_and_process_resumes(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    jobDescription: str = Form(...),
    resumes: List[UploadFile] = File(...)
):
    if not resumes:
        raise HTTPException(status_code=400, detail="No resume files provided.")
    
    job_id = db.create_job(title, jobDescription)
    background_tasks.add_task(process_resumes_task, job_id, jobDescription, resumes)
    return {"jobId": job_id}

@app.put("/api/jobs/{job_id}", status_code=200)
async def update_job_details(job_id: str, job_update: JobUpdate):
    update_data = job_update.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update.")
    db.update_job(job_id, update_data)
    return {"message": f"Job {job_id} updated."}

@app.post("/api/jobs/{job_id}/resumes", status_code=200)
async def add_resumes_to_job(
    job_id: str,
    background_tasks: BackgroundTasks,
    resumes: List[UploadFile] = File(...)
):
    job = db.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if not resumes:
        raise HTTPException(status_code=400, detail="No resume files provided.")
    
    db.update_job_status(job_id, 'processing')
    background_tasks.add_task(process_resumes_task, job_id, job['jobDescription'], resumes)
    return {"message": "Resumes are being processed and added to the job."}

@app.delete("/api/jobs/{job_id}", status_code=204)
async def delete_job(job_id: str):
    db.delete_job_and_candidates(job_id)
    return Response(status_code=204)


# === Candidate Management ===
@app.delete("/api/jobs/{job_id}/candidates/{candidate_id}", status_code=204)
async def delete_single_candidate(job_id: str, candidate_id: str):
    db.delete_candidate(job_id, candidate_id)
    return Response(status_code=204)

@app.delete("/api/jobs/{job_id}/candidates", status_code=204)
async def delete_all_job_candidates(job_id: str):
    db.delete_all_candidates(job_id)
    return Response(status_code=204)


# === Email & Scheduling ===
@app.post("/api/emails/draft", response_model=List[DraftedEmail])
async def draft_emails_for_candidates(request: EmailDraftRequest):
    job = db.get_job(request.jobId)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    
    candidates = db.get_candidates(request.jobId, request.candidateIds)
    if not candidates:
        raise HTTPException(status_code=404, detail="No specified candidates found.")

    drafts = []
    for candidate in candidates:
        email_content = email_agent.draft_email(job, candidate, request.interviewDatetime)
        drafts.append(DraftedEmail(
            candidateName=candidate.get("candidateName"),
            candidateEmail=candidate.get("candidateEmail"),
            **email_content
        ))
    return drafts

@app.post("/api/emails/send", status_code=200)
async def send_emails_and_create_events(request: EmailSendRequest):
    job = db.get_job(request.jobId)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    
    candidates = db.get_candidates(request.jobId, request.candidateIds)
    if not candidates:
        raise HTTPException(status_code=404, detail="No specified candidates found.")

    start_time = datetime.fromisoformat(request.interviewDatetime)
    end_time = start_time + timedelta(minutes=30)  # Assume 30-minute interviews

    # This is a placeholder user_id. In a real app, you would get this
    # from your authentication system (e.g., the logged-in user's ID).
    user_id = "placeholder_user_id"
    user_tokens = db.get_user_tokens(user_id)
    if not user_tokens:
        raise HTTPException(status_code=401, detail="User is not authenticated with Google or tokens are missing.")


    for candidate in candidates:
        # 1. Send Email (This is mocked - integrate a real service like SendGrid or Resend here)
        email_content = email_agent.draft_email(job, candidate, request.interviewDatetime)
        print(f"SIMULATING SENDING EMAIL TO: {candidate['candidateEmail']} with subject: {email_content['subject']}")

        # 2. Create Google Calendar Event
        event_details = {
            "summary": f"Interview: {job['title']} with {candidate['candidateName']}",
            "description": f"Interview for the {job['title']} position.",
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "attendees": [candidate['candidateEmail']], # In a real app, add the interviewer's email too
        }
        calendar.create_calendar_event(user_tokens, event_details)

    return {"message": "Emails sent and calendar events created successfully."}


# === Google Authentication ===
def get_google_flow():
    """Helper to create a Google OAuth Flow instance."""
    # This requires a client_secret.json file from Google Cloud Console
    return Flow.from_client_secrets_file(
        "client_secret.json", 
        scopes=config.GOOGLE_API_SCOPES,
        redirect_uri=config.GOOGLE_REDIRECT_URI
    )

@app.get("/api/auth/google", response_model=AuthURL)
async def google_auth():
    flow = get_google_flow()
    auth_url, _ = flow.authorization_url(
        access_type='offline', 
        prompt='consent' # Forces the refresh token to be sent every time
    )
    return {"url": auth_url}

@app.get("/api/auth/google/callback")
async def google_auth_callback(request: Request):
    flow = get_google_flow()
    flow.fetch_token(authorization_response=str(request.url))
    creds = flow.credentials

    tokens = {
        'token': creds.token,
        'refresh_token': creds.refresh_token,
        'token_uri': creds.token_uri,
        'client_id': creds.client_id,
        'client_secret': creds.client_secret,
        'scopes': creds.scopes
    }
    
    # In a real app, you would associate these tokens with a logged-in user's ID
    # For this example, we use a placeholder ID and store the tokens.
    db.store_user_tokens("placeholder_user_id", tokens)
    
    return RedirectResponse(url=f"{config.FRONTEND_URL}?calendar=connected")
