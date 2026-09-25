//pages/complaint/index.jsx
import Head from "next/head";
import { useEffect, useState } from "react";
import useComplaintStore from "@/stores/useComplaintStore";
import { useMenuStore } from "@/stores/useMenuStore";
import { useProblemOptionStore } from "@/stores/useProblemOptionStore";
import CardModalDetail from "@/components/CardModalDetail";
import ComplaintProgressCard from "@/components/ComplaintProgressCard";
import { FileText } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useTranslation } from "@/hooks/useTranslation";
import { getProblemDisplayLabel } from "@/utils/problemDisplayLabel";

// หมวดที่ต้องเบลอรูปในหน้าสาธารณะ
const BLUR_CATEGORY = "สวัสดิการสังคม";

export default function ComplaintListPage() {
  const { user } = useUser();
  const { complaints, fetchComplaints } = useComplaintStore();
  const { menu, fetchMenu } = useMenuStore();
  const { problemOptions, fetchProblemOptions } = useProblemOptionStore();
  const { t, language } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [modalData, setModalData] = useState(null);
  const [assignments, setAssignments] = useState({});

  useEffect(() => {
    const loadData = async () => {
      // ⚡ โหลด API ทั้งหมดพร้อมกันแบบ parallel แทน sequential
      await Promise.all([
        fetchComplaints("อยู่ระหว่างดำเนินการ"),
        fetchProblemOptions(),
        fetchMenu()
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchComplaints, fetchMenu, fetchProblemOptions]);

  // assignment ของแต่ละเรื่อง → ใช้คำนวณขั้นความคืบหน้าบนการ์ด
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const res = await fetch("/api/assignments");
        if (!res.ok) return;
        const data = await res.json();
        const map = {};
        (Array.isArray(data) ? data : []).forEach((a) => {
          if (a.complaintId) map[String(a.complaintId)] = a;
        });
        setAssignments(map);
      } catch (error) {
        console.error("Failed to fetch assignments:", error);
      }
    };
    fetchAssignments();
  }, []);

  const problemLabel = (prob) => {
    const clean = typeof prob === "string" ? prob.trim() : "";
    const found = problemOptions.find(
      (opt) => opt.label === prob || opt.label === clean
    );
    return getProblemDisplayLabel(language, clean || prob, found?.labelEn, t.problemMap);
  };

  return (
    <>
      <Head>
        <title>Smart-Namphare</title>
      </Head>
      <div className="w-full px-4 py-6 mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-4">
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-700 to-sky-500 bg-clip-text text-transparent">
            {t.complaint.inProgressTitle}
          </h1>
          {!loading && (
            <span className="mt-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
              {complaints.length} {t.complaint.items}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-w-screen-xl mx-auto w-full min-h-[300px] items-start">
          {loading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-500">{t.common.loading}</p>
            </div>
          ) : complaints.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FileText size={32} className="text-gray-400" />
              </div>
              <p className="text-gray-500">{t.complaint.empty}</p>
            </div>
          ) : (
            // ⚡ ไม่ต้อง sort ที่ frontend เพราะ API sort ให้แล้ว (createdAt: -1)
            complaints.map((item) => (
              <ComplaintProgressCard
                key={item._id}
                complaint={item}
                assignment={assignments[String(item._id)] || null}
                iconUrl={menu.find((m) => m.Prob_name === item.category)?.Prob_pic}
                categoryLabel={t.categoryMap?.[item.category] || item.category}
                communityLabel={item.community ? t.communityMap?.[item.community] || item.community : null}
                problemLabels={(item.problems || []).map(problemLabel)}
                stepLabels={t.complaint.steps}
                dateLocale={language === "en" ? "en-US" : "th-TH"}
                blurImages={item.category === BLUR_CATEGORY}
                onClick={() => {
                  const role = user?.publicMetadata?.role || "user";
                  setModalData({ ...item, userRole: role });
                }}
              />
            ))
          )}
        </div>
        {modalData && (
          <CardModalDetail
            modalData={{
              ...modalData,
              blurImage:
                modalData.category === BLUR_CATEGORY &&
                modalData.userRole !== "admin" &&
                modalData.userRole !== "superadmin",
            }}
            onClose={() => setModalData(null)}
          />
        )}
      </div>
    </>
  );
}
