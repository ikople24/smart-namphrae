import {
  Document,
  Page,
  View,
  Text as PdfText,
  Image,
  Font,
  StyleSheet,
} from "@react-pdf/renderer";

// Sarabun renders SARA AM (ำ) as two glyphs, which desyncs react-pdf's
// glyph-to-character mapping and drops characters from the end of the line
// (e.g. "เทศบาลตำบลน้ำแพร่พัฒนา" -> "...พัฒ"). Pre-decomposing it into
// NIKHAHIT + SARA AA looks identical and keeps the mapping 1:1.
const decomposeSaraAm = (child) =>
  typeof child === "string" ? child.replace(/ำ/g, "ํา") : child;

function Text({ children, ...props }) {
  const normalized = Array.isArray(children)
    ? children.map(decomposeSaraAm)
    : decomposeSaraAm(children);
  return <PdfText {...props}>{normalized}</PdfText>;
}

Font.register({
  family: "Sarabun",
  fonts: [
    { src: "/fonts/Sarabun-Regular.ttf" },
    { src: "/fonts/Sarabun-Bold.ttf", fontWeight: "bold" },
  ],
});

const MAP_BOX_SIZE = 220;
const MAX_PHOTOS = 4;
const PIN_SIZE = 8;

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
  orgSubtitle: {
    fontSize: 11,
    marginTop: 2,
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
    overflow: "hidden",
  },
  // Drawn on top of the tiles, since absolutely positioned tiles cover the
  // box's own border.
  mapFrame: {
    position: "absolute",
    left: 0,
    top: 0,
    width: MAP_BOX_SIZE,
    height: MAP_BOX_SIZE,
    borderWidth: 1,
    borderColor: "#9ca3af",
  },
  mapTile: {
    position: "absolute",
    width: MAP_BOX_SIZE,
    height: MAP_BOX_SIZE,
  },
  coords: {
    fontSize: 9,
    marginTop: 4,
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
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
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

function formatCoord(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(6) : "-";
}

export default function ComplaintPdfDocument({ complaint, mapTiles }) {
  const photos = Array.isArray(complaint.images)
    ? complaint.images.slice(0, MAX_PHOTOS)
    : [];
  const problemsLabel = Array.isArray(complaint.problems)
    ? complaint.problems.join(", ")
    : "-";
  const hasCoords = complaint.location?.lat && complaint.location?.lng;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.orgTitle}>
              แบบรายงานคำร้องผ่านระบบ smart-namphrae
            </Text>
            <Text style={styles.orgSubtitle}>เทศบาลตำบลน้ำแพร่พัฒนา</Text>
          </View>
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
              <Text style={{ maxLines: 6, textOverflow: "ellipsis" }}>
                {complaint.detail || "-"}
              </Text>
            </View>
          </View>

          <View style={styles.mapColumn}>
            <Text style={styles.sectionTitle}>แผนที่พิกัด</Text>
            {mapTiles ? (
              <View style={styles.mapBox}>
                {mapTiles.tiles.map((tile) => (
                  <Image
                    key={tile.tileUrl}
                    src={tile.tileUrl}
                    style={[
                      styles.mapTile,
                      {
                        left: tile.offsetX * MAP_BOX_SIZE,
                        top: tile.offsetY * MAP_BOX_SIZE,
                      },
                    ]}
                    alt=""
                  />
                ))}
                <View
                  style={[
                    styles.pin,
                    {
                      left: MAP_BOX_SIZE / 2 - PIN_SIZE / 2,
                      top: MAP_BOX_SIZE / 2 - PIN_SIZE / 2,
                    },
                  ]}
                />
                <View style={styles.mapFrame} />
              </View>
            ) : (
              <View style={styles.mapPlaceholder}>
                <Text>
                  {hasCoords ? "โหลดแผนที่ไม่สำเร็จ" : "ไม่มีข้อมูลพิกัด"}
                </Text>
              </View>
            )}
            <Text style={styles.mapCredit}>© OpenStreetMap contributors</Text>
            {hasCoords ? (
              <View style={styles.coords}>
                <Text>ละติจูด: {formatCoord(complaint.location.lat)}</Text>
                <Text>ลองจิจูด: {formatCoord(complaint.location.lng)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {photos.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>รูปภาพประกอบ</Text>
            <View style={styles.photosRow}>
              {photos.map((src, idx) => (
                <Image key={idx} src={src} style={styles.photo} alt="" />
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
