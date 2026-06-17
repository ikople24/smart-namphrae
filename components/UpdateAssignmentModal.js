import Image from "next/image";
import ImageUploads from "./ImageUploads";
import { useState, useEffect } from "react";
import { useAdminOptionsStore } from "../stores/useAdminOptionsStore";
import { completedAtToDateInputValue } from "@/utils/assignmentCompletedAt";

export default function UpdateAssignmentModal({ assignment, onClose }) {
  const [note, setNote] = useState(assignment.note || "");
  const [solution, setSolution] = useState(assignment.solution || []);
  const [solutionImages, setSolutionImages] = useState([]);
  const [completedAt, setCompletedAt] = useState(
    completedAtToDateInputValue(assignment.completedAt)
  );
  const { adminOptions } = useAdminOptionsStore();

  const handleRemoveImage = (indexToRemove) => {
    setSolutionImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  useEffect(() => {
    setNote(assignment.note || "");
    setSolution(Array.isArray(assignment.solution) ? assignment.solution : []);
    setSolutionImages(assignment.solutionImages || []);
    setCompletedAt(completedAtToDateInputValue(assignment.completedAt));
  }, [assignment]);

  useEffect(() => {
    const fetchAdminOptions = async () => {
      try {
        const res = await fetch("/api/admin-options");
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          useAdminOptionsStore.getState().setAdminOptions(data);
        } else {
          console.error("Admin options response is invalid:", data);
        }
      } catch (error) {
        console.error("Error fetching admin options:", error);
      }
    };
    fetchAdminOptions();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/assignments/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: assignment._id,
          note,
          solution,
          solutionImages,
          completedAt,
        }),
      });
      if (!res.ok) throw new Error("Failed to update assignment");
      alert("อัปเดตงานสำเร็จ");
      onClose();
      window.location.reload();
    } catch (err) {
      console.error("Error updating assignment:", err);
      alert("เกิดข้อผิดพลาดในการอัปเดต");
    }
  };

  const filteredOptions = adminOptions.filter(
    (opt) =>
      opt.menu_category === assignment.category || solution.includes(opt.label)
  );

  return (
    <dialog className="modal modal-open">
      <div className="modal-box w-full max-w-2xl flex flex-col max-h-[90vh] p-0">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">อัปเดตการดำเนินการ</h2>
          {assignment.category && (
            <p className="text-sm text-gray-400 mt-0.5">หมวดหมู่: {assignment.category}</p>
          )}
        </div>

        {/* Scrollable form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* วิธีการแก้ไข */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">วิธีการแก้ไข</p>
              {filteredOptions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {filteredOptions.map((opt) => {
                    const isSelected = solution.includes(opt.label);
                    return (
                      <button
                        key={opt._id}
                        type="button"
                        className={`btn btn-sm gap-1.5 ${
                          isSelected
                            ? "btn-info font-semibold"
                            : "btn-outline text-gray-600"
                        }`}
                        onClick={() =>
                          setSolution((prev) =>
                            prev.includes(opt.label)
                              ? prev.filter((item) => item !== opt.label)
                              : [...prev, opt.label]
                          )
                        }
                      >
                        {isSelected && <span className="text-xs leading-none">✓</span>}
                        <Image
                          src={opt.icon_url}
                          alt={opt.label}
                          width={20}
                          height={20}
                          className="w-5 h-5"
                        />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400">ไม่มีตัวเลือกสำหรับหมวดหมู่นี้</p>
              )}
            </div>

            <div className="divider my-0"></div>

            {/* หมายเหตุ */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">หมายเหตุ</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows="3"
                placeholder="บันทึกรายละเอียดการดำเนินการ..."
                className="textarea textarea-bordered w-full"
              />
            </div>

            <div className="divider my-0"></div>

            {/* ภาพถ่าย */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ภาพถ่ายการดำเนินการ
                {solutionImages.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-gray-400">({solutionImages.length} รูป)</span>
                )}
              </label>
              <ImageUploads
                initialUrls={solutionImages}
                onChange={(urls) => setSolutionImages(urls)}
              />
              {solutionImages.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
                  {solutionImages.map((url, index) => (
                    <div key={index} className="relative group">
                      <Image
                        src={url}
                        alt={`ภาพ ${index + 1}`}
                        width={120}
                        height={80}
                        className="w-full h-20 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 btn btn-xs btn-error btn-circle opacity-0 group-hover:opacity-100 transition-opacity"
                        title="ลบภาพ"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="divider my-0"></div>

            {/* วันที่ */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">วันที่ดำเนินการเสร็จสิ้น</label>
              <input
                type="date"
                value={completedAt}
                onChange={(e) => setCompletedAt(e.target.value)}
                className="input input-bordered w-full md:w-56"
              />
            </div>

          </div>

          {/* Sticky footer */}
          <div className="px-6 py-4 border-t shrink-0 flex justify-end gap-2 bg-base-100">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              ยกเลิก
            </button>
            <button type="submit" className="btn btn-primary">
              บันทึก
            </button>
          </div>
        </form>

      </div>
      <style jsx global>{`
        input[type="file"]::-webkit-file-upload-button {
          visibility: hidden;
        }
        input[type="file"]::before {
          content: "เลือกรูปภาพ";
          display: inline-block;
          background: #00bfff;
          border: 1px solid #00bfff;
          padding: 0.4rem 0.75rem;
          outline: none;
          white-space: nowrap;
          cursor: pointer;
          font-weight: 500;
          color: white;
          border-radius: 0.375rem;
          font-size: 0.85rem;
          margin-right: 0.5rem;
          max-width: 120px;
        }
        input[type="file"]:hover::before {
          background: #00ace6;
        }
      `}</style>
    </dialog>
  );
}
