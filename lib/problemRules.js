// กฎที่ผูกกับ label ของปัญหา (ไม่ใช่หมวด) — ใช้ร่วมกันทั้งฝั่ง client และ API route
// ไฟล์นี้ต้องเป็น constant ล้วน ห้าม import อะไรที่ผูกกับ Node หรือ browser

// ปัญหาที่จำกัดจำนวนคำขอต่อวัน
export const DAILY_LIMITED_PROBLEMS = {
  'ขอรถรับ-ส่งไปโรงพยาบาล': {
    limit: 3,
    labelEn: 'Hospital Transport Request',
  },
};

// ปัญหาที่ต้องกรอกชื่อ-นามสกุลผู้ป่วยเพิ่ม
export const PATIENT_INFO_PROBLEMS = ['ขอรถรับ-ส่งไปโรงพยาบาล'];

// คืน config ของ daily limit ถ้าปัญหานั้นถูกจำกัด ไม่งั้นคืน null
export const getDailyLimit = (label) => DAILY_LIMITED_PROBLEMS[label] ?? null;

// รับ labels มาจาก request body ที่ควบคุมไม่ได้ จึงต้องทนกับค่าที่ไม่ใช่ array
export const requiresPatientName = (labels) =>
  Array.isArray(labels) && labels.some((l) => PATIENT_INFO_PROBLEMS.includes(l));
