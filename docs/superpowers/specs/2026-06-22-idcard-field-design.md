# Design: เพิ่มฟิลด์เลขบัตรประชาชน 13 หลัก

**Date:** 2026-06-22
**File:** `pages/admin/register-user.jsx`
**Status:** Approved

---

## Summary

เพิ่ม input สำหรับเลขบัตรประชาชน 13 หลัก (optional) ต่อจากฟิลด์เบอร์โทรในหน้า register-user โดยใช้รูปแบบ 13 ช่องแยก เหมือน phone field ที่มีอยู่

---

## Form State

เพิ่ม `idCard: ""` ใน form state ทุกจุดที่มี reset:
- initial state (บรรทัด 36–44)
- `handleCancelEdit` (บรรทัด 198–206)
- หลัง submit สำเร็จ (บรรทัด 368)
- `setForm` ตอน load existingUser สำหรับ edit mode (บรรทัด 164–172)

---

## Validation (Zod)

เพิ่มใน `userRegistrationSchema`:

```js
idCard: z.string().refine(
  (val) => val === "" || val.length === 13,
  "เลขบัตรประชาชนต้องมี 13 หลัก"
).optional()
```

- ไม่กรอกเลย (string ว่าง) → ผ่าน
- กรอกไม่ครบ 13 หลัก → error "เลขบัตรประชาชนต้องมี 13 หลัก"
- กรอกครบ 13 หลัก → ผ่าน

---

## UI — Edit/Create Form

วางต่อจาก `div.form-control` เบอร์โทร (หลังบรรทัด 706)

```jsx
const idCardGroups = [1, 4, 5, 2, 1]
const idCardSeparators = idCardGroups
  .slice(0, -1)
  .reduce((acc, val) => [...acc, (acc[acc.length - 1] ?? -1) + val], [])
// → [0, 4, 9, 11]
```

- Label: `เลขบัตรประชาชน` + badge `ไม่บังคับ` (text-xs text-gray-400)
- 13 ช่องแยก รูปแบบ X-XXXX-XXXXX-XX-X
- Separator `-` ที่ index 0, 4, 9, 11 (คำนวณจาก idCardSeparators)
- `idCardRefs = useRef([])` แยกจาก `phoneRefs`
- Auto-focus ถัดไปเมื่อกรอก (เหมือน phone)
- Disabled เมื่อ `isSubmitting`

---

## UI — Read-only View (existingUser)

เพิ่มต่อจาก div เบอร์โทร (บรรทัด 548–558):

```jsx
<div className="form-control">
  <label className="label">
    <span className="label-text">เลขบัตรประชาชน</span>
  </label>
  <input
    type="text"
    value={existingUser.idCard || "ไม่ได้ระบุ"}
    readOnly
    className="input input-bordered w-full bg-gray-100"
  />
</div>
```

---

## Separator Logic

รูปแบบบัตรประชาชนไทย: X-XXXX-XXXXX-XX-X (1-4-5-2-1)

| Group | หลัก | Separator หลัง index |
|-------|------|----------------------|
| 1     | 1    | 0                    |
| 2     | 4    | 4                    |
| 3     | 5    | 9                    |
| 4     | 2    | 11                   |
| 5     | 1    | (ไม่มี)              |

---

## Security — ห้ามข้อมูลบัตรรั่วหน้าเว็บสาธารณะ

`CardOfficail.js` เป็น public component ที่เรียก `/api/users/get-all-user` ซึ่ง backend อาจคืน `idCard` และ `phone` มาด้วย ต้องกรอง sensitive fields ออกก่อน return ถึง client:

**แก้ `pages/api/users/get-all-user.js`:**
```js
const safeUsers = (data.users || data).map(({ idCard, phone, clerkId, ...safe }) => safe)
return res.status(response.status).json(safeUsers)
```

**`pages/api/users/get-all-users-local.js`:**
- Schema ปัจจุบันไม่มี `idCard` — ไม่ต้องเพิ่ม field นี้ใน schema นี้

**`pages/api/users/get-by-clerkId.js`:**
- ใช้เฉพาะ admin pages (register-user, manage-complaints) — ไม่ต้อง strip

---

## Scope

- `pages/admin/register-user.jsx` — เพิ่มฟิลด์ idCard
- `pages/api/users/get-all-user.js` — strip idCard + phone ก่อน return
- ไม่ต้อง refactor phone field
