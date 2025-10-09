import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { FaCheckCircle, FaListUl, FaChartBar, FaCalendarAlt, FaArrowUp, FaArrowDown, FaMap, FaDownload } from 'react-icons/fa';
import MapView from '@/components/MapView';
import Link from 'next/link';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
import { useEffect, useState } from "react";

export default function SummaryByCategory() {
  const [summary, setSummary] = useState([]);
  const [rawData, setRawData] = useState([]);
  const [year, setYear] = useState("2024");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' or 'map'

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const endpoint = year === "2025" ? `/api/submittedreports` : `/api/submittedreports_${year}`;
        const res = await fetch(endpoint);
        const data = await res.json();

        // นับจำนวนตาม category
        const countByCategory = data.reduce((acc, item) => {
          const cat = item.category || "ไม่ระบุ";
          acc[cat] = (acc[cat] || 0) + 1;
          return acc;
        }, {});

        // แปลงเป็น array เพื่อแสดง
        const result = Object.entries(countByCategory).map(([category, count]) => ({
          category,
          count,
        }));

        setSummary(result);
        setRawData(data); // เก็บข้อมูลดิบสำหรับแผนที่
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [year]);

  const total = summary.reduce((sum, item) => sum + item.count, 0);
  const topCategory = summary.sort((a, b) => b.count - a.count)[0]?.category || "-";
  const categoryCount = summary.length;

  // สร้างสีสันสำหรับกราฟ
  const generateColors = (count) => {
    const colors = [
      'rgba(99, 102, 241, 0.8)',   // Indigo
      'rgba(59, 130, 246, 0.8)',   // Blue
      'rgba(16, 185, 129, 0.8)',   // Emerald
      'rgba(245, 158, 11, 0.8)',   // Amber
      'rgba(239, 68, 68, 0.8)',    // Red
      'rgba(168, 85, 247, 0.8)',   // Purple
      'rgba(236, 72, 153, 0.8)',   // Pink
      'rgba(34, 197, 94, 0.8)',    // Green
    ];
    
    return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
  };

  const chartColors = generateColors(summary.length);

  // ฟังก์ชัน export ข้อมูลเป็น CSV
  const exportToCSV = () => {
    // เตรียมข้อมูลสำหรับ export
    const exportData = rawData.map((item, index) => ({
      'ลำดับ': index + 1,
      'รหัสคำร้อง': item.complaintId || 'ไม่ระบุ',
      'ประเภทปัญหา': item.category || 'ไม่ระบุ',
      'วันที่แจ้ง': item.createdAt ? new Date(item.createdAt).toLocaleDateString('th-TH') : 'ไม่ระบุ',
      'เวลาที่แจ้ง': item.createdAt ? new Date(item.createdAt).toLocaleTimeString('th-TH') : 'ไม่ระบุ',
      'สถานะ': item.status || 'ไม่ระบุ',
      'รายละเอียด': item.detail || 'ไม่มีรายละเอียด',
      'ตำแหน่งที่แจ้ง': item.location ? `${item.location.lat}, ${item.location.lng}` : 'ไม่ระบุ',
      'ผู้แจ้ง': item.fullName || 'ไม่ระบุ',
      'เบอร์ติดต่อ': item.phone || 'ไม่ระบุ',
      'ชุมชน': item.community || 'ไม่ระบุ',
      'เจ้าหน้าที่': item.officer || 'ไม่ระบุ'
    }));

    // สร้าง CSV content
    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => 
        headers.map(header => {
          const value = row[header];
          // ใส่ quotes รอบค่าที่มี comma หรือ newline
          if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    // สร้างและดาวน์โหลดไฟล์
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `complaints_summary_${year}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
              <p className="text-lg text-gray-600">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                📊 สรุปตามประเภทปัญหา
              </h1>
              <p className="text-gray-600">
                วิเคราะห์ข้อมูลการแจ้งปัญหาตามประเภทต่างๆ
              </p>
            </div>
            
            {/* Year Selector and Export Button */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <FaCalendarAlt className="text-primary" />
                  เลือกปี:
                </label>
                <select
                  className="select select-bordered select-sm w-32 bg-white"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                >
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                </select>
              </div>
              
              {/* Export Button */}
              <button
                onClick={exportToCSV}
                className="btn btn-primary btn-sm gap-2 bg-green-600 hover:bg-green-700 border-green-600 hover:border-green-700"
                disabled={loading || rawData.length === 0}
              >
                <FaDownload />
                Export ทั้งหมด ({rawData.length})
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm opacity-90 mb-1">รวมรายการทั้งหมด</h3>
                  <p className="text-3xl font-bold">{total.toLocaleString()}</p>
                  <div className="flex items-center gap-1 mt-2 text-sm opacity-90">
                    <FaArrowUp className="text-green-300" />
                    <span>ปี {year}</span>
                  </div>
                </div>
                <div className="text-4xl opacity-80">
                  <FaListUl />
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm opacity-90 mb-1">ประเภทที่แจ้งมากที่สุด</h3>
                  <p className="text-xl font-bold truncate">{topCategory}</p>
                  <div className="flex items-center gap-1 mt-2 text-sm opacity-90">
                    <FaChartBar className="text-yellow-300" />
                    <span>อันดับ 1</span>
                  </div>
                </div>
                <div className="text-4xl opacity-80">
                  <FaCheckCircle />
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm opacity-90 mb-1">จำนวนประเภทปัญหา</h3>
                  <p className="text-3xl font-bold">{categoryCount}</p>
                  <div className="flex items-center gap-1 mt-2 text-sm opacity-90">
                    <FaArrowDown className="text-pink-300" />
                    <span>ประเภท</span>
                  </div>
                </div>
                <div className="text-4xl opacity-80">
                  <FaChartBar />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="tabs tabs-boxed bg-white shadow-sm">
            <button
              className={`tab ${activeTab === 'chart' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('chart')}
            >
              <FaChartBar className="mr-2" />
              กราฟและสถิติ
            </button>
            <button
              className={`tab ${activeTab === 'map' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('map')}
            >
              <FaMap className="mr-2" />
              แผนที่
            </button>
            <Link
              href="/admin/map-view"
              className="tab tab-outline"
            >
              <FaMap className="mr-2" />
              แผนที่เต็มหน้าจอ
            </Link>
          </div>
        </div>

        {/* Chart Tab Content */}
        {activeTab === 'chart' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Bar Chart */}
            <div className="lg:col-span-2">
              <div className="card bg-white shadow-xl">
                <div className="card-body">
                  <h3 className="card-title text-gray-800 mb-4">
                    📈 กราฟแท่งแสดงจำนวนตามประเภทปัญหา
                  </h3>
                  <div className="h-80">
                    <Bar
                      data={{
                        labels: summary.map(item => item.category),
                        datasets: [
                          {
                            label: 'จำนวนรายการ',
                            data: summary.map(item => item.count),
                            backgroundColor: chartColors,
                            borderColor: chartColors.map(color => color.replace('0.8', '1')),
                            borderWidth: 2,
                            borderRadius: 8,
                            borderSkipped: false,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          title: { display: false },
                          tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: 'white',
                            bodyColor: 'white',
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            borderWidth: 1,
                            cornerRadius: 8,
                            displayColors: false,
                            callbacks: {
                              label: function(context) {
                                return `จำนวน: ${context.parsed.y} รายการ`;
                              }
                            }
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: { 
                              precision: 0,
                              font: {
                                size: 12
                              }
                            },
                            grid: {
                              color: 'rgba(0, 0, 0, 0.1)',
                            }
                          },
                          x: {
                            ticks: {
                              font: {
                                size: 11
                              }
                            },
                            grid: {
                              display: false
                            }
                          }
                        },
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Category List */}
            <div className="lg:col-span-1">
              <div className="card bg-white shadow-xl">
                <div className="card-body">
                  <h3 className="card-title text-gray-800 mb-4">
                    📋 รายการประเภทปัญหา
                  </h3>
                  <div className="space-y-3">
                    {summary
                      .sort((a, b) => b.count - a.count)
                      .map((item, index) => (
                        <div key={item.category} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                            <div>
                              <p className="font-medium text-gray-800 truncate max-w-32">
                                {item.category}
                              </p>
                              <p className="text-sm text-gray-500">
                                {((item.count / total) * 100).toFixed(1)}% ของทั้งหมด
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-gray-800">
                              {item.count}
                            </p>
                            <p className="text-xs text-gray-500">รายการ</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Map Tab Content */}
        {activeTab === 'map' && (
          <div className="card bg-white shadow-xl">
            <div className="card-body p-0">
              <div className="p-6 border-b border-gray-200">
                <h3 className="card-title text-gray-800 mb-2">
                  🗺️ แผนที่แสดงตำแหน่งการแจ้งปัญหา
                </h3>
                <p className="text-gray-600 text-sm">
                  คลิกที่หมุดเพื่อดูรายละเอียด • ใช้ตัวกรองด้านซ้ายเพื่อเลือกหมวดหมู่
                </p>
              </div>
              <div className="h-96">
                <MapView data={rawData} year={year} />
              </div>
            </div>
          </div>
        )}

        {/* Summary Footer */}
        <div className="mt-8">
          <div className="card bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200">
            <div className="card-body text-center">
              <p className="text-gray-600">
                📊 ข้อมูลสรุปประจำปี {year} • อัปเดตล่าสุด: {new Date().toLocaleDateString('th-TH')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}