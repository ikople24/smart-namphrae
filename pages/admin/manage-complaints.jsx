import { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import Head from "next/head";
import {
  Download,
  Eye,
  LayoutGrid,
  List,
  Search,
} from "lucide-react";
import useComplaintStore from "@/stores/useComplaintStore";
import { useMenuStore } from "@/stores/useMenuStore";
import UpdateAssignmentModal from "@/components/UpdateAssignmentModal";
import EditUserModal from "@/components/EditUserModal";
import NotificationStatus from "@/components/NotificationStatus";

const CLOSED = "ดำเนินการเสร็จสิ้น";

function daysSince(dateVal) {
  if (!dateVal) return 0;
  return Math.floor((Date.now() - new Date(dateVal).getTime()) / 86400000);
}

function complaintKey(c) {
  return String(c._id);
}

function getAssignment(assignments, complaintId) {
  return assignments.find((a) => String(a.complaintId) === String(complaintId));
}

function complaintHeading(c) {
  if (c.problems?.[0]) return c.problems[0];
  const d = (c.detail || "").trim();
  if (!d) return "ไม่มีหัวข้อ";
  return d.length > 72 ? `${d.slice(0, 72)}…` : d;
}

function complaintSnippet(c) {
  const d = (c.detail || "").trim();
  if (!d) return "—";
  return d.length > 120 ? `${d.slice(0, 120)}…` : d;
}

function renderDetailWithLinks(text, maxLen) {
  const detail = text || "";
  const truncated = detail.length > maxLen ? `${detail.slice(0, maxLen)}…` : detail;
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
          {part.length > 36 ? `${part.slice(0, 36)}…` : part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function StatusBlock({ complaint, assignment }) {
  const isAssigned = !!assignment;
  const isClosed = complaint.status === CLOSED;
  const isClosedWithoutCompletion =
    isClosed && assignment && !assignment.completedAt;

  if (isClosedWithoutCompletion) {
    const hasNoCompletionDate = assignment && !assignment.completedAt;
    const hasNoSolutionImages =
      assignment &&
      (!assignment.solutionImages || assignment.solutionImages.length === 0);
    let msg = "ยังไม่มีวันที่เสร็จสิ้น";
    if (hasNoCompletionDate && hasNoSolutionImages) {
      msg = "ยังไม่มีวันที่เสร็จสิ้นและรูปการดำเนินการ";
    } else if (hasNoSolutionImages) {
      msg = "ยังไม่มีรูปการดำเนินการ";
    }
    return (
      <div className="flex flex-col gap-1">
        <span className="inline-flex w-fit rounded-full bg-amber-100 text-amber-900 px-2.5 py-0.5 text-xs font-medium">
          ปิดแล้ว
        </span>
        <span className="text-xs text-amber-700 font-medium">⚠️ {msg}</span>
      </div>
    );
  }
  if (isClosed) {
    return (
      <div className="flex flex-col gap-1">
        <span className="inline-flex w-fit rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-medium">
          เสร็จสิ้น
        </span>
        {assignment?.completedAt && (
          <span className="text-xs text-emerald-700">
            เสร็จสิ้น:{" "}
            {new Date(assignment.completedAt).toLocaleDateString("th-TH")}
          </span>
        )}
      </div>
    );
  }
  if (isAssigned) {
    return (
      <div className="flex flex-col gap-1">
        <span className="inline-flex w-fit rounded-full bg-sky-100 text-sky-900 px-2.5 py-0.5 text-xs font-medium">
          มอบหมายแล้ว
        </span>
        <span className="text-xs text-sky-800">อยู่ระหว่างดำเนินการ</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <span className="inline-flex w-fit rounded-full bg-amber-50 text-amber-900 px-2.5 py-0.5 text-xs font-medium border border-amber-200">
        รอรับมอบหมาย
      </span>
      <span className="text-xs text-gray-600">รอการมอบหมาย</span>
    </div>
  );
}

function ActionMenu({
  complaint,
  assignment,
  isAssigned,
  isClosed,
  loading,
  onAssign,
  onOpenUpdate,
  onEditUser,
  onClean,
  onCloseComplaint,
  onReopen,
  onDelete,
  onResend,
}) {
  return (
    <div className="dropdown dropdown-end">
      <label
        tabIndex={0}
        className="btn btn-ghost btn-sm btn-square text-slate-600 border border-slate-200 bg-white hover:bg-slate-50"
        title="จัดการ"
      >
        <Eye className="w-4 h-4" />
      </label>
      <ul
        tabIndex={0}
        className="dropdown-content z-[200] menu p-2 shadow-lg bg-base-100 rounded-box w-56 max-h-80 overflow-y-auto border border-slate-200 text-sm"
      >
        {!isClosed ? (
          isAssigned ? (
            <>
              <li>
                <button type="button" onClick={() => onOpenUpdate(assignment)}>
                  อัปเดตความคืบหน้า
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onEditUser(complaint)}>
                  แก้ไขข้อมูล
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onClean(complaint.complaintId)}
                >
                  ทำความสะอาด & ส่งแจ้งเตือน
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onResend(complaint)}>
                  ส่งแจ้งเตือนอีกครั้ง
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="text-success"
                  onClick={() => onCloseComplaint(complaint._id)}
                >
                  ปิดเรื่อง
                </button>
              </li>
            </>
          ) : (
            <li>
              <button
                type="button"
                className="text-primary font-medium"
                disabled={loading}
                onClick={() => onAssign(complaint._id)}
              >
                รับเรื่อง (มอบหมายให้ฉัน)
              </button>
            </li>
          )
        ) : (
          <>
            {(() => {
              const hasNoCompletionDate =
                assignment && !assignment.completedAt;
              const hasNoSolutionImages =
                assignment &&
                (!assignment.solutionImages ||
                  assignment.solutionImages.length === 0);
              if (hasNoCompletionDate || hasNoSolutionImages) {
                return (
                  <>
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            confirm(
                              "เปิดเรื่องใหม่เพื่อแก้ไขรายละเอียดหรือไม่?"
                            )
                          ) {
                            onReopen(complaint._id);
                          }
                        }}
                      >
                        เปิดเรื่องใหม่
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        onClick={() => onOpenUpdate(assignment)}
                      >
                        แก้ไขรายละเอียดงาน
                      </button>
                    </li>
                    <li>
                      <button type="button" onClick={() => onEditUser(complaint)}>
                        แก้ไขข้อมูล
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        onClick={() => onClean(complaint.complaintId)}
                      >
                        ทำความสะอาด & ส่งแจ้งเตือน
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="text-error"
                        onClick={() => onDelete(complaint._id)}
                      >
                        ลบเรื่อง
                      </button>
                    </li>
                  </>
                );
              }
              return (
                <>
                  <li>
                    <button type="button" onClick={() => onEditUser(complaint)}>
                      แก้ไขข้อมูล
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="text-error"
                      onClick={() => onDelete(complaint._id)}
                    >
                      ลบเรื่อง
                    </button>
                  </li>
                </>
              );
            })()}
          </>
        )}
      </ul>
    </div>
  );
}

