import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import Head from "next/head";
import useComplaintStore from "@/stores/useComplaintStore";
import { useMenuStore } from "@/stores/useMenuStore";
import UpdateAssignmentModal from "@/components/UpdateAssignmentModal"; // สร้าง component นี้แยกต่างหาก
import EditUserModal from "@/components/EditUserModal";
import NotificationStatus from "@/components/NotificationStatus";

const LocationPickerModal = dynamic(() => import("@/components/LocationPickerModal"), {
  ssr: false,
});

export default function ManageComplaintsPage() {
  const { complaints, fetchComplaints } = useComplaintStore();
  const { menu, fetchMenu } = useMenuStore();
  const { user } = useUser();
  const { getToken, userId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [existingUser, setExistingUser] = useState(null);
  const [assignmentCreated, setAssignmentCreated] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  
  // ตัวกรอง
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchAssignments = async () => {
    try {
      const response = await fetch("/api/assignments");
      const data = await response.json();
      setAssignments(data);
    } catch (error) {
      console.error("Error fetching assignments:", error);
    }
  };

  useEffect(() => {
    fetchComplaints();
    fetchMenu(); // fetch menu with icons
    // Fetch assignments
    fetchAssignments();
  }, [fetchComplaints, fetchMenu]);



  useEffect(() => {
    const checkUser = async () => {
      if (!userId) return;

      try {
        const token = await getToken();
        const clerkId = userId;
        const res = await fetch("/api/users/get-by-clerkId", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (res.ok && data.user) {
          setExistingUser(data.user);
        }
      } catch (error) {
        console.error("Error checking user:", error);
      }
    };
    checkUser();
  }, [userId, getToken]);

  const handleAssign = async (complaintId) => {
    try {
      const res = await fetch("/api/assignments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaintId: complaintId,
          userId: existingUser?._id, // ใช้จาก MongoDB ไม่ใช่ Clerk
        }),
      });

      if (!res.ok) throw new Error("Failed to assign complaint");
      const result = await res.json();

      setAssignmentCreated(true);
      alert("รับงานสำเร็จ");
      fetchAssignments(); // Refresh the assignments list immediately
    } catch (error) {
      console.error("❌ Error assigning complaint:", error);
      alert("เกิดข้อผิดพลาดในการรับงาน");
    }
  };

  const handleCloseComplaint = async (complaintId) => {
    try {
      const res = await fetch(`/api/submittedreports/update-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaintId, status: "ดำเนินการเสร็จสิ้น" }),
      });
      if (!res.ok) throw new Error("Failed to close complaint");
      alert("ปิดเรื่องเรียบร้อยแล้ว");
      fetchComplaints(); // รีเฟรชข้อมูลใหม่
    } catch (error) {
      console.error("❌ Error closing complaint:", error);
      alert("เกิดข้อผิดพลาดในการปิดเรื่อง");
    }
  };

  const handleReopenComplaint = async (complaintId) => {
    try {
      const res = await fetch(`/api/submittedreports/reopen-complaint`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaintId }),
      });
      if (!res.ok) throw new Error("Failed to reopen complaint");
      alert("เปิดเรื่องใหม่เรียบร้อยแล้ว");
      fetchComplaints(); // รีเฟรชข้อมูลใหม่
    } catch (error) {
      console.error("❌ Error reopening complaint:", error);
      alert("เกิดข้อผิดพลาดในการเปิดเรื่องใหม่");
    }
  };

  const handleOpenUpdateForm = (assignment) => {
    const complaint = complaints.find((c) => c._id === assignment.complaintId);
    const assignmentWithCategory = { ...assignment, category: complaint?.category };
    setSelectedAssignment(assignmentWithCategory);
    setShowUpdateModal(true);
  };

  const handleResendNotification = async (complaintId) => {
    try {

      
      if (!complaintId) {
        throw new Error("ไม่พบ complaintId");
      }

      

      const confirmed = confirm("คุณแน่ใจหรือไม่ว่าต้องการส่งแจ้งเตือนอีกครั้ง?");
      if (!confirmed) return;

              setLoading(true);
      
      const res = await fetch("/api/submittedreports/resend-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaintId }),
      });

      

      if (!res.ok) {
        let errorMessage = "Failed to resend notification";
        let errorDetails = {};
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
          errorDetails = errorData;
        } catch (parseError) {
          console.error("❌ Failed to parse error response:", parseError);
        }
        
        console.error("❌ API Error Details:", errorDetails);
        
        if (errorDetails.searchedId) {
          errorMessage += `\n\nSearched ID: ${errorDetails.searchedId}`;
        }
        
        if (errorDetails.sampleComplaints) {
          errorMessage += `\n\nSample complaints in database:`;
          errorDetails.sampleComplaints.forEach((c, i) => {
            errorMessage += `\n${i + 1}. _id: ${c._id}, complaintId: ${c.complaintId || 'N/A'}, name: ${c.fullName}`;
          });
        }
        
        throw new Error(errorMessage);
      }

      const result = await res.json();
      
      alert("ส่งแจ้งเตือนอีกครั้งสำเร็จ");
      
      // รีเฟรชข้อมูลใหม่
      fetchComplaints();
    } catch (error) {
      console.error("❌ Error resending notification:", error);
      alert("เกิดข้อผิดพลาดในการส่งแจ้งเตือน: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestN8nConnection = async () => {
    try {
      setLoading(true);

      
      const res = await fetch("/api/test-n8n-connection");
      const result = await res.json();
      
      if (result.success) {
        alert("✅ การเชื่อมต่อ n8n สำเร็จ\n\nสถานะ: " + result.status + "\nข้อความ: " + result.message);
      } else {
        alert("❌ การเชื่อมต่อ n8n ล้มเหลว\n\nข้อผิดพลาด: " + result.error + "\nรายละเอียด: " + result.details);
      }
    } catch (error) {
      console.error("❌ Error testing n8n connection:", error);
      alert("เกิดข้อผิดพลาดในการทดสอบการเชื่อมต่อ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestComplaintData = async () => {
    try {
      setLoading(true);

      
      const res = await fetch("/api/test-complaint-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const result = await res.json();
      
      if (result.success) {
        alert("✅ การส่งข้อมูลทดสอบสำเร็จ\n\nสถานะ: " + result.status + "\nข้อความ: " + result.message);
      } else {
        alert("❌ การส่งข้อมูลทดสอบล้มเหลว\n\nข้อผิดพลาด: " + result.error + "\nรายละเอียด: " + result.details);
      }
    } catch (error) {
      console.error("❌ Error testing complaint data:", error);
      alert("เกิดข้อผิดพลาดในการทดสอบข้อมูล: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันกรองข้อมูล
  const getFilteredComplaints = () => {
    return complaints
      .filter((complaint) => {
        // กรองตามประเภท
        if (categoryFilter && complaint.category !== categoryFilter) {
          return false;
        }
        
        // กรองตามสถานะ
        if (statusFilter) {
          if (statusFilter === "ดำเนินการเสร็จสิ้น") {
            if (complaint.status !== "ดำเนินการเสร็จสิ้น") {
              return false;
            }
          } else if (statusFilter === "อยู่ระหว่างดำเนินการ") {
            if (complaint.status !== "อยู่ระหว่างดำเนินการ") {
              return false;
            }
          } else if (statusFilter === "ยังไม่ได้รับมอบหมาย") {
            const isAssigned = assignments.some((a) => a.complaintId === complaint._id);
            if (isAssigned) {
              return false;
            }
          } else if (statusFilter === "ได้รับมอบหมายแล้ว") {
            const isAssigned = assignments.some((a) => a.complaintId === complaint._id);
            if (!isAssigned) {
              return false;
            }
          } else if (statusFilter === "ปิดแล้วแต่ยังไม่มีวันที่เสร็จสิ้น") {
            const assignment = assignments.find((a) => a.complaintId === complaint._id);
            const isClosedWithoutCompletion = complaint.status === "ดำเนินการเสร็จสิ้น" && assignment && !assignment.completedAt;
            if (!isClosedWithoutCompletion) {
              return false;
            }
          } else if (statusFilter === "ปิดแล้วแต่ยังไม่มีรูปการดำเนินการ") {
            const assignment = assignments.find((a) => a.complaintId === complaint._id);
            const isClosedWithoutImages = complaint.status === "ดำเนินการเสร็จสิ้น" && assignment && (!assignment.solutionImages || assignment.solutionImages.length === 0);
            if (!isClosedWithoutImages) {
              return false;
            }
          }
        }
        
        // กรองตามคำค้นหา
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const detailMatch = complaint.detail?.toLowerCase().includes(searchLower);
          const nameMatch = complaint.fullName?.toLowerCase().includes(searchLower);
          const categoryMatch = complaint.category?.toLowerCase().includes(searchLower);
          const complaintIdMatch = complaint.complaintId?.toLowerCase().includes(searchLower);
          
          if (!detailMatch && !nameMatch && !categoryMatch && !complaintIdMatch) {
            return false;
          }
        }
        
        return true;
      })
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  };

  // ฟังก์ชันล้างตัวกรอง
  const clearFilters = () => {
    setCategoryFilter("");
    setStatusFilter("");
    setSearchTerm("");
  };


 

  return (
    <>
      <Head>
        <title>จัดการเรื่องร้องเรียน - Admin</title>
      </Head>
      <div className="p-6 max-w-full mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">จัดการเรื่องร้องเรียน</h1>
            <p className="text-sm text-gray-600 mt-1">
              💡 <strong>ฟีเจอร์ใหม่:</strong> Admin สามารถแก้ไขข้อมูลและภาพปัญหาได้แล้ว! 
              กดปุ่ม "แก้ไขข้อมูล" เพื่อแก้ไขข้อมูลผู้แจ้งและภาพที่ไม่เหมาะสม (ใช้งานได้ทั้งเรื่องที่เปิดและปิดแล้ว)
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-outline btn-info btn-sm"
              onClick={handleTestN8nConnection}
              disabled={loading}
              title="ทดสอบการเชื่อมต่อ n8n"
            >
              {loading ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                "🧪 ทดสอบ n8n"
              )}
            </button>
            <button
              className="btn btn-outline btn-warning btn-sm"
              onClick={handleTestComplaintData}
              disabled={loading}
              title="ทดสอบการส่งข้อมูล"
            >
              {loading ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                "📤 ทดสอบข้อมูล"
              )}
            </button>
            <button
              className="btn btn-outline btn-info btn-sm"
              onClick={async () => {
                try {
                  const res = await fetch('/api/test-complaint-data');
                  const data = await res.json();

                  alert(`ข้อมูลตัวอย่าง: ${data.count} รายการ\nดูข้อมูลใน Console`);
                } catch (error) {
                  console.error('Test error:', error);
                  alert('เกิดข้อผิดพลาดในการทดสอบ');
                }
              }}
              title="ทดสอบข้อมูลฐานข้อมูล"
            >
              🗄️ ทดสอบ DB
            </button>
          </div>
        </div>
        
        {/* ส่วนตัวกรอง */}
        <div className="bg-base-200 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* ค้นหา */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">ค้นหา</span>
              </label>
              <input
                type="text"
                placeholder="ค้นหาจากรายละเอียด, ชื่อ, ประเภท, ID..."
                className="input input-bordered input-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* กรองตามประเภท */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">ประเภท</span>
              </label>
              <select
                className="select select-bordered select-sm"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">ทุกประเภท</option>
                {menu.map((item) => (
                  <option key={item.Prob_name} value={item.Prob_name}>
                    {item.Prob_name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* กรองตามสถานะ */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">สถานะ</span>
              </label>
              <select
                className="select select-bordered select-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">ทุกสถานะ</option>
                <option value="อยู่ระหว่างดำเนินการ">อยู่ระหว่างดำเนินการ</option>
                <option value="ดำเนินการเสร็จสิ้น">ดำเนินการเสร็จสิ้น</option>
                <option value="ยังไม่ได้รับมอบหมาย">ยังไม่ได้รับมอบหมาย</option>
                <option value="ได้รับมอบหมายแล้ว">ได้รับมอบหมายแล้ว</option>
                <option value="ปิดแล้วแต่ยังไม่มีวันที่เสร็จสิ้น">ปิดแล้วแต่ยังไม่มีวันที่เสร็จสิ้น</option>
                <option value="ปิดแล้วแต่ยังไม่มีรูปการดำเนินการ">ปิดแล้วแต่ยังไม่มีรูปการดำเนินการ</option>
              </select>
            </div>
            
            {/* ปุ่มล้างตัวกรอง */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">&nbsp;</span>
              </label>
              <button
                className="btn btn-outline btn-sm"
                onClick={clearFilters}
              >
                ล้างตัวกรอง
              </button>
            </div>
          </div>
          
          {/* แสดงจำนวนผลลัพธ์ */}
          <div className="mt-4 text-sm text-gray-600">
            แสดง {getFilteredComplaints().length} จาก {complaints.length} เรื่อง
            {(categoryFilter || statusFilter || searchTerm) && (
              <span className="ml-2 text-warning">
                (กรองแล้ว)
              </span>
            )}
          </div>
          
          {/* แสดงสถิติสถานะ */}
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {(() => {
              const stats = {
                total: complaints.length,
                filtered: getFilteredComplaints().length,
                assigned: complaints.filter(c => assignments.some(a => a.complaintId === c._id)).length,
                unassigned: complaints.filter(c => !assignments.some(a => a.complaintId === c._id)).length,
                completed: complaints.filter(c => c.status === "ดำเนินการเสร็จสิ้น").length,
                closedWithoutDate: complaints.filter(c => {
                  const assignment = assignments.find(a => a.complaintId === c._id);
                  return c.status === "ดำเนินการเสร็จสิ้น" && assignment && !assignment.completedAt;
                }).length,
                closedWithoutImages: complaints.filter(c => {
                  const assignment = assignments.find(a => a.complaintId === c._id);
                  return c.status === "ดำเนินการเสร็จสิ้น" && assignment && (!assignment.solutionImages || assignment.solutionImages.length === 0);
                }).length
              };
              
              return (
                <>
                  <span className="badge badge-ghost badge-sm">ทั้งหมด: {stats.total}</span>
                  {(categoryFilter || statusFilter || searchTerm) && (
                    <span className="badge badge-primary badge-sm">แสดง: {stats.filtered}</span>
                  )}
                  <span className="badge badge-info badge-sm">ได้รับมอบหมาย: {stats.assigned}</span>
                  <span className="badge badge-ghost badge-sm">ยังไม่ได้รับมอบหมาย: {stats.unassigned}</span>
                  <span className="badge badge-success badge-sm">เสร็จสิ้น: {stats.completed}</span>
                  {stats.closedWithoutDate > 0 && (
                    <span className="badge badge-warning badge-sm">ปิดแล้วแต่ยังไม่มีวันที่: {stats.closedWithoutDate}</span>
                  )}
                  {stats.closedWithoutImages > 0 && (
                    <span className="badge badge-warning badge-sm">ปิดแล้วแต่ยังไม่มีรูป: {stats.closedWithoutImages}</span>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {getFilteredComplaints().length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">
              {complaints.length === 0 ? (
                <p>ไม่มีข้อมูลเรื่องร้องเรียน</p>
              ) : (
                <p>ไม่พบเรื่องร้องเรียนที่ตรงกับเงื่อนไขการค้นหา</p>
              )}
            </div>
            {(categoryFilter || statusFilter || searchTerm) && (
              <button
                className="btn btn-outline btn-sm"
                onClick={clearFilters}
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>หมวดหมู่</th>
                  <th>ภาพปัญหา</th>
                  <th>หัวข้อ</th>
                  <th>สถานะ</th>
                  <th>อัปเดตล่าสุด</th>
                  <th>แจ้งเตือน</th>
                  <th>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredComplaints().map((complaint, index) => {

                  
                  const isAssigned = assignments.some(
                    (a) => a.complaintId === complaint._id
                  );
                  const isClosed = complaint.status === "ดำเนินการเสร็จสิ้น";
                  return (
                    <tr key={complaint._id}>
                      <td className="text-center text-sm">
                        <div className="flex flex-col items-center justify-center">
                          {menu.find((m) => m.Prob_name === complaint.category)?.Prob_pic ? (
                            <img
                              src={
                                menu.find((m) => m.Prob_name === complaint.category)?.Prob_pic
                              }
                              alt={complaint.category}
                              className="w-10 h-10 object-contain mb-1"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-200 rounded mb-1 flex items-center justify-center">
                              <span className="text-xs text-gray-500">?</span>
                            </div>
                          )}
                          <span className="text-sm leading-tight text-center font-medium truncate max-w-[8rem]">
                            {complaint.category || "ไม่ระบุ"}
                          </span>
                        </div>
                      </td>
                      <td className="text-center text-sm">
                        {Array.isArray(complaint.images) && complaint.images.length > 0 ? (
                          <div className="flex flex-col items-center">
                            <img
                              src={complaint.images[0]}
                              alt="ภาพปัญหา"
                              className="w-16 h-16 object-cover rounded border"
                            />
                            {complaint.images.length > 1 && (
                              <div className="text-xs text-gray-500 mt-1">
                                +{complaint.images.length - 1} รูป
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">ไม่มีภาพ</div>
                        )}
                      </td>
                      <td className="text-sm w-64 max-w-xs">
                        <div className="font-medium mb-1 break-words">
                          {(() => {
                            const detail = complaint.detail || "";
                            // จำกัดความยาวข้อความ
                            if (detail.length > 100) {
                              const truncated = detail.substring(0, 100) + "...";
                              // แปลง URL เป็นลิงก์
                              const urlRegex = /(https?:\/\/[^\s]+)/g;
                              const parts = truncated.split(urlRegex);
                              return parts.map((part, index) => {
                                if (part.match(urlRegex)) {
                                  return (
                                    <a
                                      key={index}
                                      href={part}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 underline break-all"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {part.length > 30 ? part.substring(0, 30) + "..." : part}
                                    </a>
                                  );
                                }
                                return part;
                              });
                            }
                            // แปลง URL เป็นลิงก์สำหรับข้อความเต็ม
                            const urlRegex = /(https?:\/\/[^\s]+)/g;
                            const parts = detail.split(urlRegex);
                            return parts.map((part, index) => {
                              if (part.match(urlRegex)) {
                                return (
                                  <a
                                    key={index}
                                    href={part}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline break-all"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {part.length > 50 ? part.substring(0, 50) + "..." : part}
                                  </a>
                                );
                              }
                              return part;
                            });
                          })()}
                        </div>

                        <div className="text-xs text-gray-400 mt-2">
                          ID: {complaint.complaintId || complaint._id.toString().slice(-6)}
                        </div>

                      </td>
                      <td className="text-sm">
                        <div className="flex flex-col gap-1">
                          {(() => {
                            const assignment = assignments.find((a) => a.complaintId === complaint._id);
                            const isAssigned = assignment !== undefined;
                            const isClosed = complaint.status === "ดำเนินการเสร็จสิ้น";
                            const isClosedWithoutCompletion = isClosed && assignment && !assignment.completedAt;
                            
                            if (isClosedWithoutCompletion) {
                              return (
                                                          <>
                            <div className="badge badge-warning badge-sm w-fit">ปิดแล้ว</div>
                            <div className="text-xs text-warning font-medium">
                              ⚠️ {(() => {
                                const assignment = assignments.find((a) => a.complaintId === complaint._id);
                                const hasNoCompletionDate = assignment && !assignment.completedAt;
                                const hasNoSolutionImages = assignment && (!assignment.solutionImages || assignment.solutionImages.length === 0);
                                
                                if (hasNoCompletionDate && hasNoSolutionImages) {
                                  return "ยังไม่มีวันที่เสร็จสิ้นและรูปการดำเนินการ";
                                } else if (hasNoCompletionDate) {
                                  return "ยังไม่มีวันที่เสร็จสิ้น";
                                } else if (hasNoSolutionImages) {
                                  return "ยังไม่มีรูปการดำเนินการ";
                                }
                                return "ยังไม่มีวันที่เสร็จสิ้น";
                              })()}
                            </div>
                          </>
                              );
                            } else if (isClosed) {
                              return (
                                <>
                                  <div className="badge badge-success badge-sm w-fit">เสร็จสิ้น</div>
                                  {assignment && assignment.completedAt && (
                                    <div className="text-xs text-success font-medium">
                                      เสร็จสิ้น: {new Date(assignment.completedAt).toLocaleDateString("th-TH")}
                                    </div>
                                  )}
                                </>
                              );
                            } else if (isAssigned) {
                              return (
                                <>
                                  <div className="badge badge-info badge-sm w-fit">ได้รับมอบหมาย</div>
                                  <div className="text-xs text-info font-medium">อยู่ระหว่างดำเนินการ</div>
                                </>
                              );
                            } else {
                              return (
                                <>
                                  <div className="badge badge-ghost badge-sm w-fit">ยังไม่ได้รับมอบหมาย</div>
                                  <div className="text-xs text-gray-500 font-medium">รอการมอบหมาย</div>
                                </>
                              );
                            }
                          })()}
                        </div>
                      </td>
                      <td className="text-sm">
                        {new Date(complaint.updatedAt).toLocaleDateString("th-TH")}
                      </td>
                      <td className="text-sm text-center">
                        <div className="flex flex-col items-center space-y-1">
                          <NotificationStatus
                            notificationCount={complaint.notificationCount || 0}
                            lastNotificationSent={complaint.lastNotificationSent}
                            onResend={() => {
                              const idToSend = complaint.complaintId || complaint._id;

                              handleResendNotification(idToSend);
                            }}
                            loading={loading}
                            disabled={false}
                          />
                        </div>
                      </td>
                      <td className="flex gap-2 flex-wrap">
                        {!isClosed ? (
                          isAssigned ? (
                            <>
                              <button
                                className="btn btn-info btn-sm"
                                onClick={() =>
                                  handleOpenUpdateForm(
                                    assignments.find((a) => a.complaintId === complaint._id)
                                  )
                                }
                              >
                                อัพเดท
                              </button>
                              <button
                                className="btn btn-warning btn-sm"
                                onClick={() => {
                                  setSelectedAssignment(complaint);
                                  setShowEditUserModal(true);
                                }}
                                title="แก้ไขข้อมูลผู้แจ้งและภาพปัญหา"
                              >
                                แก้ไขข้อมูล
                              </button>
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleCloseComplaint(complaint._id)}
                              >
                                ปิดเรื่อง
                              </button>

                            </>
                          ) : (
                            <>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleAssign(complaint._id)}
                                disabled={loading}
                              >
                                รับเรื่อง
                              </button>

                            </>
                          )
                        ) : (
                          <>
                            <span className="text-gray-400 text-xs italic mr-2">เรื่องร้องเรียนนี้ถูกปิดแล้ว</span>
                            {/* ตรวจสอบว่ามี assignment และยังไม่มีวันที่ดำเนินการสำเร็จหรือไม่ */}
                            {(() => {
                              const assignment = assignments.find((a) => a.complaintId === complaint._id);
                              const hasNoCompletionDate = assignment && !assignment.completedAt;
                              const hasNoSolutionImages = assignment && (!assignment.solutionImages || assignment.solutionImages.length === 0);
                              
                              if (hasNoCompletionDate || hasNoSolutionImages) {
                                return (
                                  <div className="flex flex-col gap-2">
                                    <button
                                      className="btn btn-warning btn-sm"
                                      onClick={() => {
                                        const confirmed = confirm("คุณต้องการเปิดเรื่องใหม่เพื่อแก้ไขรายละเอียดหรือไม่?");
                                        if (confirmed) {
                                          handleReopenComplaint(complaint._id);
                                        }
                                      }}
                                    >
                                      เปิดเรื่องใหม่
                                    </button>
                                    <button
                                      className="btn btn-info btn-sm"
                                      onClick={() => {
                                        const assignmentWithCategory = { ...assignment, category: complaint?.category };
                                        setSelectedAssignment(assignmentWithCategory);
                                        setShowUpdateModal(true);
                                      }}
                                    >
                                      แก้ไขรายละเอียด
                                    </button>
                                    <button
                                      className="btn btn-warning btn-sm"
                                      onClick={() => {
                                        setSelectedAssignment(complaint);
                                        setShowEditUserModal(true);
                                      }}
                                      title="แก้ไขข้อมูลผู้แจ้งและภาพปัญหา"
                                    >
                                      แก้ไขข้อมูล
                                    </button>
                                    <button
                                      className="btn btn-error btn-sm"
                                      onClick={() => {
                                        const confirmed = confirm("คุณแน่ใจหรือไม่ว่าต้องการลบเรื่องนี้?");
                                        if (confirmed) {
                                          fetch(`/api/submittedreports/${complaint._id}`, {
                                            method: "DELETE",
                                          })
                                            .then(async (res) => {
                                              if (!res.ok) {
                                                const errorText = await res.text();
                                                throw new Error(`ลบไม่สำเร็จ: ${errorText}`);
                                              }
                                              alert("ลบเรื่องสำเร็จ");
                                              fetchComplaints();
                                            })
                                            .catch((err) => {
                                              console.error("❌ ลบไม่สำเร็จ:", err);
                                              alert("เกิดข้อผิดพลาดในการลบ");
                                            });
                                        }
                                      }}
                                    >
                                      ลบเรื่อง
                                    </button>
                                  </div>
                                );
                              } else {
                                return (
                                  <div className="flex flex-col gap-2">
                                    <button
                                      className="btn btn-warning btn-sm"
                                      onClick={() => {
                                        setSelectedAssignment(complaint);
                                        setShowEditUserModal(true);
                                      }}
                                      title="แก้ไขข้อมูลผู้แจ้งและภาพปัญหา"
                                    >
                                      แก้ไขข้อมูล
                                    </button>
                                    <button
                                      className="btn btn-error btn-sm"
                                      onClick={() => {
                                        const confirmed = confirm("คุณแน่ใจหรือไม่ว่าต้องการลบเรื่องนี้?");
                                        if (confirmed) {
                                          fetch(`/api/submittedreports/${complaint._id}`, {
                                            method: "DELETE",
                                          })
                                            .then(async (res) => {
                                              if (!res.ok) {
                                                const errorText = await res.text();
                                                throw new Error(`ลบไม่สำเร็จ: ${errorText}`);
                                              }
                                              alert("ลบเรื่องสำเร็จ");
                                              fetchComplaints();
                                            })
                                            .catch((err) => {
                                              alert("เกิดข้อผิดพลาดในการลบ");
                                            });
                                        }
                                      }}
                                    >
                                      ลบเรื่อง
                                    </button>
                                  </div>
                                );
                              }
                            })()}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showUpdateModal && selectedAssignment && (
        <UpdateAssignmentModal
          assignment={selectedAssignment}
          onClose={() => setShowUpdateModal(false)}
        />
      )}
      {showEditUserModal && (
        <EditUserModal
          isOpen={showEditUserModal}
          onClose={() => setShowEditUserModal(false)}
          complaint={selectedAssignment}
        />
      )}
    </>
  );
}
