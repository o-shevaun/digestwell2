DigestWell – Personalized Nutrition for Digestive & Gut Health

DigestWell is a full-stack web app that recommends safe, personalized meals for people living with common digestive disorders (GERD, IBS, functional dyspepsia, etc.).

It combines:

Next.js frontend (TypeScript, Tailwind CSS)

FastAPI backend (Python)

MongoDB Atlas for data

Spoonacular recipe API for rich meal content

A machine learning recommender trained on user interactions (accept / swap / reject)

Project Overview

DigestWell helps users answer:

“What can I safely eat today that won’t trigger my digestive symptoms?”

Core workflow:

Create a profile
Select digestive disorders, disliked foods, and allergies.

Generate a daily meal plan
Breakfast, lunch, and supper are proposed using Spoonacular recipes that respect safety rules.

Interact with the meals

Accept a day’s plan

Swap individual meals

Reject the plan entirely

Learn from feedback (ML)
All interactions are stored in MongoDB.
Offline scripts build a labeled dataset and train a gradient-boosted tree classifier that predicts the probability a user will accept a meal.
Future meal plans and swaps are ranked using this trained model.

Key Features

User Profile

Digestive disorders: GERD, IBS, functional dyspepsia, functional constipation/diarrhea, lactose intolerance, celiac disease, SIBO, diverticulosis, hemorrhoids.

Free-text lists of disliked foods and allergies/intolerances.

Daily Meal Planner

Breakfast / lunch / supper suggestions.

“View recipe” button opens the recipe on Spoonacular.

Interactive Feedback

Accept full plan.

Swap individual meals (never swap to the same meal again).

Reject dangerous or unappealing plans.

Analytics on Dashboard

Total plans generated.

Accepted vs rejected plans.

Guidance text explaining the workflow: Profile → Generate Plan → Get Recipes.

ML-Powered Personalization

Uses user profile + meal features + interaction history.

Gradient-boosted classifier with ROC-AUC around 0.80–0.83 on held-out test data.

Visualizations: ROC curve, confusion matrix, feature importance.

Tech Stack

Frontend

Next.js (App Router)

React, TypeScript

Tailwind CSS

NextAuth (credentials provider)

Backend

FastAPI

Pydantic

Uvicorn

Data & ML

MongoDB Atlas (Mongoose on frontend; PyMongo in ML scripts)

scikit-learn (GradientBoostingClassifier / HistGradientBoostingClassifier)

pandas, numpy

matplotlib

External APIs

Spoonacular Recipe API (primary recipe source)

(Optional) Edamam / Nutritionix for extra nutrition info

Requirements
Backend

Python 3.11+

pip, virtualenv

MongoDB Atlas connection string

Spoonacular API key

Frontend

Node.js 18+

npm or yarn

Environment Variables

Create a .env file in backend:

# Mongo
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?appName=Cluster0
MONGODB_DB=test

# CORS
ALLOW_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# API keys
SPOONACULAR_API_KEY=<your_spoonacular_key>

# FastAPI port
PORT=8000


Create a .env.local file in frontend:

# URL of the FastAPI backend
BACKEND_URL=http://127.0.0.1:8000

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace_with_strong_random_string

# Same MongoDB URI used by Mongoose
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?appName=Cluster0


⚠️ Never commit real API keys or passwords to Git.

Local Setup
1. Clone the repository
git clone https://github.com/<your-username>/digestwell.git
cd digestwell

2. Backend Setup (FastAPI + ML)
cd backend

# Create and activate virtual environment (Windows PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Or on macOS/Linux:
# python3 -m venv .venv
# source .venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt


Run the backend:

uvicorn app.main:app --reload --port 8000


The API will be available at: http://127.0.0.1:8000

3. Frontend Setup (Next.js)
cd frontend
npm install
# or: yarn


Run the dev server:

npm run dev
# or: yarn dev


The app will be available at: http://localhost:3000

Login flow:

Register a new user from /register.

Log in via /login.

You are redirected to /dashboard.

Project Structure
digestwell/
├─ backend/
│  ├─ app/
│  │  ├─ main.py                # FastAPI entrypoint
│  │  ├─ config.py              # Settings (env, API keys)
│  │  ├─ routers/
│  │  │  ├─ health.py           # /health
│  │  │  └─ model.py            # /model/generate, /model/swap
│  │  ├─ services/
│  │  │  └─ planner.py          # Planner + ML ranking logic
│  │  └─ models/                # Pydantic models if needed
│  ├─ ml/
│  │  ├─ build_dataset.py       # Build labelled interaction dataset
│  │  ├─ enrich_features.py     # Add user + meal features
│  │  ├─ train_recommender.py   # Train ML model, save recommender.joblib
│  │  ├─ visualize_recommender.py # ROC, confusion matrix, feature importance
│  │  ├─ inference.py           # Load model + score candidates
│  │  └─ seed_synthetic_interactions.py # Optional synthetic data generator
│  ├─ ml_output/
│  │  ├─ interactions_base.csv
│  │  ├─ interactions_features.csv
│  │  ├─ recommender.joblib
│  │  ├─ roc_curve.png
│  │  └─ confusion_matrix.png
│  └─ requirements.txt
│
├─ frontend/
│  ├─ src/
│  │  ├─ app/
│  │  │  ├─ page.tsx            # Landing / login redirect
│  │  │  ├─ dashboard/page.tsx  # Dashboard with counters + guidance
│  │  │  ├─ profile/page.tsx    # Digestive profile form
│  │  │  ├─ mealplans/
│  │  │  │  ├─ page.tsx         # Calendar list of meal plans
│  │  │  │  └─ [date]/page.tsx  # Single-day plan + SwapForm
│  │  │  ├─ api/
│  │  │  │  ├─ mealplans/
│  │  │  │  │  ├─ generate/route.ts  # Calls backend /model/generate
│  │  │  │  │  └─ [date]/swap/route.ts # Calls backend /model/swap
│  │  │  │  └─ auth/...         # NextAuth (credentials)
│  │  ├─ components/
│  │  │  ├─ Header.tsx          # Top nav (Dashboard, Profile, Calendar, Chat)
│  │  │  ├─ MealCard.tsx        # Single meal card + “View recipe”
│  │  │  └─ SwapForm.tsx        # Client-side swap UI
│  │  ├─ lib/
│  │  │  ├─ db.ts               # Mongoose connection
│  │  │  └─ models/             # User, UserProfile, MealPlan, MealInteraction
│  │  └─ styles/
│  ├─ package.json
│  └─ next.config.mjs
│
└─ README.md

