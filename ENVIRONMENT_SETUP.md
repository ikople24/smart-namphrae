# Environment Variables Setup

## Required Environment Variables

สร้างไฟล์ `.env.local` ในโฟลเดอร์ root ของโปรเจค และเพิ่ม environment variables ต่อไปนี้:

### Database
```env
MONGO_URI=mongodb://your-mongodb-connection-string
```

### Cloudinary (สำหรับการอัปโหลดรูปภาพ)
```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-upload-preset
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### App Configuration
```env
NEXT_PUBLIC_APP_ID=your-app-id
```

### Clerk (สำหรับ Authentication)
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
CLERK_SECRET_KEY=your-clerk-secret-key
```

## การตั้งค่า Cloudinary

1. สร้างบัญชี Cloudinary
2. ไปที่ Dashboard > Settings > Upload
3. สร้าง Upload Preset ใหม่
4. ตั้งค่า Signing Mode เป็น "Unsigned"
5. เปิดใช้งาน "Folder" และตั้งชื่อ folder
6. คัดลอก Cloud Name และ Upload Preset มาใส่ใน environment variables

## การตั้งค่า MongoDB

1. สร้าง MongoDB Atlas cluster หรือใช้ MongoDB local
2. คัดลอก connection string มาใส่ใน MONGO_URI
3. ตรวจสอบให้แน่ใจว่า database มี collection "counters" สำหรับ generate complaint ID

## การตั้งค่า n8n Webhook

1. ตรวจสอบ URL ของ n8n webhook ในไฟล์ `pages/api/submittedreports/submit-report.js`
2. ปัจจุบันใช้: `https://primary-production-a1769.up.railway.app/webhook/submit-namphare`
3. หาก URL เปลี่ยน ให้อัปเดตในไฟล์ดังกล่าว

## การทดสอบ

หลังจากตั้งค่า environment variables แล้ว:

1. รัน `npm run dev`
2. เปิด browser ไปที่ `http://localhost:3000`
3. ทดสอบการส่ง complaint form
4. ตรวจสอบ console logs เพื่อดูการทำงานของระบบ

## Troubleshooting

### ปัญหาการอัปโหลดรูปภาพ
- ตรวจสอบ Cloudinary credentials
- ตรวจสอบ Upload Preset settings
- ดู console logs สำหรับ error messages

### ปัญหาการส่งข้อมูลไป n8n
- ตรวจสอบ n8n webhook URL
- ตรวจสอบ network connectivity
- ดู server logs สำหรับ webhook errors

### ปัญหาการเชื่อมต่อ Database
- ตรวจสอบ MONGO_URI
- ตรวจสอบ MongoDB connection
- ดู server logs สำหรับ database errors 