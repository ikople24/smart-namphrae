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
import { FaCheckCircle, FaListUl, FaChartBar } from 'react-icons/fa';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
import { useEffect, useState } from "react";

export default function SummaryByCategory() {
  const [summary, setSummary] = useState([]);
  const [year, setYear] = useState("2024");

  useEffect(() => {
    async function fetchData() {
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
    }

    fetchData();
  }, [year]);

  const total = summary.reduce((sum, item) => sum + item.count, 0);
  const topCategory = summary.sort((a, b) => b.count - a.count)[0]?.category || "-";
  const categoryCount = summary.length;

  return (
    <div className="p-6">
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 mr-2">เลือกปี:</label>
        <select
          className="border rounded px-2 py-1"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        >
          <option value="2024">2024</option>
          <option value="2025">2025</option>
        </select>
      </div>
      <h2 className="text-2xl font-bold mb-6 text-gray-800">📊 สรุปตามประเภทปัญหา (category)</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 text-white p-4 rounded-lg shadow flex items-center justify-between">
          <div>
            <div className="text-sm opacity-70">รวมรายการ</div>
            <div className="text-2xl font-bold">{total}</div>
          </div>
          <FaListUl className="text-pink-400 text-2xl" />
        </div>
        <div className="bg-gray-900 text-white p-4 rounded-lg shadow flex items-center justify-between">
          <div>
            <div className="text-sm opacity-70">ประเภทที่แจ้งมากที่สุด</div>
            <div className="text-2xl font-bold">{topCategory}</div>
          </div>
          <FaCheckCircle className="text-pink-400 text-2xl" />
        </div>
        <div className="bg-gray-900 text-white p-4 rounded-lg shadow flex items-center justify-between">
          <div>
            <div className="text-sm opacity-70">จำนวนประเภท</div>
            <div className="text-2xl font-bold">{categoryCount}</div>
          </div>
          <FaChartBar className="text-pink-400 text-2xl" />
        </div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <Bar
          data={{
            labels: summary.map(item => item.category),
            datasets: [
              {
                label: 'จำนวน',
                data: summary.map(item => item.count),
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1,
              },
            ],
          }}
          options={{
            responsive: true,
            plugins: {
              legend: { display: false },
              title: { display: false },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { precision: 0 },
              },
            },
          }}
        />
      </div>
    </div>
  );
}