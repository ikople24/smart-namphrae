# Patient Name Field for Hospital Transport Requests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เมื่อผู้แจ้งเลือกปัญหา `"ขอรถรับ-ส่งไปโรงพยาบาล"` ให้แสดงช่องกรอกชื่อ-นามสกุลผู้ป่วยแบบบังคับ บันทึกลง DB ส่งต่อ n8n และแสดงให้เจ้าหน้าที่เห็น

**Architecture:** ยุบกฎของปัญหา (daily limit + patient info) มาไว้ที่โมดูลค่าคงที่เดียว `lib/problemRules.js` ที่ import ได้ทั้งฝั่ง client และ API route แล้วให้ `ComplaintFormModal` render คอมโพเนนต์ `PatientInfoInput` แบบมีเงื่อนไขจาก label ของปัญหาที่เลือก ฝั่ง API ตรวจซ้ำและ sanitize ก่อนบันทึก โดยไม่ใส่ `default` ใน schema เพื่อให้เอกสารของเรื่องหมวดอื่นไม่เปลี่ยนรูป

**Tech Stack:** Next.js 15 (Pages Router) · React 19 · Mongoose 8 · zod 3 · SweetAlert2 · daisyUI/Tailwind · i18n ผ่าน `hooks/useTranslation.ts` + `locales/{th,en}.json`

**Spec:** [docs/superpowers/specs/2026-08-25-patient-info-hospital-transport-design.md](../specs/2026-08-25-patient-info-hospital-transport-design.md)

---

## ⚠️ หมายเหตุเรื่องการทดสอบ — อ่านก่อนเริ่ม

โปรเจกต์นี้ **ไม่มี test framework ติดตั้ง** — ไม่มี jest, vitest หรือ `test` script ใน `package.json` มีแค่ `dev`, `build`, `start`, `lint`

สเปกที่ผู้ใช้อนุมัติระบุว่าการตั้ง framework ใหม่อยู่นอกขอบเขตงานนี้ ดังนั้นแผนนี้ **ไม่ใช้ TDD แบบเขียน test ก่อน** แต่แทนที่ด้วยขั้นตอนตรวจสอบที่รันได้จริงและมีผลลัพธ์ที่คาดหวังชัดเจน:

- คำสั่ง `curl` พร้อม JSON ที่คาดหวัง สำหรับ API
- `npm run build` + `npx eslint` สำหรับ static check
- checklist กดจริงในเบราว์เซอร์ สำหรับ UI

**ทุก Task ต้องรันขั้นตอนตรวจสอบของตัวเองให้ผ่านก่อน commit** ห้าม commit ทั้งที่ยังไม่ได้รัน

**ก่อนเริ่ม Task 1** เปิด dev server ค้างไว้ใน terminal แยก:

```bash
npm run dev
```

Expected: `✓ Ready in ...` และ `- Local: http://localhost:3000`

---

## File Structure

| ไฟล์ | สถานะ | ความรับผิดชอบ |
|---|---|---|
| `lib/problemRules.js` | สร้าง | แหล่งความจริงเดียวของกฎที่ผูกกับ label ปัญหา — daily limit และ patient info |
| `components/PatientInfoInput.js` | สร้าง | รับค่าชื่อผู้ป่วย + checkbox "ผู้ป่วยคือตัวผู้แจ้งเอง" และรายงานสถานะ valid กลับขึ้นไป |
| `models/SubmittedReport.js` | แก้ | เพิ่ม field `patientName` |
| `locales/th.json` | แก้ | ข้อความภาษาไทย |
| `locales/en.json` | แก้ | ข้อความภาษาอังกฤษ |
| `pages/api/submittedreports/check-daily-limit.js` | แก้ | import กฎจาก `lib/` แทนสำเนา local + ลบ dead export |
| `pages/api/submittedreports/submit-report.js` | แก้ | import กฎจาก `lib/` + validate/sanitize/บันทึก `patientName` + ใส่ใน webhook |
| `components/ComplaintFormModal.js` | แก้ | import กฎจาก `lib/` + ต่อ `PatientInfoInput` เข้าฟอร์มและ validation flow |
| `components/CardModalDetail.js` | แก้ | แสดงบล็อก "ผู้ป่วย" ให้เจ้าหน้าที่ |

**ลำดับ Task ออกแบบให้แต่ละ commit ทำงานได้เองและตรวจสอบได้:** Task 1 เป็น pure refactor (พฤติกรรมต้องไม่เปลี่ยนเลย) → Task 2 เตรียม data layer + strings → Task 3 สร้างคอมโพเนนต์แยกที่ยังไม่มีใครใช้ → Task 4 ต่อเข้าฟอร์ม (UI ใช้งานได้) → Task 5 ปิดฝั่ง server → Task 6 แสดงผล → Task 7 ตรวจรวม

---

### Task 1: ยุบกฎของปัญหามาไว้ที่ `lib/problemRules.js` (pure refactor)

**Files:**
- Create: `lib/problemRules.js`
- Modify: `pages/api/submittedreports/check-daily-limit.js:6-11`, `:34`, `:83-84`
- Modify: `pages/api/submittedreports/submit-report.js:6-12`, `:32`
- Modify: `components/ComplaintFormModal.js:15-16`, `:63`

**เป้าหมาย: พฤติกรรมต้องไม่เปลี่ยนแม้แต่นิดเดียว** งานนี้แค่ย้ายค่าคงที่ ค่าที่ใช้ต้องเหมือนเดิมทุกตัว

- [ ] **Step 1.1: สร้าง `lib/problemRules.js`**

สร้างไฟล์ใหม่ `lib/problemRules.js` ด้วยเนื้อหานี้ทั้งหมด:

```js
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
```

- [ ] **Step 1.2: แก้ `check-daily-limit.js` ให้ import จาก lib**

ในไฟล์ `pages/api/submittedreports/check-daily-limit.js`

