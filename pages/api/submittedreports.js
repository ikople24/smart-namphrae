import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";

export default async function handler(req, res) {
  await dbConnect();

  try {
    const collection = mongoose.connection.db.collection("submittedreports");
    const data = await collection.find({}).toArray();
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching submitted reports:", error);
    res.status(500).json({ error: "Failed to fetch submitted reports" });
  }
}