# backend/agents/calendar.py

from typing import Dict
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import logging
import random

def create_calendar_event(user_credentials: Dict, event_details: Dict) -> Dict:
    """
    Creates an event on the user's primary Google Calendar.

    NOTE: The final API call is commented out and mocked to allow this code
    to run without live credentials. To make it functional, uncomment the
    `service.events().insert(...).execute()` line and remove the mocked response.
    """
    try:
        # In a real scenario, you'd build the credentials from the stored tokens
        # creds = Credentials.from_authorized_user_info(user_credentials)
        # service = build('calendar', 'v3', credentials=creds)

        event_body = {
            'summary': event_details.get('summary'),
            'description': event_details.get('description'),
            'start': {'dateTime': event_details.get('start_time'), 'timeZone': 'UTC'},
            'end': {'dateTime': event_details.get('end_time'), 'timeZone': 'UTC'},
            'attendees': [{'email': email} for email in event_details.get('attendees', [])],
        }

        # --- REAL API CALL (commented out for this example) ---
        # created_event = service.events().insert(calendarId='primary', body=event_body).execute()
        
        # --- MOCKED API RESPONSE (for development without live credentials) ---
        logging.info(f"MOCK: Creating calendar event for {event_details.get('attendees')}")
        created_event = {
            'id': f'mock_event_{random.randint(1000, 9999)}',
            'htmlLink': 'https://calendar.google.com/',
            **event_body
        }
        
        return created_event

    except Exception as e:
        logging.error(f"Error creating calendar event: {e}")
        raise
