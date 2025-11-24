# DigestWell

A personalized nutrition recommendation system for **digestive disorders**.  
DigestWell helps users with conditions like **GERD, IBS, lactose intolerance, celiac disease**, and others to discover **safe meal plans** powered by **machine learning** and evidence-based dietary rules.

The system consists of:

- A modern **Next.js + Tailwind CSS** frontend
- A **FastAPI** backend with a **MongoDB Atlas** database
- A **Gradient Boosting–based recommender model** trained on user profiles and meal interaction feedback  
  (`accept`, `swap`, `reject`)

---

## Project Overview

DigestWell supports users who struggle with digestive discomfort and need practical, day-to-day guidance on **what to eat**.

The app:

- Collects each user’s **digestive disorders, disliked foods, and allergies**
- Generates daily **breakfast, lunch, and supper** meal plans using **Spoonacular recipes**
- Ensures recommendations **avoid harmful triggers** for each condition
- Learns from user behaviour (accepting, swapping, or rejecting meals) to **personalize future plans**

### Digestive disorders covered

DigestWell currently focuses on these common conditions:

- GERD / Acid Reflux  
- Irritable Bowel Syndrome (IBS)  
- Functional dyspepsia  
- Functional constipation  
- Functional diarrhea  
- Lactose intolerance  
- Celiac disease  
- Small Intestinal Bacterial Overgrowth (SIBO)  
- Diverticulosis (prevention)  
- Hemorrhoids / Anal fissures  

---

## Key Features

### 1. User Profile (Digestive Health)

Each user maintains a **digestive health profile** stored in MongoDB:

- Select one or more **digestive disorders**
- Enter **foods you dislike** (free-text, comma-separated)
- Enter **allergies / intolerances** (e.g. lactose, gluten, peanuts)

This profile is used to:

- Filter out **unsafe meals**
- Create **binary feature flags** for the ML model:
  - `has_gerd`, `has_ibs`, `has_celiac`, `has_lactose_intolerance`, …
  - `n_allergies`, `n_disliked_foods`, etc.

---

### 2. Daily Meal Plan Generation

From the **Dashboard**, the user can:

1. Click **“Generate Today’s Plan”**
2. Backend calls Spoonacular to fetch candidate recipes for:
   - **Breakfast**
   - **Lunch**
   - **Dinner / Supper**
3. The backend:
   - Applies **safety rules** per condition (e.g. low-acid for GERD, low-FODMAP options for IBS)
   - Scores candidates with the **ML model**
   - Returns the **highest-scoring safe meal** per slot

Users can:

- View the plan for **today**
- Use a **calendar view** to browse historical plans

---

### 3. Safe Recipe Integration (Spoonacular)

Each recommended meal card includes:

- Recipe **title**
- Recipe **image**
- Button: **“View recipe”** → opens the original **Spoonacular** recipe page in a new tab

No third-party blogs or random sites are used — links go directly to Spoonacular.

---

### 4. Feedback Loop: Accept / Swap / Reject

For each daily plan:

- **Accept plan**  
  - Marks all meals (breakfast, lunch, dinner) as **positive** examples.
- **Reject plan**  
  - Marks all meals as **negative** examples.
- **Swap meal**  
  - Old meal → negative label (`swap_old`)  
  - New chosen meal → positive label (`swap_new`)

All interactions are stored in MongoDB:

- `mealplans` collection – meal plans by date and user
- `mealinteractions` collection – accept/swap/reject events
- `userprofiles` collection – digestive disorders, dislikes, allergies

This data forms the basis of the **training dataset** for the recommender.

---

### 5. Dashboard & Guidance

The dashboard shows:

- **Quick stats**
  - Total plans generated
  - Accepted plans
  - Rejected plans
- **Calls to action**
  - Step 1: Complete **Profile**
  - Step 2: **Generate** today’s meal plan
  - Step 3: **View recipes** and give feedback

---

## Machine Learning Overview

The model is trained **offline** using scripts in `backend/ml/` and then loaded by the backend for online scoring.

### Labels from interactions

Each row in the training data represents:  
`(userId, mealId, mealType, action_source, label)`

