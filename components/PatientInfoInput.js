import React, { useEffect, useMemo, useCallback, useState } from "react";
import { z } from "zod";
import { useTranslation } from "@/hooks/useTranslation";

const PatientInfoInput = ({
  patientName,
  setPatientName,
  isSelf,
  setIsSelf,
  reporterPrefix,
  reporterFullName,
  validateTrigger = false,
  setValid = () => {},
}) => {
  const { t } = useTranslation();
  const [errors, setErrors] = useState({});

  const patientSchema = useMemo(
    () =>
      z.object({
        patientName: z.string().trim().min(1, t.form.validation.enterPatientName),
      }),
    [t.form.validation.enterPatientName]
  );

  const validate = useCallback(() => {
    const result = patientSchema.safeParse({ patientName });
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      setValid(false);
    } else {
      setErrors({});
      setValid(true);
    }
  }, [patientSchema, patientName, setValid]);

  useEffect(() => {
    if (!validateTrigger) return;
    validate();
  }, [validateTrigger, validate]);

  // ขณะติ๊ก "ผู้ป่วยคือตัวผู้แจ้งเอง" ให้ชื่อผู้ป่วยตามชื่อผู้แจ้งตลอด
  // รวมถึงตอนที่ผู้แจ้งย้อนกลับไปแก้ชื่อหรือคำนำหน้าของตัวเองทีหลัง
  useEffect(() => {
    if (!isSelf) return;
    setPatientName(`${reporterPrefix || ""}${reporterFullName || ""}`.trim());
  }, [isSelf, reporterPrefix, reporterFullName, setPatientName]);

  const handleToggleSelf = (checked) => {
    setIsSelf(checked);
    if (!checked) setPatientName("");
  };

  return (
    <div className="flex flex-col space-y-2 rounded-lg border border-blue-200 bg-blue-50/40 p-3">
      <label className="text-sm font-medium text-gray-800">
        {t.form.patient.sectionTitle}
      </label>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          className="checkbox checkbox-sm checkbox-info"
          checked={isSelf}
          onChange={(e) => handleToggleSelf(e.target.checked)}
        />
        <span>{t.form.patient.isSelf}</span>
      </label>

      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-800">
            {t.form.patient.name}
          </label>
          {errors.patientName && (
            <p className="ml-2 text-right text-sm text-red-500">
              {errors.patientName[0]}
            </p>
          )}
        </div>
        <input
          type="text"
          className="input input-bordered w-full border-blue-300 bg-blue-50 text-blue-900 placeholder:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          placeholder={t.form.patient.placeholder}
          value={patientName}
          disabled={isSelf}
          onChange={(e) => setPatientName(e.target.value)}
        />
      </div>
    </div>
  );
};

export default PatientInfoInput;
