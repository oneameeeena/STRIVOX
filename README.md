# STRIVOX — AI-Powered Cybersecurity Investigation Assistant

STRIVOX is an AI-powered cybersecurity investigation assistant designed to accelerate the triage, analysis, and reporting of security incidents. This repository contains the core functional MVP of the application.

## 🎯 Problem & Solution
**Problem:** Security Operations Center (SOC) analysts spend too much time manually parsing logs, diagnosing potential threats, and writing reports, leading to alert fatigue and delayed responses.
**Solution:** STRIVOX automates evidence analysis using state-of-the-art AI (via OpenRouter), rapidly diagnosing threat types, determining severity, identifying root causes, and generating professional PDF reports in seconds.

## 🏗️ Architecture & Tech Stack
**Architecture:** 
- A RESTful backend API that manages user authentication, investigation state, file parsing, and AI communication.
- A React frontend that allows security analysts to upload evidence and view actionable AI insights.

**Tech Stack:**
- **Backend:** Python 3, FastAPI, SQLAlchemy, SQLite, Pydantic, Passlib (bcrypt), JWT, ReportLab, HTTPX.
- **AI Integration:** OpenRouter API (configurable models, default: `google/gemini-2.5-flash`).
- **Frontend:** React, Vite, TypeScript, Axios, React Router.

## 📂 Project Structure
```
strivox/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routers (auth, investigations, analysis)
│   │   ├── core/         # Config & JWT Security
│   │   ├── database/     # DB session & models
│   │   ├── ai/           # OpenRouter client & JSON validators
│   │   ├── parser/       # Log/Text cleaner
│   │   ├── reports/      # PDF Generator using ReportLab
│   │   ├── schemas/      # Pydantic validation schemas
│   │   └── main.py       # Application entry point
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env              # Backend configuration
├── frontend/             # React/Vite App
│   ├── src/
│   │   ├── pages/        # Login, Register, Dashboard, Investigation details
│   │   ├── App.tsx       # Routing
│   │   └── api.ts        # Axios client
│   └── package.json
├── docs/                 
│   └── sample_attack.log # Test evidence
├── docker-compose.yml    # Full-stack Docker deployment
└── README.md
```

## ⚙️ Environment Variables
Create a `.env` file inside the `backend/` directory based on `.env.example`:
```env
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_MODEL=google/gemini-2.5-flash
SECRET_KEY=change_this_secret
DATABASE_URL=sqlite:///./strivox.db
```

## 🚀 Installation & Running the App

### Option 1: Docker (Recommended)
You can run both the backend and frontend simultaneously using Docker Compose:
```bash
docker-compose up --build
```
- Backend is available at: http://localhost:8000
- Frontend is available at: http://localhost:5173

### Option 2: Manual Run
**1. Run Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # (or `venv\Scripts\activate` on Windows)
pip install -r requirements.txt
uvicorn app.main:app --reload
```
**2. Run Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 🧪 How to Test the AI
1. **Register & Login** using the frontend interface.
2. Click **New Investigation**.
3. You can either **Paste** text into the evidence box OR **Upload** the provided sample file: `docs/sample_attack.log`.
4. Click **Start Analysis**. 
5. The backend will parse the log, send it to OpenRouter, validate the structured JSON response, and save it.
6. The frontend will display the AI's Incident Summary, Threat Type, Severity, and Recommended Actions.
7. Click **Download PDF Report** to view the dynamically generated ReportLab PDF.

## 📡 Core API Endpoints
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Authenticate & get JWT token
- `POST /api/investigations` - Create investigation with evidence
- `GET /api/investigations` - List history
- `POST /api/analyze` - Trigger AI log analysis
- `GET /api/report/{id}` - Retrieve JSON report
- `GET /api/report/{id}/pdf` - Download PDF

## 🛑 Limitations (MVP Scope)
- Client-side token removal (no Redis blacklist).
- SQLite used for simplicity (no PostgreSQL).
- Basic UI designed strictly for testing functionality (Figma UI polish pending).
- Does not integrate with live SIEM platforms (out of scope).
