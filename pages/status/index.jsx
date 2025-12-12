import CardModalDetail from "@/components/CardModalDetail";
import { useEffect, useState, useMemo, useCallback } from "react";
import useComplaintStore from "@/stores/useComplaintStore";
import CompletedCard from "@/components/CardCompleted";
import { useUser } from "@clerk/nextjs";
import { useMenuStore } from "@/stores/useMenuStore";
import { useProblemOptionStore } from "@/stores/useProblemOptionStore";
import { useTranslation } from "@/hooks/useTranslation";

const StatusPage = () => {
  const { user } = useUser();
  const { complaints, fetchComplaints } = useComplaintStore();
  const { menu, fetchMenu } = useMenuStore();
  const { problemOptions, fetchProblemOptions } = useProblemOptionStore();
  const { t, language } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [modalData, setModalData] = useState(null);
  const currentBuddhistYear = new Date().getFullYear() + 543;
  const [activeYear, setActiveYear] = useState(currentBuddhistYear.toString());
  const [localComplaints, setLocalComplaints] = useState([]);
  const [assignmentsMap, setAssignmentsMap] = useState({});
  const [loading, setLoading] = useState(true);

  // ⚡ โหลด menu และ problemOptions ที่ parent ครั้งเดียว (ไม่ใช่ทุก card)
  useEffect(() => {
    Promise.all([fetchMenu(), fetchProblemOptions()]);
  }, [fetchMenu, fetchProblemOptions]);

  // ⚡ Fetch complaints ตาม year ที่เลือก
  useEffect(() => {
    setLoading(true);
    if (activeYear === "2567") {
      fetch("/api/submittedreports_2024")
        .then((res) => res.json())
        .then((data) => {
          setLocalComplaints(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("โหลดข้อมูล 2567 ผิดพลาด:", err);
          setLoading(false);
        });
    } else {
      fetchComplaints("ดำเนินการเสร็จสิ้น", "submittedreports")
        .then(() => setLoading(false));
    }
  }, [activeYear, fetchComplaints]);

  // ⚡ ใช้ useMemo เพื่อ filter และ sort ข้อมูลแค่ครั้งเดียวเมื่อ data เปลี่ยน
  const dataSource = useMemo(() => {
    const source = activeYear === "2567" ? localComplaints : complaints;
    if (!Array.isArray(source)) return [];
    
    return source
      .filter((item) => {
        const year = new Date(item.createdAt).getFullYear();
        return activeYear === "2567" ? year === 2024 : year === 2025;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [activeYear, localComplaints, complaints]);

  // ⚡ Paginated data
  const paginatedComplaints = useMemo(() => {
    return dataSource.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [dataSource, currentPage, itemsPerPage]);

  // ⚡ Batch fetch assignments สำหรับ paginated items เท่านั้น (ลดจาก N calls เหลือ 1 call)
  useEffect(() => {
    const fetchBatchAssignments = async () => {
      if (paginatedComplaints.length === 0) return;
      
      const complaintIds = paginatedComplaints.map(c => c._id).filter(Boolean);
      if (complaintIds.length === 0) return;

      try {
        const res = await fetch("/api/assignments/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ complaintIds })
        });
        const json = await res.json();
        if (json.success) {
          setAssignmentsMap(json.data);
        }
      } catch (error) {
        console.error("Error batch fetching assignments:", error);
      }
    };

    fetchBatchAssignments();
  }, [paginatedComplaints]);

  const totalPages = Math.ceil(dataSource.length / itemsPerPage);

  return (
    <>
      <div role="tablist" className="tabs tabs-box justify-center mb-4">
        <button
          role="tab"
          className={`tab ${activeYear === "2567" ? "tab-active" : ""}`}
          onClick={() => { setActiveYear("2567"); setCurrentPage(1); }}
        >
          {language === 'en' ? 'Year 2024' : 'ปี 2567'}
        </button>
        <button
          role="tab"
          className={`tab ${activeYear === "2568" ? "tab-active" : ""}`}
          onClick={() => { setActiveYear("2568"); setCurrentPage(1); }}
        >
          {language === 'en' ? 'Year 2025' : 'ปี 2568'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <p className="text-gray-500">{t.common.loading}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 py-4 w-full max-w-4xl mx-auto min-h-screen items-stretch">
          {paginatedComplaints.map((item, index) => (
            <div key={item._id || index} className="h-full">
              <div onClick={() => {
                const role = user?.publicMetadata?.role || "user";
                if (item && item.complaintId && item.category) {
                  setModalData({ ...item, userRole: role });
                }
              }} className="cursor-pointer h-full flex flex-col">
                <div className="flex-1">
                  <CompletedCard
                    complaintMongoId={item._id}
                    complaintId={item.complaintId}
                    title={item.category}
                    description={item.detail}
                    timestamp={item.createdAt}
                    beforeImage={item.images?.[0]}
                    afterImage={item.images?.[1]}
                    problems={item.problems}
                    community={item.community}
                    status={item.status}
                    location={item.location}
                    updatedAt={item.completedAt}
                    userRole={user?.publicMetadata?.role || "user"}
                    // ⚡ ส่ง data ที่ fetch มาแล้วเป็น props แทนการ fetch ใน component
                    menu={menu}
                    problemOptions={problemOptions}
                    assignment={assignmentsMap[item._id]?.[0] || null}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="join flex justify-center mt-4">
        <button
          className="join-item btn btn-xs"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
        >
          «
        </button>
        <button className="join-item btn btn-xs">{language === 'en' ? 'Page' : 'หน้า'} {currentPage} / {totalPages || 1}</button>
        <button
          className="join-item btn btn-xs"
          disabled={currentPage >= totalPages}
          onClick={() => setCurrentPage((p) => p < totalPages ? p + 1 : p)}
        >
          »
        </button>
      </div>

      {modalData && modalData.complaintId && modalData.category && (
        <CardModalDetail
          modalData={{
            ...modalData,
            blurImage:
              modalData?.category === "สวัสดิการสังคม" &&
              modalData?.userRole !== "admin" &&
              modalData?.userRole !== "superadmin",
          }}
          onClose={() => setModalData(null)}
        />
      )}
    </>
  );
};

export default StatusPage;
