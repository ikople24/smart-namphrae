# Design: พิมพ์คำร้องเป็น PDF (สำหรับเจ้าหน้าที่)

**Date:** 2026-10-01
**Status:** Approved

---

## Summary

เพิ่มปุ่ม "พิมพ์ PDF" ใน `CardModalDetail.js` (หน้าดูรายละเอียดคำร้อง) ให้เจ้าหน้าที่กดแล้วได้ไฟล์ `.pdf` ดาวน์โหลดทันที 1 ไฟล์ต่อ 1 คำร้อง ใช้สำหรับเก็บเข้าแฟ้มคดีภายในและให้เจ้าหน้าที่/ผู้บังคับบัญชาลงชื่อรับทราบ

เอกสาร 1 หน้า A4 ประกอบด้วย: เลขที่คำร้อง, วันที่, ข้อมูลผู้แจ้ง (ชื่อ/เบอร์โทร/เลขบัตร/ชุมชน), ปัญหา/หมวดหมู่/รายละเอียด, รูปภาพประกอบ (สูงสุด 4 รูป), แผนที่พิกัดแบบพอสังเขป, และช่องลงชื่อ 2 ช่อง (ผู้พิมพ์/รับเรื่อง + ผู้บังคับบัญชา)

**ขอบเขต:** พิมพ์ได้ครั้งละ 1 ใบ จากปุ่มในหน้ารายละเอียดที่มีอยู่แล้ว ไม่รวมการพิมพ์แบบ batch, ไม่รวมข้อมูลการมอบหมาย/แนวทางแก้ไข (CardOfficail/CardAssignment), ไม่ใช่เอกสารสำหรับส่งให้ประชาชนหรือหน่วยงานภายนอก

---

## Design Decisions

| ประเด็น | ตัดสินใจ | เหตุผล |
|---|---|---|
| วิธีสร้าง PDF | `@react-pdf/renderer` ฝั่ง client, ดาวน์โหลดทันทีเมื่อกด | ได้ตัวหนังสือจริง (เลือก/ค้นหาได้, ไฟล์เล็ก) ไม่ใช่ screenshot ที่พังง่ายเวลามีแผนที่ (CORS) และไม่ต้องเพิ่ม dependency หนักแบบ Puppeteer ซึ่งเกินความจำเป็นสำหรับพิมพ์ทีละใบ |
| ปุ่มอยู่ที่ไหน | ไอคอน `ReceiptText` ที่มีอยู่แล้วใน `CardModalDetail.js` (ปัจจุบันไม่มี `onClick`) | มีอยู่แล้วในตำแหน่งที่เหมาะสม ไม่ต้องเพิ่ม UI ใหม่ |
| ใครเห็นปุ่มนี้ | role `"admin"` หรือ `"superadmin"` เท่านั้น (ไม่ใช้ `isAdmin` เดิมที่เช็กแค่ `"admin"`) | `CardModalDetail` ใช้ร่วมกับหน้าประชาชน (`/status`, `/complaint/...`) ต้องกันไม่ให้ประชาชนเห็นปุ่มพิมพ์ และต้องครอบคลุมเจ้าหน้าที่ทั้ง 2 ระดับ ตาม pattern ที่ใช้จริงใน `protected-image.js` และ `CardCompleted.js` |
| Layout | ข้อมูลผู้แจ้ง (ซ้าย) + แผนที่ (ขวา) ระดับเดียวกัน, รูปภาพเป็นแถวด้านล่าง, ช่องลงชื่อปิดท้าย | เห็นข้อมูลกับตำแหน่งพร้อมกันในสายตาเดียว เหมาะกับงานภาคสนาม ตามที่ย้ำว่าแผนที่ต้องชัดและสำคัญ |
| แหล่งแผนที่ | ดึง OSM raster tile 1 รูปตรงๆ (ไม่ผ่าน static-map API ภายนอก) + คำนวณพิกัดพินเองด้วยสูตร slippy-map | โปรเจกต์นี้ไม่มี map API key ใดๆ อยู่แล้ว (ไม่มี Google Maps/Mapbox) การใช้ OSM tile ตรงๆ ไม่ต้องขอ key ใหม่ไม่มีค่าใช้จ่าย ตรงกับ "แผนที่พอสังเขป" ที่ขอ |
| ฟอนต์ | ฝัง `Sarabun` (เทียบเท่า TH Sarabun New ที่ราชการไทยใช้) เป็น `.ttf` แล้ว `Font.register` | `react-pdf` ไม่มีฟอนต์ไทยในตัว ฟอนต์ default แสดงภาษาไทยไม่ได้เลย |
| รูปภาพประกอบ | แสดงสูงสุด 4 รูป (grid 2x2) | ต้องอัดทุกอย่างในหน้าเดียวตามที่ขอ รูปที่เหลือไม่แสดง |
| ไม่มีพิกัด | โชว์กล่อง "ไม่มีข้อมูลพิกัด" แทนแผนที่ | คำร้องเก่าบางรายการอาจไม่มี `location.lat/lng` ไม่ควรทำให้สร้าง PDF ล้มทั้งไฟล์ |
| ดึงแผนที่/รูปไม่สำเร็จ | แจ้งเตือนด้วย `sweetalert2` (มีอยู่แล้วในโปรเจกต์) ให้ลองใหม่ | คงรูปแบบการแจ้งเตือนเดิมของโปรเจกต์ ไม่เพิ่ม dependency ใหม่ |
| ข้อมูลมอบหมาย/แนวทางแก้ไข | ไม่รวมใน PDF | ผู้ใช้เลือกเฉพาะ "ข้อมูลผู้แจ้ง + รูปภาพ" ตอนถามขอบเขต ไม่ได้เลือกข้อมูลเจ้าหน้าที่ผู้รับผิดชอบ |

