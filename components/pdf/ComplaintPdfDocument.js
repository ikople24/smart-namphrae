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