ลบบล็อกนี้ (บรรทัด 5–11):

```js
// รายการปัญหาที่มีการจำกัดจำนวนต่อวัน
const DAILY_LIMITED_PROBLEMS = {
  "ขอรถรับ-ส่งไปโรงพยาบาล": {
    limit: 3,
    labelEn: "Hospital Transport Request"
  }
};
```

แล้วเพิ่ม import ต่อจาก import เดิมที่บรรทัด 3 ให้ส่วนหัวไฟล์เป็น:

```js
// pages/api/submittedreports/check-daily-limit.js
import dbConnect from "@/lib/dbConnect";
import SubmittedReport from "@/models/SubmittedReport";
import { getDailyLimit } from "@/lib/problemRules";
```

เปลี่ยนบรรทัด 34 จาก:

```js
    const limitConfig = DAILY_LIMITED_PROBLEMS[problemLabel];
```

เป็น:

```js
    const limitConfig = getDailyLimit(problemLabel);
```

ลบสองบรรทัดสุดท้ายของไฟล์ (บรรทัด 83–84) ทิ้ง — เป็น dead code เพราะ `submit-report.js` ประกาศสำเนาของตัวเองและไม่เคย import ค่านี้ และการ export ค่าที่ไม่ใช่ handler ออกจาก `pages/api/` เป็นแอนตี้แพทเทิร์นของ Next.js:

```js
// Export สำหรับใช้ใน submit-report.js
export { DAILY_LIMITED_PROBLEMS };
```

- [ ] **Step 1.3: แก้ `submit-report.js` ให้ import จาก lib**

ในไฟล์ `pages/api/submittedreports/submit-report.js`

ลบบล็อกนี้ (บรรทัด 6–12):

```js
// รายการปัญหาที่มีการจำกัดจำนวนต่อวัน
const DAILY_LIMITED_PROBLEMS = {
  "ขอรถรับ-ส่งไปโรงพยาบาล": {
    limit: 3,
    labelEn: "Hospital Transport Request"
  }
};
```

ให้ส่วนหัวไฟล์เป็น:

```js
// pages/api/submit-report.js
import dbConnect from "@/lib/dbConnect";
import SubmittedReport from "@/models/SubmittedReport";
import getNextSequence from "@/lib/getNextSequence";
import { getDailyLimit } from "@/lib/problemRules";
```

เปลี่ยนบรรทัด 32 จาก:

```js
        const limitConfig = DAILY_LIMITED_PROBLEMS[problem];
```

เป็น:

```js
        const limitConfig = getDailyLimit(problem);
```

- [ ] **Step 1.4: แก้ `ComplaintFormModal.js` ให้ import จาก lib**

ในไฟล์ `components/ComplaintFormModal.js`

ลบสองบรรทัดนี้ (บรรทัด 15–16):

```js
// ปัญหาที่มีการจำกัดจำนวนต่อวัน
const DAILY_LIMITED_PROBLEMS = ['ขอรถรับ-ส่งไปโรงพยาบาล'];
```

เพิ่ม import ต่อจากบรรทัด 12 (`import { getProblemDisplayLabel } ...`):

```js
import { getDailyLimit } from '@/lib/problemRules';
```

เปลี่ยนบรรทัด 63 (ในฟังก์ชัน `loadDailyLimits`) จาก:

```js
        DAILY_LIMITED_PROBLEMS.includes(opt.label)
```

เป็น:

```js
        getDailyLimit(opt.label) !== null
```

**หมายเหตุ:** ของเดิมฝั่ง client เป็น array ใช้ `.includes()` ส่วนฝั่ง API เป็น object map นี่คือเหตุผลที่ต้องยุบ — ตอนนี้ทั้งสองฝั่งอ่านจากที่เดียวกัน

- [ ] **Step 1.5: ตรวจว่าไม่มีการอ้างถึงตัวแปรเก่าหลงเหลือ**

Run:

```bash
grep -rn "DAILY_LIMITED_PROBLEMS" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" . | grep -v node_modules
```

Expected: มีบรรทัดเดียวคือ `lib/problemRules.js:5:export const DAILY_LIMITED_PROBLEMS = {` (เลขบรรทัดอาจต่างเล็กน้อย) ถ้ายังเจอใน `components/` หรือ `pages/api/` แปลว่าแก้ไม่ครบ

- [ ] **Step 1.6: ตรวจว่า build ผ่าน**

Run:

```bash
npm run build
```

Expected: จบด้วย `✓ Compiled successfully` และไม่มี `Failed to compile` หรือ ESLint error
ถ้าเจอ `Module not found: Can't resolve '@/lib/problemRules'` แปลว่าไฟล์ Step 1.1 ยังไม่ถูกสร้างหรือชื่อไฟล์ผิด

- [ ] **Step 1.7: ตรวจ regression ของ daily limit ผ่าน API**

Run (dev server ต้องรันอยู่):

```bash
curl -s "http://localhost:3000/api/submittedreports/check-daily-limit?problem=%E0%B8%82%E0%B8%AD%E0%B8%A3%E0%B8%96%E0%B8%A3%E0%B8%B1%E0%B8%9A-%E0%B8%AA%E0%B9%88%E0%B8%87%E0%B9%84%E0%B8%9B%E0%B9%82%E0%B8%A3%E0%B8%87%E0%B8%9E%E0%B8%A2%E0%B8%B2%E0%B8%9A%E0%B8%B2%E0%B8%A5" | python3 -m json.tool
```

Expected: JSON ที่มี `"hasLimit": true`, `"limit": 3`, `"problemEn": "Hospital Transport Request"` และมี `remaining` เป็นตัวเลข
ถ้าได้ `"hasLimit": false` แปลว่า `getDailyLimit` หา key ไม่เจอ — ตรวจว่าสตริงใน `lib/problemRules.js` เป็น `'ขอรถรับ-ส่งไปโรงพยาบาล'` เป๊ะ (มีขีดกลางระหว่าง "รับ" กับ "ส่ง")