Backend API Endpoints (FastAPI)
Method	Path	Description
GET	/health	Health check
POST	/model/generate	Generate daily meal plan with ML ranking
POST	/model/swap	Suggest a swap for a specific meal type

Example: generate plan (raw FastAPI):

curl -X POST "http://127.0.0.1:8000/model/generate" \
  -H "Content-Type: application/json" \
  -d '{ "user_id": "<mongoUserId>", "calories_target": 2100 }'


Response (simplified):

{
  "calories_target": 2100,
  "meals": {
    "breakfast": { "label": "Oatmeal with Berries", "sourceUrl": "https://spoonacular.com/..." },
    "lunch":      { "label": "Chicken Rice Bowl",     "sourceUrl": "https://spoonacular.com/..." },
    "dinner":     { "label": "Salmon & Veggies",      "sourceUrl": "https://spoonacular.com/..." }
  },
  "diag": { "...": "debug info about sources and ML scoring" }
}

Frontend API Routes (Next.js)

These are server actions that the React UI calls; they in turn call the FastAPI backend.

Method	Path	Description
POST	/api/mealplans/generate	Generate today’s plan for logged-in user
POST	/api/mealplans/[date]/swap	Swap one meal (breakfast/lunch/supper)
POST	/api/mealplans/[date]/accept	Mark plan as accepted
POST	/api/mealplans/[date]/reject	Reject & remove plan
POST	/api/profile	Create/update digestive profile

These all use the logged-in user’s ID from NextAuth and store data in MongoDB.

Machine Learning Pipeline

All ML scripts live in backend/ml/.
Ensure your backend virtualenv is activated and that MONGODB_URI / MONGODB_DB are set in the shell.

1. Build base interaction dataset
cd backend
python -m ml.build_dataset


Creates:

ml_output/interactions_base.csv – rows from mealinteractions (accept / swap / reject) joined with meal plans.

2. Enrich with user + meal features
python -m ml.enrich_features


Adds:

User features: has_gerd, has_ibs, n_allergies, n_disliked_foods, …

Meal features: trigger counts, low-FODMAP flags, safety flags, overlap with disliked foods, etc.

Output: ml_output/interactions_features.csv.

3. Train recommender model
python -m ml.train_recommender


Splits data into train / test (stratified).

Trains a tree-based classifier.

Prints metrics:

ROC AUC

Precision / recall / F1

Confusion matrix summary

Saves trained model to ml_output/recommender.joblib.

At the time of writing, ROC AUC ≈ 0.80–0.83 on held-out test data, which you can report in your project.

4. Visualize performance
python -m ml.visualize_recommender


Creates:

ml_output/roc_curve.png

ml_output/confusion_matrix.png

ml_output/feature_importance.png (if configured)

These plots are useful for your presentation and report.

5. (Optional) Seed synthetic interactions

For demo purposes, you can quickly generate synthetic interaction data in MongoDB to train the model:

python -m ml.seed_synthetic_interactions


This script:

Reads existing userprofiles.

Inserts synthetic mealinteractions to mimic real user behaviour.

Lets you train and evaluate the model even before you have many real users.

How the Recommender Works (Summary)

Labels from interactions

Accept → positive (1)

Swapped-in meals (newMeal) → strong positive (1)

Rejected meals or swapped-out previousMeal → negative (0)

Feature engineering

User condition flags (GERD, IBS, etc.).

Allergy / dislikes counts.

Meal trigger counts (acidic, spicy, FODMAP-heavy ingredients, etc.).

Safety rule outputs (is_safe_for_user_conditions).

Overlap ratio between ingredients and disliked foods.

Model

Gradient-boosted trees using scikit-learn.

Outputs p_accept for each (user, meal) pair.

Online recommendation (planner.py)

Planner asks Spoonacular for candidate meals per slot.

Filters unsafe meals using rule-based constraints.

Builds feature vectors for each candidate.

Uses the trained model to get p_accept.

Picks the top-scoring meal for each slot (breakfast, lunch, dinner).

High-Level User Flow (Dashboard Guidance)

On the dashboard, users are guided through:

Complete Your Profile
Go to Profile → select digestive disorders → add disliked foods and allergies.

Generate Today’s Plan
Click “Generate Today’s Plan” on the dashboard.
A plan is created, saved in MongoDB, and opened on the calendar detail page.

Review & Interact with Meals

Use “View recipe” to open the Spoonacular page.

If a meal doesn’t look good, Swap Selected.

If the whole day is wrong, Reject the plan.

If it looks good, Accept.

Learn Over Time
Every accept / swap / reject action is logged and used in future training runs to improve personalization.
