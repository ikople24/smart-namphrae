# Design: เพิ่มช่องกรอกชื่อผู้ป่วย สำหรับ "ขอรถรับ-ส่งไปโรงพยาบาล"

**Date:** 2026-08-25
**Status:** Approved

---

## Summary

เมื่อผู้แจ้งเลือกปัญหา `"ขอรถรับ-ส่งไปโรงพยาบาล"` ในฟอร์มแจ้งเรื่อง ให้แสดงช่องกรอก **ชื่อ-นามสกุลผู้ป่วย** เพิ่มขึ้นมาและบังคับกรอก พร้อม checkbox "ผู้ป่วยคือตัวผู้แจ้งเอง" สำหรับกรอกอัตโนมัติ

ค่าที่ได้จะถูกบันทึกลง `SubmittedReport.patientName` ส่งต่อไป n8n webhook และแสดงในหน้ารายละเอียดของเจ้าหน้าที่

**ขอบเขต:** เพิ่ม field เดียวคือชื่อผู้ป่วย ไม่รวมอายุ เลขบัตร โรงพยาบาลปลายทาง วันนัด อาการ หรือสิทธิการรักษา

---

## Design Decisions

| ประเด็น | ตัดสินใจ | เหตุผล |
|---|---|---|
| เก็บกฎไว้ที่ไหน | ค่าคงที่ในโค้ด (`lib/problemRules.js`) | ตรงแพทเทิร์นเดิมของโปรเจกต์ ตอนนี้มีปัญหาเดียวที่ต้องใช้ ถ้าอนาคตมีหลายรายการค่อยย้ายไป config ใน DB |
| ผูกกฎกับอะไร | label ของ **ปัญหา** ไม่ใช่ **หมวด** | ถ้าย้ายปัญหาไปหมวดอื่น หรือเลือกพร้อมปัญหาอื่นหลายอัน ยังทำงานถูก |
| บังคับกรอกไหม | บังคับ + มี checkbox "ผู้ป่วยคือตัวผู้แจ้งเอง" | ได้ข้อมูลครบทุกเคส โดยไม่เพิ่มภาระการพิมพ์ให้คนที่แจ้งให้ตัวเอง |
| แสดงผลที่ไหน | CardModalDetail + n8n webhook | เจ้าหน้าที่ต้องเห็นก่อนออกรถ และแจ้งเตือนควรมีชื่อผู้ป่วยติดไปด้วย ไม่ต้องแสดงในหน้า /status หรือ CardCompleted |
| Default ใน model | ไม่ใส่ `default` | ถ้าใส่ `default: ''` Mongoose จะเขียน `patientName: ""` ลงทุก document รวมถึงเรื่องหมวดอื่น ทำให้ payload ที่ส่ง n8n เปลี่ยนไปด้วย |

---

## 1. Single source of truth — `lib/problemRules.js` (ไฟล์ใหม่)

ปัจจุบัน `DAILY_LIMITED_PROBLEMS` ถูกคัดลอกไว้ 3 ที่ และ **รูปแบบข้อมูลไม่ตรงกัน**

| ไฟล์ | รูปแบบ |
|---|---|
| `components/ComplaintFormModal.js:16` | array ของ label |
| `pages/api/submittedreports/submit-report.js:7` | object map `{ label: { limit, labelEn } }` |
| `pages/api/submittedreports/check-daily-limit.js:6` | object map (สำเนาเหมือนกัน) |

นอกจากนี้ `check-daily-limit.js:84` มี `export { DAILY_LIMITED_PROBLEMS }` พร้อมคอมเมนต์ว่า "Export สำหรับใช้ใน submit-report.js" แต่ `submit-report.js` ประกาศสำเนาของตัวเองและไม่เคย import — เป็น **dead code** และเป็นแอนตี้แพทเทิร์น (export ค่าที่ไม่ใช่ handler ออกจาก `pages/api/`)

ยุบทั้งหมดมาไว้ที่ `lib/problemRules.js`:

```js
// ปัญหาที่จำกัดจำนวนคำขอต่อวัน
export const DAILY_LIMITED_PROBLEMS = {
  'ขอรถรับ-ส่งไปโรงพยาบาล': { limit: 3, labelEn: 'Hospital Transport Request' },
};

// ปัญหาที่ต้องกรอกชื่อผู้ป่วยเพิ่ม
export const PATIENT_INFO_PROBLEMS = ['ขอรถรับ-ส่งไปโรงพยาบาล'];

export const getDailyLimit = (label) => DAILY_LIMITED_PROBLEMS[label] ?? null;

export const requiresPatientName = (labels) =>
  Array.isArray(labels) && labels.some((l) => PATIENT_INFO_PROBLEMS.includes(l));
```