Run ต่อ เพื่อยืนยันว่าปัญหาที่ไม่ถูกจำกัดยังคืน `hasLimit: false`:

```bash
curl -s "http://localhost:3000/api/submittedreports/check-daily-limit?problem=test-unlimited" | python3 -m json.tool
```

Expected: `"hasLimit": false`

- [ ] **Step 1.8: ตรวจ regression ของ badge ในเบราว์เซอร์**

เปิด `http://localhost:3000` → กดหมวด **สวัสดิการสังคม**

Expected: chip "ขอรถรับ-ส่งไปโรงพยาบาล" มี badge สีเขียวแสดง `x/3` และมีข้อความ "เหลืออีก x ครั้งวันนี้" ใต้ chip เหมือนก่อนแก้
ถ้า badge หายไป แปลว่า Step 1.4 ทำให้ `statusMap` ว่าง

- [ ] **Step 1.9: Commit**

```bash
git add lib/problemRules.js components/ComplaintFormModal.js pages/api/submittedreports/check-daily-limit.js pages/api/submittedreports/submit-report.js
git commit -m "refactor: consolidate problem rules into lib/problemRules.js

DAILY_LIMITED_PROBLEMS was duplicated in three places with mismatched
shapes (array on the client, object map in both API routes), and
check-daily-limit.js exported it from pages/api/ for a consumer that
never imported it. Single source of truth now lives in lib/.

No behavior change."
```

---

### Task 2: เพิ่ม field ใน model และข้อความ i18n

**Files:**
- Modify: `models/SubmittedReport.js:7` (ต่อจาก `idCard`)
- Modify: `locales/th.json` (`form.patient`, `form.validation.enterPatientName`, `complaint.patientName`)
- Modify: `locales/en.json` (คีย์ชุดเดียวกัน)

- [ ] **Step 2.1: เพิ่ม `patientName` ใน schema**

ในไฟล์ `models/SubmittedReport.js` เพิ่มบรรทัดต่อจาก `idCard: String,` ให้ส่วนต้นของ schema เป็น:

```js
const SubmittedReportSchema = new mongoose.Schema({

  fullName: String,
  phone: String,
  idCard: String,
  patientName: String,
  community: String,
```

**ห้ามใส่ `default: ''`** — ถ้าใส่ Mongoose จะเขียน `patientName: ""` ลงทุกเอกสารรวมถึงเรื่องหมวดถนน/ไฟฟ้า ทำให้ payload ที่ส่ง n8n เปลี่ยนรูปสำหรับเรื่องปกติด้วย และ **ห้ามใส่ `required`** เพราะเรื่องหมวดอื่นไม่มีค่านี้ — การบังคับกรอกทำที่ API ตามเงื่อนไข (Task 5)

- [ ] **Step 2.2: เพิ่มคีย์ใน `locales/th.json`**

เพิ่ม object `patient` ใหม่ใน `form` (วางต่อจาก `"prefix": {...}` ก่อน `"placeholder"`):

```json
    "patient": {
      "sectionTitle": "ข้อมูลผู้ป่วย",
      "name": "ชื่อ-นามสกุลผู้ป่วย",
      "isSelf": "ผู้ป่วยคือตัวผู้แจ้งเอง",
      "placeholder": "เช่น นางสมศรี ใจดี"
    },
```

เพิ่มคีย์ใน `form.validation` ต่อจาก `"selectProblem"`:

```json
      "enterPatientName": "กรุณากรอกชื่อ-นามสกุลผู้ป่วย"
```

เพิ่มคีย์ใน `complaint` ต่อจาก `"problems"`:

```json
    "patientName": "ผู้ป่วย"
```

- [ ] **Step 2.3: เพิ่มคีย์ชุดเดียวกันใน `locales/en.json`**

โครงสร้างของ `en.json` เหมือน `th.json` ทุกประการ วางคีย์ที่ตำแหน่งเดียวกัน

ใน `form`:

```json
    "patient": {
      "sectionTitle": "Patient Information",
      "name": "Patient full name",
      "isSelf": "The reporter is the patient",
      "placeholder": "e.g. Somsri Jaidee"
    },
```

ใน `form.validation`:

```json
      "enterPatientName": "Please enter the patient's full name"
```

ใน `complaint`:

```json
    "patientName": "Patient"
```

**ต้องมีครบทั้งสองไฟล์** — `hooks/useTranslation.ts` cast `t` เป็น `typeof th` ถ้า `en.json` ขาดคีย์ TypeScript จะไม่เตือน แต่ผู้ใช้ภาษาอังกฤษจะเจอ runtime error ตอนช่องนี้โผล่

- [ ] **Step 2.4: ตรวจว่า JSON ยังถูกต้องและคีย์ตรงกันทั้งสองภาษา**

Run:

```bash
python3 - <<'PY'
import json, io
th = json.load(io.open('locales/th.json', encoding='utf-8'))
en = json.load(io.open('locales/en.json', encoding='utf-8'))
for name, d in (('th', th), ('en', en)):
    assert set(d['form']['patient']) == {'sectionTitle','name','isSelf','placeholder'}, name
    assert d['form']['validation']['enterPatientName'], name
    assert d['complaint']['patientName'], name
    print(name, 'OK:', d['form']['patient']['name'], '|', d['complaint']['patientName'])
PY
```

Expected:
```
th OK: ชื่อ-นามสกุลผู้ป่วย | ผู้ป่วย
en OK: Patient full name | Patient
```

ถ้าได้ `json.decoder.JSONDecodeError` แปลว่าลืมคอมมา หรือมีคอมมาเกินท้าย object

- [ ] **Step 2.5: Commit**

```bash
git add models/SubmittedReport.js locales/th.json locales/en.json
git commit -m "feat: add patientName field to report model and i18n strings

No default on the schema field so documents for other categories stay
unchanged; the API enforces the requirement conditionally."
```

