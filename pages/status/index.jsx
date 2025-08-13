import CardModalDetail from "@/components/CardModalDetail";
import { useEffect, useState } from "react";
import useComplaintStore from "@/stores/useComplaintStore";
import CompletedCard from "@/components/CardCompleted";
import { useUser } from "@clerk/nextjs";


const StatusPage = () => {
  const { user } = useUser();
  const { complaints, fetchComplaints } = useComplaintStore();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [modalData, setModalData] = useState(null);
  const currentBuddhistYear = new Date().getFullYear() + 543;
  const [activeYear, setActiveYear] = useState(currentBuddhistYear.toString());
  const [localComplaints, setLocalComplaints] = useState([]);

  useEffect(() => {
    if (activeYear === "2567") {
      // กรณี collection พิเศษ: fetch API โดยตรง
      fetch("/api/submittedreports_2024")
        .then((res) => res.json())
        .then((data) => setLocalComplaints(data))
        .catch((err) => console.error("โหลดข้อมูล 2567 ผิดพลาด:", err));
    } else {
      // กรณีปกติ: ใช้ store
      fetchComplaints("ดำเนินการเสร็จสิ้น", "submittedreports");
    }
  }, [activeYear]);

  const dataSource = Array.isArray(activeYear === "2567" ? localComplaints : complaints)
    ? (activeYear === "2567" ? localComplaints : complaints)
    : [];

  const paginatedComplaints = [...dataSource]
    .filter((item) => {
      const year = new Date(item.createdAt).getFullYear();
      return activeYear === "2567" ? year === 2024 : year === 2025;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      <div role="tablist" className="tabs tabs-box justify-center mb-4">
        <button
          role="tab"
          className={`tab ${activeYear === "2567" ? "tab-active" : ""}`}
          onClick={() => setActiveYear("2567")}
        >
          ปี 2567
        </button>
        <button
          role="tab"
          className={`tab ${activeYear === "2568" ? "tab-active" : ""}`}
          onClick={() => setActiveYear("2568")}
        >
          ปี 2568
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 py-4 w-full max-w-4xl mx-auto min-h-screen items-stretch">
        {paginatedComplaints.map((item, index) => (
          <div key={index} className="h-full">
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
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="join flex justify-center mt-4">
        <button
          className="join-item btn btn-xs"
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
        >
          «
        </button>
        <button className="join-item btn btn-xs">หน้า {currentPage}</button>
        <button
          className="join-item btn btn-xs"
          onClick={() =>
            setCurrentPage((p) =>
              p < Math.ceil(complaints.length / itemsPerPage) ? p + 1 : p
            )
          }
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
