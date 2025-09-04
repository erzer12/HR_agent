# ResumeRank Backend

This is the backend for the ResumeRank application, built with FastAPI.

## Setup

1.  **Install dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

2.  **Set up environment variables:**

    Create a `.env` file in the `backend` directory and add the following:

    ```
    GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
    GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
    GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"
    ```

3.  **Create `client_secret.json`:**

    Place your Google OAuth `client_secret.json` file in the `backend` directory.

4.  **Run the application:**

    ```bash
    uvicorn app:app --reload
    ```

The API will be available at `http://localhost:8000`.
