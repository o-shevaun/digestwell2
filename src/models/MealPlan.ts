// src/models/MealPlan.ts
import mongoose, { Schema, Document, models, model } from "mongoose";

export type Meal = {
  id?: number | string;
  label: string;
  image?: string;
  sourceUrl?: string | null; // <--- IMPORTANT
};

export interface MealPlanDocument extends Document {
  userId: string;
  date: string; // "YYYY-MM-DD"
  meals: {
    breakfast?: Meal | null;
    lunch?: Meal | null;
    dinner?: Meal | null;
  };
  lockedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const MealSchema = new Schema<Meal>(
  {
    id: { type: Schema.Types.Mixed, required: false },
    label: { type: String, required: true },
    image: { type: String, required: false },
    // this was missing before – without it, Mongo never stored the URL
    sourceUrl: { type: String, required: false },
  },
  { _id: false }
);

const MealPlanSchema = new Schema<MealPlanDocument>(
  {
    userId: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    meals: {
      breakfast: { type: MealSchema, required: false },
      lunch: { type: MealSchema, required: false },
      dinner: { type: MealSchema, required: false },
    },
    lockedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate plans per user per day
MealPlanSchema.index({ userId: 1, date: 1 }, { unique: true });

const MealPlan =
  (models.MealPlan as mongoose.Model<MealPlanDocument>) ||
  model<MealPlanDocument>("MealPlan", MealPlanSchema);

export default MealPlan;
