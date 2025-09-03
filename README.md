<<<<<<< HEAD

# ResumeRank Monorepo

This project is structured as a monorepo with two main packages:

- **/frontend**: A Next.js application that provides the user interface.
- **/backend**: A Python application that handles all business logic, AI processing, and data manipulation.

## Getting Started

This project requires two separate processes to be running simultaneously in two different terminal windows.

### 1. Backend Server (Python)

First, start the Python backend server. From the project root directory, run the following commands:

```bash
# Navigate to the backend directory
cd backend

# (Recommended) It is highly recommended to use a Python virtual environment
# python -m venv venv
# source venv/bin/activate  # On Windows, use `venv\Scripts\activate`

#
# !! IMPORTANT !!
# You must install the Python dependencies before starting the server.
#
# If the 'pip' command is not found, your environment may prompt you to install it.
# Please do so before proceeding.
#
pip install -r requirements.txt

#
# Now, you can run the FastAPI server
#
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```
You can verify the backend is running by opening `http://localhost:8000/api` in your browser. You should see `{"message":"ResumeRank API is running"}`.

### 2. Frontend Server (Next.js)

Once the backend is running, open a **new terminal window**. From the project root directory, run the following commands to start the UI development server:

```bash
# Install Node.js dependencies
npm install

# Run the Next.js development server
npm run dev
```

The frontend will be available at `http://localhost:9002`. It is configured to send API requests to your Python backend at `http://localhost:8000`.

    
=======
# ResumeRank AI Agent

This project is an AI agent that autonomously screens job applicants from a pool of resumes, ranks candidates, and prepares for interview scheduling.

## Architecture

The system uses a decoupled architecture:

- **Frontend**: A [Next.js](https://nextjs.org/) application responsible for the user interface.
- **Backend**: A [Python](https://www.python.org/) API built with [FastAPI](https://fastapi.tiangolo.com/) that handles all AI processing, database interactions, and other business logic.

## Features

- **Job & Resume Submission**: HR can submit a job description and a batch of resumes through the UI.
- **AI-Powered Ranking**: The Python backend uses Google's Gemini model to parse resumes, score them against the job description, and generate summaries.
- **Candidate Review**: The frontend displays a ranked list of candidates with their scores and summaries.
- **Database**: Candidate data is stored in Google Cloud Firestore.

## Setup and Installation

### Prerequisites

- Node.js and npm/yarn/pnpm
- Python 3.8+ and pip
- A Google Cloud project with Firebase (Firestore) and the Vertex AI API enabled.

### Backend Setup (Python)

1.  **Navigate to the `backend` directory:**
    ```bash
    cd backend
    ```
2.  **Create and activate a virtual environment:**
    ```bash
    # On macOS/Linux
    python3 -m venv venv
    source venv/bin/activate

    # On Windows
    python -m venv venv
    venv\Scripts\activate
    ```
3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
4.  **Create a `.env` file** in the `backend` directory and add your Google API Key:
    ```
    GOOGLE_API_KEY="YOUR_API_KEY_HERE"
    ```
5.  **Set up Firebase Credentials:**
    - Download your service account key JSON file from your Firebase project settings.
    - Rename it to `serviceAccountKey.json`.
    - Place it inside the `backend` directory.
6.  **Run the backend server:**
    ```bash
    uvicorn main:app --reload
    ```
    The API will be available at `http://localhost:8000`.

### Frontend Setup (Next.js)

1.  **Navigate to the project's root directory.**
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Create a `.env.local` file** in the root directory with your Firebase configuration for the client-side app:
    ```
    NEXT_PUBLIC_FIREBASE_API_KEY="<your-api-key>"
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="<your-auth-domain>"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="<your-project-id>"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="<your-storage-bucket>"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="<your-messaging-sender-id>"
    NEXT_PUBLIC_FIREBASE_APP_ID="<your-app-id>"
    ```
4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The frontend will be available at `http://localhost:3000`.

## Next Steps

The frontend needs to be updated to call the new Python API endpoints instead of the old TypeScript server actions. The relevant file to modify would be the component that handles the job creation form.
>>>>>>> 51e23ed (feat:Next.js frontend and Python backend)
