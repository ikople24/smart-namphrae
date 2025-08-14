# การแก้ไข ESLint Errors และ Warnings

## ปัญหาที่พบ

### 1. Unused Variables (TypeScript ESLint)
- `./pages/api/complaints/index.js:16:14` - `'err' is defined but never used`
- `./components/EditUserModal.js:60:14` - `'error' is defined but never used`
- `./components/EditUserModal.js:99:14` - `'error' is defined but never used`
- `./components/EditUserModal.js:146:14` - `'error' is defined but never used`
- `./components/EditUserModal.js:176:14` - `'error' is defined but never used`
- `./components/EditUserModal.js:201:14` - `'error' is defined but never used`

### 2. Next.js Image Optimization Warnings
- `./components/EditUserModal.js:469:26` - Using `<img>` instead of `<Image />`
- `./components/ImageModal.js:24:13` - Using `<img>` instead of `<Image />`

## การแก้ไข

### 1. แก้ไข Unused Variables

#### pages/api/complaints/index.js
```javascript
// ก่อน
} catch (err) {
  return res.status(500).json({ success: false, error: 'Failed to fetch complaints' });
}

// หลัง
} catch (error) {
  console.error('Error fetching complaints:', error);
  return res.status(500).json({ success: false, error: 'Failed to fetch complaints' });
}
```

#### components/EditUserModal.js
เพิ่ม `console.error()` ในทุก catch blocks:
```javascript
} catch (error) {
  console.error('Error saving location:', error);
  alert('เกิดข้อผิดพลาดในการบันทึกพิกัด');
}
```

### 2. แก้ไข Next.js Image Optimization

#### components/ImageModal.js
```javascript
// เพิ่ม import
import Image from 'next/image';

// แทนที่ <img> ด้วย <Image>
<Image
  src={imageUrl}
  alt={title || "ภาพปัญหา"}
  width={800}
  height={600}
  sizes="(max-width: 768px) 100vw, 800px"
  className="max-w-full max-h-[70vh] object-contain"
  onError={(e) => {
    e.target.src = '/default-icon.png';
    e.target.alt = 'ไม่สามารถโหลดภาพได้';
  }}
/>
```

#### components/EditUserModal.js
```javascript
// เพิ่ม import
import Image from "next/image";

// แทนที่ <img> ด้วย <Image>
<Image
  src={image}
  alt={`ภาพปัญหา ${index + 1}`}
  width={200}
  height={128}
  sizes="(max-width: 768px) 50vw, 200px"
  className="w-full h-32 object-cover rounded-md border cursor-pointer hover:opacity-80 transition-opacity"
  onClick={() => {
    setSelectedImage(image);
    setShowImageModal(true);
  }}
/>
```

## ผลลัพธ์

✅ **ESLint Errors ทั้งหมดได้รับการแก้ไข:**
- ไม่มี unused variables อีกต่อไป
- ทุก error variables ถูกใช้ใน console.error() เพื่อ logging

✅ **Next.js Image Optimization Warnings ได้รับการแก้ไข:**
- ใช้ `<Image />` component แทน `<img>` tag
- เพิ่ม width, height, และ sizes props ตามที่ Next.js ต้องการ
- ภาพจะได้รับการ optimize โดยอัตโนมัติ

✅ **Performance Improvements:**
- ภาพจะถูก lazy load และ optimize โดย Next.js
- ลด bandwidth และปรับปรุง LCP (Largest Contentful Paint)
