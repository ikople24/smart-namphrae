# พิมพ์คำร้องเป็น PDF — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่มปุ่มในหน้ารายละเอียดคำร้อง (`CardModalDetail.js`) ที่เจ้าหน้าที่ (role `admin`/`superadmin`) กดแล้วดาวน์โหลดไฟล์ PDF 1 หน้า ของคำร้องนั้นได้ทันที

**Architecture:** ใช้ `@react-pdf/renderer` render PDF ฝั่ง browser ตรงจาก React component (`components/pdf/ComplaintPdfDocument.js`) ไม่ผ่านการ screenshot แผนที่พิกัดดึงจาก OpenStreetMap tile เดียวตรงๆ (ไม่ใช้ API key) โดยคำนวณตำแหน่งพิน (pin) ด้วยสูตร slippy-map tile ที่อยู่ใน `lib/osmStaticTile.js` (pure function, มี unit test)

**Tech Stack:** Next.js (Pages Router), React 19, `@react-pdf/renderer`, ฟอนต์ Sarabun (.ttf), `sweetalert2` (มีอยู่แล้ว), Node's built-in `node --test` สำหรับ unit test ของ pure function (โปรเจกต์นี้ไม่มี jest/vitest)

**สเปกอ้างอิง:** `docs/superpowers/specs/2026-10-01-complaint-pdf-print-design.md`

---

## Task 1: เพิ่ม dependency `@react-pdf/renderer`

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: ติดตั้ง dependency**

Run: `npm install @react-pdf/renderer@^4.9.0`

Expected: `package.json` มีบรรทัดใหม่ใน `"dependencies"`: `"@react-pdf/renderer": "^4.9.0"` และ `package-lock.json` ถูกอัปเดต ไม่มี error

- [ ] **Step 2: ตรวจสอบว่าไม่กระทบ dependency เดิม**

