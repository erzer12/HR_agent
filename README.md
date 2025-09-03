# ResumeRank Monorepo

This project is structured as a monorepo with two main packages:

- **/frontend**: A Next.js application that provides the user interface.
- **/backend**: A Python application (to be built) that handles all business logic, AI processing, and data manipulation.

## Getting Started

### Frontend

To run the frontend development server:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:9002`.

### Backend

The backend is intended to be a Python application. Follow the instructions in `backend/PYTHON_BACKEND_ROADMAP.md` to build out the required API.

To run the Python server (once developed):

```bash
cd backend
# Set up your Python virtual environment and install dependencies from requirements.txt
uvicorn app:app --reload
```
