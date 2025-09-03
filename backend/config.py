# backend/config.py

import os
from dotenv import load_dotenv

# Load environment variables from a .env file for local development
load_dotenv()

# --- Firebase Configuration ---
# Ensure the GOOGLE_APPLICATION_CREDENTIALS environment variable is set to the path
# of your Firebase service account key JSON file. This is used by the Firebase Admin SDK.
# e.g., export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/serviceAccountKey.json"

# --- Google OAuth Configuration ---
# Get these credentials from your Google Cloud Console for the OAuth 2.0 Client ID
# that is configured for a "Web application".
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
# This must exactly match one of the "Authorized redirect URIs" in your Google Cloud project
GOOGLE_REDIRECT_URI = "http://localhost:8000/api/auth/google/callback"

# Define the scopes (permissions) your application needs from the user
GOOGLE_API_SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid"
]

# --- Application URLs ---
# The URL where your Next.js frontend is running
FRONTEND_URL = "http://localhost:9002"
