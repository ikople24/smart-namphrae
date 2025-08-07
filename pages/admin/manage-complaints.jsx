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
      console.log("Assignment created:", result);
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

  const handleOpenUpdateForm = (assignment) => {
    const complaint = complaints.find((c) => c._id === assignment.complaintId);
    const assignmentWithCategory = { ...assignment, category: complaint?.category };
    setSelectedAssignment(assignmentWithCategory);
    setShowUpdateModal(true);
  };

  const handleResendNotification = async (complaintId) => {
    try {
      console.log("🔄 Attempting to resend notification for:", complaintId);
      
      if (!complaintId) {
        throw new Error("ไม่พบ complaintId");
      }

      // ตรวจสอบว่า complaintId เป็น MongoDB ObjectId หรือ complaintId string
      console.log("🔍 ComplaintId type:", typeof complaintId, "Value:", complaintId);

      const confirmed = confirm("คุณแน่ใจหรือไม่ว่าต้องการส่งแจ้งเตือนอีกครั้ง?");
      if (!confirmed) return;

      setLoading(true);
      console.log("📤 Sending request to resend notification...");
      
      const res = await fetch("/api/submittedreports/resend-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaintId }),
      });

      console.log("📡 Response status:", res.status);

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
      console.log("✅ Notification resent successfully:", result);
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
      console.log("🧪 Testing n8n connection...");
      
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
      console.log("🧪 Testing complaint data...");
      
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


 

  return (
    <>
      <Head>
        <title>จัดการเรื่องร้องเรียน - Admin</title>
      </Head>
      <div className="p-6 max-w-full mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">จัดการเรื่องร้องเรียน</h1>
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
          </div>
        </div>
        {complaints.length === 0 ? (
          <p>ไม่มีข้อมูลเรื่องร้องเรียน</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>ลำดับ</th>
                  <th>หมวดหมู่</th>
                  <th>ภาพปัญหา</th>
                  <th>หัวข้อ</th>
                  <th>อัปเดตล่าสุด</th>
                  <th>แจ้งเตือน</th>
                  <th>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {complaints
                  .slice()
                  .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                  .map((complaint, index) => {
                  // Debug: Log complaint data for all complaints
                  console.log(`🔍 Complaint ${index + 1} data:`, {
                    _id: complaint._id,
                    complaintId: complaint.complaintId,
                    fullName: complaint.fullName,
                    category: complaint.category,
                    hasComplaintId: !!complaint.complaintId
                  });
                  
                  const isAssigned = assignments.some(
                    (a) => a.complaintId === complaint._id
                  );
                  const isClosed = complaint.status === "ดำเนินการเสร็จสิ้น";
                  return (
                    <tr key={complaint._id}>
                      <td className="text-center text-sm">{index + 1}</td>
                      <td className="text-center text-sm">
                        <div className="flex flex-col items-center justify-center">
                          {menu.find((m) => m.Prob_name === complaint.category)?.Prob_pic && (
                            <img
                              src={
                                menu.find((m) => m.Prob_name === complaint.category)?.Prob_pic
                              }
                              alt={complaint.category}
                              className="w-10 h-10 object-contain mb-1"
                            />
                          )}
                          <span className="truncate max-w-[6rem] text-sm leading-tight text-center">
                            {complaint.category}
                          </span>
                        </div>
                      </td>
                      <td className="text-center text-sm">
                        {Array.isArray(complaint.images) && complaint.images.length > 0 && (
                          <img
                            src={complaint.images[0]}
                            alt="ภาพปัญหา"
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                      </td>
                      <td className="text-sm max-w-xs overflow-hidden whitespace-nowrap text-ellipsis">
                        <div className="font-medium">
                          {complaint.detail}
                        </div>
                      </td>
                      <td className="text-sm">
                        {new Date(complaint.updatedAt).toLocaleDateString(
                          "th-TH"
                        )}
                      </td>
                      <td className="text-sm text-center">
                        <div className="flex flex-col items-center space-y-1">
                          <NotificationStatus
                            notificationCount={complaint.notificationCount || 0}
                            lastNotificationSent={complaint.lastNotificationSent}
                            onResend={() => {
                              const idToSend = complaint.complaintId || complaint._id;
                              console.log(`🔔 Resending notification for complaint ${index + 1}:`, {
                                complaintId: complaint.complaintId,
                                _id: complaint._id,
                                idToSend: idToSend
                              });
                              handleResendNotification(idToSend);
                            }}
                            loading={loading}
                            disabled={false}
                          />
                          <div className="text-xs text-gray-500">
                            ID: {complaint.complaintId || complaint._id.toString().slice(-6)}
                          </div>
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
                              >
                                แก้ไขผู้แจ้ง
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