`requiresPatientName` ต้องทนกับค่าที่ไม่ใช่ array ได้ เพราะฝั่ง API รับ `problems` มาจาก request body ที่ควบคุมไม่ได้

ไฟล์นี้เป็น constant ล้วน ไม่มี import ที่ผูกกับ Node → import ได้ทั้ง client bundle และ API route

**จุดที่ต้องแก้ตาม:**
- `ComplaintFormModal.js:63` — เปลี่ยน `DAILY_LIMITED_PROBLEMS.includes(opt.label)` เป็น `getDailyLimit(opt.label) !== null`
- `submit-report.js:32` และ `check-daily-limit.js:34` — import แทนการประกาศ local
- `check-daily-limit.js:83-84` — ลบคอมเมนต์ + `export` ที่เป็น dead code

---

## 2. Data flow

```
ComplaintFormModal
  selectedProblems (ids) ──map──> labels ──> requiresPatientName(labels)
       │
       ├── true ──> render <PatientInfoInput />  (บังคับกรอก)
       │
       └── payload { ...เดิม, [patientName เฉพาะเมื่อ needsPatient] }
                    │
                    ▼
       POST /api/submittedreports/submit-report
         1. re-validate ฝั่ง server (กัน bypass ด้วย curl)
         2. sanitize + trim แล้วบันทึกลง SubmittedReport.patientName
         3. ใส่ patientName ใน webhook payload ──> n8n
                    │
                    ▼
       CardModalDetail  แสดงบล็อก "ผู้ป่วย" (เฉพาะเมื่อมีค่า)
```

---

## 3. Component ใหม่ — `components/PatientInfoInput.js`

แยกเป็นไฟล์ของตัวเอง ไม่ยัดเข้า `ReporterInput.js` (ยาว ~190 บรรทัด) และไม่ยัดเข้า `ComplaintFormModal.js` (420 บรรทัด) หน้าที่เดียวของมันคือ "เก็บชื่อผู้ป่วย และบอกว่า valid หรือยัง"

**Props**

| prop | ชนิด | หน้าที่ |
|---|---|---|
| `patientName` / `setPatientName` | string / fn | ค่าชื่อผู้ป่วย (state อยู่ที่ ComplaintFormModal) |
| `isSelf` / `setIsSelf` | bool / fn | สถานะ checkbox |
| `reporterPrefix`, `reporterFullName` | string | ใช้ auto-fill เมื่อ `isSelf` |
| `validateTrigger` | bool | ให้ validate ตอนกดส่ง (แพทเทิร์นเดียวกับ `ReporterInput`) |
| `setValid` | fn | รายงานผล validate กลับขึ้นไป |

**พฤติกรรม**

- ติ๊ก checkbox → เซ็ตค่าเป็น `reporterPrefix + reporterFullName` และ input เป็น `disabled`
- ขณะติ๊กอยู่ ถ้าผู้แจ้งย้อนไปแก้ชื่อ/คำนำหน้าตัวเอง → sync ตามด้วย `useEffect`
- ปลด checkbox → เคลียร์ช่องให้ว่าง พร้อมพิมพ์ใหม่
- ไม่มี dropdown คำนำหน้าแยก — ช่องเดียว พิมพ์ "นางสมศรี ใจดี" ได้เลย
- ใช้สไตล์ input เดียวกับ `ReporterInput` (`input input-bordered bg-blue-50 text-blue-900 border-blue-300 ...`)

**ตำแหน่งในฟอร์ม:** ระหว่าง chips ปัญหา กับ `<ImageUploads />` เห็นทันทีหลังกดเลือกปัญหา โดยไม่ต้องเลื่อนหา

---

## 4. Validation

### Client

ใน `PatientInfoInput` ใช้ zod แบบเดียวกับ `ReporterInput`:

```js
const patientSchema = z.object({
  patientName: z.string().trim().min(1, t.form.validation.enterPatientName),
});
```

`ComplaintFormModal` เก็บผลไว้ใน `patientValidRef` คู่กับ `reporterValidRef` เดิม แล้วต่อเข้า `validationErrors` array ที่มีอยู่ — เตือนรวมใน Swal ก้อนเดียว **ไม่เพิ่ม popup ใหม่**:

```js
if (needsPatient && !patientValidRef.current) {
  validationErrors.push(t.form.validation.enterPatientName);
}
```

### Server

ใน `submit-report.js` ก่อนสร้าง record (client-side validation ข้ามได้ด้วย curl):

