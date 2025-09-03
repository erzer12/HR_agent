# backend/main.py
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import RedirectResponse
from typing import List
import uvicorn
import os
import resend
import json
import datetime

# Google Calendar
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleAuthRequest
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Correctly import from the ai_logic module
from ai_logic import rank_candidates_from_files, RankCandidatesOutput, CandidateRanking, draft_personalized_email
from pydantic import BaseModel, Field
import firebase_admin
from firebase_admin import credentials, firestore

app = FastAPI()

# --- Pydantic Models ---
class SelectionRequest(BaseModel):
    count: int = Field(..., gt=0, description="The number of top candidates to select.")

# --- Client Initialization ---
if os.path.exists("serviceAccountKey.json"):
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
else:
    print("WARNING: serviceAccountKey.json not found. Firebase integration will be disabled.")
    db = None

if os.getenv("RESEND_API_KEY"):
    resend.api_key = os.getenv("RESEND_API_KEY")
else:
    print("WARNING: RESEND_API_KEY not found. Email sending will be disabled.")

# --- Google Calendar Integration ---
CLIENT_SECRETS_FILE = "client_secret.json"
SCOPES = ["https://www.googleapis.com/auth/calendar.events"]

@app.get("/authorize")
async def authorize():
    if not os.path.exists(CLIENT_SECRETS_FILE):
        raise HTTPException(status_code=500, detail="Google client_secret.json not found.")
    
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE, scopes=SCOPES, redirect_uri=f"{os.getenv('BASE_URL', 'http://localhost:8000')}/oauth2callback"
    )
    authorization_url, state = flow.authorization_url(access_type="offline", include_granted_scopes="true")
    return RedirectResponse(authorization_url)

@app.get("/oauth2callback")
async def oauth2callback(request: Request, state: str, code: str):
    if not os.path.exists(CLIENT_SECRETS_FILE):
        raise HTTPException(status_code=500, detail="Google client_secret.json not found.")

    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE, scopes=SCOPES, state=state, redirect_uri=f"{os.getenv('BASE_URL', 'http://localhost:8000')}/oauth2callback"
    )
    flow.fetch_token(code=code)
    credentials = flow.credentials

    # DANGER: For demonstration only. In a real app, securely store credentials per user.
    with open('token.json', 'w') as token_file:
        token_file.write(credentials.to_json())

    return {"message": "Authorization successful! You can now close this window."}

# --- API Endpoints ---

@app.get("/")
def read_root():
    return {"message": "ResumeRank Python Backend is running!"}

@app.post("/jobs/{job_id}/schedule-interviews", response_model=dict)
async def schedule_interviews_endpoint(job_id: str):
    if not db:
        raise HTTPException(status_code=503, detail="Firebase is not configured.")

    creds = None
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(GoogleAuthRequest())
            with open('token.json', 'w') as token_file:
                token_file.write(creds.to_json())
        else:
            raise HTTPException(
                status_code=401, 
                detail="User not authenticated. Please visit /authorize to grant calendar access."
            )

    try:
        service = build('calendar', 'v3', credentials=creds)
        job_ref = db.collection("jobs").document(job_id)
        candidates_ref = job_ref.collection("candidates")
        contacted_candidates_query = candidates_ref.where("status", "==", "contacted").stream()

        scheduled_interviews = []
        failed_interviews = []
        batch = db.batch()
        
        start_time = datetime.datetime.now(datetime.timezone.utc).replace(hour=9, minute=0, second=0, microsecond=0) + datetime.timedelta(days=1)

        for doc in contacted_candidates_query:
            candidate = doc.to_dict()
            candidate_email = candidate.get("candidateEmail")
            candidate_name = candidate.get("candidateName")

            if not candidate_email:
                failed_interviews.append({"name": candidate_name, "reason": "Missing email."})
                continue

            end_time = start_time + datetime.timedelta(minutes=30)
            event = {
                'summary': f'Interview: {candidate_name}',
                'location': 'Google Meet',
                'description': 'Interview for the position.',
                'start': {'dateTime': start_time.isoformat(), 'timeZone': 'UTC'},
                'end': {'dateTime': end_time.isoformat(), 'timeZone': 'UTC'},
                'attendees': [{'email': candidate_email}],
                'conferenceData': {
                    'createRequest': {
                        'requestId': f'{job_id}-{doc.id}',
                        'conferenceSolutionKey': {'type': 'hangoutsMeet'}
                    }
                }
            }

            try:
                created_event = service.events().insert(calendarId='primary', body=event, conferenceDataVersion=1).execute()
                batch.update(doc.reference, {"status": "scheduled", "interviewLink": created_event.get('hangoutLink')})
                scheduled_interviews.append({"name": candidate_name, "event_id": created_event.get('id')})
                start_time = end_time
            except HttpError as error:
                failed_interviews.append({"name": candidate_name, "reason": str(error)})
        
        batch.commit()
        job_ref.update({"status": "scheduling_completed"})

        return {
            "message": "Interview scheduling process completed.",
            "scheduled_count": len(scheduled_interviews),
            "failed_count": len(failed_interviews),
            "scheduled": scheduled_interviews,
            "failed": failed_interviews
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

# ... (rest of the endpoints)

# ... (rest of the endpoints)

@app.delete("/jobs/{job_id}", status_code=204)
async def delete_job_endpoint(job_id: str):
    if not db:
        raise HTTPException(status_code=503, detail="Firebase is not configured.")

    job_ref = db.collection("jobs").document(job_id)
    
    try:
        # Firestore does not support cascading deletes, so we must delete subcollections manually.
        candidates_ref = job_ref.collection("candidates")
        candidates_docs = candidates_ref.stream()

        batch = db.batch()
        deleted_candidates_count = 0
        for doc in candidates_docs:
            batch.delete(doc.reference)
            deleted_candidates_count += 1
        
        # Delete the job document itself
        batch.delete(job_ref)
        
        batch.commit()

        print(f"Deleted job {job_id} and {deleted_candidates_count} associated candidates.")
        return  # Return a 204 No Content response

    except Exception as e:
        print(f"Error deleting job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=f"An error occurred while deleting the job: {str(e)}")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
