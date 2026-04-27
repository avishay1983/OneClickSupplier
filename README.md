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
- **Backend**: Python FastAPI (Unified Repo).
- **Database**: Local JSON Store (migrated from Supabase).

## Getting Started

### Prerequisites

- Node.js (v18+)
- Python 3.10+
- Environment variables configured in `.env`.

### Local Development

#### 1. Setup Backend
```bash
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload
```

#### 2. Setup Frontend
```bash
npm install
npm run dev
```

The frontend will run on [http://localhost:8080](http://localhost:8080) and the backend on [http://localhost:8000](http://localhost:8000).
In production, the backend serves the built frontend from the `dist/` folder.

## License

Internal use only for OneClickSupplier.