- `label = 1` (positive)
  - Meals in **accepted** plans
  - New meal chosen on **swap** (`swap_new`)
- `label = 0` (negative)
  - Meals in **rejected** plans
  - Previous meal that was swapped away (`swap_old`)

---

### Feature Engineering

#### a) User features

Derived from `userprofiles`:

- Binary condition flags  
  `has_gerd`, `has_ibs`, `has_functional_dyspepsia`, `has_celiac`,  
  `has_lactose_intolerance`, `has_sibo`, `has_diverticulosis`,  
  `has_hemorrhoids`, …
- Preference counts  
  - `n_allergies`  
  - `n_disliked_foods`

#### b) Meal features

From Spoonacular metadata + custom rules:

- Macros: `calories`, `protein`, `fat`, `carbs` (when available)
- Dietary flags (from API or heuristics):
  - `is_gluten_free`, `is_lactose_free`, `is_low_fat`, `is_low_fodmap`, …
- Trigger counts:
  - `n_potential_gerd_triggers`
  - `n_potential_ibs_triggers`
  - `n_disliked_ingredients_in_meal`

#### c) User–meal cross features

- `is_safe_for_user_conditions` (boolean – passes hard rules or not)
- `disliked_overlap_ratio`  
  = #disliked ingredients in meal / total ingredients

---

### Model Choice

DigestWell uses a **tree-based ensemble classifier** (e.g. `GradientBoostingClassifier` from scikit-learn) inside a pipeline:

- **Preprocessing**
  - One-hot encoding for categorical features (meal type, meal label, userId if used)
  - Scaling for numeric features
- **Classifier**
  - Gradient boosting or similar tree ensemble
- **Metric**
  - Evaluated on train/test split with **ROC AUC**, accuracy, precision, recall, and F1.
- Current validation example (will change as more real data is collected):
  - ROC AUC ≈ **0.80–0.83** on held-out test set

Trained model is saved to:

