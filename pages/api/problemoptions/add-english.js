import dbConnect from "@/lib/dbConnect";
import ProblemOption from "@/models/ProblemOption";

// Mapping ภาษาไทย -> ภาษาอังกฤษ
const thaiToEnglishMap = {
  // ไฟส่องสว่าง (Street Lighting)
  "ไฟไม่ติด": "Light not working",
  "ติดๆดับๆ": "Flickering light",
  "สายไฟชำรุด": "Damaged wiring",
  "คัตเอาท์ชำรุด": "Damaged cutout",
  "ต้องการติดตั้งชุดหลอดไฟ": "Request light installation",
  "ไฟหันผิดทิศทาง": "Light facing wrong direction",
  "แสงสว่างไม่เพียงพอ": "Insufficient lighting",
  
  // น้ำประปา (Water Supply)
  "น้ำไม่ไหล": "No water flow",
  "น้ำไหลอ่อน": "Weak water pressure",
  "น้ำขุ่น": "Cloudy water",
  "ท่อแตก": "Broken pipe",
  "ท่อรั่ว": "Leaking pipe",
  "มิเตอร์ชำรุด": "Damaged meter",
  "ต้องการติดตั้งประปา": "Request water installation",
  "น้ำมีกลิ่น": "Water has odor",
  "น้ำมีสี": "Discolored water",
  
  // ถนน/ทางเท้า (Road/Sidewalk)
  "ถนนชำรุด": "Damaged road",
  "ถนนเป็นหลุม": "Pothole",
  "ทางเท้าชำรุด": "Damaged sidewalk",
  "ฝาท่อชำรุด": "Damaged manhole cover",
  "กิ่งไม้กีดขวางถนน": "Tree branch blocking road",
  "ต้องการตัดต้นไม้": "Request tree cutting",
  "น้ำท่วมขัง": "Flooding/Standing water",
  "สะพานชำรุด": "Damaged bridge",
  "ราวกันตกชำรุด": "Damaged guardrail",
  "กิ่งไม้กีดขวางทางถนน": "Tree branch blocking road",
  
  // ขยะมูลฝอย (Waste Management)
  "ขยะไม่ถูกเก็บ": "Garbage not collected",
  "ถังขยะเต็ม": "Full garbage bin",
  "ถังขยะชำรุด": "Damaged garbage bin",
  "ต้องการถังขยะ": "Request garbage bin",
  "กลิ่นเหม็นจากขยะ": "Bad smell from garbage",
  "ขยะมูลฝอย": "Solid waste",
  "ขยะอันตราย": "Hazardous waste",
  
  // สวัสดิการสังคม (Social Welfare)
  "ขอรับเบี้ยยังชีพ": "Request living allowance",
  "ขอรับสิทธิการรับเงินสงเคราะห์เบี้ยยังชีพ": "Request welfare subsidy",
  "ผู้สูงอายุ": "Elderly",
  "ผู้พิการ": "Disabled person",
  "เด็กและเยาวชน": "Children and youth",
  "ครอบครัวยากจน": "Poor family",
  "ผู้ป่วยติดเตียง": "Bedridden patient",
  
  // อื่นๆ (Other)
  "อื่นๆ": "Other",
  "ติดต่อหน่วยงาน": "Contact agency",
  "สอบถามข้อมูล": "Request information",
  "ร้องเรียนทั่วไป": "General complaint",
  
  // เสียงไร้สาย (Noise Pollution)
  "เสียงดังรบกวน": "Noise disturbance",
  "เสียงจากการก่อสร้าง": "Construction noise",
  "เสียงจากโรงงาน": "Factory noise",
  "เสียงจากสัตว์": "Animal noise",
  "เสียงจากยานพาหนะ": "Vehicle noise",
  
  // สัตว์เลี้ยง (Stray Animals)
  "สุนัขจรจัด": "Stray dog",
  "แมวจรจัด": "Stray cat",
  "สัตว์ดุร้าย": "Aggressive animal",
  "สัตว์ป่วย": "Sick animal",
  "ซากสัตว์": "Animal carcass",
  "สัตว์รบกวน": "Animal nuisance",
  
  // งานสาธารณสุข (Public Health)
  "แจ้งเหตุโรคไข้เลือดออก": "Report dengue fever",
  "พ่นหมอกควัน": "Fogging request",
  "กำจัดแหล่งเพาะพันธุ์ยุง": "Mosquito breeding elimination",
  "ขอรับวัคซีน": "Request vaccination",
  "สุขภาพชุมชน": "Community health",
  "อาหารไม่ปลอดภัย": "Food safety issue",
  "น้ำดื่มไม่สะอาด": "Unsafe drinking water",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();
    
    const options = await ProblemOption.find({});
    const updates = [];
    const notFound = [];
    
    for (const option of options) {
      // ข้ามถ้ามี labelEn อยู่แล้ว
      if (option.labelEn && option.labelEn.trim() !== "") {
        continue;
      }
      
      const englishLabel = thaiToEnglishMap[option.label];
      
      if (englishLabel) {
        await ProblemOption.findByIdAndUpdate(option._id, {
          labelEn: englishLabel
        });
        updates.push({ label: option.label, labelEn: englishLabel });
      } else {
        // ถ้าไม่มี mapping ให้ใส่เป็น [TH] ชื่อไทย
        const fallbackLabel = `[TH] ${option.label}`;
        await ProblemOption.findByIdAndUpdate(option._id, {
          labelEn: fallbackLabel
        });
        notFound.push({ label: option.label, labelEn: fallbackLabel });
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Updated ${updates.length + notFound.length} problem options with English labels`,
      updates,
      notFound,
      totalOptions: options.length
    });
    
  } catch (error) {
    console.error("Error updating problem options:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error updating problem options",
      error: error.message 
    });
  }
}
