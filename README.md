# ResumeRank Monorepo

This project is structured as a monorepo with two main packages:

- **/frontend**: A Next.js application that provides the user interface.
- **/backend**: A Python application that handles all business logic, AI processing, and data manipulation.

## Getting Started

### Frontend

The frontend is a Next.js application. From the project root directory, run the following commands:

```bash
npm install
npm run dev
```

The frontend will be available at `http://localhost:9002`.

### Backend

The backend is a Python application. Follow the instructions in `backend/PYTHON_BACKEND_ROADMAP.md` to build out the required API.

To run the Python server (once developed), you will typically run these commands from the root directory:

```bash
cd backend
# Set up your Python virtual environment and install dependencies
pip install -r requirements.txt

# Run the server
uvicorn app:app --reload
```

    