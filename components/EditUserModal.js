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
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editedData, setEditedData] = useState({ location: null });
  const [isEditingImages, setIsEditingImages] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingImage, setDeletingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isManualLocation, setIsManualLocation] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  
  // ฟังก์ชันตรวจสอบพิกัด
  const validateCoordinates = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    
    if (manualLat === '' || manualLng === '') return { isValid: false, message: 'กรุณากรอกพิกัดให้ครบ' };
    if (isNaN(lat) || isNaN(lng)) return { isValid: false, message: 'กรุณากรอกพิกัดให้ถูกต้อง' };
    if (lat < -90 || lat > 90) return { isValid: false, message: 'ละติจูดต้องอยู่ระหว่าง -90 ถึง 90' };
    if (lng < -180 || lng > 180) return { isValid: false, message: 'ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180' };
    
    return { isValid: true, message: 'พิกัดถูกต้อง' };
  };

  useEffect(() => {
    if (complaint && isOpen) {
      setLoading(true);
      // ใช้ข้อมูลจาก complaint ที่ส่งมาจากตารางรายการโดยตรง
      setReporterInfo(complaint);
      setEditedData({ location: complaint.location || { lat: 15.0, lng: 100.0 } });
      
      // ตั้งค่าค่าเริ่มต้นสำหรับ manual input
      if (complaint.location) {
        setManualLat(complaint.location.lat.toString());
        setManualLng(complaint.location.lng.toString());
      }
      setLoading(false);
    }
  }, [complaint, isOpen]);

  const handleLocationConfirm = async (newLocation) => {
    try {
      await axios.put(`/api/submittedreports/${complaint._id}`, {
        location: newLocation,
      });
      setReporterInfo((prev) => ({
        ...prev,
        location: newLocation,
      }));
      setIsEditingLocation(false);
    } catch (error) {
      console.error('Error saving location:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกพิกัด');
    }
  };

  const handleManualLocationSave = async () => {
    try {
      const lat = parseFloat(manualLat);
      const lng = parseFloat(manualLng);
      
      if (isNaN(lat) || isNaN(lng)) {
        alert('กรุณากรอกพิกัดให้ถูกต้อง');
        return;
      }
      
      if (lat < -90 || lat > 90) {
        alert('ละติจูดต้องอยู่ระหว่าง -90 ถึง 90');
        return;
      }
      
      if (lng < -180 || lng > 180) {
        alert('ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180');
        return;
      }
      
      const newLocation = { lat, lng };
      
      await axios.put(`/api/submittedreports/${complaint._id}`, {
        location: newLocation,
      });
      
      setReporterInfo((prev) => ({
        ...prev,
        location: newLocation,
      }));
      
      setEditedData({ location: newLocation });
      setIsManualLocation(false);
      alert('บันทึกพิกัดสำเร็จ');
    } catch (error) {
      console.error('Error saving manual location:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกพิกัด');
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์ภาพเท่านั้น');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('ขนาดไฟล์ต้องไม่เกิน 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      const secureUrl = await uploadToCloudinary(file);
      const response = await axios.post('/api/upload-complaint-image', {
        reportId: complaint._id,
        imageUrl: secureUrl,
      });

      if (response.data.success) {
        setReporterInfo((prev) => ({
          ...prev,
          images: response.data.data.images,
        }));
        alert('อัปโหลดภาพสำเร็จ');
      } else {
        alert('เกิดข้อผิดพลาดในการอัปโหลดภาพ: ' + response.data.message);
      }
    } catch (uploadError) {
      console.error('Error uploading image:', uploadError);
      let errorMessage = 'เกิดข้อผิดพลาดในการอัปโหลดภาพ';
      if (uploadError.response?.data?.message) {
        errorMessage += ': ' + uploadError.response.data.message;
      } else if (uploadError.message) {
        errorMessage += ': ' + uploadError.message;
      }
      alert(errorMessage);
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  };

  const handleDeleteImage = async (imageUrl) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบภาพนี้?')) return;

    try {
      setDeletingImage(true);
      
      const response = await axios.delete('/api/delete-image', {
        data: {
          reportId: complaint._id,
          imageUrl: imageUrl
        }
      });

      if (response.data.success) {
        // อัปเดตข้อมูลใน state
        setReporterInfo(prev => ({
          ...prev,
          images: response.data.data.images
        }));
        alert('ลบภาพสำเร็จ');
      } else {
        alert('เกิดข้อผิดพลาดในการลบภาพ: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('เกิดข้อผิดพลาดในการลบภาพ');
    } finally {
      setDeletingImage(false);
    }
  };

  const handleUpdateInfo = async () => {
    try {
      const response = await axios.put(`/api/submittedreports/${complaint._id}`, {
        fullName: reporterInfo.fullName,
        phone: reporterInfo.phone,
        detail: reporterInfo.detail
      });

      if (response.data.success) {
        alert('อัปเดตข้อมูลสำเร็จ');
        setReporterInfo(response.data.data);
        // รีเฟรชข้อมูลในหน้า manage-complaints
        if (typeof window !== 'undefined' && window.location.pathname.includes('/admin/manage-complaints')) {
          window.location.reload();
        }
      } else {
        alert('เกิดข้อผิดพลาดในการอัปเดตข้อมูล');
      }
    } catch (error) {
      console.error('Error updating info:', error);
      alert('เกิดข้อผิดพลาดในการอัปเดตข้อมูล');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
        <button
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
          onClick={onClose}
        >
          ✕
        </button>
        <h2 className="text-xl font-bold mb-4">แก้ไขข้อมูลผู้แจ้ง</h2>
        {reporterInfo?.status === "ดำเนินการเสร็จสิ้น" && (
          <div className="alert alert-warning mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>เรื่องร้องเรียนนี้ถูกปิดแล้ว แต่คุณยังสามารถแก้ไขข้อมูลได้</span>
          </div>
        )}
        <div>
          {loading ? (
            <p>กำลังโหลด...</p>
          ) : reporterInfo ? (
            <div className="space-y-6">
              {/* ข้อมูลพื้นฐาน */}
              <div className="bg-gray-50 p-4 rounded-md shadow-md">
                <h3 className="text-lg font-semibold mb-3">ข้อมูลผู้แจ้ง</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ชื่อผู้แจ้ง
                    </label>
                    <input
                      type="text"
                      value={reporterInfo.fullName || ''}
                      onChange={(e) => setReporterInfo(prev => ({ ...prev, fullName: e.target.value }))}
                      className="input input-bordered w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      เบอร์โทร
                    </label>
                    <input
                      type="tel"
                      value={reporterInfo.phone || ''}
                      onChange={(e) => setReporterInfo(prev => ({ ...prev, phone: e.target.value }))}
                      className="input input-bordered w-full"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    รายละเอียด
                  </label>
                  <textarea
                    value={reporterInfo.detail || ''}
                    onChange={(e) => setReporterInfo(prev => ({ ...prev, detail: e.target.value }))}
                    className="textarea textarea-bordered w-full h-24"
                    placeholder="รายละเอียดของปัญหา..."
                  />
                </div>
                <button
                  onClick={handleUpdateInfo}
                  className="btn btn-primary btn-sm mt-3"
                >
                  บันทึกข้อมูล
                </button>
              </div>

                             {/* พิกัด */}
               <div className="bg-gray-50 p-4 rounded-md shadow-md">
                 <h3 className="text-lg font-semibold mb-3">พิกัด</h3>
                 <div className="flex items-center justify-between mb-2">
                   <p className="text-sm text-gray-600">
                     📍พิกัด: {reporterInfo.location?.lat?.toFixed(5)}, {reporterInfo.location?.lng?.toFixed(5)}
                   </p>
                   <button
                     onClick={() => {
                       if (reporterInfo.location) {
                         const coords = `${reporterInfo.location.lat.toFixed(5)}, ${reporterInfo.location.lng.toFixed(5)}`;
                         navigator.clipboard.writeText(coords);
                         alert('คัดลอกพิกัดแล้ว');
                       }
                     }}
                     className="btn btn-ghost btn-xs"
                     title="คัดลอกพิกัด"
                   >
                     📋
                   </button>
                 </div>
                 
                 {/* ตัวเลือกการแก้ไขพิกัด */}
                 <div className="mt-4 space-y-3">
                   {/* ตัวเลือกที่ 1: แก้ไขด้วยแผนที่ */}
                   <div className="form-control">
                     <label className="label cursor-pointer">
                       <span className="label-text">แก้ไขด้วยแผนที่</span>
                       <input
                         type="checkbox"
                         className="toggle toggle-primary"
                         checked={isEditingLocation}
                         onChange={() => {
                           setIsEditingLocation(!isEditingLocation);
                           if (isManualLocation) setIsManualLocation(false);
                         }}
                       />
                     </label>
                   </div>
                   
                   {/* ตัวเลือกที่ 2: แก้ไขด้วยการกรอกพิกัด */}
                   <div className="form-control">
                     <label className="label cursor-pointer">
                       <span className="label-text">แก้ไขด้วยการกรอกพิกัด</span>
                       <input
                         type="checkbox"
                         className="toggle toggle-secondary"
                         checked={isManualLocation}
                         onChange={() => {
                           setIsManualLocation(!isManualLocation);
                           if (isEditingLocation) setIsEditingLocation(false);
                         }}
                       />
                     </label>
                   </div>
                 </div>
                 
                 {/* แสดงแผนที่เมื่อเลือกแก้ไขด้วยแผนที่ */}
                 {isEditingLocation && (
                   <div className="card p-4 mb-4 relative">
                     <div className="w-full">
                       <LocationPickerModal
                         initialLocation={editedData.location}
                         onConfirm={handleLocationConfirm}
                         onCancel={() => setIsEditingLocation(false)}
                       />
                     </div>
                   </div>
                 )}
                 
                 {/* แสดงฟอร์มกรอกพิกัดเมื่อเลือกแก้ไขด้วยการกรอกพิกัด */}
                 {isManualLocation && (
                   <div className="card p-4 mb-4 bg-blue-50">
                     <h4 className="font-semibold mb-3">กรอกพิกัด</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">
                           ละติจูด (Latitude)
                         </label>
                         <input
                           type="number"
                           step="any"
                           value={manualLat}
                           onChange={(e) => setManualLat(e.target.value)}
                           placeholder="เช่น 18.70542"
                           className="input input-bordered w-full"
                         />
                         <p className="text-xs text-gray-500 mt-1">ค่าต้องอยู่ระหว่าง -90 ถึง 90</p>
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">
                           ลองจิจูด (Longitude)
                         </label>
                         <input
                           type="number"
                           step="any"
                           value={manualLng}
                           onChange={(e) => setManualLng(e.target.value)}
                           placeholder="เช่น 98.91375"
                           className="input input-bordered w-full"
                         />
                         <p className="text-xs text-gray-500 mt-1">ค่าต้องอยู่ระหว่าง -180 ถึง 180</p>
                       </div>
                     </div>
                     {/* แสดงสถานะการตรวจสอบพิกัด */}
                     {(() => {
                       const validation = validateCoordinates();
                       return (
                         <div className={`mt-3 p-2 rounded-md text-sm ${
                           validation.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                         }`}>
                           {validation.message}
                         </div>
                       );
                     })()}
                     
                     <div className="flex gap-2 mt-4">
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
                           // คืนค่าเดิม
                           if (reporterInfo.location) {
                             setManualLat(reporterInfo.location.lat.toString());
                             setManualLng(reporterInfo.location.lng.toString());
                           }
                         }}
                         className="btn btn-outline btn-sm"
                       >
                         ยกเลิก
                       </button>
                     </div>
                     
                     {/* แสดงตัวอย่างพิกัด */}
                     <div className="mt-3 p-3 bg-gray-100 rounded-md">
                       <h5 className="font-medium text-sm mb-2">ตัวอย่างพิกัดในประเทศไทย:</h5>
                       <div className="text-xs space-y-1">
                         <p>• กรุงเทพฯ: 13.7563, 100.5018</p>
                         <p>• เชียงใหม่: 18.7883, 98.9853</p>
                         <p>• ภูเก็ต: 7.8804, 98.3923</p>
                         <p>• พัทยา: 12.9236, 100.8824</p>
                       </div>
                     </div>
                   </div>
                 )}
               </div>

              {/* ภาพปัญหา */}
              <div className="bg-gray-50 p-4 rounded-md shadow-md">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold">ภาพปัญหา</h3>
                  <button
                    onClick={() => setIsEditingImages(!isEditingImages)}
                    className="btn btn-outline btn-sm"
                  >
                    {isEditingImages ? 'ปิดการแก้ไข' : 'แก้ไขภาพ'}
                  </button>
                </div>
                
                                 {isEditingImages && (
                   <div className="mb-4 p-3 bg-blue-50 rounded-md">
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       เพิ่มภาพใหม่
                     </label>
                     <div className="relative">
                       <input
                         type="file"
                         accept="image/*"
                         onChange={handleImageUpload}
                         disabled={uploadingImage}
                         className="file-input file-input-bordered w-full"
                         id="image-upload-input"
                       />
                     </div>
                     {uploadingImage && (
                       <div className="mt-2 text-sm text-blue-600">
                         กำลังอัปโหลดภาพ...
                       </div>
                     )}
                   </div>
                 )}

                                 {reporterInfo.images && reporterInfo.images.length > 0 ? (
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                     {reporterInfo.images.map((image, index) => (
                       <div key={index} className="relative group">
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
                         {isEditingImages && (
                           <button
                             onClick={() => handleDeleteImage(image)}
                             disabled={deletingImage}
                             className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                             title="ลบภาพ"
                           >
                             {deletingImage ? '...' : '×'}
                           </button>
                         )}
                         <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
                           {index + 1}
                         </div>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <p className="text-gray-500 text-center py-4">ไม่มีภาพ</p>
                 )}
              </div>

                             {/* ข้อมูลระบบ */}
               <div className="bg-gray-50 p-4 rounded-md shadow-md">
                 <h3 className="text-lg font-semibold mb-3">ข้อมูลระบบ</h3>
                 <div className="text-sm text-gray-600 space-y-1">
                   <p>Complaint ID: <span className="font-mono">{complaint?._id}</span></p>
                   <p>สถานะ: <span className="font-medium">{reporterInfo.status || 'ไม่ระบุ'}</span></p>
                   <p>วันที่สร้าง: {reporterInfo.createdAt ? new Date(reporterInfo.createdAt).toLocaleDateString('th-TH') : 'ไม่ระบุ'}</p>
                   <p>อัปเดตล่าสุด: {reporterInfo.updatedAt ? new Date(reporterInfo.updatedAt).toLocaleDateString('th-TH') : 'ไม่ระบุ'}</p>
                   <p>จำนวนภาพ: {reporterInfo.images ? reporterInfo.images.length : 0} รูป</p>
                 </div>
               </div>
            </div>
          ) : (
            <p>ไม่พบข้อมูล</p>
          )}
        </div>
      </div>
      
      {/* Image Modal */}
      <ImageModal
        isOpen={showImageModal}
        onClose={() => {
          setShowImageModal(false);
          setSelectedImage(null);
        }}
        imageUrl={selectedImage}
        title="ภาพปัญหา"
      />
    </div>
  );
}
