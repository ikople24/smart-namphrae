import dbConnect from "@/lib/dbConnect";
import Assignment from "@/models/Assignment";
import "@/models/CreateUser";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "GET") {
    try {
      const raw = await Assignment.find({})
        .populate("userId", "name department profileImage")
        .lean();
      const assignments = raw.map((a) => {
        const u = a.userId;
        const populated = u && typeof u === "object";
        const userIdStr =
          populated && u._id != null
            ? String(u._id)
            : u != null
              ? String(u)
              : "";
        const assigneeName = populated && u.name ? u.name : null;
        // ส่งข้อมูลเจ้าหน้าที่ที่ populate มาจาก Mongo ไปด้วย เพื่อให้ฝั่ง client
        // แสดงชื่อ/แผนกได้ทันที ไม่ต้องพึ่ง backend รายชื่อ user ภายนอก
        const assignee = populated
          ? {
              name: u.name || null,
              department: u.department || null,
              profileImage: u.profileImage || null,
            }
          : null;
        return { ...a, userId: userIdStr, assigneeName, assignee };
      });
      res.status(200).json(assignments);
    } catch {
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}