---

### Task 3: สร้างคอมโพเนนต์ `PatientInfoInput`

**Files:**
- Create: `components/PatientInfoInput.js`

คอมโพเนนต์นี้ยังไม่มีใครเรียกใช้จนกว่าจะถึง Task 4 หน้าที่เดียวของมันคือ "เก็บชื่อผู้ป่วย และบอกว่า valid หรือยัง" แยกเป็นไฟล์ของตัวเองเพราะ `ReporterInput.js` ยาว ~190 บรรทัดและ `ComplaintFormModal.js` ยาว 420 บรรทัดอยู่แล้ว

- [ ] **Step 3.1: เขียนไฟล์ `components/PatientInfoInput.js`**

สร้างไฟล์ใหม่ด้วยเนื้อหานี้ทั้งหมด:

```jsx
import React, { useEffect, useMemo, useCallback, useState } from "react";
import { z } from "zod";
import { useTranslation } from "@/hooks/useTranslation";

const PatientInfoInput = ({
  patientName,
  setPatientName,
  isSelf,
  setIsSelf,
  reporterPrefix,
  reporterFullName,
  validateTrigger = false,
  setValid = () => {},
}) => {
  const { t } = useTranslation();
  const [errors, setErrors] = useState({});

  const patientSchema = useMemo(
    () =>
      z.object({
        patientName: z.string().trim().min(1, t.form.validation.enterPatientName),
      }),
    [t.form.validation.enterPatientName]
  );

  const validate = useCallback(() => {
    const result = patientSchema.safeParse({ patientName });
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      setValid(false);
    } else {
      setErrors({});
      setValid(true);
    }
  }, [patientSchema, patientName, setValid]);

  useEffect(() => {
    if (!validateTrigger) return;
    validate();
  }, [validateTrigger, validate]);

  // ขณะติ๊ก "ผู้ป่วยคือตัวผู้แจ้งเอง" ให้ชื่อผู้ป่วยตามชื่อผู้แจ้งตลอด
  // รวมถึงตอนที่ผู้แจ้งย้อนกลับไปแก้ชื่อหรือคำนำหน้าของตัวเองทีหลัง
  useEffect(() => {
    if (!isSelf) return;
    setPatientName(`${reporterPrefix || ""}${reporterFullName || ""}`.trim());
  }, [isSelf, reporterPrefix, reporterFullName, setPatientName]);

  const handleToggleSelf = (checked) => {
    setIsSelf(checked);
    if (!checked) setPatientName("");
  };

  return (
    <div className="flex flex-col space-y-2 rounded-lg border border-blue-200 bg-blue-50/40 p-3">
      <label className="text-sm font-medium text-gray-800">
        {t.form.patient.sectionTitle}
      </label>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          className="checkbox checkbox-sm checkbox-info"
          checked={isSelf}
          onChange={(e) => handleToggleSelf(e.target.checked)}
        />
        <span>{t.form.patient.isSelf}</span>
      </label>

      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-800">
            {t.form.patient.name}
          </label>
          {errors.patientName && (
            <p className="ml-2 text-right text-sm text-red-500">
              {errors.patientName[0]}
            </p>
          )}
        </div>
        <input
          type="text"
          className="input input-bordered w-full border-blue-300 bg-blue-50 text-blue-900 placeholder:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          placeholder={t.form.patient.placeholder}
          value={patientName}
          disabled={isSelf}
          onChange={(e) => setPatientName(e.target.value)}
        />
      </div>
    </div>
  );
};

export default PatientInfoInput;
```

**จุดที่ต้องระวัง:** `setPatientName` อยู่ใน dependency array ของ `useEffect` ตัว sync ดังนั้นฝั่ง `ComplaintFormModal` ต้องส่ง setter ของ `useState` ตรงๆ (ซึ่ง React การันตีว่า identity คงที่) **ห้ามส่ง arrow function ที่สร้างใหม่ทุก render** เข้าไป ไม่งั้นจะเกิด infinite loop — Task 4 ทำตามนี้อยู่แล้ว

- [ ] **Step 3.2: ตรวจว่า build และ lint ผ่าน**

Run:

```bash
npx eslint components/PatientInfoInput.js && npm run build
```

Expected: `eslint` ไม่พิมพ์อะไรออกมา (ผ่าน) แล้ว build จบด้วย `✓ Compiled successfully`
ถ้าเจอ ESLint เตือน `react-hooks/exhaustive-deps` ให้เพิ่มตัวแปรที่ขาดเข้า dependency array **ห้ามใส่ eslint-disable**

- [ ] **Step 3.3: Commit**

```bash
git add components/PatientInfoInput.js
git commit -m "feat: add PatientInfoInput component

Collects the patient's full name with a 'reporter is the patient'
checkbox that auto-fills and locks the field. Not wired up yet."
```

---

### Task 4: ต่อ `PatientInfoInput` เข้า `ComplaintFormModal`

**Files:**
- Modify: `components/ComplaintFormModal.js` — import, state, derived value, validation, payload, reset, render

- [ ] **Step 4.1: เพิ่ม import**

เพิ่มบรรทัดนี้ในส่วน import ด้านบนของไฟล์ (ต่อจาก `import ReporterInput from './ReporterInput';`):

```js
import PatientInfoInput from './PatientInfoInput';
```

และแก้ import ของ `problemRules` (ที่เพิ่มไว้ใน Task 1) ให้ดึง `requiresPatientName` มาด้วย:

```js
import { getDailyLimit, requiresPatientName } from '@/lib/problemRules';
```

ตรวจว่า `useMemo` ถูก import แล้วในบรรทัดแรกของไฟล์ ถ้ายังไม่มีให้แก้เป็น:

```js
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
```

- [ ] **Step 4.2: เพิ่ม state และ ref**

