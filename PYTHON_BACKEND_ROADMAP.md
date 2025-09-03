# Python Backend Roadmap for ResumeRank

This document provides a detailed blueprint for building a Python backend to power the ResumeRank application. The frontend is a Next.js application that displays data from Firestore. Your Python backend will serve as a REST API, handling all business logic, AI processing, and data manipulation.

You can use any Python web framework, but **FastAPI** is highly recommended for its performance, automatic API documentation (via Swagger UI), and data validation using Pydantic, which aligns well with this project's needs.

---

## High-Level Architecture

1.  **Next.js Frontend**: The existing application in the `/frontend` directory. It makes HTTP requests to your Python backend.
2.  **Python Backend API**: A separate web server (e.g., running on `http://localhost:8000`) that exposes several endpoints.
3.  **Firestore**: Acts as the database. The Python backend writes job and candidate data to it, and the Next.js frontend reads from it in real-time to update the UI.
4.  **Google Cloud APIs**: Used for Google Calendar integration.

---

## 1. Core Application File (`main.py` or `app.py`)

This is the entry point for your FastAPI/Flask web server. It will define all the API endpoints the frontend will call.

### Required API Endpoints:

#### Job Management

- **`POST /api/jobs`**: Creates a new job, processes uploaded resumes, and ranks candidates.
  - **Request Body**: `multipart/form-data` containing:
    - `title`: `string`
    - `jobDescription`: `string`
    - `resumes`: `List[UploadFile]` (a list of resume files)
  - **Logic**:
    1.  Create a new document in the `jobs` collection in Firestore with an initial `status` of 'processing'.
    2.  For each uploaded resume file, asynchronously call your `resume_processing.py` agent. This agent will parse the resume, score it against the job description, and generate a summary.
    3.  As each resume is processed, store the structured candidate data (name, email, score, summary) as a new document in a subcollection: `jobs/{new_job_id}/candidates`.
    4.  Once all resumes are processed, update the job document's `status` to 'completed'.
  - **Response**: `201 Created` with the new job's ID (e.g., `{ "jobId": "..." }`).

- **`PUT /api/jobs/{job_id}`**: Updates an existing job's title or description.
  - **Request Body**: JSON with optional `title` and `jobDescription`.
  - **Logic**: Fetches the specified job document from Firestore and updates its fields.
  - **Response**: `200 OK`.

- **`POST /api/jobs/{job_id}/resumes`**: Adds new resumes to an existing job.
  - **Request Body**: `multipart/form-data` with `resumes` (file list).
  - **Logic**:
    1.  Update the job's `status` to 'processing'.
    2.  Perform the same resume processing and candidate creation logic as the `POST /api/jobs` endpoint, adding new candidates to the subcollection.
    3.  Set the job's `status` back to 'completed'.
  - **Response**: `200 OK`.

- **`DELETE /api/jobs/{job_id}`**: Deletes a job and all its associated candidates.
  - **Logic**: Deletes the job document and recursively deletes all documents in its `candidates` subcollection from Firestore.
  - **Response**: `204 No Content`.

#### Candidate Management

- **`DELETE /api/jobs/{job_id}/candidates/{candidate_id}`**: Deletes a single candidate.
  - **Logic**: Deletes the specified candidate document from the subcollection.
  - **Response**: `204 No Content`.

- **`DELETE /api/jobs/{job_id}/candidates`**: Deletes all candidates for a specific job.
  - **Logic**: Recursively deletes all documents in the `jobs/{job_id}/candidates` subcollection.
  - **Response**: `204 No Content`.

#### Email & Scheduling

- **`POST /api/emails/draft`**: Drafts personalized emails for a list of selected candidates.
  - **Request Body**: JSON containing:
    - `jobId`: `string`
    - `interviewDatetime`: `string` (ISO 8601 format)
    - `candidateIds`: `List[string]`
  - **Logic**:
    1.  Fetch the job details and the details for each selected candidate from Firestore.
    2.  For each candidate, call your `email_agent.py` to generate a personalized email body.
  - **Response**: `200 OK` with a list of JSON objects, each containing `{ "candidateName": "...", "candidateEmail": "...", "subject": "...", "body": "..." }`.