```text
backend/ml_output/recommender.joblib
and loaded at runtime by ml/inference.py.

Project Structure (simplified)
text
Copy code
nutrition-suite/
├── frontend/                # Next.js + Tailwind app
│   └── src/
│       ├── app/             # Pages (dashboard, mealplans, auth, etc.)
│       ├── components/      # Reusable UI components
│       └── lib/             # NextAuth config, helpers
│
├── backend/                 # FastAPI + ML
│   ├── app/
│   │   ├── main.py          # FastAPI entrypoint
│   │   ├── routers/         # API routers (health, model, chat, etc.)
│   │   ├── services/        # planner, ML ranking logic
│   │   └── models/          # Pydantic + Mongo schemas (if used)
│   │
│   ├── ml/
│   │   ├── build_dataset.py     # Build labelled interaction dataset
│   │   ├── enrich_features.py   # Add user + meal features
│   │   ├── train_recommender.py # Train ML model
│   │   ├── visualize_recommender.py # ROC, confusion matrix, feature importance
│   │   ├── inference.py         # Load recommender and score candidates
│   │   └── seed_synthetic_interactions.py # Optional synthetic data
│   │
│   └── ml_output/
│       ├── interactions_base.csv
│       ├── interactions_features.csv
│       ├── recommender.joblib
│       ├── roc_curve.png
│       └── confusion_matrix.png
│
└── README.md
Requirements
Backend

Python 3.11+

pip, virtualenv

MongoDB Atlas connection string

Spoonacular API key (and optionally Edamam/Nutritionix keys)

Frontend

Node.js 18+

npm or yarn

Local Setup
1. Clone the repository
bash
Copy code
git clone https://github.com/<your-username>/digestwell2.git
cd digestwell2
2. Backend Setup (FastAPI + ML)
From the backend/ directory:

bash
Copy code
cd backend

# Create and activate virtual environment
py -3.11 -m venv .venv      # Windows
.\.venv\Scripts\activate

# or on macOS/Linux:
# python3.11 -m venv .venv
# source .venv/bin/activate

# Upgrade tooling and install dependencies
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
Backend environment variables
Create a .env file in backend/:

env
Copy code
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.rozrokt.mongodb.net/?appName=Cluster0
MONGODB_DB=test

SPOONACULAR_API_KEY=your_spoonacular_key_here
EDAMAM_APP_ID=...
EDAMAM_APP_KEY=...

ALLOW_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
PORT=8000
Run the backend API
bash
Copy code
uvicorn app.main:app --reload --port 8000
Backend should now be available at:
http://127.0.0.1:8000

3. Frontend Setup (Next.js)
From the frontend/ directory:

bash
Copy code
cd ../frontend

npm install
# or
# yarn
Create .env.local in frontend/:

env
Copy code
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

BACKEND_URL=http://127.0.0.1:8000
Run the frontend:

bash
Copy code
npm run dev
# or
# yarn dev
Frontend runs at:
http://localhost:3000

Machine Learning Workflow
All ML scripts run from the backend/ directory with the virtualenv activated.

Make sure the environment variable MONGODB_URI is set before running:

bash
Copy code
$env:MONGODB_URI = "mongodb+srv://<user>:<password>@cluster0.rozrokt.mongodb.net/?appName=Cluster0"
# (Windows PowerShell; adjust for macOS/Linux)
1. Build base interaction dataset
bash
Copy code
python -m ml.build_dataset
Outputs:

ml_output/interactions_base.csv

2. Enrich with user + meal features
bash
Copy code
python -m ml.enrich_features
Outputs:

ml_output/interactions_features.csv

3. Train recommender model
bash
Copy code
python -m ml.train_recommender
Outputs:

Trained model ml_output/recommender.joblib

Printed metrics (ROC AUC, accuracy, precision, recall, F1)

4. Visualize model performance
bash
Copy code
python -m ml.visualize_recommender
Outputs:

ml_output/roc_curve.png

ml_output/confusion_matrix.png

(optionally) feature importance plot

You can include these PNGs in reports or presentations to show:

Model discrimination (ROC curve)

Class-wise behaviour (confusion matrix)

Which features drive the recommendations (feature importance)

Backend API Endpoints
FastAPI (backend)
Method	Path	Description
GET	/health	Health check – returns simple status JSON
POST	/model/generate	Generate daily plan (Breakfast/Lunch/Dinner)
POST	/model/swap	Suggest a replacement meal for a given slot
GET	/profile/{id}	(Optional) Fetch user profile
POST	/profile	Create/update user digestive profile

Note: The frontend usually talks to FastAPI through Next.js API routes (see below).

Next.js API Routes (frontend)
Method	Path	Description
POST	/api/mealplans/generate	Calls backend /model/generate and saves plan
POST	/api/mealplans/[date]/swap	Swap a meal (logs interaction, updates plan)
POST	/api/mealplans/[date]/accept	Accept plan and log interactions
POST	/api/mealplans/[date]/reject	Reject plan and log interactions
GET	/api/mealplans	List generated plans for calendar view
POST	/api/profile	Save/update user digestive profile
GET	/api/profile	Get current user profile

Authentication is handled via NextAuth credentials provider with MongoDB as the user store.

Typical User Flow
Sign up / Login

Create an account using email + password.

Complete Digestive Profile

Choose digestive disorders, disliked foods, and allergies.

Generate Today’s Plan

Click “Generate Today’s Plan” on the dashboard.

Review & View Recipes

Inspect breakfast, lunch, and supper cards.

Click “View recipe” to open Spoonacular instructions.

Give Feedback

Swap any meal that doesn’t look good.

Accept or Reject the daily plan.

Return Later

Use the Calendar to browse previous days.

As more feedback is given, the ML model becomes more personalized.

Future Work / Ideas
Add support for more conditions and stricter clinical rules.

Integrate educational content (articles, videos) per condition.

Support multiple daily snacks and flexible meal counts.

Use more advanced models (e.g. XGBoost / LightGBM) and offline hyperparameter search.

Explainability views: “Why this meal?” based on top features.

License
You can choose a license that matches your goals (e.g. MIT). Add it here:

text
Copy code
MIT License
Copyright (c) 2025 <Your Name>
Acknowledgements
Spoonacular API for recipe data

MongoDB Atlas for cloud-hosted storage

FastAPI and Next.js for the application stack

Project developed as part of a Personalized Nutrition for Digestive Health final-year project.
