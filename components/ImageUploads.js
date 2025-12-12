import Image from "next/image";
import { useState } from "react";
import { X } from "lucide-react";
import { uploadToCloudinary } from "@/utils/uploadToCloudinary";
import { useTranslation } from "@/hooks/useTranslation";

const ImageUploads = ({ onChange }) => {
  const { t } = useTranslation();
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  const deleteFromCloudinary = async (url) => {
    try {
      console.log("🗑️ Attempting to delete image:", url);
      const response = await fetch("/api/delete-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });
      
      if (response.ok) {
        console.log("✅ Image deleted successfully");
      } else {
        const errorData = await response.json();
        console.error("❌ Failed to delete image:", errorData.error);
      }
    } catch (err) {
      console.error("❌ Error deleting image:", err);
    }
  };

  const handleFiles = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // ตรวจสอบจำนวนไฟล์
    if (previews.length >= 3) {
      const confirmReplace = window.confirm(t.form.alert.replaceImage);
      if (confirmReplace) {
        const file = selectedFiles[0];
        try {
          const cloudUrl = await uploadToCloudinary(file);
          const updatedPreviews = [...previews];
          const removedUrl = updatedPreviews[0];
          updatedPreviews[0] = cloudUrl;
          setPreviews(updatedPreviews);
          // ตรวจสอบว่า onChange เป็น function และส่ง array ที่ถูกต้อง
          if (typeof onChange === 'function') {
            onChange(updatedPreviews.filter(url => url && typeof url === 'string'));
          }
          if (removedUrl) {
            deleteFromCloudinary(removedUrl);
          }
        } catch (err) {
          console.error("Upload error:", err);
          alert(t.form.alert.uploadError + ": " + err.message);
        }
      }
      return;
    }

    const remainingSlots = 3 - previews.length;
    const filesToAdd = selectedFiles.slice(0, remainingSlots);
    const newPreviews = [...previews];
    const newFiles = [...files];

    for (const file of filesToAdd) {
      try {
        const cloudUrl = await uploadToCloudinary(file);
        if (cloudUrl && typeof cloudUrl === 'string') {
          newPreviews.push(cloudUrl);
        }
      } catch (err) {
        console.error("Upload error:", err);
        alert(t.form.alert.uploadError + ": " + err.message);
      }
    }

    setPreviews(newPreviews);
    setFiles([...newFiles, ...filesToAdd]);
    
    // ตรวจสอบว่า onChange เป็น function และส่ง array ที่ถูกต้อง
    if (typeof onChange === 'function') {
      onChange(newPreviews.filter(url => url && typeof url === 'string'));
    }
  };

  const removeImage = (index) => {
    const newPreviews = [...previews];
    const removedUrl = newPreviews[index];

    newPreviews.splice(index, 1);
    setPreviews(newPreviews);
    
    // ตรวจสอบว่า onChange เป็น function และส่ง array ที่ถูกต้อง
    if (typeof onChange === 'function') {
      onChange(newPreviews.filter(url => url && typeof url === 'string'));
    }

    if (removedUrl && typeof removedUrl === 'string') {
      deleteFromCloudinary(removedUrl);
    }
  };

  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text text-sm font-medium text-gray-800">
         {t.form.uploadImage}
        </span>
      </label>
      <div className="w-full flex items-center rounded-md border border-blue-200 bg-blue-50 px-4 py-2">
        <label className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none cursor-pointer">
          {t.form.chooseImage}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            className="hidden"
          />
        </label>
        <span className="ml-4 text-sm text-gray-600">
          {previews.length > 0 ? `${previews.length} ${t.form.filesUploaded}` : t.form.noImageAttached}
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {t.form.imageSupport}
      </p>

      {previews.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-3">
          {previews.map((p, index) => (
            <div key={index} className="relative group">
              <Image
                src={p}
                alt={`preview-${index}`}
                width={300}
                height={96}
                className="w-full h-24 object-cover rounded border border-gray-300 p-1 bg-white shadow-sm"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs hover:bg-red-600 transition"
                title="ลบภาพ"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUploads;
