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

```text backend/ml_output/recommender.joblib

Project Structure

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
│   │   └── inference.py         # Load recommender and score candidates
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