```js
let cleanPatientName;
if (requiresPatientName(problems)) {
  cleanPatientName = String(req.body.patientName || '')
    .replace(/[\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanPatientName) {
    return res.status(400).json({
      success: false,
      error: 'กรุณากรอกชื่อ-นามสกุลผู้ป่วย',
      errorCode: 'PATIENT_NAME_REQUIRED',
    });
  }
  if (cleanPatientName.length > 100) {
    return res.status(400).json({
      success: false,
      error: 'ชื่อ-นามสกุลผู้ป่วยยาวเกินกำหนด',
      errorCode: 'PATIENT_NAME_TOO_LONG',
    });
  }
}
```

ตอนสร้าง record ต้อง **override ค่าที่ sanitize แล้วทับค่าดิบ** ใน `...dataToSave` (แบบเดียวกับที่ `detail` ทำอยู่):

```js
const newReport = await SubmittedReport.create({
  ...dataToSave,
  detail: cleanDetail,
  ...(cleanPatientName ? { patientName: cleanPatientName } : {}),
  complaintId,
  ...
});
```

---

## 5. Model — `models/SubmittedReport.js`

เพิ่มบรรทัดเดียวต่อจาก `idCard`:

```js
patientName: String,
```

**ไม่ใส่ `default`** — ตรงกับสไตล์ field อื่นในไฟล์เดียวกัน (`fullName: String`, `phone: String`, `idCard: String`) และทำให้เอกสารของเรื่องที่ไม่ใช่คำขอรถ **ไม่มี field นี้เลย** เหมือนเดิมทุกประการ

ไม่ใส่ `required` เพราะเรื่องหมวดอื่นไม่มีค่านี้ — ให้ API เป็นคนบังคับตามเงื่อนไข

**ไม่ต้องทำ migration** ข้อมูลเก่าอ่านออกมาเป็น `undefined` ตามปกติ

---

## 6. การแสดงผลและ webhook

### CardModalDetail

เพิ่มบล็อกเหนือส่วน "รายละเอียด" (`components/CardModalDetail.js:188`) แสดงเฉพาะเมื่อมีค่า:

```jsx
{modalData.patientName && (
  <div>
    <div className="font-semibold mb-1">{t.complaint.patientName}</div>
    <div className="bg-blue-50 p-3 text-sm text-gray-700 rounded border">
      {modalData.patientName}
    </div>
  </div>
)}
```

### Webhook payload

ใน `submit-report.js` เพิ่มลง `webhookPayload` แบบมีเงื่อนไข เพื่อไม่ให้ payload ของเรื่องปกติเปลี่ยนรูป:

```js
...(newReport.patientName ? { patientName: newReport.patientName } : {}),
```

n8n workflow ฝั่งปลายทางหยิบไปใช้เมื่อไรก็ได้ ไม่ต้องแก้พร้อมกัน

---

## 7. i18n

เพิ่ม key ทั้ง `locales/th.json` และ `locales/en.json` (ต้องมีครบทั้งสองไฟล์ ไม่งั้นผู้ใช้ภาษาอังกฤษจะเจอ error ตอนช่องนี้โผล่)

| key | ไทย | อังกฤษ |
|---|---|---|
| `form.patient.sectionTitle` | ข้อมูลผู้ป่วย | Patient Information |
| `form.patient.name` | ชื่อ-นามสกุลผู้ป่วย | Patient full name |
| `form.patient.isSelf` | ผู้ป่วยคือตัวผู้แจ้งเอง | The reporter is the patient |
| `form.patient.placeholder` | เช่น นางสมศรี ใจดี | e.g. Somsri Jaidee |
| `form.validation.enterPatientName` | กรุณากรอกชื่อ-นามสกุลผู้ป่วย | Please enter the patient's full name |
| `complaint.patientName` | ผู้ป่วย | Patient |

---

## 8. การเคลียร์ค่า

สองจุดที่ต้องกันข้อมูลค้าง:

1. **`handleClearForm`** เพิ่ม `setPatientName('')` + `setIsSelf(false)`
   พร้อมกันนี้เพิ่ม **`setIdCard('')`** ด้วย — เป็นบั๊กที่มีอยู่แล้ว: `handleClearForm` (บรรทัด 228–242) reset ทุก field ยกเว้น `idCard` ทำให้กด "ล้างฟอร์ม" แล้วเลขบัตรประชาชนยังค้างอยู่ กระทบทุกหมวด แก้ไปพร้อมกันเพราะอยู่ในฟังก์ชันเดียวกับที่กำลังจะแก้อยู่แล้ว

