# CivicResolve AI

CivicResolve AI is a civic issue management platform designed to help citizens report local problems, reduce duplicate complaints, and let authorities triage and resolve them efficiently.

## Problem

Many cities still depend on fragmented complaint systems where:

- citizens report the same issue multiple times
- officials struggle to prioritize urgent cases
- backlog is hard to track across departments
- evidence quality varies from one complaint to another
- citizens do not get clear visibility into resolution status

This platform addresses that gap by combining a web-based civic workflow with AI-powered analysis for duplicate detection, evidence evaluation, classification, and urgency scoring.

## Solution

CivicResolve AI creates a single flow from complaint submission to resolution:

- Citizens can submit civic issues with text, images, location, and urgency details
- The app automatically checks for nearby or similar reports to reduce duplicates
- AI evaluates complaint evidence and suggests a category and priority level
- Admins review and assign work to officers
- Officers update progress, complete inspections, and verify closure
- Citizens can follow the lifecycle of their issue and receive better transparency

## Key features

- Role-based dashboard for citizens, admin, and civic officers
- Complaint creation with image upload and geolocation support
- Duplicate detection using similarity and geospatial analysis
- AI-assisted evidence and priority scoring
- SLA tracking and workflow management
- Notifications and status updates
- Local demo login flow for testing the platform

## Tech stack

### Frontend
- HTML, CSS, JavaScript
- Static dashboard pages for landing, login, citizen, admin, and officer views
- Browser-side logic for role navigation and dashboard interactions

### Backend
- Node.js
- Express.js
- MySQL for persistent data and authentication
- REST API gateway for frontend and admin/officer workflows

### AI engine
- Python
- FastAPI
- PyTorch / Transformers / Hugging Face models
- CV and multimodal AI components such as:
  - CLIP for classification
  - YOLO for object detection
  - BLIP for image captioning
  - Embedding models for similarity analysis

### Supporting services
- duplicate detection
- geospatial matching
- evidence strength evaluation
- priority scoring
- workflow and SLA handling

## Project structure

```text
FusionX1.0-main/
├── index.html
├── login.html
├── citizen-dashboard.html
├── admin-dashboard.html
├── officer-dashboard.html
├── style.css
├── css/
├── js/
├── backend/
│   ├── server.js
│   ├── src/
│   └── package.json
├── ai-engine/
│   ├── api.py
│   ├── models/
│   ├── services/
│   └── uploads/
├── package.json
├── start.bat
├── README.md
└── .gitignore
```

## Execution

### Prerequisites

- Node.js LTS
- Python 3.10+
- Optional: MySQL if you want database-backed persistence enabled

### Option 1: Run using the Windows launcher

From the project root:

```bash
start.bat
```

This script will:

- install backend dependencies if missing
- open a second terminal for the AI engine
- start the Node server on port 3001
- make the app available at http://localhost:3001/

Keep both windows open while using the app.

### Option 2: Run manually

#### Terminal 1: Start the backend and frontend

```bash
cd path\to\FusionX1.0-main
npm install
npm start
```

Then open:

```text
http://localhost:3001/
```

#### Terminal 2: Start the AI engine

```bash
cd path\to\FusionX1.0-main\ai-engine
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn api:app --host 0.0.0.0 --port 8000
```

Later runs can be started with:

```bash
cd path\to\FusionX1.0-main\ai-engine
venv\Scripts\activate
uvicorn api:app --host 0.0.0.0 --port 8000
```

## Health checks

After starting the app, verify these endpoints:

- Frontend: http://localhost:3001/
- Backend health: http://localhost:3001/api/health
- AI health: http://localhost:8000/health
- AI bridge: http://localhost:3001/api/ai-health

If the AI engine is offline, the app can still run using fallback logic, but the full AI features will be limited.

## Demo access

Open http://localhost:3001/login.html and use the demo roles:

1. Citizen
2. Admin
3. Civic Officer

Example admin workflow:

- log in as admin
- review the priority queue
- assign an officer such as OFF-001

## Notes

- Use http://localhost:3001 rather than opening HTML files directly in a browser so the API and frontend share the same origin.
- The project is designed for local development and demo use.
- For a clean setup on another device, reinstall dependencies rather than copying generated folders like backend/node_modules or ai-engine/venv.

## License

This project is intended for educational/demo use in civic technology and smart governance prototypes.

