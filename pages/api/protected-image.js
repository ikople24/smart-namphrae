// /pages/api/protected-image.js
import { getAuth } from "@clerk/nextjs/server";

export default async function handler(req, res) {
  const { sessionClaims } = getAuth(req);
  const isAdmin = sessionClaims?.publicMetadata?.role === "admin" || sessionClaims?.publicMetadata?.role === "superadmin";

  if (!isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const imageUrl = req.query.url;
  const response = await fetch(imageUrl);
  const buffer = await response.arrayBuffer();

  res.setHeader("Content-Type", response.headers.get("content-type"));
  res.send(Buffer.from(buffer));
}