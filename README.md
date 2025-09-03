
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

    