ต่อจากบรรทัด `const [idCard, setIdCard] = useState('');` (บรรทัด 29) เพิ่ม:

```js
  const [patientName, setPatientName] = useState('');
  const [isPatientSelf, setIsPatientSelf] = useState(false);
```

ต่อจากบรรทัด `const reporterValidRef = useRef(true);` (บรรทัด 37) เพิ่ม:

```js
  const patientValidRef = useRef(true);
```

- [ ] **Step 4.3: คำนวณ label ของปัญหาที่เลือก และเงื่อนไขว่าต้องกรอกชื่อผู้ป่วยไหม**

ต่อจากบรรทัด `const { problemOptions, fetchProblemOptions } = useProblemOptionStore();` (บรรทัด 43) เพิ่ม:

```js
  // แปลง id ของปัญหาที่เลือกเป็น label เพื่อเทียบกับกฎใน lib/problemRules
  const selectedProblemLabels = useMemo(
    () =>
      selectedProblems.map((id) => {
        const match = problemOptions.find((opt) => opt._id === id);
        return match ? match.label : id;
      }),
    [selectedProblems, problemOptions]
  );

  const needsPatientInfo = requiresPatientName(selectedProblemLabels);
```

- [ ] **Step 4.4: เคลียร์ค่าเมื่อผู้ใช้ยกเลิกเลือกปัญหา**

เพิ่ม `useEffect` ต่อจากบล็อกใน Step 4.3 เพื่อกันไม่ให้ชื่อผู้ป่วยค้างไปกับ payload หลังผู้ใช้กดยกเลิกเลือก chip:

```js
  useEffect(() => {
    if (needsPatientInfo) return;
    setPatientName('');
    setIsPatientSelf(false);
    patientValidRef.current = true;
  }, [needsPatientInfo]);
```

- [ ] **Step 4.5: ต่อเข้า validation flow**

ในฟังก์ชัน `handleSubmit` หลังบล็อกที่ push `t.form.validation.selectProblem` (บรรทัด 134–136) เพิ่ม:

```js
    if (needsPatientInfo && !patientValidRef.current) {
      validationErrors.push(t.form.validation.enterPatientName);
    }
```

**อย่าสร้าง Swal ใหม่** — ต้อง push เข้า `validationErrors` array เดิมเพื่อให้เตือนรวมใน popup ก้อนเดียวกับ error อื่น

- [ ] **Step 4.6: ใส่ `patientName` ลง payload แบบมีเงื่อนไข**

ในบล็อก `const payload = {` (บรรทัด 152) เพิ่มบรรทัดต่อจาก `idCard: idCard.trim(),`:

```js
      ...(needsPatientInfo ? { patientName: patientName.trim() } : {}),
```

ใช้ conditional spread ไม่ใช่ `patientName: ''` เพื่อให้ payload และเอกสาร MongoDB ของเรื่องหมวดอื่น **ไม่มี key นี้เลย** เหมือนก่อนเพิ่มฟีเจอร์

- [ ] **Step 4.7: เคลียร์ค่าใน `handleClearForm`**

ในฟังก์ชัน `handleClearForm` (บรรทัด 243–257) เพิ่มสามบรรทัดนี้ ต่อจาก `setPhone('');`:

```js
    setIdCard('');
    setPatientName('');
    setIsPatientSelf(false);
```

และเพิ่มต่อจาก `reporterValidRef.current = true;`:

```js
    patientValidRef.current = true;
```

**`setIdCard('')` เป็นการแก้บั๊กที่มีอยู่เดิม** — ฟังก์ชันนี้ reset ทุก field ยกเว้น `idCard` ทำให้กด "ล้างฟอร์ม" แล้วเลขบัตรประชาชนยังค้าง กระทบทุกหมวด ผู้ใช้อนุมัติให้แก้ไปพร้อมกันแล้ว

- [ ] **Step 4.8: Render คอมโพเนนต์**

แทรกบล็อกนี้ **ก่อน** `<ImageUploads onChange={(urls) => setImageUrls(urls)} />` (บรรทัด 376) เพื่อให้ช่องโผล่ขึ้นมาใต้ chips ปัญหาทันที ผู้ใช้ไม่ต้องเลื่อนหา:

```jsx
          {needsPatientInfo && (
            <PatientInfoInput
              patientName={patientName}
              setPatientName={setPatientName}
              isSelf={isPatientSelf}
              setIsSelf={setIsPatientSelf}
              reporterPrefix={prefix}
              reporterFullName={fullName}
              validateTrigger={validateTrigger}
              setValid={(v) => (patientValidRef.current = v)}
            />
          )}
```

ส่ง `setPatientName` และ `setIsPatientSelf` ซึ่งเป็น setter ของ `useState` ตรงๆ ตามที่ Step 3.1 กำหนด

- [ ] **Step 4.9: ตรวจ lint และ build**

Run:

```bash
npx eslint components/ComplaintFormModal.js && npm run build
```

Expected: eslint เงียบ และ build จบด้วย `✓ Compiled successfully`

- [ ] **Step 4.10: ตรวจในเบราว์เซอร์**

เปิด `http://localhost:3000` แล้วไล่ตามนี้:

