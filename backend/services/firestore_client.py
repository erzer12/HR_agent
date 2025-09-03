# backend/services/firestore_client.py

import firebase_admin
from firebase_admin import credentials, firestore
from typing import Dict, Any, List, Optional

# Initialize the Firebase Admin SDK.
# It automatically uses the credentials from the GOOGLE_APPLICATION_CREDENTIALS env var.
# Make sure you have set this environment variable to point to your service account key file.
try:
    firebase_admin.get_app()
except ValueError:
    # In a production environment, you might use a different credential source,
    # but for local development, this is standard.
    # cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app()


db = firestore.client()

def create_job(title: str, description: str) -> str:
    """Creates a new job document in Firestore."""
    job_data = {
        'title': title,
        'jobDescription': description,
        'status': 'processing',
        'createdAt': firestore.SERVER_TIMESTAMP
    }
    _, job_ref = db.collection('jobs').add(job_data)
    return job_ref.id

def get_job(job_id: str) -> Dict[str, Any]:
    """Retrieves a single job document by its ID."""
    job = db.collection('jobs').document(job_id).get()
    return {"id": job.id, **job.to_dict()} if job.exists else None

def update_job(job_id: str, data: Dict[str, Any]):
    """Updates fields of a specific job document."""
    db.collection('jobs').document(job_id).update(data)

def update_job_status(job_id: str, status: str):
    """Convenience function to update a job's status."""
    update_job(job_id, {'status': status})

def delete_job_and_candidates(job_id: str):
    """Deletes a job and its entire 'candidates' subcollection."""
    job_ref = db.collection('jobs').document(job_id)
    _delete_collection(job_ref.collection('candidates'), 100)
    job_ref.delete()

def add_candidate(job_id: str, candidate_data: Dict[str, Any]):
    """Adds a new candidate document to a job's subcollection."""
    db.collection('jobs').document(job_id).collection('candidates').add(candidate_data)

def get_candidates(job_id: str, candidate_ids: List[str]) -> List[Dict[str, Any]]:
    """Fetches specific candidates from a job's subcollection."""
    candidates = []
    candidates_ref = db.collection('jobs').document(job_id).collection('candidates')
    for cid in candidate_ids:
        doc = candidates_ref.document(cid).get()
        if doc.exists:
            candidates.append({"id": doc.id, **doc.to_dict()})
    return candidates

def delete_candidate(job_id: str, candidate_id: str):
    """Deletes a single candidate document."""
    db.collection('jobs').document(job_id).collection('candidates').document(candidate_id).delete()

def delete_all_candidates(job_id: str):
    """Deletes all documents in the 'candidates' subcollection for a job."""
    candidates_ref = db.collection('jobs').document(job_id).collection('candidates')
    _delete_collection(candidates_ref, 100)

def _delete_collection(coll_ref, batch_size: int):
    """Recursively deletes a collection in batches."""
    docs = coll_ref.limit(batch_size).stream()
    deleted = 0
    for doc in docs:
        doc.reference.delete()
        deleted += 1
    if deleted >= batch_size:
        return _delete_collection(coll_ref, batch_size)

def store_user_tokens(user_id: str, tokens: Dict):
    """
    Stores user's Google OAuth tokens in Firestore.
    IMPORTANT: In production, you MUST encrypt these tokens before storing them.
    """
    db.collection('users').document(user_id).set({'google_tokens': tokens}, merge=True)

def get_user_tokens(user_id: str) -> Optional[Dict]:
    """
    Retrieves a user's stored Google OAuth tokens.
    In production, you would decrypt the tokens after fetching them.
    """
    doc = db.collection('users').document(user_id).get()
    if doc.exists:
        return doc.to_dict().get('google_tokens')
    return None
