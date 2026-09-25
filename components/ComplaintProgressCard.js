// components/ComplaintProgressCard.js
// การ์ดเรื่องร้องเรียน "อยู่ระหว่างดำเนินการ" (ยกแบบมาจาก smart-takhli):
// รูปใหญ่เต็มความกว้าง (หลายรูป = สไลด์ปัดได้ + จุดบอกตำแหน่ง) · ป้ายวันที่มุมบน
// · ไอคอนหมวด+ชื่อหมวด+ชุมชนซ้อนบนรูป · ชิปปัญหา + รหัสคำร้อง
// · รายละเอียดย่อ · ขั้นตอน 4 ไอคอน (รับเรื่อง→มอบหมาย→ดำเนินการ→เสร็จสิ้น)
import { useEffect, useRef, useState } from "react";
import { FileText, UserCheck, Clock, CheckCircle2, MapPin, Calendar } from "lucide-react";
import { getOptimizedCloudinaryUrl } from "@/utils/uploadToCloudinary";

const DONE_STATUS = "ดำเนินการเสร็จสิ้น";

// map เรื่อง + assignment → ขั้น 1-4
// 1 รับเรื่อง · 3 มีการมอบหมายแล้ว (ยังไม่เสร็จ = กำลังดำเนินการ) · 4 เสร็จสิ้น
export function getProgressStep(complaint, assignment) {
  if (complaint?.status === DONE_STATUS) return 4;
  if (assignment) return 3;
  return 1;
}

const STEPS = [
  { key: "received", Icon: FileText, color: "#22C55E" },
  { key: "assigned", Icon: UserCheck, color: "#4F6EF7" },
  { key: "inProgress", Icon: Clock, color: "#F2A93B" },
  { key: "completed", Icon: CheckCircle2, color: "#16A34A" },
];

function StepRow({ step, labels }) {
  return (
    <div className="mt-3 flex items-center rounded-[14px] bg-[#F8F7FB] px-2 py-2.5">
      {STEPS.map(({ key, Icon, color }, i) => {
        const reached = i + 1 <= step;
        return (
          <div key={key} className="flex flex-1 items-center">
            <div className="flex flex-1 flex-col items-center gap-1">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ background: reached ? color : "#ECE9F3" }}
              >
                <Icon size={17} color={reached ? "#fff" : "#9590A8"} strokeWidth={2.2} />
              </span>
              <span
                className="text-[10px] font-semibold whitespace-nowrap"
                style={{ color: reached ? color : "#9590A8" }}
              >
                {labels?.[key] || key}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                className="mb-4 h-[2.5px] w-6 shrink-0 rounded-full"
                style={{ background: i + 2 <= step ? STEPS[i + 1].color : "#ECE9F3" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// สไลด์รูปแบบปัดนิ้ว (scroll-snap) + จุดบอกตำแหน่ง · เลื่อนอัตโนมัติเมื่อมีหลายรูป
// (หยุดชั่วคราวเมื่อผู้ใช้แตะ/ปัดเอง · ปิด auto ตาม prefers-reduced-motion)
function PhotoSlider({ images, blur, autoMs = 3500, children }) {
  const [slide, setSlide] = useState(0);
  const ref = useRef(null);
  const pausedUntil = useRef(0);

  const onScroll = () => {
    const el = ref.current;
    if (el && el.clientWidth) setSlide(Math.round(el.scrollLeft / el.clientWidth));
  };

  const pause = () => {
    pausedUntil.current = Date.now() + 5000;
  };

  useEffect(() => {
    if (images.length <= 1) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      const el = ref.current;
      if (!el || Date.now() < pausedUntil.current) return;
      const w = el.clientWidth;
      if (!w) return;
      const next = (Math.round(el.scrollLeft / w) + 1) % images.length;
      el.scrollTo({ left: next * w, behavior: "smooth" });
    }, autoMs);
    return () => clearInterval(timer);
  }, [images.length, autoMs]);

  const imgClass = `h-full w-full object-cover ${blur ? "blur-sm" : ""}`;

  return (
    <div className="relative h-[170px] overflow-hidden">
      {images.length === 1 ? (
        <img
          src={getOptimizedCloudinaryUrl(images[0], 600)}
          alt="ภาพร้องเรียน"
          loading="lazy"
          decoding="async"
          className={imgClass}
        />
      ) : (
        <div
          ref={ref}
          onScroll={onScroll}
          onTouchStart={pause}
          onPointerDown={pause}
          className="flex h-full snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((url, i) => (
            <div key={i} className="relative h-full w-full shrink-0 snap-center">
              <img
                src={getOptimizedCloudinaryUrl(url, 600)}
                alt={`ภาพที่ ${i + 1}`}
                loading="lazy"
                decoding="async"
                className={imgClass}
              />
            </div>
          ))}
        </div>
      )}
      {images.length > 1 && (
        <div className="pointer-events-none absolute bottom-3 right-3 z-10 flex gap-1.5">
          {images.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{ width: i === slide ? 14 : 6, background: i === slide ? "#fff" : "rgba(255,255,255,0.55)" }}
            />
          ))}
        </div>
      )}
      {children}
    </div>
  );
}