| ทำ | คาดหวัง |
|---|---|
| กดหมวด **สวัสดิการสังคม** | ยังไม่มีกล่อง "ข้อมูลผู้ป่วย" |
| กด chip "ขอรถรับ-ส่งไปโรงพยาบาล" | กล่อง "ข้อมูลผู้ป่วย" โผล่ใต้ chips เหนือส่วนอัปโหลดรูป |
| กรอกชื่อผู้แจ้ง "สมชาย ทดสอบ" แล้วติ๊ก "ผู้ป่วยคือตัวผู้แจ้งเอง" | ช่องชื่อผู้ป่วยขึ้น "นายสมชาย ทดสอบ" และเป็นสีเทากดพิมพ์ไม่ได้ |
| ขณะติ๊กอยู่ เปลี่ยนคำนำหน้าเป็น "นาง" | ช่องผู้ป่วยเปลี่ยนเป็น "นางสมชาย ทดสอบ" ทันที |
| ปลด checkbox | ช่องว่างและพิมพ์ได้ |
| ล้างช่องผู้ป่วยให้ว่าง แล้วกด "ส่งเรื่อง" (กรอกอย่างอื่นครบ) | Swal เตือนมีบรรทัด "กรุณากรอกชื่อ-นามสกุลผู้ป่วย" รวมกับ error อื่นใน popup เดียว |
| กดยกเลิกเลือก chip "ขอรถรับ-ส่ง" | กล่องหายไป |
| เปิด DevTools Console แล้วกดส่ง | log `📤 Payload ส่งไป backend:` มี key `patientName` |
| กดหมวดอื่น เช่น **ถนน** แล้วกดส่ง | log `📤 Payload` **ไม่มี** key `patientName` |
| กด "ล้างฟอร์ม" | ทุกช่องว่าง รวมถึงเลขบัตรประชาชนและชื่อผู้ป่วย |

ถ้าเบราว์เซอร์ค้างหรือ console ขึ้น "Maximum update depth exceeded" แปลว่ามีการส่ง arrow function ใหม่เข้า `setPatientName` — กลับไปตรวจ Step 4.8

- [ ] **Step 4.11: Commit**

```bash
git add components/ComplaintFormModal.js
git commit -m "feat: require patient name for hospital transport requests

Shows PatientInfoInput when a selected problem is in
PATIENT_INFO_PROBLEMS, folds its validation into the existing combined
alert, and sends patientName only when it applies so payloads for other
categories are unchanged.

Also fixes handleClearForm not resetting idCard."
```

---

### Task 5: บังคับและ sanitize ฝั่ง server

**Files:**
- Modify: `pages/api/submittedreports/submit-report.js` — validation, destructure, create, webhook payload

Validation ฝั่ง client ข้ามได้ด้วย `curl` จึงต้องตรวจซ้ำที่นี่

- [ ] **Step 5.1: เพิ่ม `requiresPatientName` เข้า import**

แก้บรรทัด import ที่เพิ่มไว้ใน Task 1 เป็น:

```js
import { getDailyLimit, requiresPatientName } from "@/lib/problemRules";
```

- [ ] **Step 5.2: เพิ่มการ validate และ sanitize**

หลังบรรทัด `const cleanDetail = ...` (บรรทัด 79) เพิ่มบล็อกนี้:

```js
    // ตรวจซ้ำฝั่ง server เพราะ validation ฝั่ง client ข้ามได้
    let cleanPatientName;
    if (requiresPatientName(problems)) {
      cleanPatientName = String(req.body.patientName || '')
        .replace(/[\n\r\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanPatientName) {
        return res.status(400).json({
          success: false,
          error: "กรุณากรอกชื่อ-นามสกุลผู้ป่วย",
          errorCode: "PATIENT_NAME_REQUIRED",
        });
      }

      if (cleanPatientName.length > 100) {
        return res.status(400).json({
          success: false,
          error: "ชื่อ-นามสกุลผู้ป่วยยาวเกินกำหนด",
          errorCode: "PATIENT_NAME_TOO_LONG",
        });
      }
    }
```

`problems` ถูก destructure จาก `req.body` ไว้แล้วที่บรรทัด 21 จึงใช้ได้เลย และ `requiresPatientName` ทนกับค่าที่ไม่ใช่ array อยู่แล้ว

- [ ] **Step 5.3: กันค่าดิบไม่ให้หลุดลง DB**

แก้บรรทัด 83 จาก:

```js
    const { updatedAt, ...dataToSave } = req.body;
```

เป็น:

```js
    const { updatedAt, patientName: rawPatientName, ...dataToSave } = req.body;
```

ดึง `patientName` ดิบออกจาก `dataToSave` เพื่อไม่ให้ค่าที่ไม่ผ่าน sanitize ถูกบันทึก และกันกรณีที่มีคนส่ง `patientName` มากับเรื่องหมวดอื่นที่ไม่ควรมี field นี้ คอมเมนต์ `// eslint-disable-next-line @typescript-eslint/no-unused-vars` ที่อยู่เหนือบรรทัดนี้ครอบคลุมตัวแปรที่ไม่ได้ใช้ทั้งสองตัวแล้ว

- [ ] **Step 5.4: บันทึกค่าที่ sanitize แล้ว**

แก้บล็อก `SubmittedReport.create` (บรรทัด 85–91) เป็น:

```js
    const newReport = await SubmittedReport.create({
      ...dataToSave,
      detail: cleanDetail,
      ...(cleanPatientName ? { patientName: cleanPatientName } : {}),
      complaintId,
      lastNotificationSent: new Date(),
      notificationCount: 1,
    });
```

- [ ] **Step 5.5: ใส่ใน webhook payload**

ในบล็อก `const webhookPayload = {` เพิ่มบรรทัดต่อจาก `officer: newReport.officer || '',` (บรรทัด 110):

```js
        ...(newReport.patientName ? { patientName: newReport.patientName } : {}),
```

ใช้ conditional spread เพื่อให้ payload ของเรื่องหมวดอื่นที่ส่งไป n8n เหมือนเดิมทุกประการ

- [ ] **Step 5.6: ตรวจว่า API ปฏิเสธคำขอที่ไม่มีชื่อผู้ป่วย**

Run:

```bash
curl -s -X POST http://localhost:3000/api/submittedreports/submit-report \
  -H "Content-Type: application/json" \
  -H "x-app-id: app_a" \
  -d '{"fullName":"ทดสอบ ระบบ","phone":"0800000000","community":"ทดสอบ","category":"สวัสดิการสังคม","problems":["ขอรถรับ-ส่งไปโรงพยาบาล"],"detail":"ทดสอบ","images":[],"location":{"lat":18.8,"lng":98.9}}' \
  | python3 -m json.tool
```

