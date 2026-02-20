# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/6422d882-b11f-4b09-8a0b-47925031a58e

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/6422d882-b11f-4b09-8a0b-47925031a58e) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/6422d882-b11f-4b09-8a0b-47925031a58e) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

---

## Python Backend (Migrated from Edge Functions)

This project now uses a Python FastAPI backend instead of Supabase Edge Functions for complex logic (Vendor API, Receipts, Quotes, Cron Jobs).

### Setup

1.  Navigate to the backend directory:
    ```sh
    cd backend
    ```

2.  Create and activate a virtual environment:
    ```sh
    python -m venv venv
    # Windows:
    .\venv\Scripts\activate
    # Linux/Mac:
    source venv/bin/activate
    ```

3.  Install dependencies:
    ```sh
    pip install -r requirements.txt
    ```

4.  Configure Environment Variables:
    *   Copy `.env.example` to `.env` (or create one).
    *   Required: `SUPABASE_URL`, `SUPABASE_KEY` (Service Role), `GMAIL_USER`, `GMAIL_APP_PASSWORD`.

### Running the Server

```sh
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.
Documentation is available at `http://localhost:8000/docs`.

### Key Features
*   **Vendors**: Onboarding, OTP, Status.
*   **Quotes**: Request and Submit quotes.
*   **Receipts**: Upload and manage receipts with status updates.
*   **Cron Jobs**: `POST /api/cron/send-expiry-reminder` for expiry notifications.
