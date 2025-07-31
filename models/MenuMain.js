import mongoose from "mongoose";

const MenuMainSchema = new mongoose.Schema(
  {
    Prob_name: String,
    Prob_pic: String,
    order: Number,
  },
  { collection: "menu_list" } // ชื่อตรงกับ Compass
);

export default mongoose.models.MenuMain || mongoose.model("MenuMain", MenuMainSchema);