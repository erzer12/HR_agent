from typing import Dict
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import logging

def create_calendar_event(user_credentials: Dict, event_details: Dict) -> Dict:
    """
    Creates an event on the user's primary Google Calendar.
    """
    try:
        creds = Credentials.from_authorized_user_info(user_credentials)
        service = build('calendar', 'v3', credentials=creds)

        event_body = {
            'summary': event_details.get('summary'),
            'description': event_details.get('description'),
            'start': {'dateTime': event_details.get('start_time'), 'timeZone': 'UTC'},
            'end': {'dateTime': event_details.get('end_time'), 'timeZone': 'UTC'},
            'attendees': [{'email': email} for email in event_details.get('attendees', [])],
        }

        created_event = service.events().insert(calendarId='primary', body=event_body).execute()
        
        return created_event

    except Exception as e:
        logging.error(f"Error creating calendar event: {e}")
        raise
