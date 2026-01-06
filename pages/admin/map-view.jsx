import React, { useState, useEffect } from 'react';
import { FaMap, FaFilter, FaCalendarAlt, FaArrowLeft } from 'react-icons/fa';
import MapView from '@/components/MapView';
import Link from 'next/link';
import { useMenuStore } from '@/stores/useMenuStore';
import Image from 'next/image';
import { getThaiFiscalYear } from '@/lib/fiscalYear';

export default function MapViewPage() {
  const [data, setData] = useState([]);
  const currentFiscalYearThai = getThaiFiscalYear(new Date());
  const fiscalYearOptions = Array.from({ length: 5 }, (_, i) => String(currentFiscalYearThai - i)); // last 5 FYs
  const [year, setYear] = useState(String(currentFiscalYearThai)); // year = Thai fiscal year (พ.ศ.)
  const [loading, setLoading] = useState(true);
  
  const { menu, fetchMenu } = useMenuStore();

  // ฟังก์ชันหา icon จาก category (ใช้วิธีเดียวกับ CardModalDetail)
  const findIconByCategory = (category) => {
    if (!category || !menu || menu.length === 0) return '/default-icon.png';
    
    const matched = menu.find((m) => m.Prob_name === category);
    return matched?.Prob_pic || '/default-icon.png';
  };

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const endpoint = `/api/complaints/fiscal-year?fiscalYear=${encodeURIComponent(year)}&role=admin`;
        const res = await fetch(endpoint);
        const json = await res.json();
        const rows = json?.success && Array.isArray(json?.data) ? json.data : [];
        setData(rows);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [year]);

  const totalComplaints = data.length;
  const complaintsWithLocation = data.filter(item => item.location && item.location.lat && item.location.lng).length;
  const categories = [...new Set(data.map(item => item.category).filter(Boolean))];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
              <p className="text-lg text-gray-600">กำลังโหลดข้อมูลแผนที่...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/admin/summary-category"
                className="btn btn-ghost btn-sm"
              >
                <FaArrowLeft className="mr-2" />
                กลับ
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <FaMap className="text-primary" />
                  แผนที่แสดงตำแหน่งการแจ้งปัญหา
                </h1>
                <p className="text-gray-600 text-sm">
                  ดูตำแหน่งการแจ้งปัญหาทั้งหมดในรูปแบบแผนที่
                </p>
              </div>
            </div>
            
            {/* Year Selector */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <FaCalendarAlt className="text-primary" />
                เลือกปีงบประมาณ:
              </label>
              <select
                className="select select-bordered select-sm w-32 bg-white"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                {fiscalYearOptions.map((fy) => (
                  <option key={fy} value={fy}>
                    {fy}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm opacity-90">รวมรายการ</h3>
                  <p className="text-2xl font-bold">{totalComplaints}</p>
                </div>
                <div className="text-3xl opacity-80">
                  <FaMap />
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm opacity-90">มีตำแหน่ง</h3>
                  <p className="text-2xl font-bold">{complaintsWithLocation}</p>
                </div>
                <div className="text-3xl opacity-80">
                  📍
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm opacity-90">หมวดหมู่</h3>
                  <p className="text-2xl font-bold">{categories.length}</p>
                </div>
                <div className="text-3xl opacity-80">
                  <FaFilter />
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm opacity-90">ปีงบประมาณ {year}</h3>
                  <p className="text-2xl font-bold">{((complaintsWithLocation / totalComplaints) * 100).toFixed(1)}%</p>
                </div>
                <div className="text-3xl opacity-80">
                  📊
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="max-w-7xl mx-auto px-6 pb-6">
        <div className="card bg-white shadow-xl">
          <div className="card-body p-0">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">
                    🗺️ แผนที่แสดงตำแหน่งการแจ้งปัญหา
                  </h3>
                  <p className="text-gray-600 text-sm">
                    คลิกที่หมุดเพื่อดูรายละเอียด • ใช้ตัวกรองด้านซ้ายเพื่อเลือกหมวดหมู่
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  แสดง {complaintsWithLocation} จาก {totalComplaints} รายการ
                </div>
              </div>
            </div>
            <div className="h-[600px]">
              <MapView data={data} year={year} />
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6">
          <div className="card bg-white shadow-lg">
            <div className="card-body">
              <h4 className="font-semibold text-gray-800 mb-3">คำอธิบายสีหมุด</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {categories.map((category) => {
                  const iconUrl = findIconByCategory(category);
                  const isValidIconUrl = iconUrl && (iconUrl.startsWith('http') || iconUrl.startsWith('/'));
                  
                  // หาสีตาม category
                  const getCategoryColor = (cat) => {
                    const colorMap = {
                      'ถนน': 'bg-red-500',
                      'ไฟฟ้า': 'bg-amber-500', 
                      'น้ำ': 'bg-blue-500',
                      'ขยะ': 'bg-emerald-500',
                      'สิ่งแวดล้อม': 'bg-violet-500',
                      'ความปลอดภัย': 'bg-pink-500',
                      'อื่นๆ': 'bg-gray-500'
                    };
                    return colorMap[cat] || 'bg-gray-500';
                  };
                  
                  return (
                    <div key={category} className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${getCategoryColor(category)}`}>
                        {isValidIconUrl ? (
                          <Image
                            src={iconUrl}
                            alt={category}
                            width={12}
                            height={12}
                            className="object-contain"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-3 h-3 bg-white rounded-full flex items-center justify-center text-xs font-bold text-gray-800">
                            {category.charAt(0)}
                          </div>
                        )}
                      </div>
                      <span className="text-sm">{category}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 