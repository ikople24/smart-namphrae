import React, { useEffect, useState } from "react";
import Image from "next/image";
import { AlertCircle, MessageCircleHeart } from "lucide-react";
import SatisfactionForm from "./SatisfactionForm";
import { useTranslation } from "@/hooks/useTranslation";


export default function CardOfficail(props) {
  // console.log("CardOfficail received props:", props);
    const { t, language } = useTranslation();
    const [assignedDate, setAssignedDate] = useState(null);
    const [completedDate, setCompletedDate] = useState(null);
    const [officer, setOfficer] = useState(null);
    const [showRating, setShowRating] = useState(false);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const res = await fetch("/api/assignments");
        const data = await res.json();
        // console.log("Fetched assignments:", data);
        if (props.probId) {
          const responsibleAssignments = data.filter(
            assignment => assignment.complaintId === props.probId
          );
          // console.log("Filtered assignments by complaintId:", responsibleAssignments); //debug:
          if (responsibleAssignments.length > 0) {
            const ra = responsibleAssignments[0];
            setAssignedDate(ra.assignedAt);
            setCompletedDate(ra.completedAt);
            // ใช้ข้อมูลเจ้าหน้าที่ที่ populate มากับ assignment (Mongo) โดยตรง
            // แทนการดึงรายชื่อ user จาก backend ภายนอกที่อาจล่ม/ตอบ 401
            if (ra.assignee && ra.assignee.name) {
              setOfficer({
                name: ra.assignee.name,
                department: ra.assignee.department || "",
                profileUrl: ra.assignee.profileImage || "",
              });
            }
          }
        }
      } catch (error) {
        console.error("Error fetching assignments:", error);
      }
    };

    fetchAssignments();
  }, [props.probId]);

  // ซ่อนการ์ดเฉพาะเมื่อเรื่องยังไม่ถูกมอบหมาย (ไม่ผูกกับการโหลดข้อมูลเจ้าหน้าที่)
  // เพื่อให้ปุ่มประเมินฝั่งประชาชนแสดงเสมอสำหรับเรื่องที่ถูกมอบหมาย/เสร็จสิ้น
  // ส่วนแสดงชื่อเจ้าหน้าที่ด้านล่างมี fallback เป็น "ไม่ทราบชื่อเจ้าหน้าที่" อยู่แล้ว
  if (!assignedDate) {
    return null;
  }

  const formatDateTime = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleString(language === "en" ? "en-US" : "th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    }) + (language === "th" ? " น." : "");
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-md shadow p-4">
      <div className="text-md font-semibold mb-2">{t.official.title}</div>
      <div className="grid grid-cols-[30%_70%] gap-4 items-start">
        <div className="flex flex-col items-center gap-2 border-r border-gray-200 pr-4 h-full">
          <Image
            src={officer?.profileUrl || "https://cdn-icons-png.flaticon.com/128/18775/18775921.png"}
            alt="Officer"
            width={56}
            height={56}
            className="rounded-full object-cover"
          />
          <div className="textarea-xs font-semibold text-gray-500 leading-tight text-center">
            {officer?.name
              ? `${officer.name.split(" ").slice(1).join(" ")}${officer.department ? ` (${officer.department})` : ""}`
              : t.official.unknownOfficer}
          </div>
        </div>
        <div className="flex flex-col gap-1 text-sm text-gray-700">
          <div className="flex justify-between">
            <div className="text-xs text-gray-900">{t.official.assignedDate}</div>
            <div className="text-xs text-gray-900 font-semibold">
              {formatDateTime(assignedDate)}
            </div>
          </div>
          <div className="flex justify-between">
            <div className="text-xs text-gray-900">{t.official.completedDate}</div>
            <div className="text-xs text-gray-900 font-semibold">
              {formatDateTime(completedDate)}
            </div>
          </div>
          <div className="flex flex-wrap justify-between items-center mt-4 gap-2">
            <button className="btn btn-outline btn-error btn-sm btn-disabled text-red-400">
              <AlertCircle className="w-4 h-4" /> {t.official.report}
            </button>
            <button
              className="btn btn-info btn-sm text-white"
              onClick={() => setShowRating(!showRating)}
            >
              <MessageCircleHeart className="w-6 h-6 text-white" /> {t.official.rateSatisfaction}
            </button>
          </div>
          {showRating && (
            <div className="mt-4 w-full">
              <SatisfactionForm
                complaintId={props.probId}
                onSubmit={(data) => {
                  console.log("ส่งความคิดเห็น:", data);
                  setShowRating(false);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
