import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import CommunitySelector from './CommunitySelector';
import ReporterInput from './ReporterInput';

import { useProblemOptionStore } from '@/stores/useProblemOptionStore';
import ImageUploads from './ImageUploads';
import Swal from 'sweetalert2';
import { z } from 'zod';
import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';
const LocationConfirm = dynamic(() => import('./LocationConfirm'), { ssr: false });

// ปัญหาที่มีการจำกัดจำนวนต่อวัน
const DAILY_LIMITED_PROBLEMS = ['ขอรถรับ-ส่งไปโรงพยาบาล'];

const ComplaintFormModal = ({ selectedLabel, onClose }) => {
  const { t, language } = useTranslation();
  
  const schema = z.object({
    community: z.string().min(1, t.form.validation.selectCommunity),
  });
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [prefix, setPrefix] = useState('นาย');
  const [fullName, setFullName] = useState('');

  const [phone, setPhone] = useState('');
  const [detail, setDetail] = useState('');
  const [imageUrls, setImageUrls] = useState([]);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [location, setLocation] = useState(null);
  const [selectedProblems, setSelectedProblems] = useState([]);
  const [validateTrigger, setValidateTrigger] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const reporterValidRef = useRef(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);
  
  // State สำหรับ daily limit
  const [dailyLimitStatus, setDailyLimitStatus] = useState({});

  const { problemOptions, fetchProblemOptions } = useProblemOptionStore();

// ฟังก์ชันตรวจสอบ daily limit
  const checkDailyLimit = useCallback(async (problemLabel) => {
    try {
      const res = await fetch(`/api/submittedreports/check-daily-limit?problem=${encodeURIComponent(problemLabel)}`);
      const data = await res.json();
      return data;
    } catch (error) {
      console.error('Error checking daily limit:', error);
      return { hasLimit: false };
    }
  }, []);

  // โหลด daily limit status เมื่อเปิด modal
  useEffect(() => {
    const loadDailyLimits = async () => {
      const filteredOptions = problemOptions.filter(opt => opt.category === selectedLabel);
      const limitedProblems = filteredOptions.filter(opt => 
        DAILY_LIMITED_PROBLEMS.includes(opt.label)
      );

      const statusMap = {};
      for (const opt of limitedProblems) {
        const status = await checkDailyLimit(opt.label);
        statusMap[opt.label] = status;
      }
      setDailyLimitStatus(statusMap);
    };

    if (problemOptions.length > 0 && selectedLabel) {
      loadDailyLimits();
    }
  }, [problemOptions, selectedLabel, checkDailyLimit]);

  useEffect(() => {
    fetchProblemOptions();
  }, [fetchProblemOptions]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ป้องกันการส่งซ้ำ
    if (isSubmitting) {
      return;
    }

    // ป้องกันการกดปุ่มซ้ำอย่างรวดเร็ว (ภายใน 3 วินาที)
    const now = Date.now();
    if (now - lastSubmitTime < 3000) {
      await Swal.fire({
        icon: 'warning',
        title: t.form.alert.pleaseWait,
        text: t.form.alert.waitMessage,
        confirmButtonText: t.form.alert.ok
      });
      return;
    }
    setLastSubmitTime(now);

    setValidateTrigger(true);
    await new Promise((resolve) => setTimeout(resolve, 0)); // allow validation effect to run

    const result = schema.safeParse({ community: selectedCommunity });
    if (!result.success) {
      setFormErrors(result.error.flatten().fieldErrors);
      return;
    } else {
      setFormErrors({});
    }

    // ตรวจสอบข้อมูลที่จำเป็นทั้งหมด
    const validationErrors = [];
    
    if (!reporterValidRef.current) {
      validationErrors.push(t.form.validation.reporterInvalid);
    }

    if (!location) {
      validationErrors.push(t.form.validation.selectLocation);
    }

    if (imageUrls.length === 0) {
      validationErrors.push(t.form.validation.uploadImage);
    }

    if (!fullName.trim()) {
      validationErrors.push(t.form.validation.enterReporterName);
    }

    if (selectedProblems.length === 0) {
      validationErrors.push(t.form.validation.selectProblem);
    }

    if (validationErrors.length > 0) {
      await Swal.fire({
        icon: 'warning',
        title: t.form.alert.checkData,
        html: validationErrors.map(error => `• ${error}`).join('<br>'),
        confirmButtonText: t.form.alert.ok
      });
      return;
    }

    // ตั้งค่า isSubmitting เป็น true ก่อนส่งข้อมูล
    setIsSubmitting(true);

    // NOTE: complaintId will be generated by the backend
    const payload = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      community: selectedCommunity,
      problems: selectedProblems.map(id => {
        const match = problemOptions.find(opt => opt._id === id);
        return match ? match.label : id;
      }),
      category: selectedLabel,
      images: imageUrls,
      detail: detail.trim(),
      location,
      status: 'อยู่ระหว่างดำเนินการ',
      officer: '',
      updatedAt: new Date(),
    };

    console.log("📤 Payload ส่งไป backend:", payload);

    try {
      const res = await fetch('/api/submittedreports/submit-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-id': process.env.NEXT_PUBLIC_APP_ID || 'app_a',
        },
        body: JSON.stringify(payload),
      });
      
      console.log("📡 Response status:", res.status);
      
      if (!res.ok) {
        let errorMessage = 'ส่งข้อมูลไม่สำเร็จ';
        let errorData = null;
        try {
          errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error("❌ Failed to parse error response:", parseError);
        }
        
        if (res.status === 409) {
          // กรณีส่งซ้ำ
          throw new Error(errorMessage);
        }
        
        if (res.status === 429 && errorData?.errorCode === 'DAILY_LIMIT_REACHED') {
          // กรณีครบ limit วันนี้ - รีเฟรช limit status
          const status = await checkDailyLimit(errorData.problem);
          setDailyLimitStatus(prev => ({
            ...prev,
            [errorData.problem]: status
          }));
          throw new Error(errorMessage);
        }
        
        throw new Error(errorMessage);
      }

      const data = await res.json();
      const complaintId = data.complaintId;

      console.log("✅ Successfully submitted with complaintId:", complaintId);

      // ลดเวลา delay ลงเหลือ 2 วินาที
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      await Swal.fire({
        icon: 'success',
        title: t.form.alert.success,
        html: `${t.form.alert.successMessage} <strong>${complaintId}</strong><br><br>${t.form.alert.notifyOfficer}`,
        confirmButtonText: t.form.alert.ok,
      });
      
      handleClearForm();
      onClose?.(); // Close the modal
    } catch (err) {
      console.error('❌ เกิดข้อผิดพลาด:', err);
      await Swal.fire({
        icon: 'error',
        title: t.form.alert.error,
        text: err.message || t.form.alert.errorMessage,
        confirmButtonText: t.form.alert.ok,
      });
    } finally {
      // ตั้งค่า isSubmitting เป็น false เสมอ ไม่ว่าจะสำเร็จหรือไม่
      setIsSubmitting(false);
    }
  };

  const handleClearForm = () => {
    setSelectedCommunity('');
    setPrefix('นาย');
    setFullName('');

    setPhone('');
    setDetail('');
    setImageUrls([]); // Explicitly clear imageUrls
    setUseCurrentLocation(false);
    setLocation(null);
    setSelectedProblems([]);
    setValidateTrigger(false);
    setFormErrors({});
    reporterValidRef.current = true;
  };

  const handleCommunitySelect = (community) => {
    setSelectedCommunity(community);
  };

  useEffect(() => {
  import('leaflet').then(L => {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/leaflet/marker-icon-2x.png',
      iconUrl: '/leaflet/marker-icon.png',
      shadowUrl: '/leaflet/marker-shadow.png',
    });
  });
}, []);

  if (!selectedLabel) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 overflow-y-auto flex items-center justify-center transition-all">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto transform transition-all duration-300 opacity-0 scale-95 animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-gray-800">
            {t.form.formFor}: {t.categoryMap?.[selectedLabel] || selectedLabel}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className={`text-gray-500 hover:text-gray-800 text-sm ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <CommunitySelector
            selected={selectedCommunity}
            onSelect={handleCommunitySelect}
            error={formErrors.community?.[0]}
          />
          <div>
            <p className="font-semibold text-sm text-gray-700">{t.form.selectProblem}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {problemOptions
                .filter(option => option.category === selectedLabel)
                .map(option => {
                  const displayLabel = language === 'en' && option.labelEn ? option.labelEn : option.label;
                  const limitStatus = dailyLimitStatus[option.label];
                  const isLimitReached = limitStatus?.isLimitReached;
                  const remaining = limitStatus?.remaining;
                  const hasLimit = limitStatus?.hasLimit;

                  return (
                    <div key={option._id} className="flex flex-col items-start">
                      <button
                        type="button"
                        disabled={isLimitReached}
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border whitespace-nowrap transition-all ${
                          isLimitReached 
                            ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed opacity-60' 
                            : selectedProblems.includes(option._id) 
                              ? 'bg-blue-100 text-black border-blue-300' 
                              : 'border-gray-300 text-black hover:bg-gray-100'
                        }`}
                        onClick={() => {
                          if (isLimitReached) {
                            const messageDefault = `วันนี้มีการขอ "${displayLabel}" ครบ ${limitStatus?.limit} ครั้งแล้ว กรุณารอวันถัดไป`;
                            Swal.fire({
                              icon: 'warning',
                              title: t.form?.dailyLimit?.limitReachedTitle || 'ครบจำนวนวันนี้แล้ว',
                              text: messageDefault,
                              confirmButtonText: t.form.alert.ok
                            });
                            return;
                          }
                          setSelectedProblems(prev =>
                            prev.includes(option._id)
                              ? prev.filter(id => id !== option._id)
                              : [...prev, option._id]
                          );
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Image
                            src={option.iconUrl}
                            alt={displayLabel}
                            width={20}
                            height={20}
                            className="w-5 h-5"
                          />
                          <span>{displayLabel}</span>
                          {hasLimit && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                              isLimitReached 
                                ? 'bg-red-100 text-red-600' 
                                : 'bg-green-100 text-green-600'
                            }`}>
                              {isLimitReached 
                                ? (t.form?.dailyLimit?.full || 'เต็ม') 
                                : `${remaining}/${limitStatus?.limit}`}
                            </span>
                          )}
                        </div>
                      </button>
                      {hasLimit && !isLimitReached && (
                        <span className="text-xs text-gray-500 mt-0.5 ml-2">
                          {(t.form?.dailyLimit?.remainingToday || 'เหลืออีก {remaining} ครั้งวันนี้').replace('{remaining}', remaining)}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
          <ImageUploads onChange={(urls) => setImageUrls(urls)} />
          <ReporterInput
            prefix={prefix}
            setPrefix={setPrefix}
            fullName={fullName}
            setFullName={setFullName}
            phone={phone}
            setPhone={setPhone}
            detail={detail}
            setDetail={setDetail}
            validateTrigger={validateTrigger}
            setValid={(v) => reporterValidRef.current = v}
          />
          <LocationConfirm
            useCurrent={useCurrentLocation}
            onToggle={setUseCurrentLocation}
            location={location}
            setLocation={setLocation}
          />
        <div className="flex mb-4 gap-2 justify-end">
          <button
            type="button"
            onClick={handleClearForm}
            disabled={isSubmitting}
            className={`btn btn-outline btn-warning ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {t.form.clearForm}
          </button>
          <button 
            type="submit" 
            className={`btn ${isSubmitting ? 'btn-disabled' : 'btn-info'}`} 
            disabled={isSubmitting}
          >
            {isSubmitting && <span className="loading loading-infinity loading-xs mr-2" />}
            {isSubmitting ? t.form.submitting : t.form.submit}
          </button>
        </div>
        </form>
      </div>
    </div>
  );
};

export default ComplaintFormModal;