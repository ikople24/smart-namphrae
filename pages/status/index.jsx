import CardModalDetail from "@/components/CardModalDetail";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Search } from "lucide-react";
import CompletedCard from "@/components/CardCompleted";
import { useUser } from "@clerk/nextjs";
import { useMenuStore } from "@/stores/useMenuStore";
import { useProblemOptionStore } from "@/stores/useProblemOptionStore";
import { useTranslation } from "@/hooks/useTranslation";
import { getThaiFiscalYear } from "@/lib/fiscalYear";

const StatusPage = () => {
  const { user } = useUser();
  const { menu, fetchMenu } = useMenuStore();
  const { problemOptions, fetchProblemOptions } = useProblemOptionStore();
  const { t, language } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [modalData, setModalData] = useState(null);
  const currentFiscalYearThai = getThaiFiscalYear(new Date());
  const yearTabs = useMemo(
    () => [String(currentFiscalYearThai - 1), String(currentFiscalYearThai)],
    [currentFiscalYearThai]
  );
  const [activeYear, setActiveYear] = useState(String(currentFiscalYearThai));
  const [fiscalComplaints, setFiscalComplaints] = useState([]);
  const [assignmentsMap, setAssignmentsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // ⚡ โหลด menu และ problemOptions ที่ parent ครั้งเดียว (ไม่ใช่ทุก card)
  useEffect(() => {
    Promise.all([fetchMenu(), fetchProblemOptions()]);
  }, [fetchMenu, fetchProblemOptions]);

  // ⚡ Fetch complaints ตาม "ปีงบประมาณ" ที่เลือก (1 ต.ค. - 30 ก.ย.)
  useEffect(() => {
    setLoading(true);
    fetch(
      `/api/complaints/fiscal-year?fiscalYear=${encodeURIComponent(
        activeYear
      )}&status=${encodeURIComponent("ดำเนินการเสร็จสิ้น")}&role=admin`
    )
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && Array.isArray(json?.data)) {
          setFiscalComplaints(json.data);
        } else {
          setFiscalComplaints([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("โหลดข้อมูลปีงบประมาณผิดพลาด:", err);
        setFiscalComplaints([]);
        setLoading(false);
      });
  }, [activeYear]);

  // ⚡ ใช้ useMemo เพื่อ filter และ sort ข้อมูลแค่ครั้งเดียวเมื่อ data เปลี่ยน
  const dataSource = useMemo(() => {
    const source = fiscalComplaints;
    if (!Array.isArray(source)) return [];

    const q = searchTerm.trim().toLowerCase();
    const filtered = !q
      ? source
      : source.filter((item) => {
          const detail = item.detail?.toLowerCase() || "";
          const category = item.category?.toLowerCase() || "";
          const complaintId = item.complaintId?.toLowerCase() || "";
          const community = item.community?.toLowerCase() || "";
          const fullName = item.fullName?.toLowerCase() || "";
          return (
            detail.includes(q) ||
            category.includes(q) ||
            complaintId.includes(q) ||
            community.includes(q) ||
            fullName.includes(q)
          );
        });

    // backend already filters by fiscal year and sorts desc; keep a defensive sort here.
    return [...filtered].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [fiscalComplaints, searchTerm]);

  // ⚡ Paginated data
  const paginatedComplaints = useMemo(() => {
    return dataSource.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [dataSource, currentPage, itemsPerPage]);

  useEffect(() => {
    // reset page when searching (so user sees first results)
    setCurrentPage(1);
  }, [searchTerm, activeYear]);

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
        {yearTabs.map((y) => (
          <button
            key={y}
            role="tab"
            className={`tab ${activeYear === y ? "tab-active" : ""}`}
            onClick={() => {
              setActiveYear(y);
              setCurrentPage(1);
            }}
          >
            {language === "en" ? `Fiscal Year ${Number(y) - 543}` : `ปีงบประมาณ ${y}`}
          </button>
        ))}
      </div>

      <div className="w-full max-w-3xl mx-auto px-4 mb-4">
        <label className="label px-1 py-0">
          <span className="label-text font-medium text-gray-700">
            ค้นหา
          </span>
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              language === "en"
                ? "Search by complaint id, category, community, details..."
                : "ค้นหาจากเลขที่คำร้อง, หมวดหมู่, ชุมชน, รายละเอียด..."
            }
            className="input input-bordered input-sm w-full pl-10 bg-white"
          />
        </div>
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
