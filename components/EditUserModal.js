import React, { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { uploadToCloudinary } from "@/utils/uploadToCloudinary";
import dynamic from "next/dynamic";
const LocationPickerModal = dynamic(() => import("./LocationPickerModal"), { ssr: false });
const ImageModal = dynamic(() => import("./ImageModal"), { ssr: false });

export default function EditUserModal({ isOpen, onClose, complaint }) {
  const [reporterInfo, setReporterInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editedData, setEditedData] = useState({ location: null });
  const [isEditingImages, setIsEditingImages] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingImage, setDeletingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isManualLocation, setIsManualLocation] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

  const validateCoordinates = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (manualLat === "" || manualLng === "") return { isValid: false, message: "กรุณากรอกพิกัดให้ครบ" };
    if (isNaN(lat) || isNaN(lng)) return { isValid: false, message: "กรุณากรอกพิกัดให้ถูกต้อง" };
    if (lat < -90 || lat > 90) return { isValid: false, message: "ละติจูดต้องอยู่ระหว่าง -90 ถึง 90" };
    if (lng < -180 || lng > 180) return { isValid: false, message: "ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180" };
    return { isValid: true, message: "พิกัดถูกต้อง" };
  };

  useEffect(() => {
    if (complaint && isOpen) {
      setLoading(true);
      setReporterInfo(complaint);
      setEditedData({ location: complaint.location || { lat: 15.0, lng: 100.0 } });
      if (complaint.location) {
        setManualLat(complaint.location.lat.toString());
        setManualLng(complaint.location.lng.toString());
      }
      setLoading(false);
    }
  }, [complaint, isOpen]);

  const handleLocationConfirm = async (newLocation) => {
    try {
      await axios.put(`/api/submittedreports/${complaint._id}`, { location: newLocation });
      setReporterInfo((prev) => ({ ...prev, location: newLocation }));
      setIsEditingLocation(false);
    } catch (error) {
      console.error("Error saving location:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกพิกัด");
    }
  };

  const handleManualLocationSave = async () => {
    try {
      const lat = parseFloat(manualLat);
      const lng = parseFloat(manualLng);
      if (isNaN(lat) || isNaN(lng)) { alert("กรุณากรอกพิกัดให้ถูกต้อง"); return; }
      if (lat < -90 || lat > 90) { alert("ละติจูดต้องอยู่ระหว่าง -90 ถึง 90"); return; }
      if (lng < -180 || lng > 180) { alert("ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180"); return; }
      const newLocation = { lat, lng };
      await axios.put(`/api/submittedreports/${complaint._id}`, { location: newLocation });
      setReporterInfo((prev) => ({ ...prev, location: newLocation }));
      setEditedData({ location: newLocation });
      setIsManualLocation(false);
      alert("บันทึกพิกัดสำเร็จ");
    } catch (error) {
      console.error("Error saving manual location:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกพิกัด");
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("กรุณาเลือกไฟล์ภาพเท่านั้น"); return; }
    if (file.size > 5 * 1024 * 1024) { alert("ขนาดไฟล์ต้องไม่เกิน 5MB"); return; }
    try {
      setUploadingImage(true);
      const secureUrl = await uploadToCloudinary(file);
      const response = await axios.post("/api/upload-complaint-image", {
        reportId: complaint._id,
        imageUrl: secureUrl,
      });
      if (response.data.success) {
        setReporterInfo((prev) => ({ ...prev, images: response.data.data.images }));
        alert("อัปโหลดภาพสำเร็จ");
      } else {
        alert("เกิดข้อผิดพลาดในการอัปโหลดภาพ: " + response.data.message);
      }
    } catch (uploadError) {
      console.error("Error uploading image:", uploadError);
      let errorMessage = "เกิดข้อผิดพลาดในการอัปโหลดภาพ";
      if (uploadError.response?.data?.message) errorMessage += ": " + uploadError.response.data.message;
      else if (uploadError.message) errorMessage += ": " + uploadError.message;
      alert(errorMessage);
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  const handleDeleteImage = async (imageUrl) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบภาพนี้?")) return;
    try {
      setDeletingImage(true);
      const response = await axios.delete("/api/delete-image", {
        data: { reportId: complaint._id, imageUrl },
      });
      if (response.data.success) {
        setReporterInfo((prev) => ({ ...prev, images: response.data.data.images }));
        alert("ลบภาพสำเร็จ");
      } else {
        alert("เกิดข้อผิดพลาดในการลบภาพ: " + response.data.message);
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      alert("เกิดข้อผิดพลาดในการลบภาพ");
    } finally {
      setDeletingImage(false);
    }
  };

  const handleUpdateInfo = async () => {
    try {
      const response = await axios.put(`/api/submittedreports/${complaint._id}`, {
        fullName: reporterInfo.fullName,
        phone: reporterInfo.phone,
        detail: reporterInfo.detail,
      });
      if (response.data.success) {
        alert("อัปเดตข้อมูลสำเร็จ");
        setReporterInfo(response.data.data);
        if (typeof window !== "undefined" && window.location.pathname.includes("/admin/manage-complaints")) {
          window.location.reload();
        }
      } else {
        alert("เกิดข้อผิดพลาดในการอัปเดตข้อมูล");
      }
    } catch (error) {
      console.error("Error updating info:", error);
      alert("เกิดข้อผิดพลาดในการอัปเดตข้อมูล");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="px-6 pt-5 pb-0 shrink-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-xl font-bold text-gray-900">แก้ไขข้อมูลผู้แจ้ง</h2>
              {reporterInfo?.status === "ดำเนินการเสร็จสิ้น" && (
                <p className="text-xs text-amber-600 mt-0.5">เรื่องถูกปิดแล้ว — คุณยังแก้ไขข้อมูลได้</p>
              )}
            </div>
            <button className="btn btn-ghost btn-sm btn-circle text-gray-400" onClick={onClose}>✕</button>
          </div>

          {/* Tabs */}
          <div className="tabs tabs-bordered w-full">
            <button
              className={`tab tab-lg font-medium ${activeTab === "info" ? "tab-active" : "text-gray-500"}`}
              onClick={() => setActiveTab("info")}
            >
              ข้อมูลผู้แจ้ง
            </button>
            <button
              className={`tab tab-lg font-medium ${activeTab === "media" ? "tab-active" : "text-gray-500"}`}
              onClick={() => setActiveTab("media")}
            >
              ตำแหน่ง &amp; ภาพ
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <p className="text-gray-500">กำลังโหลด...</p>
          ) : !reporterInfo ? (
            <p className="text-gray-500">ไม่พบข้อมูล</p>
          ) : (
            <>
              {/* TAB: ข้อมูลผู้แจ้ง */}
              {activeTab === "info" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้แจ้ง</label>
                      <input
                        type="text"
                        value={reporterInfo.fullName || ""}
                        onChange={(e) => setReporterInfo((prev) => ({ ...prev, fullName: e.target.value }))}
                        className="input input-bordered w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทร</label>
                      <input
                        type="tel"
                        value={reporterInfo.phone || ""}
                        onChange={(e) => setReporterInfo((prev) => ({ ...prev, phone: e.target.value }))}
                        className="input input-bordered w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label>
                    <textarea
                      value={reporterInfo.detail || ""}
                      onChange={(e) => setReporterInfo((prev) => ({ ...prev, detail: e.target.value }))}
                      className="textarea textarea-bordered w-full h-32"
                      placeholder="รายละเอียดของปัญหา..."
                    />
                  </div>

                  {/* System info — collapsed */}
                  <details className="mt-1">
                    <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-600 select-none w-fit">
                      ข้อมูลระบบ
                    </summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-500 space-y-1 border">
                      <p>ID: <span className="font-mono text-xs break-all">{complaint?._id}</span></p>
                      <p>สถานะ: <span className="font-medium text-gray-700">{reporterInfo.status || "ไม่ระบุ"}</span></p>
                      <p>วันที่สร้าง: {reporterInfo.createdAt ? new Date(reporterInfo.createdAt).toLocaleDateString("th-TH") : "ไม่ระบุ"}</p>
                      <p>อัปเดตล่าสุด: {reporterInfo.updatedAt ? new Date(reporterInfo.updatedAt).toLocaleDateString("th-TH") : "ไม่ระบุ"}</p>
                      <p>จำนวนภาพ: {reporterInfo.images ? reporterInfo.images.length : 0} รูป</p>
                    </div>
                  </details>
                </div>
              )}

              {/* TAB: ตำแหน่ง & ภาพ */}
              {activeTab === "media" && (
                <div className="space-y-5">

                  {/* Coordinates */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">พิกัดตำแหน่ง</p>
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border">
                      <span className="text-sm text-gray-700">
                        📍 {reporterInfo.location?.lat?.toFixed(5)}, {reporterInfo.location?.lng?.toFixed(5)}
                      </span>
                      <div className="flex items-center gap-1">
                        {reporterInfo.location?.lat && reporterInfo.location?.lng && (
                          <a
                            href={`https://www.google.com/maps?q=${reporterInfo.location.lat},${reporterInfo.location.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost btn-xs text-sky-600"
                            title="ดูบน Google Maps"
                          >
                            🗺️
                          </a>
                        )}
                        <button
                          onClick={() => {
                            if (reporterInfo.location) {
                              navigator.clipboard.writeText(
                                `${reporterInfo.location.lat.toFixed(5)}, ${reporterInfo.location.lng.toFixed(5)}`
                              );
                              alert("คัดลอกพิกัดแล้ว");
                            }
                          }}
                          className="btn btn-ghost btn-xs"
                          title="คัดลอกพิกัด"
                        >
                          📋
                        </button>
                      </div>
                    </div>

                    {/* Segmented edit mode — shown only when not editing */}
                    {!isEditingLocation && !isManualLocation && (
                      <div className="flex gap-2 mt-3">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline flex-1"
                          onClick={() => setIsEditingLocation(true)}
                        >
                          🗺️ แก้ไขด้วยแผนที่
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline flex-1"
                          onClick={() => setIsManualLocation(true)}
                        >
                          ✏️ กรอกพิกัดเอง
                        </button>
                      </div>
                    )}

                    {/* Map picker */}
                    {isEditingLocation && (
                      <div className="mt-3 rounded-lg overflow-hidden border">
                        <LocationPickerModal
                          initialLocation={editedData.location}
                          onConfirm={handleLocationConfirm}
                          onCancel={() => setIsEditingLocation(false)}
                        />
                      </div>
                    )}

                    {/* Manual input */}
                    {isManualLocation && (
                      <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ละติจูด</label>
                            <input
                              type="number"
                              step="any"
                              value={manualLat}
                              onChange={(e) => setManualLat(e.target.value)}
                              placeholder="เช่น 18.70542"
                              className="input input-bordered w-full"
                            />
                            <p className="text-xs text-gray-400 mt-1">-90 ถึง 90</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ลองจิจูด</label>
                            <input
                              type="number"
                              step="any"
                              value={manualLng}
                              onChange={(e) => setManualLng(e.target.value)}
                              placeholder="เช่น 98.91375"
                              className="input input-bordered w-full"
                            />
                            <p className="text-xs text-gray-400 mt-1">-180 ถึง 180</p>
                          </div>
                        </div>
                        {(() => {
                          const v = validateCoordinates();
                          return (
                            <div className={`mt-3 px-3 py-2 rounded-md text-sm ${v.isValid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                              {v.message}
                            </div>
                          );
                        })()}
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={handleManualLocationSave}
                            className="btn btn-primary btn-sm"
                            disabled={!validateCoordinates().isValid}
                          >
                            บันทึกพิกัด
                          </button>
                          <button
                            onClick={() => {
                              setIsManualLocation(false);
                              if (reporterInfo.location) {
                                setManualLat(reporterInfo.location.lat.toString());
                                setManualLng(reporterInfo.location.lng.toString());
                              }
                            }}
                            className="btn btn-ghost btn-sm"
                          >
                            ยกเลิก
                          </button>
                        </div>
                        <div className="mt-3 p-2 bg-white/70 rounded text-xs text-gray-500 space-y-0.5">
                          <p className="font-medium mb-1">ตัวอย่างพิกัด:</p>
                          <p>• กรุงเทพฯ 13.7563, 100.5018</p>
                          <p>• เชียงใหม่ 18.7883, 98.9853</p>
                          <p>• ภูเก็ต 7.8804, 98.3923</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="divider my-0"></div>

                  {/* Images */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-gray-700">
                        ภาพปัญหา ({reporterInfo.images?.length || 0} รูป)
                      </p>
                      <button
                        onClick={() => setIsEditingImages(!isEditingImages)}
                        className={`btn btn-sm ${isEditingImages ? "btn-error btn-outline" : "btn-outline"}`}
                      >
                        {isEditingImages ? "ปิดการแก้ไข" : "+ แก้ไขภาพ"}
                      </button>
                    </div>

                    {isEditingImages && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-dashed border-blue-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">เพิ่มภาพใหม่ (ไม่เกิน 5MB)</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                          className="file-input file-input-bordered file-input-sm w-full"
                        />
                        {uploadingImage && <p className="mt-2 text-sm text-blue-600">กำลังอัปโหลด...</p>}
                      </div>
                    )}

                    {reporterInfo.images && reporterInfo.images.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {reporterInfo.images.map((image, index) => (
                          <div key={index} className="relative group">
                            <Image
                              src={image}
                              alt={`ภาพ ${index + 1}`}
                              width={200}
                              height={128}
                              sizes="(max-width: 768px) 50vw, 200px"
                              className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => { setSelectedImage(image); setShowImageModal(true); }}
                            />
                            {isEditingImages && (
                              <button
                                onClick={() => handleDeleteImage(image)}
                                disabled={deletingImage}
                                className="absolute top-1.5 right-1.5 btn btn-xs btn-error btn-circle opacity-0 group-hover:opacity-100 transition-opacity"
                                title="ลบภาพ"
                              >
                                {deletingImage ? "…" : "×"}
                              </button>
                            )}
                            <div className="absolute bottom-1.5 left-1.5 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-full">
                              {index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-lg">
                        ไม่มีภาพ
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sticky footer */}
        <div className="px-6 py-4 border-t bg-white shrink-0 flex justify-end gap-2 rounded-b-xl">
          <button className="btn btn-ghost" onClick={onClose}>ปิด</button>
          {activeTab === "info" && reporterInfo && (
            <button className="btn btn-primary" onClick={handleUpdateInfo}>
              บันทึกข้อมูล
            </button>
          )}
        </div>
      </div>

      <ImageModal
        isOpen={showImageModal}
        onClose={() => { setShowImageModal(false); setSelectedImage(null); }}
        imageUrl={selectedImage}
        title="ภาพปัญหา"
      />
    </div>
  );
}
