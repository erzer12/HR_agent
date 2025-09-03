# ResumeRank Monorepo

This project is structured as a monorepo with two main packages:

- **/frontend**: A Next.js application that provides the user interface.
- **/backend**: A Python application that handles all business logic, AI processing, and data manipulation.

## Getting Started

### 1. Frontend (Next.js)

The frontend is a Next.js application. From the project root directory, run the following commands to start the UI development server:

```bash
npm install
npm run dev
```

The frontend will be available at `http://localhost:9002`. It is configured to send API requests to your Python backend, which it expects to be running on `http://localhost:8000`.

### 2. Backend (Python)

The backend is a Python application that you will build. Follow the detailed instructions in `backend/PYTHON_BACKEND_ROADMAP.md` to create the required API.

To run the Python server (once you have developed it), you will typically run these commands from the root directory:

```bash
# Navigate to the backend directory
cd backend

# It is highly recommended to use a Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows, use `venv\Scripts\activate`

# Install the required Python packages
pip install -r requirements.txt

# Run the FastAPI server
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```