2. **ยกเลิกเลือก chip** — ผู้ใช้กดเลือก "ขอรถรับ-ส่ง" กรอกชื่อ แล้วเปลี่ยนใจกดออก ต้องเคลียร์ `patientName` + `isSelf` ไม่ให้หลุดไปกับ payload (ใช้ `useEffect` ที่ผูกกับ `needsPatient`)

---

## 9. ผลกระทบต่อการแจ้งเรื่องปกติ

ตรวจสอบจากโค้ดแล้ว:

| จุด | ผลกระทบ |
|---|---|
| Validation ฝั่ง server | ไม่มี — `requiresPatientName(problems)` คืน `false` → ข้ามทั้งบล็อก |
| ช่องกรอกในฟอร์ม | ไม่มี — render แบบมีเงื่อนไข |
| `loadDailyLimits` | ไม่มี — filter ตามหมวด หมวดอื่นได้ list ว่าง ไม่ยิง API (เหมือนเดิม) |
| ย้าย `DAILY_LIMITED_PROBLEMS` | ไม่มี — ค่าเหมือนเดิม แค่ย้ายที่อยู่ และ export ที่ลบเป็น dead code |
| เอกสารใน MongoDB | ไม่มี — ไม่ใส่ `default` จึงไม่มี field เพิ่มในเรื่องปกติ |
| webhook payload | ไม่มี — ใส่ key แบบมีเงื่อนไข |
| ข้อมูลเก่าใน DB | ไม่มี — ไม่ต้อง migration |
| **`handleClearForm`** | **มี (ตั้งใจ)** — กด "ล้างฟอร์ม" แล้วเลขบัตรจะถูกเคลียร์ด้วย ซึ่งเป็นพฤติกรรมที่ถูกต้อง |

**ผู้เรียกใช้ที่เกี่ยวข้อง:** `ComplaintFormModal` ถูกใช้ที่ `pages/index.tsx:149` ที่เดียว, `ReporterInput` ถูกใช้ใน `ComplaintFormModal` ที่เดียว — ไม่มีที่อื่นพลอยกระทบ

---

## 10. Verification

โปรเจกต์ยังไม่มี test framework ติดตั้ง (ไม่มี jest/vitest ใน `package.json`) การตั้ง framework ใหม่อยู่นอกขอบเขตงานนี้ ยืนยันด้วย manual checklist แทน:

1. หมวดสวัสดิการสังคม → กด "ขอรถรับ-ส่งไปโรงพยาบาล" → ช่องข้อมูลผู้ป่วยโผล่
2. ไม่กรอก แล้วกดส่ง → Swal เตือนรวมกับ error อื่น ไม่ใช่ popup แยก
3. ติ๊ก "ผู้ป่วยคือตัวผู้แจ้งเอง" → auto-fill + input `disabled`; แก้ชื่อผู้แจ้งแล้วช่องผู้ป่วยตามทัน
4. ปลด checkbox → ช่องว่างและแก้ไขได้
5. กดยกเลิกเลือก chip → ช่องหาย และค่าไม่ติดไปกับ payload (ตรวจจาก console log `📤 Payload`)
6. หมวดอื่น (ถนน/ไฟฟ้า) → ไม่มีช่องนี้ และ payload ไม่มี key `patientName`
7. `curl` POST ตรงไป API ด้วย `problems: ["ขอรถรับ-ส่งไปโรงพยาบาล"]` แต่ไม่ส่ง `patientName` → ได้ 400 `PATIENT_NAME_REQUIRED`
8. เปิด CardModalDetail ของเรื่องที่ส่ง → เห็นชื่อผู้ป่วย; เปิดเรื่องเก่าก่อนฟีเจอร์นี้ → ไม่ขึ้นบล็อกว่าง
9. กด "ล้างฟอร์ม" → ทุกช่องว่างรวมถึงเลขบัตรประชาชนและชื่อผู้ป่วย
10. สลับภาษาเป็นอังกฤษ → ข้อความในส่วนผู้ป่วยแสดงถูกต้อง ไม่มี `undefined`
11. **Regression:** daily limit ยังทำงานปกติ — badge เหลือ `x/3`, chip กดไม่ได้เมื่อเต็ม, API คืน 429
12. `npm run build` ผ่าน ไม่มี ESLint error

---

## ไฟล์ที่แตะ (9 ไฟล์)

**ใหม่ 2**
- `lib/problemRules.js`
- `components/PatientInfoInput.js`

**แก้ 7**
- `components/ComplaintFormModal.js`
- `pages/api/submittedreports/submit-report.js`
- `pages/api/submittedreports/check-daily-limit.js`
- `models/SubmittedReport.js`
- `components/CardModalDetail.js`
- `locales/th.json`
- `locales/en.json`
