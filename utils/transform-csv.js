const fs = require("fs");
const csv = require("csv-parser");

const results = [];

function formatDateToISO(thaiDateStr) {
  try {
    const cleaned = thaiDateStr
      ?.trim()
      .replace(/\u00A0/g, " ") // non-breaking space
      .replace(/\r|\n|\t/g, "") // remove control characters
      .replace(/^"|"$/g, "");   // remove wrapping quotes

    const [datePart, timePartRaw] = cleaned.split(" ");
    const [day, month, yearBE] = datePart.split("/").map(Number);

    const timePart = timePartRaw || "00:00:00";
    const [hh, mm, ss] = timePart.split(":").map((n) => n.padStart(2, "0"));

    const year = yearBE - 543;
    const padZero = (num) => num.toString().padStart(2, "0");
    const dateISO = `${year}-${padZero(month)}-${padZero(day)}T${hh}:${mm}:${ss}`;

    const iso = new Date(dateISO).toISOString();
    if (isNaN(new Date(iso))) throw new Error("Invalid date");
    return iso;
  } catch {
    console.warn("❗ ไม่สามารถแปลงวันที่:", JSON.stringify(thaiDateStr));
    return "-";
  }
}

fs.createReadStream("input.csv", { encoding: "utf8" })
  .pipe(csv())
  .on("data", (row) => {
    const [lat, lng] = row["ข้อมูลการแจ้ง/ตำแหน่งGPS"]
      ? row["ข้อมูลการแจ้ง/ตำแหน่งGPS"].split(",").map(Number)
      : [null, null];

    const safe = (value) => (value?.trim() ? value : "-");

    function removeEmptyFields(obj) {
      return Object.entries(obj).reduce((acc, [key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          acc[key] = val;
        }
        return acc;
      }, {});
    }

    const entry = {
      fullName: safe(row["ข้อมูลผู้แจ้ง/ชื่อ"]),
      category: safe(row["ข้อมูลการแจ้ง/ประเภทปัญหา"]),
      phone: safe(row["ข้อมูลผู้แจ้ง/เบอร์โทรติดต่อ"]),
      prefix: safe(row["ข้อมูลผู้แจ้ง/คำนำหน้า"]),
      community: (() => {
        const raw = row["ข้อมูลการแจ้ง/ชุมชนที่เกิดเหตุ"]?.trim() || "";
        if (!raw) return "-";
        return raw.replace(/^หมู่\s*\d+\s*/i, "").trim() || "-";
      })(),
      complaintId: safe(row["�� Row ID"]),
      status: safe(row["การดำเนินการ/สถานะปัญหา"]),
      problems: row["ข้อมูลการแจ้ง/รายการปัญหา"]
        ? row["ข้อมูลการแจ้ง/รายการปัญหา"]
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : [],
      detail: safe(row["ข้อมูลการแจ้ง/รายละเอียดการแจ้ง"]),
      officer: row["การแสดงผล"]?.trim() === "true" ? "on" : "off",
      // address: removeEmptyFields({
      //   house_no: safe(row["ที่อยู่/บ้านเลขที่"]),
      //   road: safe(row["ที่อยู่/ถนน-ซอย"]),
      //   sub_district: safe(row["ที่อยู่/ชุมชน"])
      // }),
      updatedAt: (() => {
        const iso = formatDateToISO(row["ข้อมูลการแจ้ง/วันที่รับแจ้ง"]?.trim());
        return iso;
      })(),
      createdAt: (() => {
        const iso = formatDateToISO(row["ข้อมูลการแจ้ง/วันที่รับแจ้ง"]?.trim());
        return iso;
      })(),

      location: lat && lng ? { lat, lng } : "-",
      images: [
        row["ข้อมูลภาพปัญหา/ภาพที่1"],
        row["ข้อมูลภาพปัญหา/ภาพที่2"],
        row["ข้อมูลภาพปัญหา/ภาพที่3"],
      ].filter(Boolean),
      // phone: safe(row["บุคคล/เบอร์โทร"]),
      // household_income: safe(row["รายได้ต่อครัวเรือน"]),
      // assistive_devices: safe(row["อุปรกรณ์ช่วยเหลือ"]),
      // remark: safe(row["หมายเหตุ"]),
      // ob_type: safe(row["ประเภทกายอุปกรณ์"]),
      // id_code_th: safe(row["id_code"]),
      // image_icon: safe(row["pic"]),
      // shot_name: safe(row["ชื่อย่อ"]),
    };

    results.push(removeEmptyFields(entry));
  })
  .on("end", () => {
    fs.writeFileSync("output.json", JSON.stringify(results, null, 2), "utf8");
    console.log("✅ แปลงข้อมูลเรียบร้อยแล้ว → บันทึกในไฟล์ output.json");
  });
