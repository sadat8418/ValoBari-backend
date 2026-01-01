import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    auth_token: String,
  },
  { timestamps: true }
);

export default mongoose.model("BkashToken", schema);
