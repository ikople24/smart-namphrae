import dbConnect from "@/lib/dbConnect";
import AdminOption from "@/models/AdminOption";

// Mapping ภาษาไทย -> ภาษาอังกฤษ สำหรับ Admin Options (เจ้าหน้าที่)
const thaiToEnglishMap = {
  // ไฟส่องสว่าง (Street Lighting)
  "ซ่อมสายไฟ": "Repair wiring",
  "ตรวจสอบวงจร": "Check circuit",
  "ซ่อมคัตท์เอาท์": "Repair cutout",
  "เปลี่ยนหลอดไฟ": "Replace light bulb",
  "ติดตั้งหลอดไฟใหม่": "Install new light",
  "ปรับตำแหน่งหลอดไฟ": "Adjust light position",
  "ซ่อมเสาไฟ": "Repair light pole",
  "ตรวจสอบระบบไฟฟ้า": "Check electrical system",
  
  // น้ำประปา (Water Supply)
  "ซ่อมท่อประปา": "Repair water pipe",
  "เปลี่ยนท่อประปา": "Replace water pipe",
  "ซ่อมมิเตอร์น้ำ": "Repair water meter",
  "เปลี่ยนมิเตอร์น้ำ": "Replace water meter",
  "ตรวจสอบแรงดันน้ำ": "Check water pressure",
  "ล้างถังเก็บน้ำ": "Clean water tank",
  "ติดตั้งประปาใหม่": "Install new water supply",
  "ซ่อมวาล์วน้ำ": "Repair water valve",
  
  // ถนน/ทางเท้า (Road/Sidewalk)
  "ซ่อมถนน": "Road repair",
  "ปะหลุมถนน": "Pothole filling",
  "ซ่อมทางเท้า": "Sidewalk repair",
  "ซ่อมฝาท่อ": "Repair manhole cover",
  "ตัดกิ่งไม้": "Tree trimming",
  "กำจัดวัชพืช": "Weed removal",
  "ทำความสะอาดท่อระบายน้ำ": "Clean drainage",
  "ซ่อมสะพาน": "Bridge repair",
  "ติดตั้งป้ายจราจร": "Install traffic sign",
  
  // ขยะมูลฝอย (Waste Management)
  "เก็บขยะ": "Garbage collection",
  "เปลี่ยนถังขยะ": "Replace garbage bin",
  "ซ่อมถังขยะ": "Repair garbage bin",
  "ติดตั้งถังขยะใหม่": "Install new garbage bin",
  "กำจัดขยะอันตราย": "Hazardous waste disposal",
  "ทำความสะอาดพื้นที่": "Area cleaning",
  
  // สวัสดิการสังคม (Social Welfare)
  "ลงทะเบียนผู้สูงอายุ": "Elderly registration",
  "ลงทะเบียนผู้พิการ": "Disability registration",
  "ตรวจสอบสิทธิ์": "Verify eligibility",
  "จ่ายเบี้ยยังชีพ": "Pay living allowance",
  "เยี่ยมบ้าน": "Home visit",
  "ให้คำปรึกษา": "Provide consultation",
  
  // อื่นๆ (Other)
  "ประสานงาน": "Coordinate",
  "ติดต่อหน่วยงานที่เกี่ยวข้อง": "Contact relevant agency",
  "ส่งต่อเรื่อง": "Forward case",
  "ดำเนินการอื่นๆ": "Other actions",
  "ติดต่อหน่วยงาน": "Contact agency",
  
  // เสียงไร้สาย (Noise Pollution)
  "ตรวจสอบเสียง": "Noise inspection",
  "แจ้งเตือนผู้ก่อเสียง": "Notify noise maker",
  "ประสานงานตำรวจ": "Coordinate with police",
  "ติดตั้งอุปกรณ์ลดเสียง": "Install noise reduction",
  
  // สัตว์เลี้ยง (Stray Animals)
  "จับสัตว์จรจัด": "Catch stray animal",
  "ฉีดวัคซีน": "Vaccinate",
  "ทำหมัน": "Neuter/Spay",
  "ส่งสถานสงเคราะห์": "Send to shelter",
  "กำจัดซากสัตว์": "Remove animal carcass",
  "ตรวจสอบสัตว์ป่วย": "Check sick animal",
  
  // งานสาธารณสุข (Public Health)
  "พ่นหมอกควัน": "Fogging",
  "กำจัดแหล่งเพาะพันธุ์ยุง": "Eliminate mosquito breeding",
  "ตรวจสอบคุณภาพน้ำ": "Water quality inspection",
  "ตรวจสอบอาหาร": "Food inspection",
  "ให้ความรู้สุขภาพ": "Health education",
  "ฉีดวัคซีนป้องกันโรค": "Disease vaccination",
  "แจ้งเหตุโรคไข้เลือดออก": "Report dengue fever",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();
    
    const options = await AdminOption.find({});
    const updates = [];
    const notFound = [];
    
    for (const option of options) {
      // ข้ามถ้ามี label_en อยู่แล้ว
      if (option.label_en && option.label_en.trim() !== "") {
        continue;
      }
      
      const englishLabel = thaiToEnglishMap[option.label];
      
      if (englishLabel) {
        await AdminOption.findByIdAndUpdate(option._id, {
          label_en: englishLabel
        });
        updates.push({ label: option.label, label_en: englishLabel });
      } else {
        // ถ้าไม่มี mapping ให้ใส่เป็น [TH] ชื่อไทย
        const fallbackLabel = `[TH] ${option.label}`;
        await AdminOption.findByIdAndUpdate(option._id, {
          label_en: fallbackLabel
        });
        notFound.push({ label: option.label, label_en: fallbackLabel });
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Updated ${updates.length + notFound.length} admin options with English labels`,
      updates,
      notFound,
      totalOptions: options.length
    });
    
  } catch (error) {
    console.error("Error updating admin options:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error updating admin options",
      error: error.message 
    });
  }
}
