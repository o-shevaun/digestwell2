import mongoose, { Schema, Document, models, model } from "mongoose";

export interface UserProfileDocument extends Document {
  userId: string;
  digestiveDisorders: string[];
  dislikedFoods: string[];
  allergies: string[];
  createdAt: Date;
  updatedAt: Date;
}

const UserProfileSchema = new Schema<UserProfileDocument>(
  {
    userId: {
      type: String,
      required: true,
      unique: true, // one profile per user
    },
    digestiveDisorders: {
      type: [String],
      default: [],
    },
    dislikedFoods: {
      type: [String],
      default: [],
    },
    allergies: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const UserProfile =
  (models.UserProfile as mongoose.Model<UserProfileDocument>) ||
  model<UserProfileDocument>("UserProfile", UserProfileSchema);

export default UserProfile;
