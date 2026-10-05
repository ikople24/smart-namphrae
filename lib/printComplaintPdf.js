import { pdf } from "@react-pdf/renderer";
import Swal from "sweetalert2";
import ComplaintPdfDocument from "@/components/pdf/ComplaintPdfDocument";
import { getVerifiedMapTile } from "@/lib/osmStaticTile";

export async function printComplaintPdf(complaint) {
  try {
    const mapTile =
      complaint.location?.lat && complaint.location?.lng
        ? await getVerifiedMapTile(complaint.location.lat, complaint.location.lng)
        : null;

    const blob = await pdf(
      <ComplaintPdfDocument complaint={complaint} mapTile={mapTile} />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${complaint.complaintId}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error generating complaint PDF:", error);
    Swal.fire({
      icon: "error",
      title: "สร้าง PDF ไม่สำเร็จ",
      text: "กรุณาลองใหม่อีกครั้ง",
    });
  }
}
