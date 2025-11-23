import mongoose, { Schema, Document, models, model } from "mongoose";

export type MealType = "breakfast" | "lunch" | "dinner";
export type MealAction = "accept" | "swap" | "reject";

type MealSnapshot = {
  id?: string | number;
  label?: string;
  image?: string;
  sourceUrl?: string;
};

export interface MealInteractionDocument extends Document {
  userId: string;
  date: string; // YYYY-MM-DD (plan date)
  mealType: MealType;
  action: MealAction;
  timestamp: Date;
  previousMeal?: MealSnapshot;
  newMeal?: MealSnapshot;
}

const MealSnapshotSchema = new Schema<MealSnapshot>(
  {
    id: { type: Schema.Types.Mixed, required: false },
    label: { type: String, required: false },
    image: { type: String, required: false },
    sourceUrl: { type: String, required: false },
  },
  { _id: false }
);

const MealInteractionSchema = new Schema<MealInteractionDocument>({
  userId: { type: String, required: true, index: true },
  date: { type: String, required: true, index: true }, // plan date
  mealType: {
    type: String,
    required: true,
    enum: ["breakfast", "lunch", "dinner"],
  },
  action: {
    type: String,
    required: true,
    enum: ["accept", "swap", "reject"],
  },
  timestamp: { type: Date, default: Date.now },
  previousMeal: { type: MealSnapshotSchema, required: false },
  newMeal: { type: MealSnapshotSchema, required: false },
});

// Simple compound index to query interactions per user per date quickly
MealInteractionSchema.index({ userId: 1, date: 1, mealType: 1 });

const MealInteraction =
  (models.MealInteraction as mongoose.Model<MealInteractionDocument>) ||
  model<MealInteractionDocument>("MealInteraction", MealInteractionSchema);

export default MealInteraction;