export default function ManageComplaintsPage() {
  const { complaints, fetchComplaints } = useComplaintStore();
  const { menu, fetchMenu } = useMenuStore();
  const { user } = useUser();
  const { getToken, userId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [existingUser, setExistingUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState("");
  const [advancedStatusFilter, setAdvancedStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [mainTab, setMainTab] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");
  const [viewMode, setViewMode] = useState("list");
  const [followSub, setFollowSub] = useState("all");

  const fetchAssignments = useCallback(async () => {
    try {
      const response = await fetch("/api/assignments");
      const data = await response.json();
      setAssignments(data);
    } catch (error) {
      console.error("Error fetching assignments:", error);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
    fetchMenu();
    fetchAssignments();
  }, [fetchComplaints, fetchMenu, fetchAssignments]);

  useEffect(() => {
    const checkUser = async () => {
      if (!userId) return;
      try {
        const token = await getToken();
        const res = await fetch("/api/users/get-by-clerkId", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.user) setExistingUser(data.user);
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
          complaintId,
          userId: existingUser?._id,
        }),
      });
      if (!res.ok) throw new Error("Failed to assign complaint");
      alert("รับงานสำเร็จ");
      fetchAssignments();
    } catch (error) {
      console.error("Error assigning complaint:", error);
      alert("เกิดข้อผิดพลาดในการรับงาน");
    }
  };

  const handleCloseComplaint = async (complaintId) => {
    try {
      const res = await fetch(`/api/submittedreports/update-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaintId, status: CLOSED }),
      });
      if (!res.ok) throw new Error("Failed to close complaint");
      alert("ปิดเรื่องเรียบร้อยแล้ว");
      fetchComplaints();
    } catch (error) {
      console.error("Error closing complaint:", error);
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
      fetchComplaints();
    } catch (error) {
      console.error("Error reopening complaint:", error);
      alert("เกิดข้อผิดพลาดในการเปิดเรื่องใหม่");
    }
  };

  const handleOpenUpdateForm = (assignment) => {
    const c = complaints.find((x) => String(x._id) === String(assignment.complaintId));
    setSelectedAssignment({ ...assignment, category: c?.category });
    setShowUpdateModal(true);
  };

  const handleResendNotification = async (complaintId) => {
    try {
      if (!complaintId) throw new Error("ไม่พบ complaintId");
      if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการส่งแจ้งเตือนอีกครั้ง?")) return;
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
        } catch {
          /* ignore */
        }
        if (errorDetails.details && Array.isArray(errorDetails.details)) {
          errorMessage = `ข้อมูลไม่สมบูรณ์:\n${errorDetails.details.join("\n")}`;
        }
        throw new Error(errorMessage);
      }
      const result = await res.json();
      if (result.success) {
        alert(
          result.warning
            ? `${result.message}\n\n${result.warning}`
            : "ส่งแจ้งเตือนอีกครั้งสำเร็จ"
        );
      } else {
        alert(result.error || "เกิดข้อผิดพลาด");
      }
      fetchComplaints();
    } catch (error) {
      console.error("Error resending notification:", error);
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanComplaint = async (complaintId) => {
    try {
      setLoading(true);
      const res = await fetch("/api/clean-complaint-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaintId }),
      });
      const result = await res.json();
      if (result.success) {
        let message = `ทำความสะอาดข้อมูลสำหรับ ${complaintId}\n\n`;
        if (result.hasChanges) {
          message += "ทำความสะอาด detail สำเร็จ\n";
          (result.changes || []).forEach((ch, i) => {
            message += `${i + 1}. ${ch}\n`;
          });
        } else {
          message += "ไม่มีการเปลี่ยนแปลง detail\n";
        }
        alert(message);
        fetchComplaints();
      } else {
        alert(result.error || "การทำความสะอาดล้มเหลว");
      }
    } catch (error) {
      console.error("Error cleaning complaint:", error);
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComplaint = async (id) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบเรื่องนี้?")) return;
    try {
      const res = await fetch(`/api/submittedreports/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "ลบไม่สำเร็จ");
      }
      alert("ลบเรื่องสำเร็จ");
      fetchComplaints();
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการลบ");
    }
  };

  const stats = useMemo(() => {
    let waiting = 0;
    let inProg = 0;
    let done = 0;
    for (const c of complaints) {
      const a = getAssignment(assignments, c._id);
      const closed = c.status === CLOSED;
      if (closed) done += 1;
      else if (a) inProg += 1;
      else waiting += 1;
    }
    return {
      total: complaints.length,
      waiting,
      inProg,
      done,
    };
  }, [complaints, assignments]);

  const applyAdvancedFilter = (complaint) => {
    const a = getAssignment(assignments, complaint._id);
    const isAssigned = !!a;
    if (advancedStatusFilter === CLOSED) {
      return complaint.status === CLOSED;
    }
    if (advancedStatusFilter === "อยู่ระหว่างดำเนินการ") {
      return complaint.status === "อยู่ระหว่างดำเนินการ";
    }
    if (advancedStatusFilter === "ยังไม่ได้รับมอบหมาย") {
      return !isAssigned;
    }
    if (advancedStatusFilter === "ได้รับมอบหมายแล้ว") {
      return isAssigned;
    }
    if (advancedStatusFilter === "ปิดแล้วแต่ยังไม่มีวันที่เสร็จสิ้น") {
      return (
        complaint.status === CLOSED &&
        a &&
        !a.completedAt
      );
    }
    if (advancedStatusFilter === "ปิดแล้วแต่ยังไม่มีรูปการดำเนินการ") {
      return (
        complaint.status === CLOSED &&
        a &&
        (!a.solutionImages || a.solutionImages.length === 0)
      );
    }
    return true;
  };

  const applyMainTab = (complaint) => {
    const a = getAssignment(assignments, complaint._id);
    const closed = complaint.status === CLOSED;
    if (mainTab === "wait") return !closed && !a;
    if (mainTab === "progress") return !closed && !!a;
    if (mainTab === "done") return closed;
    return true;
  };

  const filteredComplaints = useMemo(() => {
    let list = complaints.filter((complaint) => {
      if (advancedStatusFilter) {
        if (!applyAdvancedFilter(complaint)) return false;
      } else if (!applyMainTab(complaint)) {
        return false;
      }
      if (categoryFilter && complaint.category !== categoryFilter) {
        return false;
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const detailMatch = complaint.detail?.toLowerCase().includes(q);
        const nameMatch = complaint.fullName?.toLowerCase().includes(q);
        const categoryMatch = complaint.category?.toLowerCase().includes(q);
        const idMatch = complaint.complaintId?.toLowerCase().includes(q);
        const communityMatch = complaint.community?.toLowerCase().includes(q);
        if (
          !detailMatch &&
          !nameMatch &&
          !categoryMatch &&
          !idMatch &&
          !communityMatch
        ) {
          return false;
        }
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      const ta = new Date(a.updatedAt).getTime();
      const tb = new Date(b.updatedAt).getTime();
      return sortOrder === "desc" ? tb - ta : ta - tb;
    });
    return list;
  }, [
    complaints,
    assignments,
    advancedStatusFilter,
    mainTab,
    categoryFilter,
    searchTerm,
    sortOrder,
  ]);

  // Pagination: จำกัดจำนวนแถวที่เรนเดอร์ต่อครั้ง (กันหน้าโหลดช้า)
  const PAGE_SIZE = 25;
  const [page, setPage] = useState(1); // 1-based

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, advancedStatusFilter, mainTab, searchTerm, sortOrder]);

  const totalFiltered = filteredComplaints.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const pagedComplaints = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return filteredComplaints.slice(start, end);
  }, [filteredComplaints, page]);
  const limitedGridComplaints = useMemo(() => {
    return filteredComplaints.slice(0, PAGE_SIZE);
  }, [filteredComplaints]);
  const visibleComplaints =
    viewMode === "list" ? pagedComplaints : limitedGridComplaints;

  // Pagination UI: แสดงหน้าได้สูงสุด 5 ค่า (เหมือนในภาพตัวอย่าง)
  const visiblePageNumbers = useMemo(() => {
    const windowSize = 5;
    if (totalPages <= windowSize) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const half = Math.floor(windowSize / 2);
    let start = Math.max(1, page - half);
    let end = Math.min(totalPages, start + windowSize - 1);

    // ถ้ายังไม่ครบ window ให้เลื่อนไปข้างหน้า
    start = Math.max(1, end - windowSize + 1);

    const pages = [];
    for (let p = start; p <= end; p += 1) pages.push(p);
    return pages;
  }, [page, totalPages]);

  const followUpBuckets = useMemo(() => {
    const critical = [];
    const urgent = [];
    const follow = [];

    for (const c of complaints) {
      const a = getAssignment(assignments, c._id);
      const closed = c.status === CLOSED;
      const days = daysSince(c.updatedAt || c.createdAt);
      const incompleteClosed =
        closed &&
        a &&
        (!a.completedAt ||
          !a.solutionImages ||
          a.solutionImages.length === 0);

      if (incompleteClosed) {
        critical.push(c);
        continue;
      }
      if (a && !closed) {
        if (days >= 30) critical.push(c);
        else if (days >= 14) urgent.push(c);
        else if (days >= 7) follow.push(c);
      }
    }

    const dedupe = (arr) => {
      const seen = new Set();
      return arr.filter((x) => {
        const k = complaintKey(x);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    };

    return {
      critical: dedupe(critical),
      urgent: dedupe(urgent),
      follow: dedupe(follow),
      all: dedupe([...critical, ...urgent, ...follow]),
    };
  }, [complaints, assignments]);

  const followUpList = useMemo(() => {
    if (followSub === "critical") return followUpBuckets.critical;
    if (followSub === "urgent") return followUpBuckets.urgent;
    if (followSub === "follow") return followUpBuckets.follow;
    return followUpBuckets.all;
  }, [followSub, followUpBuckets]);

  const clearFilters = () => {
    setCategoryFilter("");
    setAdvancedStatusFilter("");
    setSearchTerm("");
    setMainTab("all");
  };

  const setTab = (tab) => {
    setMainTab(tab);
    setAdvancedStatusFilter("");
  };

  const handleExportCsv = () => {
    const escape = (v) => {
      const s = v == null ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [
      [
        "#",
        "สถานะ",
        "หมวดหมู่",
        "หัวข้อ",
        "รายละเอียด (ย่อ)",
        "เจ้าหน้าที่",
        "อัปเดต",
        "complaintId",
      ].join(","),
    ];
    filteredComplaints.forEach((c, i) => {
      const a = getAssignment(assignments, c._id);
      const statusText =
        c.status === CLOSED
          ? "เสร็จสิ้น"
          : a
            ? "กำลังดำเนินการ"
            : "รอรับมอบหมาย";
      lines.push(
        [
          escape(i + 1),
          escape(statusText),
          escape(c.category),
          escape(complaintHeading(c)),
          escape((c.detail || "").slice(0, 200)),
          escape(a?.assigneeName || "—"),
          escape(
            c.updatedAt
              ? new Date(c.updatedAt).toLocaleString("th-TH")
              : ""
          ),
          escape(c.complaintId || c._id),
        ].join(",")
      );
    });
    const blob = new Blob(["\ufeff", lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `complaints-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const roleLabel = user?.publicMetadata?.role || "ผู้ใช้";

  return (
    <>
      <Head>
        <title>จัดการเรื่องร้องเรียน - Admin</title>
      </Head>
      <div className="min-h-screen bg-slate-50/80 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                จัดการเรื่องร้องเรียน
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                รวม {stats.total} เรื่อง • รอรับมอบหมาย {stats.waiting} •
                กำลังดำเนินการ {stats.inProg} • กำลังแสดงสิทธิ์{" "}
                <span className="font-medium text-slate-800">{roleLabel}</span>
              </p>
              <p className="mt-1 text-xs text-slate-500 max-w-2xl">
                Admin สามารถแก้ไขข้อมูลและภาพปัญหาได้จากเมนู &quot;แก้ไขข้อมูล&quot;
                ในแต่ละเรื่อง
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                className="btn btn-outline btn-sm border-slate-300 bg-white gap-2"
                onClick={handleExportCsv}
                disabled={!filteredComplaints.length}
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <div className="join border border-slate-200 rounded-lg overflow-hidden bg-white">
                <button
                  type="button"
                  className={`btn btn-sm join-item border-0 rounded-none ${
                    viewMode === "list"
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600"
                  }`}
                  onClick={() => setViewMode("list")}
                  title="มุมมองรายการ"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className={`btn btn-sm join-item border-0 rounded-none ${
                    viewMode === "grid"
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600"
                  }`}
                  onClick={() => setViewMode("grid")}
                  title="มุมมองการ์ด"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {[
              {
                label: "เรื่องร้องเรียนทั้งหมด",
                value: stats.total,
                bar: "bg-slate-400",
                card: "bg-white border-slate-200",
              },
              {
                label: "รอรับมอบหมาย",
                value: stats.waiting,
                bar: "bg-amber-400",
                card: "bg-white border-amber-100",
              },
              {
                label: "กำลังดำเนินการ",
                value: stats.inProg,
                bar: "bg-sky-500",
                card: "bg-white border-sky-100",
              },
              {
                label: "เสร็จสิ้น",
                value: stats.done,
                bar: "bg-emerald-500",
                card: "bg-white border-emerald-100",
              },
            ].map((card) => (
              <div
                key={card.label}
                className={`relative overflow-hidden rounded-2xl border shadow-sm ${card.card} p-5`}
              >
                <p className="text-sm font-medium text-slate-600">{card.label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900 tabular-nums">
                  {card.value}
                </p>
                <div
                  className={`absolute bottom-0 left-0 right-0 h-1 ${card.bar} opacity-90`}
                />
              </div>
            ))}
          </div>

          {followUpBuckets.all.length > 0 && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 sm:p-5 mb-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-rose-900">
                    เรื่องที่ต้องติดตาม
                  </h2>
                  <span className="badge badge-error badge-sm text-white border-0">
                    {followUpBuckets.all.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "all", label: "ทั้งหมด", count: followUpBuckets.all.length },
                    {
                      id: "critical",
                      label: "วิกฤต",
                      count: followUpBuckets.critical.length,
                    },
                    {
                      id: "urgent",
                      label: "เร่งด่วน",
                      count: followUpBuckets.urgent.length,
                    },
                    {
                      id: "follow",
                      label: "ติดตาม",
                      count: followUpBuckets.follow.length,
                    },
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setFollowSub(chip.id)}
                      className={`btn btn-xs rounded-full ${
                        followSub === chip.id
                          ? "bg-rose-700 text-white border-rose-700"
                          : "bg-white border-rose-200 text-rose-900"
                      }`}
                    >
                      {chip.label}{" "}
                      <span className="opacity-80">{chip.count}</span>
                    </button>
                  ))}
                </div>
              </div>
              <ul className="divide-y divide-rose-100 rounded-xl bg-white/90 border border-rose-100 max-h-48 overflow-y-auto">
                {followUpList.slice(0, 8).map((c) => {
                  const a = getAssignment(assignments, c._id);
                  const d = daysSince(c.updatedAt || c.createdAt);
                  return (
                    <li key={complaintKey(c)}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2.5 hover:bg-rose-50/80 flex flex-wrap items-baseline justify-between gap-2 text-sm"
                        onClick={() => {
                          setSearchTerm(c.complaintId || "");
                          setTab("all");
                        }}
                      >
                        <span className="font-medium text-rose-900">
                          {d} วัน
                        </span>
                        <span className="text-xs text-slate-600">
                          {a ? "มอบหมายแล้ว" : "รอรับมอบหมาย"} ·{" "}
                          {complaintHeading(c)}
                        </span>
                        <span className="text-xs text-slate-400 w-full sm:w-auto sm:text-right">
                          {c.updatedAt
                            ? new Date(c.updatedAt).toLocaleDateString("th-TH")
                            : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5 mb-6">
            <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4 mb-4">
              {[
                { id: "all", label: "ทั้งหมด", count: stats.total },
                { id: "wait", label: "รอรับมอบหมาย", count: stats.waiting },
                { id: "progress", label: "กำลังดำเนินการ", count: stats.inProg },
                { id: "done", label: "เสร็จสิ้น", count: stats.done },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    mainTab === t.id && !advancedStatusFilter
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {t.label}{" "}
                  <span className="opacity-75 tabular-nums">({t.count})</span>
                </button>
              ))}
            </div>

            <div className="flex flex-col lg:flex-row gap-3 lg:items-center mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="search"
                  className="input input-bordered w-full pl-10 bg-slate-50 border-slate-200 focus:bg-white"
                  placeholder="ค้นหาจากหัวข้อ, หมวดหมู่, ที่อยู่ผู้แจ้ง..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <select
                  className="select select-bordered bg-slate-50 border-slate-200 min-w-[10rem]"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="">หมวดหมู่: ทั้งหมด</option>
                  {menu.map((item) => (
                    <option key={item.Prob_name} value={item.Prob_name}>
                      {item.Prob_name}
                    </option>
                  ))}
                </select>
                <select
                  className="select select-bordered bg-slate-50 border-slate-200 min-w-[11rem]"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <option value="desc">ล่าสุด → เก่า</option>
                  <option value="asc">เก่า → ล่าสุด</option>
                </select>
              </div>
            </div>

            <details className="group mb-2">
              <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-800 list-none flex items-center gap-2">
                <span className="underline decoration-dotted">
                  ตัวกรองเพิ่มเติม (ผู้ดูแลระบบ)
                </span>
              </summary>
              <div className="mt-3 flex flex-col sm:flex-row gap-3 items-start">
                <select
                  className="select select-bordered select-sm w-full max-w-md bg-white"
                  value={advancedStatusFilter}
                  onChange={(e) => {
                    setAdvancedStatusFilter(e.target.value);
                    if (e.target.value) setMainTab("all");
                  }}
                >
                  <option value="">ไม่ใช้ตัวกรองพิเศษ</option>
                  <option value="อยู่ระหว่างดำเนินการ">อยู่ระหว่างดำเนินการ</option>
                  <option value={CLOSED}>{CLOSED}</option>
                  <option value="ยังไม่ได้รับมอบหมาย">ยังไม่ได้รับมอบหมาย</option>
                  <option value="ได้รับมอบหมายแล้ว">ได้รับมอบหมายแล้ว</option>
                  <option value="ปิดแล้วแต่ยังไม่มีวันที่เสร็จสิ้น">
                    ปิดแล้วแต่ยังไม่มีวันที่เสร็จสิ้น
                  </option>
                  <option value="ปิดแล้วแต่ยังไม่มีรูปการดำเนินการ">
                    ปิดแล้วแต่ยังไม่มีรูปการดำเนินการ
                  </option>
                </select>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={clearFilters}
                >
                  ล้างตัวกรอง
                </button>
              </div>
            </details>

            <p className="text-sm text-slate-500">
              แสดง{" "}
              <span className="font-semibold text-slate-800 tabular-nums">
                {visibleComplaints.length}
              </span>{" "}
              จาก {filteredComplaints.length} เรื่อง
              {viewMode === "list" && totalFiltered > 0 && (
                <span className="ml-2 text-slate-500">
                  (หน้า {page}/{totalPages})
                </span>
              )}
              {(categoryFilter || searchTerm || advancedStatusFilter) && (
                <span className="text-amber-600 ml-1">(กรองแล้ว)</span>
              )}
            </p>
          </div>

          {filteredComplaints.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-500">
              {complaints.length === 0 ? (
                <p>ไม่มีข้อมูลเรื่องร้องเรียน</p>
              ) : (
                <p>ไม่พบเรื่องที่ตรงกับเงื่อนไข</p>
              )}
              {(categoryFilter || searchTerm || advancedStatusFilter) && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline mt-4"
                  onClick={clearFilters}
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>
          ) : viewMode === "list" ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="table table-sm md:table-md w-full min-w-[900px]">
                <thead className="bg-slate-50 text-slate-700 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="w-10 rounded-tl-xl">#</th>
                    <th>สถานะ</th>
                    <th>หมวดหมู่</th>
                    <th>ภาพ</th>
                    <th>รายละเอียด</th>
                    <th>เจ้าหน้าที่</th>
                    <th>แจ้งเตือน</th>
                    <th>อัปเดต</th>
                    <th className="rounded-tr-xl w-14">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {pagedComplaints.map((complaint, index) => {
                    const assignment = getAssignment(assignments, complaint._id);
                    const isAssigned = !!assignment;
                    const isClosed = complaint.status === CLOSED;
                    return (
                      <tr
                        key={complaintKey(complaint)}
                        className="border-b border-slate-100 hover:bg-slate-50/80"
                      >
                        <td className="text-slate-500 tabular-nums">
                          {(page - 1) * PAGE_SIZE + index + 1}
                        </td>
                        <td>
                          <StatusBlock
                            complaint={complaint}
                            assignment={assignment}
                          />
                        </td>
                        <td>
                          <div className="flex items-center gap-2 max-w-[10rem]">
                            {menu.find((m) => m.Prob_name === complaint.category)
                              ?.Prob_pic ? (
                              <img
                                src={
                                  menu.find(
                                    (m) => m.Prob_name === complaint.category
                                  )?.Prob_pic
                                }
                                alt=""
                                className="w-9 h-9 rounded-full object-contain bg-slate-100 shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-500 shrink-0">
                                ?
                              </div>
                            )}
                            <span className="font-medium text-slate-800 leading-tight line-clamp-2">
                              {complaint.category || "ไม่ระบุ"}
                            </span>
                          </div>
                        </td>
                        <td>
                          {Array.isArray(complaint.images) &&
                          complaint.images.length > 0 ? (
                            <img
                              src={complaint.images[0]}
                              alt=""
                              className="w-14 h-14 object-cover rounded-lg border border-slate-200"
                            />
                          ) : (
                            <span className="text-xs text-slate-400">ไม่มีภาพ</span>
                          )}
                        </td>
                        <td className="max-w-xs">
                          <div className="font-semibold text-slate-900 line-clamp-2">
                            {complaintHeading(complaint)}
                          </div>
                          <div className="text-xs text-slate-600 mt-1 line-clamp-2">
                            {renderDetailWithLinks(complaintSnippet(complaint), 200)}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            ID:{" "}
                            {complaint.complaintId ||
                              String(complaint._id).slice(-8)}
                          </div>
                        </td>
                        <td>
                          {assignment?.assigneeName ? (
                            <span className="text-sky-700 font-medium cursor-default">
                              {assignment.assigneeName}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td>
                          <NotificationStatus
                            notificationCount={complaint.notificationCount || 0}
                            lastNotificationSent={complaint.lastNotificationSent}
                            onResend={() => {
                              const idToSend =
                                complaint.complaintId || complaint._id;
                              handleResendNotification(idToSend);
                            }}
                            loading={loading}
                            disabled={false}
                          />
                        </td>
                        <td className="text-slate-600 whitespace-nowrap text-xs sm:text-sm">
                          {complaint.updatedAt
                            ? new Date(complaint.updatedAt).toLocaleString(
                                "th-TH"
                              )
                            : "—"}
                        </td>
                        <td>
                          <ActionMenu
                            complaint={complaint}
                            assignment={assignment}
                            isAssigned={isAssigned}
                            isClosed={isClosed}
                            loading={loading}
                            onAssign={handleAssign}
                            onOpenUpdate={handleOpenUpdateForm}
                            onEditUser={(c) => {
                              setSelectedAssignment(c);
                              setShowEditUserModal(true);
                            }}
                            onClean={handleCleanComplaint}
                            onCloseComplaint={handleCloseComplaint}
                            onReopen={handleReopenComplaint}
                            onDelete={handleDeleteComplaint}
                            onResend={(c) => {
                              const idToSend = c.complaintId || c._id;
                              handleResendNotification(idToSend);
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-slate-100">
                  <button
                    type="button"
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent"
                    onClick={() => setPage(1)}
                    disabled={page <= 1}
                    aria-label="ไปหน้าแรก"
                  >
                    {"<<"}
                  </button>
                  <button
                    type="button"
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    aria-label="ไปหน้าก่อนหน้า"
                  >
                    {"<"}
                  </button>

                  {visiblePageNumbers.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        p === page
                          ? "bg-blue-600 text-white"
                          : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                      }`}
                      onClick={() => setPage(p)}
                      aria-current={p === page ? "page" : undefined}
                    >
                      {p}
                    </button>
                  ))}

                  <button
                    type="button"
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    aria-label="ไปหน้าถัดไป"
                  >
                    {">"}
                  </button>
                  <button
                    type="button"
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent"
                    onClick={() => setPage(totalPages)}
                    disabled={page >= totalPages}
                    aria-label="ไปหน้าสุดท้าย"
                  >
                    {">>"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {limitedGridComplaints.map((complaint, index) => {
                const assignment = getAssignment(assignments, complaint._id);
                const isAssigned = !!assignment;
                const isClosed = complaint.status === CLOSED;
                return (
                  <div
                    key={complaintKey(complaint)}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs text-slate-400 tabular-nums">
                        #{index + 1}
                      </span>
                      <ActionMenu
                        complaint={complaint}
                        assignment={assignment}
                        isAssigned={isAssigned}
                        isClosed={isClosed}
                        loading={loading}
                        onAssign={handleAssign}
                        onOpenUpdate={handleOpenUpdateForm}
                        onEditUser={(c) => {
                          setSelectedAssignment(c);
                          setShowEditUserModal(true);
                        }}
                        onClean={handleCleanComplaint}
                        onCloseComplaint={handleCloseComplaint}
                        onReopen={handleReopenComplaint}
                        onDelete={handleDeleteComplaint}
                        onResend={(c) => {
                          const idToSend = c.complaintId || c._id;
                          handleResendNotification(idToSend);
                        }}
                      />
                    </div>
                    <StatusBlock
                      complaint={complaint}
                      assignment={assignment}
                    />
                    <div className="flex gap-3">
                      {complaint.images?.[0] ? (
                        <img
                          src={complaint.images[0]}
                          alt=""
                          className="w-20 h-20 object-cover rounded-xl border"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xs text-slate-400">
                          ไม่มีภาพ
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 line-clamp-2">
                          {complaintHeading(complaint)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-3">
                          {complaintSnippet(complaint)}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-100 pt-3">
                      <span>
                        เจ้าหน้าที่:{" "}
                        <strong className="text-sky-800">
                          {assignment?.assigneeName || "—"}
                        </strong>
                      </span>
                      <span>
                        อัปเดต:{" "}
                        {complaint.updatedAt
                          ? new Date(complaint.updatedAt).toLocaleString("th-TH")
                          : "—"}
                      </span>
                    </div>
                    <div className="border-t border-slate-100 pt-2">
                      <NotificationStatus
                        notificationCount={complaint.notificationCount || 0}
                        lastNotificationSent={complaint.lastNotificationSent}
                        onResend={() => {
                          const idToSend =
                            complaint.complaintId || complaint._id;
                          handleResendNotification(idToSend);
                        }}
                        loading={loading}
                        disabled={false}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
