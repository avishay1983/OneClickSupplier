# OneClickSupplier

A streamlined procurement and vendor management system designed for rapid onboarding and quote management.

## Project Overview

OneClickSupplier is a comprehensive solution for managing the vendor lifecycle, from initial request to signed contracts. It features:

- **Unified Dashboard**: A centralized view for procurement managers to track all active requests.
- **Vendor Onboarding**: Automated flows for vendor registration and document submission.
- **Quote Management**: Integrated tools for requesting, receiving, and comparing vendor quotes.
- **AI Integration**: Powered by OpenAI and Google Gemini for document analysis and automated insights.

## Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS.
- **Backend**: Python FastAPI.
- **Database**: PostgreSQL (via Supabase).

## Getting Started

### Prerequisites

- Node.js (v18+)
- Python 3.10+
- Environment variables configured in `.env` and `backend/.env`.

### Local Development

#### Frontend

```bash
npm install
npm run dev
```

#### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

## License

Internal use only for OneClickSupplier.