Expected:
```json
{
    "success": false,
    "error": "กรุณากรอกชื่อ-นามสกุลผู้ป่วย",
    "errorCode": "PATIENT_NAME_REQUIRED"
}
```

ถ้าได้ `201` กลับมาแทน แปลว่าบล็อกใน Step 5.2 ไม่ทำงาน — ตรวจว่าวางไว้ **ก่อน** `SubmittedReport.create` และ `problems` ถูก destructure มาแล้ว

Run ต่อ เพื่อยืนยันว่าชื่อยาวเกินถูกปฏิเสธ:

```bash
curl -s -X POST http://localhost:3000/api/submittedreports/submit-report \
  -H "Content-Type: application/json" \
  -H "x-app-id: app_a" \
  -d "$(python3 -c 'import json;print(json.dumps({"fullName":"ทดสอบ ยาว","phone":"0800000001","community":"ทดสอบ","category":"สวัสดิการสังคม","problems":["ขอรถรับ-ส่งไปโรงพยาบาล"],"patientName":"ก"*101,"detail":"ทดสอบ","images":[],"location":{"lat":18.8,"lng":98.9}},ensure_ascii=False))")" \
  | python3 -m json.tool
```

Expected: `"errorCode": "PATIENT_NAME_TOO_LONG"`

- [ ] **Step 5.7: ตรวจว่าเรื่องหมวดอื่นยังส่งผ่านได้ตามปกติ**

Run:

```bash
curl -s -X POST http://localhost:3000/api/submittedreports/submit-report \
  -H "Content-Type: application/json" \
  -H "x-app-id: app_a" \
  -d '{"fullName":"ทดสอบ ปกติ","phone":"0800000002","community":"ทดสอบ","category":"ถนน","problems":["ถนนชำรุด"],"detail":"ทดสอบเรื่องปกติ","images":[],"location":{"lat":18.8,"lng":98.9}}' \
  | python3 -m json.tool | head -20
```

Expected: `"success": true` พร้อม `"complaintId"` เป็นสตริง และใน `data` **ไม่มี** key `patientName`
ถ้าเห็น `"patientName": ""` ใน `data` แปลว่า Task 2 ใส่ `default: ''` ไว้ — กลับไปลบออก

- [ ] **Step 5.8: ตรวจว่าค่าที่บันทึกถูก sanitize จริง**

ส่งชื่อที่มี newline และช่องว่างซ้ำเข้าไป:

```bash
curl -s -X POST http://localhost:3000/api/submittedreports/submit-report \
  -H "Content-Type: application/json" \
  -H "x-app-id: app_a" \
  -d '{"fullName":"ทดสอบ ซานิไทซ์","phone":"0800000003","community":"ทดสอบ","category":"สวัสดิการสังคม","problems":["ขอรถรับ-ส่งไปโรงพยาบาล"],"patientName":"  นางสมศรี\n\t  ใจดี  ","detail":"ทดสอบ","images":[],"location":{"lat":18.8,"lng":98.9}}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(repr(d['data']['patientName']))"
```

Expected: `'นางสมศรี ใจดี'` — ไม่มี newline ไม่มีช่องว่างหัวท้าย ช่องว่างกลางยุบเหลือหนึ่ง

**หมายเหตุ:** คำขอทดสอบเหล่านี้นับรวมใน daily limit 3 ครั้ง/วันด้วย ถ้าเจอ `429 DAILY_LIMIT_REACHED` ระหว่างทดสอบให้ลบเอกสารทดสอบออกก่อน หรือทดสอบต่อวันถัดไป

- [ ] **Step 5.9: ลบข้อมูลทดสอบออกจาก MongoDB**

Run (ใช้ connection string จาก `.env.local`):

```bash
node -e "
require('dotenv').config({path:'.env.local'});
const m=require('mongoose');
m.connect(process.env.MONGODB_URI).then(async()=>{
  const r=await m.connection.db.collection('submittedreports').deleteMany({phone:{\$in:['0800000000','0800000001','0800000002','0800000003']}});
  console.log('deleted:',r.deletedCount);
  await m.disconnect();
});
"
```

Expected: `deleted: 2` หรือมากกว่า (คำขอที่ถูกปฏิเสธด้วย 400 ไม่ได้ถูกบันทึก จึงนับเฉพาะที่สำเร็จ)
ถ้า `dotenv` ไม่มีให้ใช้ ให้เปิด MongoDB Compass แล้วลบเอกสารที่ `phone` ขึ้นต้นด้วย `08000000` ด้วยมือแทน

- [ ] **Step 5.10: Commit**

```bash
git add pages/api/submittedreports/submit-report.js
git commit -m "feat: validate and sanitize patientName server-side

Client validation is bypassable, so the API re-checks the requirement,
strips control characters, caps the length, and drops the raw value from
the spread so only the sanitized string is persisted."
```

---

### Task 6: แสดงชื่อผู้ป่วยในหน้ารายละเอียดเจ้าหน้าที่

**Files:**
- Modify: `components/CardModalDetail.js:188-195`

- [ ] **Step 6.1: เพิ่มบล็อกแสดงผล**

ในไฟล์ `components/CardModalDetail.js` แทรกบล็อกนี้ **ก่อน** `<div>` เปล่าที่บรรทัด 188 ซึ่งเป็นตัวเปิดของส่วน "รายละเอียด" (บรรทัดถัดไปคือ `<div className="font-semibold mb-1">{t.complaint.detail}</div>`):

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

ใช้ `{modalData.patientName && ...}` เพื่อไม่ให้เรื่องเก่าที่ไม่มี field นี้แสดงกล่องเปล่า

- [ ] **Step 6.2: ตรวจ lint และ build**

Run:

```bash
npx eslint components/CardModalDetail.js && npm run build
```

