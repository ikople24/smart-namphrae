const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * แปลงค่าจากฟอร์ม/ API ให้เป็น Date สำหรับบันทึก MongoDB
 * ค่าแบบ YYYY-MM-DD จาก <input type="date"> ตีความเป็นเที่ยงคืนตามปฏิทินไทย (Asia/Bangkok)
 * ไม่ใช่เที่ยงคืน UTC — จึงไม่แสดงเป็น 07:00 น. เมื่อใช้ toLocaleString('th-TH')
 */
export function parseCompletedAtForStorage(value) {
  if (value == null || value === "") return null;
  if (typeof value === "string" && DATE_ONLY.test(value.trim())) {
    return new Date(`${value.trim()}T00:00:00+07:00`);
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** ค่า value สำหรับ <input type="date" /> ตามปฏิทินไทย */
export function completedAtToDateInputValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
