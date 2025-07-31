import dbConnect from "@/lib/dbConnect";
import MenuMain from "@/models/MenuMain";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await dbConnect();
    
    console.log("🔍 Fetching menu data from database...");
    const menuData = await MenuMain.find({}).sort({ order: 1 });
    
    console.log("🔍 Menu data found:", menuData.length, "items");
    console.log("🔍 Menu items:", menuData.map(item => ({ 
      Prob_name: item.Prob_name, 
      Prob_pic: item.Prob_pic 
    })));
    
    res.status(200).json(menuData);
  } catch (error) {
    console.error("❌ Error fetching menu data:", error);
    res.status(500).json({ error: "Failed to fetch menu data" });
  }
} 