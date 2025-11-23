export type Role = "user" | "admin";

export type Meal = {
  label: string;
  image?: string;
  url?: string;
  yield?: number;
  calories?: number;
  cuisineType?: string[];
  mealType?: string[];
  ingredients?: string[];
};

export type DayPlan = {
  date: string; // YYYY-MM-DD
  userId: string;
  caloriesTarget: number;
  meals: { breakfast: Meal; lunch: Meal; dinner: Meal };
  alternatives: { breakfast: Meal[]; lunch: Meal[]; dinner: Meal[] };
  lockedAt?: string;
  createdAt: string;
  updatedAt: string;
  accepted?: boolean;
};