---

## 1. ปุ่มพิมพ์ใน `CardModalDetail.js`

ปัจจุบัน (บรรทัด ~146-148):

```jsx
<button className="ml-auto text-gray-500 hover:text-gray-700">
  <ReceiptText size={18} />
</button>
```

แก้เป็น gate ตาม role ของเจ้าหน้าที่ (ไม่ใช่ `isAdmin` เดิม):

```jsx
const isStaff = user?.publicMetadata?.role === "admin" || user?.publicMetadata?.role === "superadmin";
```

```jsx
{isStaff && (
  <button
    className="ml-auto text-gray-500 hover:text-gray-700"
    onClick={() => handlePrintPdf(modalData)}
    disabled={isGeneratingPdf}
  >
    <ReceiptText size={18} />
  </button>
)}
```

`handlePrintPdf`:
1. เตรียมข้อมูลแผนที่ด้วย `lib/osmStaticTile.js` (ถ้ามีพิกัด)
2. สร้าง PDF ด้วย `pdf(<ComplaintPdfDocument complaint={modalData} mapTile={mapTile} />).toBlob()`
3. trigger ดาวน์โหลดไฟล์ชื่อ `${modalData.complaintId}.pdf` ผ่าน `URL.createObjectURL`
4. ครอบด้วย try/catch — ถ้า error ให้เรียก `Swal.fire({ icon: 'error', ... })`

`react-pdf`'s `pdf()` + `Image`/`Font` ทำงานได้ทั้งฝั่ง browser จึงไม่ต้องมี API route ใหม่

---

## 2. `lib/osmStaticTile.js` (ไฟล์ใหม่)

แปลง lat/lng → URL ของ OSM tile เดียว + ตำแหน่งพิน (เป็นสัดส่วน 0-1 ภายใน tile นั้น) ด้วยสูตร Web Mercator มาตรฐาน:

