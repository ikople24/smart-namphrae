import dbConnect from "@/lib/dbConnect";
import Assignment from "@/models/Assignment";
import "@/models/CreateUser";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "GET") {
    try {
      const raw = await Assignment.find({})
        .populate("userId", "name profileImage")
        .lean();
      const assignments = raw.map((a) => {
        const u = a.userId;
        const userIdStr =
          u && typeof u === "object" && u._id != null
            ? String(u._id)
            : u != null
              ? String(u)
              : "";
        const assigneeName =
          u && typeof u === "object" && u.name ? u.name : null;
        return { ...a, userId: userIdStr, assigneeName };
      });
      res.status(200).json(assignments);
    } catch {
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}