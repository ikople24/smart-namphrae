import { CircleCheck } from "lucide-react";
import ReactCompareImage from 'react-compare-image';
import { useMemo, useState } from "react";
import { getOptimizedCloudinaryUrl } from "@/utils/uploadToCloudinary";
import { useTranslation } from "@/hooks/useTranslation";

/* eslint-disable @next/next/no-img-element */

const CompletedCard = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  complaintMongoId,
  title,
  beforeImage,
  problems,
  updatedAt,
  userRole = "user",
  // ⚡ รับ data ที่ parent fetch มาแล้วเป็น props (ไม่ต้อง fetch เอง)
  menu = [],
  problemOptions = [],
  assignment = null,
}) => {
  const [previewImg, setPreviewImg] = useState(null);
  const { t, language } = useTranslation();

  // ⚡ ใช้ useMemo แทน useEffect+useState สำหรับ computed values
  const activeIcons = useMemo(() => {
    if (!Array.isArray(problems)) return [];
    return problems.map((problem) => {
      const found = problemOptions?.find(
        (p) => p?.label?.trim() === problem?.trim()
      );
      const displayLabel = language === 'en' && found?.labelEn ? found.labelEn : (found?.label ?? problem);
      return {
        label: displayLabel,
        iconUrl: found?.iconUrl ?? "",
      };
    });
  }, [problems, problemOptions, language]);

  // ⚡ ใช้ useMemo สำหรับ menu icon
  const menuIcon = useMemo(() => {
    return menu?.find((item) => item.Prob_name === title);
  }, [menu, title]);

  const shouldBlur = title === "สวัสดิการสังคม" && userRole !== "admin" && userRole !== "superadmin";

  // ⚡ Optimize Cloudinary URLs สำหรับ thumbnail
  const optimizedBeforeImage = useMemo(() => 
    getOptimizedCloudinaryUrl(beforeImage, 400), 
    [beforeImage]
  );
  
  const optimizedAfterImage = useMemo(() => 
    getOptimizedCloudinaryUrl(assignment?.solutionImages?.[0], 400), 
    [assignment?.solutionImages]
  );

  return (
    <>
      <div className="bg-white shadow-md rounded-2xl p-4 border border-green-300 space-y-2 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {menuIcon && (
              <img
                src={menuIcon.Prob_pic}
                alt={menuIcon.Prob_name}
                loading="lazy"
                decoding="async"
                className="w-10 h-10 object-contain"
              />
            )}
            <h2 className="text-lg font-semibold text-gray-800">
              {t.categoryMap?.[title] || title}
            </h2>
          </div>
          <div className="text-xs text-gray-500 whitespace-nowrap">
            {language === 'en' ? 'Completed:' : 'วันที่สำเร็จ:'} {new Date(assignment?.completedAt || updatedAt).toLocaleDateString(language === 'en' ? "en-US" : "th-TH")}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeIcons.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm"
            >
              {item.iconUrl && (
                <img
                  src={item.iconUrl}
                  alt={item.label}
                  loading="lazy"
                  decoding="async"
                  className="w-5 h-5 object-contain"
                />
              )}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
        
        {/* Compare Image Section */}
        {beforeImage && assignment?.solutionImages?.[0] && (
          <div
            className="relative my-2 max-w-full h-[180px] sm:h-[220px] mx-auto pointer-events-auto z-10 overflow-hidden rounded-lg border border-green-200 cursor-pointer"
            onClick={() => setPreviewImg('compare')}
          >
            <div className="absolute top-2 left-2 z-20 bg-black bg-opacity-50 text-white px-2 py-0.5 rounded text-xs">
              {t.complaint.beforeImage}
            </div>
            <div className="absolute top-2 right-2 z-20 bg-black bg-opacity-50 text-white px-2 py-0.5 rounded text-xs">
              {t.complaint.afterImage}
            </div>
            <div className={shouldBlur ? "blur-sm" : ""}>
              <ReactCompareImage
                leftImage={optimizedBeforeImage}
                rightImage={optimizedAfterImage}
                handle={<div />}
                sliderLineWidth={2}
                sliderPositionPercentage={0.5}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end mt-2">
          <div className="inline-flex items-center gap-1 border border-green-500 text-green-600 px-3 py-1 rounded-full text-xs">
            <CircleCheck size={14} className="text-green-500" />
            {t.status.completed}
          </div>
        </div>
      </div>

      {/* Modal แสดงรูปเปรียบเทียบใหญ่ */}
      {previewImg === 'compare' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setPreviewImg(null)}
        >
          <div className="bg-white rounded-lg p-4 max-w-3xl w-full relative" onClick={e => e.stopPropagation()}>
            <div className={shouldBlur ? "blur-sm" : ""}>
              <ReactCompareImage
                leftImage={beforeImage}
                rightImage={assignment?.solutionImages?.[0]}
                handle={<div />}
                sliderLineWidth={2}
                sliderPositionPercentage={0.5}
              />
            </div>
            <button
              className="absolute top-2 right-2 text-black text-2xl"
              onClick={() => setPreviewImg(null)}
            >✖</button>
          </div>
        </div>
      )}
    </>
  );
};

export default CompletedCard;
