import React, { useEffect, useState, useMemo, useCallback } from "react";
import { z } from "zod";
import { useTranslation } from "@/hooks/useTranslation";

const ReporterInput = ({
  prefix,
  setPrefix,
  fullName,
  setFullName,
  phone,
  setPhone,
  detail,
  setDetail,
  validateTrigger = false,
  setValid = () => {},
}) => {
  const { t, language } = useTranslation();
  const [errors, setErrors] = useState({});

  const reporterSchema = useMemo(() => z.object({
    prefix: z.string(),
    fullName: z.string().min(1, t.form.validation.enterName),
    phone: z.string()
      .regex(/^[0-9]{10}$/, t.form.validation.enterPhone),
    detail: z.string().min(1, t.form.validation.enterDetail),
  }), [t.form.validation.enterName, t.form.validation.enterPhone, t.form.validation.enterDetail]);

  const validate = useCallback(() => {
    const result = reporterSchema.safeParse({ prefix, fullName, phone, detail });
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      setValid(false);
    } else {
      setErrors({});
      setValid(true);
    }
  }, [reporterSchema, prefix, fullName, phone, detail, setValid]);

  useEffect(() => {
    if (!validateTrigger) return;
    validate();
  }, [validateTrigger, validate]);

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex flex-col space-y-2 mt-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-gray-800">
            {t.form.problemDetail}
          </label>
          {errors.detail && <p className="text-sm text-red-500 text-right ml-2">{errors.detail[0]}</p>}
        </div>
        <textarea
          className="textarea w-full bg-blue-50 text-blue-900 border-blue-300 placeholder:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={t.form.placeholder.detail}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
        ></textarea>
      </div>
      <div className="flex flex-col space-y-2 mt-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-gray-800">{t.form.reporterInfo}</label>
            {errors.fullName && <p className="text-sm text-red-500 text-right ml-2">{errors.fullName[0]}</p>}
        </div>
        <div className="flex gap-2">
          <div className="flex flex-col flex-shrink-0">
            <div className="flex justify-between items-center">
              <label className="sr-only">{language === 'en' ? 'Prefix' : 'คำนำหน้า'}</label>
            </div>
            <select
              className="select select-bordered bg-blue-100 text-blue-900 border-blue-300 w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
            >
              <option value="นาย" className="text-blue-700">
                {t.form.prefix.mr}
              </option>
              <option value="นาง" className="text-blue-700">
                {t.form.prefix.mrs}
              </option>
              <option value="น.ส." className="text-blue-700">
                {t.form.prefix.ms}
              </option>
            </select>
          </div>
          <div className="flex flex-1 flex-col">
            <div className="flex justify-between items-center">
              <label className="sr-only">{t.form.placeholder.name}</label>
            </div>
            <input
              type="text"
              className="input input-bordered flex-1 bg-blue-50 text-blue-900 border-blue-300 placeholder:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t.form.placeholder.name}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              />
          </div>
        </div>
      </div>

      <div className="flex flex-col space-y-2 mt-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-gray-800">
            {t.form.phoneNumber}
          </label>
          {errors.phone && <p className="text-sm text-red-500 text-right ml-2">{errors.phone[0]}</p>}
        </div>
        <div className="relative w-full">
          <input
            type="tel"
            className="input input-bordered w-full bg-blue-50 text-blue-900 border-blue-300 placeholder:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10 tabular-nums"
            placeholder={t.form.placeholder.phone}
            inputMode="numeric"
            pattern="\d*"
            minLength="10"
            maxLength="10"
            title="Must be 10 digits"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onInput={(e) => (e.target.value = e.target.value.replace(/\D/g, ""))}
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-900 pointer-events-none z-10"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="#9ca3af"
          >
            <path d="M7.25 11.5C6.83579 11.5 6.5 11.8358 6.5 12.25C6.5 12.6642 6.83579 13 7.25 13H8.75C9.16421 13 9.5 12.6642 9.5 12.25C9.5 11.8358 9.16421 11.5 8.75 11.5H7.25Z" />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M6 1C4.61929 1 3.5 2.11929 3.5 3.5V12.5C3.5 13.8807 4.61929 15 6 15H10C11.3807 15 12.5 13.8807 12.5 12.5V3.5C12.5 2.11929 11.3807 1 10 1H6ZM10 2.5H9.5V3C9.5 3.27614 9.27614 3.5 9 3.5H7C6.72386 3.5 6.5 3.27614 6.5 3V2.5H6C5.44771 2.5 5 2.94772 5 3.5V12.5C5 13.0523 5.44772 13.5 6 13.5H10C10.5523 13.5 11 13.0523 11 12.5V3.5C11 2.94772 10.5523 2.5 10 2.5Z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default ReporterInput;