```js
const TILE_SIZE = 256;
const ZOOM = 16;

export function getStaticMapTile(lat, lng, zoom = ZOOM) {
  const latRad = (lat * Math.PI) / 180;
  const n = 2 ** zoom;

  const xTileFloat = ((lng + 180) / 360) * n;
  const yTileFloat =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

  const xTile = Math.floor(xTileFloat);
  const yTile = Math.floor(yTileFloat);

  return {
    tileUrl: `https://tile.openstreetmap.org/${zoom}/${xTile}/${yTile}.png`,
    pinXRatio: xTileFloat - xTile, // 0..1 ตำแหน่งแนวนอนภายใน tile
    pinYRatio: yTileFloat - yTile, // 0..1 ตำแหน่งแนวตั้งภายใน tile
  };
}
```

ใน `ComplaintPdfDocument.js` วาง `<Image>` ของ tile แล้ว overlay พิน (วงกลมแดงเล็กๆ) ด้วย `View` ที่ `position: 'absolute'` คำนวณ `left`/`top` จาก `pinXRatio * tileWidthPx` และใต้แผนที่ใส่ข้อความเครดิตเล็กๆ "© OpenStreetMap contributors" ตามข้อกำหนดการใช้งานฟรีของ OSM

ถ้าคำร้องไม่มี `location.lat`/`location.lng` → ข้ามการเรียกฟังก์ชันนี้ไปเลย และ render กล่อง placeholder "ไม่มีข้อมูลพิกัด" แทน

---

## 3. `components/pdf/ComplaintPdfDocument.js` (ไฟล์ใหม่)

React component ที่ export `<Document>` ของ `@react-pdf/renderer` ขนาด A4:

- **Header**: ชื่อหน่วยงาน + "แบบรายงานคำร้อง" + เลขที่คำร้อง + วันที่ (ขวาบน)
- **แถวข้อมูล/แผนที่** (`flexDirection: 'row'`): ซ้าย = ชื่อ-สกุล, เบอร์โทร, เลขบัตรประชาชน, ชุมชน, ปัญหา/หมวดหมู่, รายละเอียด — ขวา = แผนที่ (tile + พิน) หรือกล่อง placeholder
- **รูปภาพประกอบ**: grid 2x2 สูงสุด 4 รูป จาก `complaint.images` (เป็น Cloudinary URL อยู่แล้ว, fetch ตรงได้เหมือนรูปอื่นในระบบ)
- **ช่องลงชื่อ**: แถวล่างสุด 2 กล่องเท่ากัน "ผู้พิมพ์/รับเรื่อง" และ "ผู้บังคับบัญชา" แต่ละกล่องมีเส้นประสำหรับเซ็น + ช่องวันที่

ลงทะเบียนฟอนต์ที่ไฟล์นี้ (หรือไฟล์ตั้งค่า font กลาง):

```js
import { Font } from '@react-pdf/renderer';

Font.register({
  family: 'Sarabun',
  fonts: [
    { src: '/fonts/Sarabun-Regular.ttf' },
    { src: '/fonts/Sarabun-Bold.ttf', fontWeight: 'bold' },
  ],
});
```

ทุก `<Text>`/style ในเอกสารต้องกำหนด `fontFamily: 'Sarabun'` (ค่า default ของ react-pdf ไม่รองรับภาษาไทย)

---

## 4. ไฟล์ที่แก้/เพิ่มทั้งหมด

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `components/CardModalDetail.js` | wire ปุ่ม `ReceiptText` ให้เรียก `handlePrintPdf`, เพิ่ม role check staff |
| `components/pdf/ComplaintPdfDocument.js` | **ใหม่** — นิยามหน้า PDF |
| `lib/osmStaticTile.js` | **ใหม่** — คำนวณ tile URL + ตำแหน่งพิน |
| `public/fonts/Sarabun-Regular.ttf`, `public/fonts/Sarabun-Bold.ttf` | **ใหม่** — ไฟล์ฟอนต์ (จาก Google Fonts, license OFL เปิดใช้ได้ฟรี) |
| `package.json` | เพิ่ม dependency `@react-pdf/renderer` |

---

## 5. การตรวจสอบ (ไม่มี test framework ในโปรเจกต์นี้)

ทดสอบด้วยมือผ่าน dev server: เปิดหน้า admin ด้วยบัญชี role `admin` และ `superadmin`, เปิดคำร้องที่มีพิกัดและไม่มีพิกัด, คำร้องที่มีรูปภาพ 0/1/4/มากกว่า 4 รูป, กดปุ่มพิมพ์แล้วตรวจว่า:
- ไฟล์ดาวน์โหลดชื่อตรงกับเลขคำร้อง
- ข้อความภาษาไทยแสดงถูกต้อง (ไม่ใช่กล่องเปล่า)
- แผนที่มีพินตรงตำแหน่งจริง (เทียบกับ Google Maps link ที่มีอยู่แล้วใน dropdown ของ manage-complaints)
- ผู้ใช้ role `"user"` ไม่เห็นปุ่มนี้เลย