export default function ComplaintProgressCard({
  complaint,
  assignment,
  iconUrl,
  categoryLabel,
  communityLabel,
  problemLabels = [],
  stepLabels,
  dateLocale = "th-TH",
  blurImages = false,
  onClick,
}) {
  const step = getProgressStep(complaint, assignment);
  const images = complaint.images ?? [];
  const category = categoryLabel || complaint.category || "เรื่องร้องเรียน";
  const dateText = complaint.createdAt
    ? new Date(complaint.createdAt).toLocaleDateString(dateLocale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const headOverlay = (
    <>
      {/* ไล่เงาล่างให้ตัวหนังสือบนรูปอ่านออก */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
      {dateText && (
        <span className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11.5px] font-semibold text-[#1B1830]">
          <Calendar size={13} className="text-[#4F6EF7]" />
          {dateText}
        </span>
      )}
      <div className="absolute bottom-3 left-3 right-16 z-10 flex items-center gap-2.5">
        {iconUrl && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-white p-1">
            <img src={iconUrl} alt="" className="h-full w-full rounded-[8px] object-contain" />
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-bold leading-tight text-white drop-shadow">{category}</span>
          {communityLabel && (
            <span className="mt-0.5 flex items-center gap-1 text-[11.5px] text-white/90">
              <MapPin size={12} className="shrink-0 text-[#FBBF24]" />
              <span className="truncate">{communityLabel}</span>
            </span>
          )}
        </span>
      </div>
    </>
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className="block w-full cursor-pointer overflow-hidden rounded-[18px] bg-white text-left shadow-[0_4px_14px_rgba(60,40,100,0.05)] transition hover:-translate-y-0.5"
    >
      {images.length > 0 ? (
        <PhotoSlider images={images} blur={blurImages}>
          {headOverlay}
        </PhotoSlider>
      ) : (
        /* ไม่มีรูป — หัวแบบแถบไอคอนหมวดแทน */
        <div className="flex items-center gap-2.5 px-3.5 pt-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-[#F1ECFE]">
            {iconUrl ? (
              <img src={iconUrl} alt="" className="h-full w-full object-contain" />
            ) : (
              <span className="text-[16px] font-bold text-[#7C3AED]">{category.slice(0, 1)}</span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-bold leading-tight text-gray-900">{category}</span>
            {communityLabel && (
              <span className="mt-0.5 flex items-center gap-1 text-[11.5px] text-[#9590A8]">
                <MapPin size={12} className="shrink-0 text-[#F2A93B]" />
                <span className="truncate">{communityLabel}</span>
              </span>
            )}
          </span>
          {dateText && <span className="shrink-0 text-[11px] text-[#9590A8]">{dateText}</span>}
        </div>
      )}

      <div className="px-3.5 pb-3.5 pt-3">
        <div className="flex items-center justify-between gap-2">
          {problemLabels[0] ? (
            <span className="inline-flex max-w-[65%] items-center rounded-full bg-[#F1ECFE] px-3 py-1 text-[11.5px] font-semibold text-[#7C3AED]">
              <span className="truncate">{problemLabels[0]}</span>
              {problemLabels.length > 1 && <span className="ml-1 shrink-0">+{problemLabels.length - 1}</span>}
            </span>
          ) : (
            <span />
          )}
          <span className="shrink-0 font-mono text-[11px] text-[#9590A8]">
            {complaint.complaintId || String(complaint._id).slice(-8).toUpperCase()}
          </span>
        </div>
        {complaint.detail && (
          <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-[#4A4458]">{complaint.detail}</p>
        )}
        <StepRow step={step} labels={stepLabels} />
      </div>
    </div>
  );
}
