import dbConnect from "@/lib/dbConnect";
import ProblemOption from "@/models/ProblemOption";

export default async function handler(req, res) {
  await dbConnect();

  try {
    if (req.method === "GET") {
      const options = await ProblemOption.find({});
      return res.status(200).json(options);
    }

    if (req.method === "POST") {
      const created = await ProblemOption.create(req.body);
      return res.status(201).json(created);
    }

    if (req.method === "PUT") {
      const { _id, ...updates } = req.body;
      if (!_id) {
        return res.status(400).json({ message: "Missing problem option id" });
      }

      const updated = await ProblemOption.findByIdAndUpdate(_id, updates, {
        new: true,
      });

      if (!updated) {
        return res.status(404).json({ message: "Problem option not found" });
      }

      return res.status(200).json(updated);
    }

    if (req.method === "DELETE") {
      const { _id } = req.body;
      if (!_id) {
        return res.status(400).json({ message: "Missing problem option id" });
      }

      await ProblemOption.findByIdAndDelete(_id);
      return res.status(204).end();
    }

    res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({
      message: "Error handling problem option",
      error: error.message,
    });
  }
}