import mongoose from "mongoose";

const SubmittedReport2024Schema = new mongoose.Schema(
  {},
  { collection: "submittedreports_2024", strict: false }
);

export default mongoose.models.SubmittedReport2024 ||
  mongoose.model("SubmittedReport2024", SubmittedReport2024Schema);