Run: `git diff package.json`
Expected: มีแค่ 1 บรรทัดใหม่เพิ่มใน `dependencies`, ไม่มีบรรทัดอื่นถูกลบ/เปลี่ยน

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @react-pdf/renderer for complaint PDF export"
```

---

## Task 2: เพิ่มฟอนต์ภาษาไทย Sarabun

`@react-pdf/renderer` ไม่มีฟอนต์ที่รองรับภาษาไทยมาให้ ต้องฝังไฟล์ฟอนต์เอง ใช้ **Sarabun** (เทียบเท่า TH Sarabun New ที่ราชการไทยใช้) จาก Google Fonts repo (license OFL ใช้ได้ฟรี)

**Files:**
- Create: `public/fonts/Sarabun-Regular.ttf`
- Create: `public/fonts/Sarabun-Bold.ttf`

- [ ] **Step 1: สร้างโฟลเดอร์และดาวน์โหลดฟอนต์**

Run:
```bash
mkdir -p public/fonts
curl -fsSL -o public/fonts/Sarabun-Regular.ttf "https://github.com/google/fonts/raw/main/ofl/sarabun/Sarabun-Regular.ttf"
curl -fsSL -o public/fonts/Sarabun-Bold.ttf "https://github.com/google/fonts/raw/main/ofl/sarabun/Sarabun-Bold.ttf"
```

Expected: ทั้ง 2 คำสั่งจบโดยไม่มี error (exit code 0)

- [ ] **Step 2: ตรวจสอบไฟล์ที่ได้**

Run: `file public/fonts/*.ttf`
Expected output (ชื่อ font อาจมีรายละเอียดต่างเล็กน้อยแต่ต้องขึ้น "TrueType Font data" และ "Sarabun" ทั้งคู่):
```
public/fonts/Sarabun-Bold.ttf:    TrueType Font data, ... Sarabun ...
public/fonts/Sarabun-Regular.ttf: TrueType Font data, ... Sarabun ...
```

ถ้าไฟล์ไม่ใช่ TrueType (เช่นโดน redirect ไปหน้า HTML error) ให้ลบไฟล์แล้วรัน Step 1 ใหม่

- [ ] **Step 3: Commit**

```bash
git add public/fonts/Sarabun-Regular.ttf public/fonts/Sarabun-Bold.ttf
git commit -m "chore: add Sarabun Thai font for PDF export"
```

---

## Task 3: `lib/osmStaticTile.js` — คำนวณ OSM tile URL และตำแหน่งพิน (TDD)

ฟังก์ชัน pure function แปลง lat/lng → URL ของ OSM raster tile 1 รูป + ตำแหน่งพิน (เป็นสัดส่วน 0-1 ภายใน tile นั้น) ด้วยสูตร Web Mercator / slippy-map tile มาตรฐาน

**Files:**
- Create: `lib/osmStaticTile.js`
- Test: `lib/osmStaticTile.test.js`

- [ ] **Step 1: เขียน test ที่ fail ก่อน**

สร้างไฟล์ `lib/osmStaticTile.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getStaticMapTile } from './osmStaticTile.js';

test('lat=0, lng=0, zoom=10 -> tile กึ่งกลางพอดี (512,512) พินอยู่มุมบนซ้ายของ tile เป๊ะ', () => {
  const result = getStaticMapTile(0, 0, 10);
  assert.equal(result.tileUrl, 'https://tile.openstreetmap.org/10/512/512.png');
  assert.equal(result.pinXRatio, 0);
  assert.equal(result.pinYRatio, 0);
});

test('คำนวณ tile และตำแหน่งพินถูกต้องสำหรับพิกัดจริง (zoom=16)', () => {
  const result = getStaticMapTile(18.1458, 100.1408, 16);
  assert.equal(result.tileUrl, 'https://tile.openstreetmap.org/16/50998/29408.png');
  assert.ok(Math.abs(result.pinXRatio - 0.07630222222360317) < 1e-9);
  assert.ok(Math.abs(result.pinYRatio - 0.009918001891492167) < 1e-9);
});

test('ไม่ส่ง zoom มา -> ใช้ค่า default 16', () => {
  const result = getStaticMapTile(18.1458, 100.1408);
  assert.equal(result.tileUrl, 'https://tile.openstreetmap.org/16/50998/29408.png');
});
```

(ค่า `0.07630222222360317` และ `0.009918001891492167` คำนวณจากสูตร Web Mercator มาตรฐานตรงๆ สำหรับ lat=18.1458, lng=100.1408 ที่ zoom 16 — เป็น ground truth ของสูตร ไม่ใช่ค่าที่ได้จากการรันโค้ดที่จะเขียนใน Step 3)

- [ ] **Step 2: รัน test เพื่อยืนยันว่า fail**

Run: `node --test lib/osmStaticTile.test.js`
Expected: FAIL — `Cannot find module './osmStaticTile.js'` หรือ `getStaticMapTile is not a function`

- [ ] **Step 3: เขียน implementation**

สร้างไฟล์ `lib/osmStaticTile.js`:

```js
const DEFAULT_ZOOM = 16;

export function getStaticMapTile(lat, lng, zoom = DEFAULT_ZOOM) {
  const latRad = (lat * Math.PI) / 180;
  const n = 2 ** zoom;

  const xTileFloat = ((lng + 180) / 360) * n;
  const yTileFloat =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

  const xTile = Math.floor(xTileFloat);
  const yTile = Math.floor(yTileFloat);

  return {
    tileUrl: `https://tile.openstreetmap.org/${zoom}/${xTile}/${yTile}.png`,
    pinXRatio: xTileFloat - xTile,
    pinYRatio: yTileFloat - yTile,
  };
}
```

- [ ] **Step 4: รัน test เพื่อยืนยันว่า pass**

Run: `node --test lib/osmStaticTile.test.js`
Expected: `pass 3`, `fail 0`

- [ ] **Step 5: Commit**

```bash
git add lib/osmStaticTile.js lib/osmStaticTile.test.js
git commit -m "feat: add OSM static tile + pin position calculator"
```

---

## Task 4: `components/pdf/ComplaintPdfDocument.js` — นิยามหน้า PDF

React component ที่ export `<Document>` ของ `@react-pdf/renderer` ขนาด A4 ตาม layout ที่ตกลงกันไว้ (ข้อมูลผู้แจ้งซ้าย + แผนที่ขวา, รูปภาพแถวล่าง, ช่องลงชื่อ 2 ช่อง)

**Files:**
- Create: `components/pdf/ComplaintPdfDocument.js`

- [ ] **Step 1: สร้างไฟล์**

```jsx
import {
  Document,
  Page,
  View,
  Text,
  Image,
  Font,
  StyleSheet,
} from "@react-pdf/renderer";

Font.register({
  family: "Sarabun",
  fonts: [
    { src: "/fonts/Sarabun-Regular.ttf" },
    { src: "/fonts/Sarabun-Bold.ttf", fontWeight: "bold" },
  ],
});

const MAP_BOX_SIZE = 220;
const MAX_PHOTOS = 4;

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: "Sarabun",
    fontSize: 10,
    color: "#1f2937",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#374151",
    paddingBottom: 8,
    marginBottom: 10,
  },
  orgTitle: {
    fontSize: 14,
    fontWeight: "bold",
  },
  headerRight: {
    textAlign: "right",
    fontSize: 10,
  },
  sectionTitle: {
    backgroundColor: "#e5e7eb",
    padding: 4,
    fontWeight: "bold",
    fontSize: 11,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  infoColumn: {
    flex: 1,
  },
  field: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderStyle: "solid",
    borderRadius: 3,
    padding: 5,
    marginBottom: 5,
  },
  fieldLabel: {
    fontSize: 8,
    color: "#6b7280",
    marginBottom: 1,
  },
  mapColumn: {
    width: MAP_BOX_SIZE,
  },
  mapBox: {
    width: MAP_BOX_SIZE,
    height: MAP_BOX_SIZE,
    position: "relative",
    borderWidth: 1,
    borderColor: "#9ca3af",
  },
  mapImage: {
    width: MAP_BOX_SIZE,
    height: MAP_BOX_SIZE,
  },
  mapPlaceholder: {
    width: MAP_BOX_SIZE,
    height: MAP_BOX_SIZE,
    borderWidth: 1,
    borderColor: "#9ca3af",
    alignItems: "center",
    justifyContent: "center",
  },
  mapCredit: {
    fontSize: 6,
    color: "#9ca3af",
    marginTop: 2,
  },
  pin: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#dc2626",
    borderWidth: 1,
    borderColor: "#ffffff",
  },
  photosRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  photo: {
    width: "48%",
    height: 110,
    objectFit: "cover",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  signRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  signBox: {
    flex: 1,
    textAlign: "center",
    fontSize: 9,
  },
  signLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#6b7280",
    borderStyle: "dotted",
    height: 24,
    marginBottom: 4,
  },
});

function formatThaiDate(dateValue) {
  if (!dateValue) return "-";
  return new Date(dateValue).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ComplaintPdfDocument({ complaint, mapTile }) {
  const photos = Array.isArray(complaint.images)
    ? complaint.images.slice(0, MAX_PHOTOS)
    : [];
  const problemsLabel = Array.isArray(complaint.problems)
    ? complaint.problems.join(", ")
    : "-";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.orgTitle}>แบบรายงานคำร้อง</Text>
          <View style={styles.headerRight}>
            <Text>เลขที่คำร้อง: {complaint.complaintId}</Text>
            <Text>วันที่: {formatThaiDate(complaint.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.infoColumn}>
            <Text style={styles.sectionTitle}>ข้อมูลผู้แจ้ง</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>ชื่อ-สกุล</Text>
              <Text>{complaint.fullName || "-"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>เบอร์โทร</Text>
              <Text>{complaint.phone || "-"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>เลขบัตรประชาชน</Text>
              <Text>{complaint.idCard || "-"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>ชุมชน</Text>
              <Text>{complaint.community || "-"}</Text>
            </View>
            {complaint.patientName ? (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>ชื่อผู้ป่วย</Text>
                <Text>{complaint.patientName}</Text>
              </View>
            ) : null}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>ปัญหา / หมวดหมู่</Text>
              <Text>
                {problemsLabel} ({complaint.category || "-"})
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>รายละเอียด</Text>
              <Text>{complaint.detail || "-"}</Text>
            </View>
          </View>

          <View style={styles.mapColumn}>
            <Text style={styles.sectionTitle}>แผนที่พิกัด</Text>
            {mapTile ? (
              <View style={styles.mapBox}>
                <Image src={mapTile.tileUrl} style={styles.mapImage} />
                <View
                  style={[
                    styles.pin,
                    {
                      left: mapTile.pinXRatio * MAP_BOX_SIZE - 4,
                      top: mapTile.pinYRatio * MAP_BOX_SIZE - 4,
                    },
                  ]}
                />
              </View>
            ) : (
              <View style={styles.mapPlaceholder}>
                <Text>ไม่มีข้อมูลพิกัด</Text>
              </View>
            )}
            <Text style={styles.mapCredit}>© OpenStreetMap contributors</Text>
          </View>
        </View>

        {photos.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>รูปภาพประกอบ</Text>
            <View style={styles.photosRow}>
              {photos.map((src, idx) => (
                <Image key={idx} src={src} style={styles.photo} />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.signRow}>
          <View style={styles.signBox}>
            <View style={styles.signLine} />
            <Text>ผู้พิมพ์/รับเรื่อง</Text>
            <Text>วันที่ ____________________</Text>
          </View>
          <View style={styles.signBox}>
            <View style={styles.signLine} />
            <Text>ผู้บังคับบัญชา</Text>
            <Text>วันที่ ____________________</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: ตรวจไวยากรณ์เบื้องต้น**

Run: `npx eslint components/pdf/ComplaintPdfDocument.js`
Expected: ไม่มี error (warning เรื่อง prop-types หรือ unused var ถ้ามีให้แก้ตามที่ eslint แจ้ง)

หน้านี้จะถูกตรวจสอบแบบ end-to-end จริงใน Task 6 (ยังไม่มี test framework สำหรับ render component ใน repo นี้ — ดู Task 6)

- [ ] **Step 3: Commit**

```bash
git add components/pdf/ComplaintPdfDocument.js
git commit -m "feat: add ComplaintPdfDocument PDF layout component"
```

---

## Task 5: ต่อปุ่มพิมพ์เข้ากับ `CardModalDetail.js`

**Files:**
- Modify: `components/CardModalDetail.js`

- [ ] **Step 1: เพิ่ม import ที่จำเป็น**

ไฟล์ `components/CardModalDetail.js` บรรทัด 1-12 ปัจจุบัน:

```jsx
import { Dialog } from "@headlessui/react";
import { ReceiptText } from "lucide-react";
import { useMenuStore } from "@/stores/useMenuStore";
import { useProblemOptionStore } from "@/stores/useProblemOptionStore";
import { useEffect, useState } from "react";
import Image from "next/image";
import CardAssignment from "./CardAssignment";
import CardOfficail from "./CardOfficail";
import SatisfactionChart from "./SatisfactionChart";
import { useUser } from "@clerk/nextjs";
import { useTranslation } from "@/hooks/useTranslation";
import { getProblemDisplayLabel } from "@/utils/problemDisplayLabel";
```

แก้เป็น:

```jsx
import { Dialog } from "@headlessui/react";
import { Loader2, ReceiptText } from "lucide-react";
import { useMenuStore } from "@/stores/useMenuStore";
import { useProblemOptionStore } from "@/stores/useProblemOptionStore";
import { useEffect, useState } from "react";
import Image from "next/image";
import CardAssignment from "./CardAssignment";
import CardOfficail from "./CardOfficail";
import SatisfactionChart from "./SatisfactionChart";
import { useUser } from "@clerk/nextjs";
import { useTranslation } from "@/hooks/useTranslation";
import { getProblemDisplayLabel } from "@/utils/problemDisplayLabel";
import { pdf } from "@react-pdf/renderer";
import Swal from "sweetalert2";
import ComplaintPdfDocument from "./pdf/ComplaintPdfDocument";
import { getStaticMapTile } from "@/lib/osmStaticTile";
```

- [ ] **Step 2: เพิ่ม state และตัวแปร role**

บรรทัดปัจจุบัน (ประมาณบรรทัด 18-22):

```jsx
  const [categoryIcon, setCategoryIcon] = useState(null);
  const [previewImg, setPreviewImg] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";
```

แก้เป็น:

```jsx
  const [categoryIcon, setCategoryIcon] = useState(null);
  const [previewImg, setPreviewImg] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";
  const isStaff =
    user?.publicMetadata?.role === "admin" ||
    user?.publicMetadata?.role === "superadmin";
```

(`isAdmin` ยังต้องเก็บไว้ — ใช้สำหรับ logic เบลอรูปภาพที่มีอยู่แล้วในไฟล์นี้ ไม่เกี่ยวกับปุ่มพิมพ์)

- [ ] **Step 3: เพิ่มฟังก์ชัน `handlePrintPdf`**

เพิ่มฟังก์ชันนี้ต่อจาก `useEffect` ตัวสุดท้าย ก่อน `if (!modalData ...) return null;`:

```jsx
  const handlePrintPdf = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    try {
      const mapTile =
        modalData.location?.lat && modalData.location?.lng
          ? getStaticMapTile(modalData.location.lat, modalData.location.lng)
          : null;

      const blob = await pdf(
        <ComplaintPdfDocument complaint={modalData} mapTile={mapTile} />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${modalData.complaintId}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating complaint PDF:", error);
      Swal.fire({
        icon: "error",
        title: "สร้าง PDF ไม่สำเร็จ",
        text: "กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };
```

- [ ] **Step 4: ต่อปุ่มเข้ากับ UI**

บรรทัดปัจจุบัน (ประมาณบรรทัด 144-149):

```jsx
          <div className="px-4 py-2 text-sm text-gray-600 font-semibold flex items-center gap-2 mt-2">
            {language === 'en' ? 'Complaint ID:' : 'เลขที่คำร้อง:'} <span className="text-black">{modalData.complaintId}</span>
            <button className="ml-auto text-gray-500 hover:text-gray-700">
              <ReceiptText size={18} />
            </button>
          </div>
```

แก้เป็น:

```jsx
          <div className="px-4 py-2 text-sm text-gray-600 font-semibold flex items-center gap-2 mt-2">
            {language === 'en' ? 'Complaint ID:' : 'เลขที่คำร้อง:'} <span className="text-black">{modalData.complaintId}</span>
            {isStaff && (
              <button
                className="ml-auto text-gray-500 hover:text-gray-700 disabled:opacity-50"
                onClick={handlePrintPdf}
                disabled={isGeneratingPdf}
                title={language === 'en' ? 'Print PDF' : 'พิมพ์ PDF'}
              >
                {isGeneratingPdf ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ReceiptText size={18} />
                )}
              </button>
            )}
          </div>
```

- [ ] **Step 5: Lint check**

Run: `npx eslint components/CardModalDetail.js`
Expected: ไม่มี error

- [ ] **Step 6: Commit**

```bash
git add components/CardModalDetail.js
git commit -m "feat: add staff-only PDF print button to complaint detail view"
```

---

## Task 6: ตรวจสอบแบบ manual ผ่าน dev server (ไม่มี test framework ใน repo นี้)

**Files:** ไม่มีไฟล์ใหม่ — เป็นขั้นตอนตรวจสอบ

- [ ] **Step 1: เริ่ม dev server**

Run: `npm run dev`
Expected: เซิร์ฟเวอร์รันที่ `http://localhost:3000` ไม่มี error ใน terminal

- [ ] **Step 2: ตรวจสอบด้วยบัญชี role `admin`**

เปิด `http://localhost:3000/admin/manage-complaints` (หรือหน้าที่เปิด `CardModalDetail` ได้ เช่น `/admin/map-view`) ด้วยบัญชีที่ `publicMetadata.role === "admin"`:
- เปิดคำร้องที่**มีพิกัด**และ**มีรูปภาพ 4 รูปขึ้นไป** → กดปุ่ม `ReceiptText` → ปุ่มต้องเปลี่ยนเป็นไอคอนหมุน (`Loader2`) ชั่วครู่ → ไฟล์ `<complaintId>.pdf` ต้องถูกดาวน์โหลด
- เปิดไฟล์ PDF ที่ได้ ตรวจว่า: ข้อความภาษาไทยแสดงถูกต้อง (ไม่ใช่กล่องเปล่า/เครื่องหมายคำถาม), แผนที่มีจุดพินแสดงอยู่, รูปภาพแสดงแค่ 4 รูปแรก, มีช่องลงชื่อ 2 ช่องด้านล่าง
- เทียบตำแหน่งพิกัดในแผนที่กับลิงก์ Google Maps ที่มีอยู่แล้วในปุ่ม dropdown ของ `pages/admin/manage-complaints.jsx` (เพื่อยืนยันว่าพินอยู่ตำแหน่งที่ถูกต้องจริง ไม่ใช่สุ่ม)

- [ ] **Step 2b: ตรวจสอบด้วยบัญชี role `superadmin`**

ล็อกอินด้วยบัญชีที่ `publicMetadata.role === "superadmin"` แล้วเปิด `CardModalDetail` ของคำร้องใดก็ได้ → ปุ่มพิมพ์ PDF **ต้องแสดง** และกดดาวน์โหลดได้เหมือน role `admin` (นี่คือจุดที่แก้ไขจาก bug เดิมที่ `isAdmin` เช็กแค่ `"admin"` เพียงอย่างเดียว ถ้าไม่เช็กจุดนี้จะไม่รู้ว่าแก้ครบ)

- [ ] **Step 3: ตรวจสอบ edge cases**

- เปิดคำร้องที่**ไม่มีพิกัด** (`location.lat`/`location.lng` เป็น `undefined`) → กดพิมพ์ → PDF ต้องสร้างสำเร็จ และช่องแผนที่ต้องแสดงกล่อง "ไม่มีข้อมูลพิกัด" แทน ไม่ error
- เปิดคำร้องที่**ไม่มีรูปภาพ** → PDF ต้องสร้างสำเร็จ ไม่มีส่วน "รูปภาพประกอบ" แสดงค้างเป็นช่องว่าง
- เปิดคำร้องที่มี `patientName` (เช่นเคสขอรถรับ-ส่งโรงพยาบาล) → PDF ต้องมีช่อง "ชื่อผู้ป่วย" เพิ่มขึ้นมา

- [ ] **Step 4: ตรวจสอบการจำกัด role**

ล็อกอินด้วยบัญชีที่ `publicMetadata.role` เป็น `"user"` (หรือไม่มี role) แล้วเปิดหน้า `/status` หรือ `/complaint/[id_card]` ที่แสดง `CardModalDetail` ของคำร้องตัวเอง → ปุ่มพิมพ์ PDF (ไอคอน `ReceiptText`) **ต้องไม่แสดง** เลย

- [ ] **Step 5: ตรวจสอบ console**

เปิด browser devtools console ระหว่างทำ Step 2-4 ทั้งหมด → ต้องไม่มี error สีแดงใน console (warning ของ react-pdf เรื่อง unsupported style property ถ้ามีให้บันทึกไว้แก้ แต่ไม่ควรมี uncaught exception)

- [ ] **Step 6: Build check**

Run: `npm run build`
Expected: build สำเร็จไม่มี error (ตรวจว่า `@react-pdf/renderer` ไม่ทำให้ build พัง)
