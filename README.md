# DigestWell – Personalized Meal Plans for Digestive Health

DigestWell is a web application that helps people with **digestive disorders** (GERD, IBS, functional dyspepsia, lactose intolerance, celiac disease, etc.) discover **safe, personalized meals**.

The system combines:

* A **Next.js** frontend
* A **FastAPI** backend
* **MongoDB Atlas** for storage
* A **machine learning recommender** trained on:

  * User profiles (conditions, dislikes, allergies)
  * Meal plans and meal interaction feedback (accept / swap / reject)

---

## Table of Contents

* [Project Overview](#project-overview)
* [Core Features](#core-features)
* [System Architecture](#system-architecture)
* [Screenshots](#screenshots)
* [Tech Stack](#tech-stack)
* [Project Structure](#project-structure)
* [Requirements](#requirements)
* [Backend Setup](#backend-setup)
* [Frontend Setup](#frontend-setup)
* [Environment Variables](#environment-variables)
* [Running the ML Pipeline](#running-the-ml-pipeline)
* [ML Visualisations](#ml-visualisations)
* [Backend API Endpoints](#backend-api-endpoints)
* [Usage Flow](#usage-flow)
* [Future Work](#future-work)
* [License](#license)
* [Acknowledgements](#acknowledgements)

---

## Project Overview

Digestive disorders are strongly affected by food choices. Many patients struggle to know **what is safe to eat** and what will trigger symptoms.

DigestWell:

1. Lets users create a **profile** with their digestive conditions, foods they dislike, and allergies.
2. Generates **daily meal plans** (breakfast, lunch, dinner) using Spoonacular recipes.
3. Applies **safety rules** based on disorders (e.g., GERD → avoid spicy / acidic meals).
4. Logs every **interaction** (accept / swap / reject).
5. Trains a **Gradient Boosted Trees classifier** to estimate the probability a user will accept a given meal.
6. Uses the model to **rank candidate meals**, so new plans become more personalized over time.
7. Includes a chat box where users can query on any issue they are unsure about for their digestive health

---

## Core Features

### User features

* **Authentication**

  * Register / Login with email & password.
* **Profile page**

  * Select digestive disorders:

    * GERD (acid reflux), IBS, functional dyspepsia, functional constipation, functional diarrhoea, lactose intolerance, celiac disease, SIBO, diverticulosis, haemorrhoids / anal fissures.
  * List **foods you dislike**.
  * List **allergies / intolerances**.
* **Dashboard**

  * Generate today’s meal plan.
  * See total plans generated, accepted, rejected.
  * Buttons to open calendar view and chat.
  * Short onboarding: **Profile → Generate plan → View recipes & give feedback**.
* **Calendar**

  * View meal plans by date.
  * Each date shows breakfast, lunch, supper cards.
* **Meal cards**

  * Show meal image, title, type (Breakfast / Lunch / Supper).
  * “View recipe” link that opens the **Spoonacular** recipe page.
* **Swap / Accept / Reject**

  * Swap a single meal (e.g. only Breakfast).
  * Accept the whole plan.
  * Reject the whole plan.

### Machine Learning features

* **Data logging to MongoDB Atlas**

  * `userprofiles` – user conditions, dislikes, allergies.
  * `mealplans` – daily plans (breakfast / lunch / dinner).
  * `mealinteractions` – every accept / swap / reject with timestamps.
* **Offline ML pipeline (Python / scikit-learn)**

  * `ml.build_dataset.py` – builds labelled interaction dataset.
  * `ml.enrich_features.py` – adds user + meal features.
  * `ml.train_recommender.py` – trains GradientBoosting / RandomForest classifier.
  * `ml.visualize_recommender.py` – ROC curve, confusion matrix, feature importance.
* **Model performance**

  * With real interactions, the recommender achieves a **ROC AUC ≈ 0.80–0.83** on a held-out test set (not perfect → realistic, not overfitted).
* **Runtime inference**

  * `ml.inference.py` loads `recommender.joblib`.
  * `planner.py` uses the model to **rank candidate meals** from Spoonacular and pick the top meal per slot, falling back gracefully if ranking fails.

---

## System Architecture

High-level:

1. **Frontend (Next.js)**

   * Pages: `/`, `/homepage`, `/profile`, `/mealplans`, `/login`, `/register`, `/chat`.
   * Uses NextAuth for credentials-based authentication.
   * Calls internal API routes under `/api/*`.
2. **Backend (FastAPI)**

   * Exposes `/model/generate` and `/model/swap` for meal plans and swaps.
   * Uses `planner.py` to combine:

     * Spoonacular API calls
     * Hard safety rules
     * ML recommender scores
3. **Database (MongoDB Atlas)**

   * Stores users, profiles, meal plans, and interactions in separate collections.
4. **ML Pipeline (offline)**

   * Python scripts under `backend/ml/` build datasets, train the model, and export plots.

---

## Tech Stack

**Frontend**

* Next.js (App Router)
* TypeScript
* Tailwind CSS
* NextAuth (Credentials provider)

**Backend**

* FastAPI
* Pydantic
* HTTPX / requests for external APIs

**Database**

* MongoDB Atlas (cloud-hosted)

**Machine Learning**

* Python 3.11+
* pandas, numpy
* scikit-learn
* joblib
* matplotlib

**External APIs**

* Spoonacular (recipe search + metadata)
* (Optional) Edamam / Nutritionix for nutrition data

---

## Project Structure

```text
nutrition-suite/
├─ backend/
│  ├─ app/
│  │  ├─ main.py                    # FastAPI entrypoint
│  │  ├─ config.py                  # Settings (API keys, Mongo URI)
│  │  ├─ routers/
│  │  │  ├─ health.py               # /health
│  │  │  ├─ model.py                # /model/generate, /model/swap
│  │  │  └─ chat.py (optional)
│  │  ├─ services/
│  │  │  └─ planner.py              # Planner + ML ranking logic
│  │  ├─ providers/
│  │  │  └─ spoonacular.py          # Calls Spoonacular API
│  │  └─ models/
│  │     └─ mongo_schemas.py        # Pydantic models (if used)
│  ├─ ml/
│  │  ├─ build_dataset.py           # Build labelled interaction dataset
│  │  ├─ enrich_features.py         # Add user + meal features
│  │  ├─ train_recommender.py       # Train ML model
│  │  ├─ visualize_recommender.py   # ROC, confusion matrix, feature importance
│  │  └─ inference.py               # Load recommender & score candidates
│  └─ ml_output/
│     ├─ interactions_base.csv
│     ├─ interactions_features.csv
│     ├─ recommender.joblib
│     ├─ roc_curve.png
│     └─ confusion_matrix.png
│
├─ frontend/
│  ├─ src/
│  │  ├─ app/
│  │  │  ├─ page.tsx                # Landing / home
│  │  │  ├─ dashboard/page.tsx      # Main dashboard
│  │  │  ├─ profile/page.tsx        # Profile configuration
│  │  │  ├─ mealplans/page.tsx      # Calendar overview
│  │  │  ├─ mealplans/[date]/page.tsx # Meal plan detail
│  │  │  ├─ login/page.tsx
│  │  │  ├─ register/page.tsx
│  │  │  └─ api/mealplans/*         # Next.js API routes
│  │  ├─ components/
│  │  │  ├─ Header.tsx
│  │  │  ├─ MealCard.tsx
│  │  │  └─ SwapForm.tsx
│  │  └─ lib/
│  │     └─ auth.ts                 # NextAuth config
│  └─ public/
│     └─ (images, logos, etc.)
│
└─ README.md
```

---

## Requirements

### Backend

* Python **3.11+**
* `pip`, `virtualenv`
* MongoDB Atlas connection string
* Spoonacular API key (and optionally Edamam / Nutritionix keys)

### Frontend

* Node.js **18+**
* `npm` or `yarn`

---

## Backend Setup

```bash
cd backend

# Create and activate virtual environment (Windows PowerShell example)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Or on macOS / Linux
# python3 -m venv .venv
# source .venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

Set your environment variables **for development** (PowerShell example):

```powershell
$env:MONGODB_URI = "your-mongodb-atlas-uri"
$env:MONGODB_DB  = "test"           
$env:SPOONACULAR_API_KEY = "your-spoonacular-key"
```

Run the FastAPI backend:

```bash
uvicorn app.main:app --reload --port 8000
```

---

## Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
# or
# yarn
```

Create a `.env.local` in `frontend/`:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=some-long-random-string

BACKEND_URL=http://127.0.0.1:8000
MONGODB_URI=your-mongodb-atlas-uri       # if needed by NextAuth adapter
```

Run the frontend:

```bash
npm run dev
# or
# yarn dev
```

The app should be available at **[http://localhost:3000](http://localhost:3000)**.

---

## Environment Variables

### Backend (`backend/.env` or shell)

* `MONGODB_URI` – MongoDB Atlas connection string
* `MONGODB_DB` – database name (e.g. `test` or `digestwell`)
* `SPOONACULAR_API_KEY` – Spoonacular API key
* (Optional) `EDAMAM_APP_ID`, `EDAMAM_APP_KEY`, `NUTRITIONIX_APP_ID`, `NUTRITIONIX_API_KEY`

### Frontend (`frontend/.env.local`)

* `NEXTAUTH_URL`
* `NEXTAUTH_SECRET`
* `BACKEND_URL` – e.g. `http://127.0.0.1:8000`

---

## Running the ML Pipeline

All ML scripts live in `backend/ml/`.

1. **Build the base labelled dataset**

   ```bash
   cd backend
   python -m ml.build_dataset
   ```

   Outputs: `ml_output/interactions_base.csv`

2. **Enrich with user + meal features**

   ```bash
   python -m ml.enrich_features
   ```

   Outputs: `ml_output/interactions_features.csv`

3. **Train the recommender**

   ```bash
   python -m ml.train_recommender
   ```

   Console output includes:

   * Number of rows
   * Train / test split sizes
   * **ROC AUC** on test set (≈ 0.80+)
   * Precision / recall / F1 and confusion matrix summary

   Model is saved to:

   * `ml_output/recommender.joblib`


---

## ML Visualisations

To generate plots for your report / presentation:

```bash
python -m ml.visualize_recommender
```

Outputs saved into `backend/ml_output/`:

* `roc_curve.png` – ROC curve of the recommender.
* `confusion_matrix.png` – Confusion matrix on the test set.
* Feature importance plot (depending on your implementation).
  
## Screenshots

> <img width="572" height="463" alt="image" src="https://github.com/user-attachments/assets/edcbf50b-7f10-4104-87ea-4003e2b3c905" />, <img width="692" height="441" alt="image" src="https://github.com/user-attachments/assets/8d0d53a7-9656-403c-9c35-8100595a54da" />, <img width="576" height="469" alt="image" src="https://github.com/user-attachments/assets/bbfef30e-f91d-40d1-b154-d13c012f035c" />

---

## Backend API Endpoints

### FastAPI (backend)

| Method | Path              | Description                                                                        |
| ------ | ----------------- | ---------------------------------------------------------------------------------- |
| GET    | `/health`         | Health check (used for monitoring)                                                 |
| POST   | `/model/generate` | Generate one-day meal plan (breakfast/lunch/dinner) using Spoonacular + ML ranking |
| POST   | `/model/swap`     | Swap a single meal (breakfast/lunch/dinner)                                        |

Payloads:

* `/model/generate`

  ```json
  {
    "user_id": "MongoUserIdString",
    "calories_target": 2100
  }
  ```

* `/model/swap`

  ```json
  {
    "user_id": "MongoUserIdString",
    "meal_type": "breakfast",
    "exclude_label": "Current meal label to avoid repeating"
  }
  ```

### Next.js API (frontend)

| Method   | Path                             | Description                                                                                                                          |
| -------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| POST     | `/api/mealplans/generate`        | Called from Dashboard “Generate Today’s Plan” button; forwards to backend `/model/generate` and then redirects to the meal plan page |
| POST     | `/api/mealplans/[date]/swap`     | Swap a selected meal slot for that date                                                                                              |
| POST     | `/api/mealplans/[date]/accept`   | Accept the whole plan                                                                                                                |
| POST     | `/api/mealplans/[date]/reject`   | Reject the whole plan                                                                                                                |
| GET/POST | `/api/profile`                   | Load and save user profile (conditions, dislikes, allergies)                                                                         |
| POST     | `/api/auth/register`             | Register user (hashes password, saves to Mongo)                                                                                      |
| POST     | `/api/auth/callback/credentials` | NextAuth credentials login flow                                                                                                      |

---

## Usage Flow

1. **Register & Login**

   * Create an account using email and password.
   * Login via the `/login` page.

2. **Set up your Digestive Profile**

   * Go to **Profile**.
   * Tick your digestive disorders (e.g. GERD, IBS, celiac disease).
   * Enter foods you dislike (e.g. *liver, pasta*).
   * Enter allergies (e.g. *lactose, gluten, peanuts*).
   * Save – data is stored in MongoDB (`userprofiles`).

3. **Generate Today’s Plan**

   * On the **Dashboard**, click **“Generate Today’s Plan”**.
   * Frontend calls `/api/mealplans/generate` → FastAPI `/model/generate`.
   * Backend:

     * Fetches candidate meals from Spoonacular.
     * Applies safety filters based on your profile.
     * Builds feature vectors for each candidate.
     * Uses the trained ML model to score each candidate.
     * Selects the **highest-scoring safe meal** for each slot.
   * Plan is saved in `mealplans` and shown on the detail page.

4. **View Recipes**

   * On the meal plan page, click **“View recipe”** under any meal.
   * Opens the official **Spoonacular recipe** page in a new tab.

5. **Give Feedback (for ML)**

   * If you like the plan: click **Accept** → logs positive interactions.
   * If you dislike it: click **Reject** → logs negative interactions.
   * If you want just one meal changed:

     * Choose **Swap: Breakfast / Lunch / Supper**.
     * The backend suggests a new meal (excluding the previous one).
     * `mealinteractions` stores:

       * `swap_old` (previous meal → label 0)
       * `swap_new` (new meal → label 1)

6. **Calendar View**

   * Use the **Calendar** link to review previous days’ plans.
   * Older than 24 hours become read-only (locked).

Over time, as more interactions are logged, retraining the model makes meal suggestions more personalised to each user.

---

## Future Works

Some ideas for extending DigestWell:

* Add more digestive disorders/diseases 
* Incorporate **more detailed nutrition analysis** (macro/micro nutrients).
* Add per-user explanations for “why this meal was recommended”.
* Support **push notifications / email reminders** for daily meal plans.

---


## Acknowledgements

* Spoonacular API for recipe data.
* MongoDB Atlas for database hosting.
* scikit-learn for the ML toolkit.
* Next.js, FastAPI, Tailwind CSS, and the broader open-source community.

---

