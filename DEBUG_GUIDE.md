# Debug Guide - การแก้ไขปัญหาการส่ง ComplaintForm

## การตรวจสอบ Logs

### 1. Browser Console Logs
เปิด Developer Tools (F12) และดูที่ Console tab เพื่อตรวจสอบ:

```
📤 Payload ส่งไป backend: { ... }
📡 Response status: 200
✅ Successfully submitted with complaintId: CMP-000001
```

### 2. Server Logs
ตรวจสอบ server logs ใน terminal ที่รัน `npm run dev`:

```
📥 Incoming body: { ... }
🆔 Generated complaintId: CMP-000001
💾 Saved to database: 507f1f77bcf86cd799439011
🚀 Sending to n8n webhook...
📡 n8n webhook response status: 200
✅ n8n webhook success: { ... }
```

### 3. Health Check
เรียก API endpoint เพื่อตรวจสอบสถานะระบบ:

```bash
curl http://localhost:3000/api/health-check
```

## ปัญหาที่พบบ่อยและวิธีแก้ไข

### 1. ปัญหาการส่งข้อมูลไป n8n

**อาการ:**
- ข้อมูลบันทึกใน database แล้ว แต่ไม่ส่งไป n8n
- Error ใน server logs: "🚨 Webhook failed"

**วิธีแก้ไข:**
1. ตรวจสอบ n8n webhook URL ใน `pages/api/submittedreports/submit-report.js`
2. ตรวจสอบ network connectivity
3. ตรวจสอบ n8n workflow ว่าทำงานอยู่หรือไม่

### 2. ปัญหาการอัปโหลดรูปภาพ

**อาการ:**
- รูปภาพอัปโหลดไม่สำเร็จ
- Error: "Cloudinary configuration missing"

**วิธีแก้ไข:**
1. ตรวจสอบ environment variables:
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
   - `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
2. ตรวจสอบ Cloudinary Upload Preset settings
3. ตรวจสอบ file size และ format

### 3. ปัญหาการ Validate ข้อมูล

**อาการ:**
- ฟอร์มไม่ส่งข้อมูลแม้กรอกครบแล้ว
- Error: "กรุณาตรวจสอบข้อมูล"

**วิธีแก้ไข:**
1. ตรวจสอบการกรอกข้อมูลให้ครบถ้วน
2. ตรวจสอบ format เบอร์โทรศัพท์ (10 หลัก)
3. ตรวจสอบการเลือกตำแหน่ง
4. ตรวจสอบการอัปโหลดรูปภาพ

### 4. ปัญหาการเชื่อมต่อ Database

**อาการ:**
- Error: "Server error"
- ไม่สามารถบันทึกข้อมูลได้

**วิธีแก้ไข:**
1. ตรวจสอบ `MONGO_URI` ใน environment variables
2. ตรวจสอบ MongoDB connection
3. ตรวจสอบ network connectivity

## การทดสอบระบบ

### 1. ทดสอบการส่งข้อมูล
```javascript
// ข้อมูลทดสอบ
const testPayload = {
  fullName: "ทดสอบ ระบบ",
  phone: "0812345678",
  community: "บ้านบ่อ",
  problems: ["ถนนเสียหาย"],
  category: "ถนน",
  images: ["https://example.com/test.jpg"],
  detail: "ทดสอบระบบ",
  location: { lat: 18.7883, lng: 98.9853 },
  status: "อยู่ระหว่างดำเนินการ",
  officer: "",
  updatedAt: new Date(),
};
```

### 2. ทดสอบ API Endpoints
```bash
# ทดสอบ health check
curl http://localhost:3000/api/health-check

# ทดสอบ submit report
curl -X POST http://localhost:3000/api/submittedreports/submit-report \
  -H "Content-Type: application/json" \
  -H "x-app-id: app_a" \
  -d '{"fullName":"ทดสอบ","phone":"0812345678","community":"บ้านบ่อ","problems":["ถนนเสียหาย"],"category":"ถนน","images":[],"detail":"ทดสอบ","location":{"lat":18.7883,"lng":98.9853}}'
```

## การตรวจสอบ Environment Variables

สร้างไฟล์ `.env.local` และตรวจสอบ:

```env
# Database
MONGO_URI=mongodb://your-connection-string

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-upload-preset
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# App
NEXT_PUBLIC_APP_ID=your-app-id
```

## การตรวจสอบ n8n Webhook

1. ตรวจสอบ URL: `https://primary-production-a1769.up.railway.app/webhook/submit-namphare`
2. ทดสอบส่งข้อมูลไปยัง webhook โดยตรง
3. ตรวจสอบ n8n workflow logs
4. ตรวจสอบ response จาก n8n

## การแก้ไขปัญหาแบบ Real-time

1. เปิด Developer Tools
2. ไปที่ Network tab
3. ส่งข้อมูลผ่านฟอร์ม
4. ตรวจสอบ request/response ของ API calls
5. ดู error messages และ status codes 