Expected: eslint เงียบ และ build จบด้วย `✓ Compiled successfully`

- [ ] **Step 6.3: ตรวจในเบราว์เซอร์**

ส่งเรื่องจริงหนึ่งรายการผ่านฟอร์ม (หมวดสวัสดิการสังคม + "ขอรถรับ-ส่งไปโรงพยาบาล" + ชื่อผู้ป่วย "นางสมศรี ใจดี") แล้วเปิดหน้ารายการร้องเรียนและกดเข้าไปดูรายละเอียด

Expected:
- เห็นหัวข้อ "ผู้ป่วย" พร้อมค่า "นางสมศรี ใจดี" อยู่เหนือส่วน "รายละเอียด"
- เปิดเรื่องเก่าที่ส่งก่อนฟีเจอร์นี้ → **ไม่มี** หัวข้อ "ผู้ป่วย" และไม่มีกล่องเปล่า
- สลับภาษาเป็น EN → หัวข้อเปลี่ยนเป็น "Patient"

- [ ] **Step 6.4: Commit**

```bash
git add components/CardModalDetail.js
git commit -m "feat: show patient name in the officer detail view"
```

---

### Task 7: ตรวจสอบรวมทั้งระบบ

**Files:** ไม่มีการแก้ไฟล์ — เป็นการตรวจก่อนถือว่างานเสร็จ

- [ ] **Step 7.1: ตรวจ static ทั้งโปรเจกต์**

Run:

```bash
npm run build && npm run lint
```

Expected: build จบด้วย `✓ Compiled successfully` และ lint ไม่มี error
**ห้ามข้ามขั้นนี้** และห้ามอ้างว่างานเสร็จถ้ายังไม่เห็นผลลัพธ์นี้กับตา

- [ ] **Step 7.2: Regression — daily limit ยังทำงาน**

เปิด `http://localhost:3000` → หมวดสวัสดิการสังคม

Expected:
- chip "ขอรถรับ-ส่งไปโรงพยาบาล" มี badge `x/3` สีเขียว และข้อความ "เหลืออีก x ครั้งวันนี้"
- ถ้าวันนี้ครบ 3 แล้ว: badge เป็น "เต็ม" สีแดง chip เป็นสีเทากดไม่ได้ และกดแล้วขึ้น Swal "ครบจำนวนวันนี้แล้ว"

- [ ] **Step 7.3: Regression — เรื่องหมวดอื่นไม่กระทบ**

ส่งเรื่องจริงหนึ่งรายการในหมวด **ถนน** ผ่านฟอร์ม

Expected:
- ไม่มีกล่อง "ข้อมูลผู้ป่วย" ปรากฏเลย
- ส่งสำเร็จ ได้เลขที่เรื่องกลับมา
- Console log `📤 Payload ส่งไป backend:` ไม่มี key `patientName`
- เปิดรายละเอียดเรื่องนั้น → ไม่มีหัวข้อ "ผู้ป่วย"

- [ ] **Step 7.4: ตรวจสอบเอกสารใน MongoDB**

Run:

```bash
node -e "
require('dotenv').config({path:'.env.local'});
const m=require('mongoose');
m.connect(process.env.MONGODB_URI).then(async()=>{
  const c=m.connection.db.collection('submittedreports');
  const withPatient=await c.countDocuments({patientName:{\$exists:true}});
  const emptyPatient=await c.countDocuments({patientName:''});
  console.log('มี patientName:',withPatient,'| เป็นสตริงว่าง:',emptyPatient);
  await m.disconnect();
});
"
```

Expected: `เป็นสตริงว่าง: 0` — ถ้ามากกว่า 0 แปลว่ามี `default: ''` หลงเหลือใน schema หรือ frontend ส่ง `patientName: ''` มาโดยไม่มีเงื่อนไข

- [ ] **Step 7.5: ตรวจสองภาษา**

สลับภาษาเป็น EN แล้วเปิดฟอร์มหมวดสวัสดิการสังคม กด chip "Hospital Transport Request"

Expected: เห็น "Patient Information", "The reporter is the patient", "Patient full name" และ placeholder "e.g. Somsri Jaidee" — ไม่มีคำว่า `undefined` และไม่มีคีย์ดิบแบบ `form.patient.name` โผล่มา

- [ ] **Step 7.6: ลบข้อมูลทดสอบและตรวจสถานะ git**

ลบเรื่องทดสอบที่สร้างใน Task 6 และ 7 ออกจาก MongoDB (ผ่าน Compass หรือสคริปต์แบบ Step 5.9 โดยเปลี่ยนเงื่อนไขเป็นเบอร์/ชื่อที่ใช้ทดสอบ)

Run:

```bash
git status --short && git log --oneline -6
```

Expected: `git status` ว่าง (ไม่มีไฟล์ค้าง) และเห็น commit 6 รายการจาก Task 1–6

---

## สรุปสิ่งที่ต้องไม่เปลี่ยนหลังทำเสร็จ

ตรวจสามข้อนี้อีกครั้งก่อนถือว่าจบ — สเปกให้สัญญากับผู้ใช้ไว้ว่าการแจ้งเรื่องปกติจะไม่กระทบ:

1. เอกสาร MongoDB ของเรื่องหมวดอื่น **ไม่มี** field `patientName`
2. webhook payload ที่ส่งไป n8n สำหรับเรื่องหมวดอื่น **ไม่มี** key `patientName`
3. daily limit ของ "ขอรถรับ-ส่งไปโรงพยาบาล" ยังเป็น 3 ครั้ง/วัน และ badge/429 ยังทำงาน

ข้อยกเว้นเดียวที่เปลี่ยนพฤติกรรมของเรื่องปกติโดยตั้งใจคือ `handleClearForm` ที่ตอนนี้เคลียร์เลขบัตรประชาชนด้วย (แก้บั๊กเดิม ผู้ใช้อนุมัติแล้ว)
