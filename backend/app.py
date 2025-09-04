
from datetime import datetime, timedelta
from typing import List

from fastapi import (FastAPI, File, Form, UploadFile, HTTPException, 
                     BackgroundTasks, Request, Response, Depends)
from fastapi.middleware.cors import CORSMiddleware
from google_auth_oauthlib.flow import Flow
from starlette.responses import RedirectResponse

# Import services
from services import resume_processing, email_agent, calendar
import services.firestore_client as db

# Import Pydantic models and config
from models import (JobUpdate, EmailDraftRequest, EmailSendRequest, 
                    DraftedEmail, AuthURL, Candidate, JobCreate)
import config

# --- FastAPI App Initialization ---
app = FastAPI(
    title="ResumeRank API",
    description="Backend for the ResumeRank application.",
    version="1.0.0"
)

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.FRONTEND_URL, "http://localhost:9002"],
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
    for candidate_data in candidates:
        candidate = Candidate(**candidate_data)
        email_content = email_agent.draft_email(job, candidate.model_dump(), request.interviewDatetime)
        drafts.append(DraftedEmail(
            candidateName=candidate.candidateName,
            candidateEmail=candidate.candidateEmail,
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
    end_time = start_time + timedelta(minutes=30)

    user_id = "placeholder_user_id" 
    user_tokens = db.get_user_tokens(user_id)
    if not user_tokens:
        raise HTTPException(status_code=401, detail="User not authenticated with Google.")

    for candidate_data in candidates:
        candidate = Candidate(**candidate_data)
        email_content = email_agent.draft_email(job, candidate.model_dump(), request.interviewDatetime)
        
        # email_agent.send_email(candidate.candidateEmail, email_content['subject'], email_content['body'])

        event_details = {
            "summary": f"Interview: {job['title']} with {candidate.candidateName}",
            "description": f"Interview for the {job['title']} position.",
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "attendees": [candidate.candidateEmail],
        }
        calendar.create_calendar_event(user_tokens, event_details)

    return {"message": "Emails sent and calendar events created successfully."}


# === Google Authentication ===
def get_google_flow():
    return Flow.from_client_secrets_file(
        "client_secret.json", 
        scopes=config.GOOGLE_API_SCOPES,
        redirect_uri=config.GOOGLE_REDIRECT_URI
    )

@app.get("/api/auth/google", response_model=AuthURL)
async def google_auth():
    flow = get_google_flow()
    auth_url, _ = flow.authorization_url(access_type='offline', prompt='consent')
    return {"url": auth_url}

@app.get("/api/auth/google/callback")
async def google_auth_callback(request: Request):
    flow = get_google_flow()
    try:
        flow.fetch_token(authorization_response=str(request.url))
    except Exception as e:
        print(f"Error fetching token: {e}")
        raise HTTPException(status_code=400, detail="Error fetching token")

    creds = flow.credentials
    tokens = {
        'token': creds.token,
        'refresh_token': creds.refresh_token,
        'token_uri': creds.token_uri,
        'client_id': creds.client_id,
        'client_secret': creds.client_secret,
        'scopes': creds.scopes
    }
    
    db.store_user_tokens("placeholder_user_id", tokens)
    
    return RedirectResponse(url=f"{config.FRONTEND_URL}?calendar=connected")
