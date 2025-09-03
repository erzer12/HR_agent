# Python Backend Roadmap for ResumeRank

This document outlines the necessary Python files and API endpoints to build a backend that supports the ResumeRank frontend. The frontend is built with Next.js and reads data from Firestore. Your Python backend will be responsible for all business logic, AI processing, and writing data to Firestore.

You can use any Python web framework like **FastAPI** or **Flask**.

---

## 1. Core Application File (`app.py` or `main.py`)

This will be the entry point for your web server. It will define the API endpoints that the frontend will call.

### Required API Endpoints:

#### Job Management
- **`POST /api/jobs`**: Creates a new job, processes uploaded resumes, and ranks candidates.
  - **Request Body**: `multipart/form-data` containing `title` (string), `jobDescription` (string), and `resumes` (file list).
  - **Logic**:
    1.  Parse the job title and description.
    2.  For each uploaded resume file:
        -   Call your `resume_processing.py` agent to parse, score, and summarize the candidate against the job description.
    3.  Create a new "job" document in Firestore.
    4.  Store the ranked candidates as a subcollection under that job document.
    5.  Set the job `status` to 'completed'.
  - **Response**: `201 Created` with the new job ID.

- **`PUT /api/jobs/{job_id}`**: Updates an existing job's title or description.
  - **Request Body**: JSON with `title` and/or `jobDescription`.
  - **Logic**: Updates the corresponding job document in Firestore.
  - **Response**: `200 OK`.

- **`POST /api/jobs/{job_id}/resumes`**: Adds new resumes to an existing job.
  - **Request Body**: `multipart/form-data` with `resumes` (file list).
  - **Logic**: Same as resume processing in `POST /api/jobs`, but adds candidates to an existing job.
  - **Response**: `200 OK`.

- **`DELETE /api/jobs/{job_id}`**: Deletes a job and all its candidates.
  - **Logic**: Deletes the job document and its candidate subcollection from Firestore.
  - **Response**: `204 No Content`.

#### Candidate Management
- **`DELETE /api/jobs/{job_id}/candidates/{candidate_id}`**: Deletes a single candidate.
  - **Response**: `204 No Content`.

- **`DELETE /api/jobs/{job_id}/candidates`**: Deletes all candidates for a job.
  - **Response**: `204 No Content`.

#### Email & Scheduling
- **`POST /api/emails/draft`**: Drafts personalized emails for selected candidates.
  - **Request Body**: JSON with `job_id`, `interview_datetime`, and a list of `candidate_ids`.
  - **Logic**:
    1.  Fetch job and candidate details from Firestore.
    2.  Call your `email_agent.py` to generate a personalized email body for each candidate.
  - **Response**: `200 OK` with a list of email drafts (subject, body, candidate name).

- **`POST /api/emails/send`**: Sends the emails and creates calendar events.
  - **Request Body**: JSON with `job_id`, `interview_datetime`, and a list of `candidate_ids`.
  - **Logic**:
    1.  Call your `calendar.py` module to create a Google Calendar event for each candidate.
    2.  Use a service like Resend or SendGrid to send the final emails.
  - **Response**: `200 OK`.

#### Google Authentication
- **`GET /api/auth/google`**: Generates and returns the Google OAuth2 consent screen URL.
  - **Response**: JSON with `{ "url": "..." }`.

- **`GET /api/auth/google/callback`**: Handles the callback from Google after user consent.
  - **Logic**:
    1.  Receives the authorization `code` from Google.
    2.  Exchanges the code for an access token and refresh token.
    3.  **Securely store the user's tokens** (e.g., in Firestore, encrypted).
  - **Response**: Redirects the user back to the frontend (`http://localhost:9002?calendar=connected`).

---

## 2. Agent & Logic Modules

These files will contain your core business logic and AI agent implementations.

### `resume_processing.py`
- Contains the agent/logic for parsing resume text.
- Takes a job description and resume content as input.
- Uses an LLM (e.g., via OpenAI, Anthropic, or CrewAI) to:
  - Extract candidate name and email.
  - Score the candidate's suitability (0.0 to 1.0).
  - Generate a concise summary of their qualifications related to the job.
- Returns this structured data.

### `email_agent.py`
- Contains the agent/logic for drafting emails.
- Takes job details, candidate details, and the interview time as input.
- Uses an LLM to generate a personalized email body.
- Returns the email subject and body.

### `calendar.py`
- Contains functions to interact with the Google Calendar API.
- Initializes the `google-api-python-client`.
- Has a function `create_calendar_event` that takes user's auth tokens, event details, and attendee emails to create an event.

---

## 3. Firestore Integration (`firestore_client.py`)

- A utility module to initialize the Firebase Admin SDK for Python.
- Provides helper functions to interact with Firestore (e.g., `get_job`, `add_candidate`, `delete_job`).
- This will be imported by your API endpoint functions in `app.py`.