- **`POST /api/emails/send`**: Sends the drafted emails and creates Google Calendar events.
  - **Request Body**: JSON containing:
    - `jobId`: `string`
    - `interviewDatetime`: `string` (ISO 8601 format)
    - `candidateIds`: `List[string]`
    - `userGoogleTokens`: `dict` (The user's stored OAuth tokens)
  - **Logic**:
    1.  For each candidate:
        - Call `email_agent.py` to get the final email content.
        - Use an email service (e.g., Resend, SendGrid) to send the email.
        - Call your `calendar.py` module to create a Google Calendar event using the user's stored tokens.
  - **Response**: `200 OK`.

#### Google Authentication

- **`GET /api/auth/google`**: Generates and returns the Google OAuth2 consent screen URL.
  - **Logic**: Uses the `google-auth-oauthlib` library to create the authorization URL with the correct scopes (`calendar.events`, `userinfo.email`, etc.).
  - **Response**: JSON with `{ "url": "..." }`.

- **`GET /api/auth/google/callback`**: Handles the callback from Google after the user grants permission.
  - **Logic**:
    1.  Receives the `code` query parameter from Google.
    2.  Exchanges the `code` for an access token and a refresh token.
    3.  **Securely store these tokens** in Firestore, associated with the user. Encrypt them before saving.
  - **Response**: Redirects the user back to the frontend (`http://localhost:9002?calendar=connected`).

---

## 2. Agent & Logic Modules

These Python files will contain your core business logic and AI agent implementations. They should be placed in a subdirectory like `backend/agents/`.

### `resume_processing.py`
- **Purpose**: To analyze a single resume against a job description.
- **Function**: `process_resume(job_description: str, resume_content: str) -> dict`
- **Logic**:
  1.  Takes the job description and the raw text from a resume file as input.
  2.  Uses an LLM framework (e.g., LangChain, CrewAI, or direct OpenAI/Anthropic API calls) to perform "structured extraction."
  3.  The prompt should ask the LLM to return a JSON object with a specific schema:
      - `candidateName`: `string`
      - `candidateEmail`: `string`
      - `suitabilityScore`: `float` (a score from 0.0 to 1.0)
      - `summary`: `string` (A 2-3 sentence summary of why the candidate is a good fit, based on the resume and job description).
- **Returns**: A Python dictionary matching the schema above.

### `email_agent.py`
- **Purpose**: To draft personalized interview confirmation emails.
- **Function**: `draft_email(job_details: dict, candidate_details: dict, interview_time: str) -> dict`
- **Logic**:
  1.  Uses an LLM with a prompt that includes context about the job, the candidate's specific strengths (from their summary), and the interview details.
  2.  The prompt should ask the LLM to generate a warm, professional, and personalized email.
- **Returns**: A dictionary containing `{ "subject": "...", "body": "..." }`.

### `calendar.py`
- **Purpose**: To interact with the Google Calendar API.
- **Function**: `create_calendar_event(user_credentials: dict, event_details: dict) -> dict`
- **Logic**:
  1.  Initializes the `googleapiclient.discovery.build` service object using the user's stored OAuth credentials.
  2.  Constructs an event resource object with the title, description, start/end times, and attendee emails.
  3.  Calls `service.events().insert(...)` to create the event on the user's calendar.
- **Returns**: The created event details from the Google Calendar API.

---

## 3. Firestore Integration (`firestore_client.py`)

- **Purpose**: A utility module to abstract Firestore operations.
- **Logic**:
  - Initializes the Firebase Admin SDK for Python (`firebase_admin.initialize_app()`).
  - Provides helper functions like `get_job(job_id)`, `add_candidate(job_id, candidate_data)`, `update_job_status(job_id, status)`, etc.
- **Usage**: This module will be imported by your API endpoint functions in `main.py` to interact with the database.
```