# การแก้ไขปัญหาการเบลอภาพในหน้า /complaint

## ปัญหาที่พบ
- ในหน้า `/complaint` มีการเบลอภาพสำหรับหมวดหมู่ "สวัสดิการสังคม" 
- แต่เมื่อกดเปิดรูปใน modal preview กลับแสดงภาพจริงโดยไม่เบลอ
- ปัญหานี้เกิดขึ้นในหลาย component

## การแก้ไข

### 1. CardModalDetail.js
**ปัญหา:** Modal preview ภาพใหญ่ไม่เบลอภาพ
**แก้ไข:** เพิ่มเงื่อนไขการเบลอใน modal preview
```javascript
className={`object-contain rounded-lg shadow-lg ${!isAdmin && modalData.blurImage ? "blur-sm" : ""}`}
```

### 2. pages/complaint/index.jsx
**ปัญหา:** Modal preview ภาพใหญ่ในหน้าหลักไม่เบลอภาพ เพราะใช้ modalData?.category ที่อาจยังไม่ถูกตั้งค่า
**แก้ไข:** เพิ่ม state previewImgCategory และใช้ในการเบลอภาพ
```javascript
// เพิ่ม state
const [previewImgCategory, setPreviewImgCategory] = useState(null);

// เมื่อคลิกภาพ
onClick={e => { 
  e.stopPropagation(); 
  setPreviewImg(item.images[0]); 
  setPreviewImgCategory(item.category); 
}}

// ใน modal preview
className={`max-w-full max-h-full rounded-lg shadow-lg ${
  previewImgCategory === "สวัสดิการสังคม" && 
  (user?.publicMetadata?.role !== "admin" && user?.publicMetadata?.role !== "superadmin") 
    ? "blur-sm" 
    : ""
}`}
```

### 3. CardCompleted.js
**ปัญหา:** Modal preview ภาพเปรียบเทียบไม่เบลอภาพ และเกิด ReferenceError: shouldBlur is not defined
**แก้ไข:** เพิ่มเงื่อนไขการเบลอใน modal preview และแก้ไขปัญหา scope ของตัวแปร
```javascript
<div className={title === "สวัสดิการสังคม" && userRole !== "admin" && userRole !== "superadmin" ? "blur-sm" : ""}>
  <ReactCompareImage ... />
</div>
```

## ผลลัพธ์
- ภาพในหมวดหมู่ "สวัสดิการสังคม" จะถูกเบลอทั้งในหน้าหลักและ modal preview
- Admin และ Superadmin จะเห็นภาพจริงโดยไม่เบลอ
- ผู้ใช้ทั่วไปจะเห็นภาพเบลอในทุกที่

## การทดสอบ
1. เข้าไปที่หน้า `/complaint`
2. หาเรื่องร้องเรียนในหมวดหมู่ "สวัสดิการสังคม"
3. กดเปิดรูปภาพ
4. ตรวจสอบว่าภาพถูกเบลอใน modal preview
5. ลองเข้าสู่ระบบเป็น admin และตรวจสอบว่าภาพไม่เบลอ
