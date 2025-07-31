import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FaFilter, FaEye, FaEyeSlash, FaInfoCircle } from 'react-icons/fa';
import { useMenuStore } from '@/stores/useMenuStore';
import Image from 'next/image';

// สีสำหรับสถานะ
const statusColors = {
  'อยู่ระหว่างดำเนินการ': '#f59e0b', // yellow
  'ดำเนินการเสร็จสิ้น': '#10b981', // green
  'เสร็จสิ้น': '#10b981', // green
  'รอดำเนินการ': '#ef4444', // red
};

// สีสำหรับแต่ละหมวดหมู่
const categoryColors = {
  'ถนน': '#ef4444', // red
  'ไฟฟ้า': '#f59e0b', // amber
  'น้ำ': '#3b82f6', // blue
  'ขยะ': '#10b981', // emerald
  'สิ่งแวดล้อม': '#8b5cf6', // violet
  'ความปลอดภัย': '#ec4899', // pink
  'อื่นๆ': '#6b7280', // gray
};

const MapViewInner = ({ data, year }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null);
  
  const { menu, fetchMenu } = useMenuStore();

  // ฟังก์ชันหา icon จาก category (ใช้วิธีเดียวกับ CardModalDetail)
  const findIconByCategory = useCallback((category) => {
    if (!category || !menu || menu.length === 0) {
      console.log(`🔍 No category or menu data: category="${category}", menu.length=${menu?.length}`);
      return '/default-icon.png';
    }
    
    const matched = menu.find((m) => m.Prob_name === category);
    console.log(`🔍 Looking for category: "${category}" -> found:`, matched);
    
    if (matched) {
      console.log(`🔍 Icon URL:`, matched.Prob_pic);
      console.log(`🔍 Icon URL valid:`, matched.Prob_pic && (matched.Prob_pic.startsWith('http') || matched.Prob_pic.startsWith('/')));
      return matched.Prob_pic;
    } else {
      console.log(`🔍 No match found for category: "${category}"`);
      console.log(`🔍 Available Prob_names:`, menu.map(m => m.Prob_name));
      return '/default-icon.png';
    }
  }, [menu]);

  // สร้าง custom icon สำหรับ marker
  const createCustomIcon = useCallback((category) => {
    const color = categoryColors[category] || categoryColors['อื่นๆ'];
    
    // หา icon จาก menu data โดยใช้ฟังก์ชัน mapping
    const iconUrl = findIconByCategory(category);
    console.log(`🎯 Creating icon for category: "${category}" -> iconUrl: "${iconUrl}"`);
    
    // ตรวจสอบว่า iconUrl เป็น URL ที่ถูกต้องหรือไม่
    const isValidIconUrl = iconUrl && (iconUrl.startsWith('http') || iconUrl.startsWith('/'));
    console.log(`🎯 isValidIconUrl for "${category}":`, isValidIconUrl);
    
    return L.divIcon({
      html: `
        <div style="
          background: ${color};
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        ">
          ${isValidIconUrl ? `
            <img 
              src="${iconUrl}" 
              alt="${category}"
              style="
                width: 20px;
                height: 20px;
                object-fit: contain;
              "
              onerror="this.style.display='none'; console.log('❌ Icon failed to load:', '${iconUrl}');"
              onload="console.log('✅ Icon loaded successfully:', '${iconUrl}');"
            />
          ` : `
            <div style="
              width: 18px;
              height: 18px;
              background: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              font-weight: bold;
              color: ${color};
            ">
              ${category.charAt(0)}
            </div>
          `}
        </div>
      `,
      className: 'custom-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }, [findIconByCategory]);

  // โหลด menu data
  useEffect(() => {
    console.log('🔍 Fetching menu data...');
    fetchMenu();
  }, [fetchMenu]);

  // Debug logging
  useEffect(() => {
    console.log('🔍 Menu Data:', menu);
    console.log('🔍 Menu length:', menu?.length);
    console.log('🔍 Menu Prob_names:', menu?.map(item => item.Prob_name) || []);
    console.log('🔍 Data:', data);
    
    // ตรวจสอบ category ที่มีในข้อมูล
    if (data && data.length > 0) {
      const categories = [...new Set(data.map(item => item.category).filter(Boolean))];
      const dataWithLocation = data.filter(item => item.location && item.location.lat && item.location.lng);
      const dataWithoutLocation = data.filter(item => !item.location || !item.location.lat || !item.location.lng);
      
      console.log('🔍 Categories in data:', categories);
      console.log('🔍 Data with location:', dataWithLocation.length);
      console.log('🔍 Data without location:', dataWithoutLocation.length);
      console.log('🔍 Total data:', data.length);
      
      // ตรวจสอบ category mapping
      categories.forEach(category => {
        const matched = menu?.find((m) => m.Prob_name === category);
        console.log(`🔍 Category "${category}" -> matched:`, matched ? 'YES' : 'NO', matched?.Prob_pic || 'NO ICON');
      });
      
      if (dataWithoutLocation.length > 0) {
        console.log('🔍 Items without location:', dataWithoutLocation.slice(0, 3));
      }
    }
  }, [menu, data]);

  // เริ่มต้นแผนที่
  useEffect(() => {
    if (!mapRef.current) return;

    // ตั้งค่า Leaflet icon defaults
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/leaflet/marker-icon-2x.png',
      iconUrl: '/leaflet/marker-icon.png',
      shadowUrl: '/leaflet/marker-shadow.png',
    });

    // สร้างแผนที่
    const map = L.map(mapRef.current).setView([13.7563, 100.5018], 10); // กรุงเทพฯ

    // เพิ่ม tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, []);

  // อัปเดต markers เมื่อข้อมูลเปลี่ยน
  useEffect(() => {
    if (!mapInstanceRef.current || !data) return;

    // ลบ markers เก่า
    markersRef.current.forEach(marker => {
      if (marker) {
        mapInstanceRef.current.removeLayer(marker);
      }
    });
    markersRef.current = [];

    // กรองข้อมูลตามหมวดหมู่ที่เลือก
    const filteredData = selectedCategories.length > 0 
      ? data.filter(item => selectedCategories.includes(item.category))
      : data;

    // สร้าง markers ใหม่
    filteredData.forEach(item => {
      if (item.location && item.location.lat && item.location.lng) {
        const iconUrl = findIconByCategory(item.category);
        console.log(`🔍 Creating marker for category: "${item.category}" with icon: "${iconUrl}"`);
        const marker = L.marker([item.location.lat, item.location.lng], {
          icon: createCustomIcon(item.category)
        }).addTo(mapInstanceRef.current);

        const isValidIconUrl = iconUrl && (iconUrl.startsWith('http') || iconUrl.startsWith('/'));
        
        // สร้าง popup content
        const popupContent = `
          <div class="p-4 min-w-[280px]">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-8 h-8 rounded-full flex items-center justify-center" style="background: ${categoryColors[item.category] || categoryColors['อื่นๆ']}">
                ${isValidIconUrl ? `
                  <img 
                    src="${iconUrl}" 
                    alt="${item.category}"
                    style="width: 16px; height: 16px; object-fit: contain;"
                    onerror="this.style.display='none'"
                  />
                ` : `
                  <div style="
                    width: 16px;
                    height: 16px;
                    background: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 8px;
                    font-weight: bold;
                    color: ${categoryColors[item.category] || categoryColors['อื่นๆ']};
                  ">
                    ${item.category.charAt(0)}
                  </div>
                `}
              </div>
              <h3 class="font-bold text-gray-800">${item.category}</h3>
            </div>
            <div class="space-y-2 text-sm">
              <p><strong>เลขที่:</strong> ${item.complaintId || 'N/A'}</p>
              <p><strong>ผู้แจ้ง:</strong> ${item.fullName || 'ไม่ระบุ'}</p>
              <p><strong>ชุมชน:</strong> ${item.community || 'ไม่ระบุ'}</p>
              <p><strong>สถานะ:</strong> <span class="px-2 py-1 rounded-full text-xs font-medium" style="background: ${statusColors[item.status] || statusColors['รอดำเนินการ']}; color: white;">${item.status || 'ไม่ระบุ'}</span></p>
              <p><strong>วันที่:</strong> ${new Date(item.createdAt || item.updatedAt).toLocaleDateString('th-TH')}</p>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);

        // เพิ่ม event listener
        marker.on('click', () => {
          setSelectedMarker(item);
        });

        markersRef.current.push(marker);
      }
    });

    // ปรับ zoom ให้เห็น markers ทั้งหมด
    if (markersRef.current.length > 0) {
      const group = new L.featureGroup(markersRef.current);
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
    }
  }, [data, selectedCategories, findIconByCategory, createCustomIcon]);

  // ดึงหมวดหมู่ทั้งหมด
  const allCategories = [...new Set(data?.map(item => item.category).filter(Boolean) || [])];

  // สลับการเลือกหมวดหมู่
  const toggleCategory = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // เลือกหมวดหมู่ทั้งหมด
  const selectAllCategories = () => {
    setSelectedCategories(allCategories);
  };

  // ล้างการเลือกทั้งหมด
  const clearAllCategories = () => {
    setSelectedCategories([]);
  };

  return (
    <div className="relative h-full">
      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      
      {/* Filter Panel */}
      <div className="absolute top-4 left-4 z-[1000]">
        <div className="bg-white rounded-lg shadow-xl border border-gray-200">
          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-t-lg border-b border-gray-200"
          >
            <FaFilter className="text-primary" />
            กรองหมวดหมู่
            {showFilters ? <FaEyeSlash /> : <FaEye />}
          </button>

          {/* Filter Content */}
          {showFilters && (
            <div className="p-4 space-y-3">
              {/* Filter Actions */}
              <div className="flex gap-2">
                <button
                  onClick={selectAllCategories}
                  className="btn btn-xs btn-primary"
                >
                  เลือกทั้งหมด
                </button>
                <button
                  onClick={clearAllCategories}
                  className="btn btn-xs btn-outline"
                >
                  ล้างทั้งหมด
                </button>
              </div>

              {/* Category List */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {allCategories.map(category => (
                  <label key={category} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category)}
                      onChange={() => toggleCategory(category)}
                      className="checkbox checkbox-sm"
                    />
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: categoryColors[category] || categoryColors['อื่นๆ'] }}
                      >
                        {(() => {
                          const iconUrl = findIconByCategory(category);
                          const isValidIconUrl = iconUrl && (iconUrl.startsWith('http') || iconUrl.startsWith('/'));
                          
                          if (isValidIconUrl) {
                            return (
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
                            );
                          } else {
                            return (
                              <div className="w-3 h-3 bg-white rounded-full flex items-center justify-center text-xs font-bold" style={{ color: categoryColors[category] || categoryColors['อื่นๆ'] }}>
                                {category.charAt(0)}
                              </div>
                            );
                          }
                        })()}
                      </div>
                      <span className="text-sm">{category}</span>
                    </div>
                  </label>
                ))}
              </div>

              {/* Selected Count */}
              <div className="text-xs text-gray-500 pt-2 border-t">
                แสดง {selectedCategories.length > 0 ? selectedCategories.length : allCategories.length} จาก {allCategories.length} หมวดหมู่
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Panel */}
      <div className="absolute top-4 right-4 z-[1000]">
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <FaInfoCircle className="text-primary" />
            ข้อมูลแผนที่
          </div>
          <div className="space-y-1 text-xs text-gray-600">
            <p>ปี: {year}</p>
            <p>จำนวนจุด: {markersRef.current.length}</p>
            <p>หมวดหมู่ที่แสดง: {selectedCategories.length || allCategories.length}</p>
          </div>
        </div>
      </div>

      {/* Selected Marker Info */}
      {selectedMarker && (
        <div className="absolute bottom-4 left-4 right-4 z-[1000]">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: categoryColors[selectedMarker.category] || categoryColors['อื่นๆ'] }}
                >
                  {(() => {
                    const iconUrl = findIconByCategory(selectedMarker.category);
                    return (
                      <Image
                        src={iconUrl}
                        alt={selectedMarker.category}
                        width={20}
                        height={20}
                        className="object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    );
                  })()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{selectedMarker.category}</h3>
                  <p className="text-sm text-gray-500">{selectedMarker.complaintId || 'N/A'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMarker(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            {/* รูปภาพ */}
            {selectedMarker.images && selectedMarker.images.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700 mb-2">รูปภาพ:</p>
                <div className="flex gap-2 overflow-x-auto">
                  {selectedMarker.images.slice(0, 3).map((image, index) => {
                    // ตรวจสอบว่าเป็นไฟล์ .heic หรือไม่
                    const isHeic = image.toLowerCase().includes('.heic');
                    const displayImage = isHeic ? `/api/convert-heic?url=${encodeURIComponent(image)}` : image;
                    
                    return (
                      <div key={index} className="flex-shrink-0 relative">
                        <Image
                          src={displayImage}
                          alt={`รูปภาพ ${index + 1}`}
                          width={60}
                          height={60}
                          className="rounded-lg object-cover border border-gray-200"
                          onError={(e) => {
                            e.target.src = '/default-icon.png';
                          }}
                        />
                        {isHeic && (
                          <div className="absolute top-1 right-1 bg-yellow-500 text-white text-xs px-1 rounded">
                            HEIC
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {selectedMarker.images.length > 3 && (
                    <div className="flex-shrink-0 w-15 h-15 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-500">
                      +{selectedMarker.images.length - 3}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">ผู้แจ้ง:</span>
                <span className="font-medium ml-1">{selectedMarker.fullName || 'ไม่ระบุ'}</span>
              </div>
              <div>
                <span className="text-gray-500">ชุมชน:</span>
                <span className="font-medium ml-1">{selectedMarker.community || 'ไม่ระบุ'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">สถานะ:</span>
                <span 
                  className="px-2 py-1 rounded-full text-xs font-medium ml-1 text-white"
                  style={{ background: statusColors[selectedMarker.status] || statusColors['รอดำเนินการ'] }}
                >
                  {selectedMarker.status || 'ไม่ระบุ'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">วันที่:</span>
                <span className="font-medium ml-1">
                  {new Date(selectedMarker.createdAt || selectedMarker.updatedAt).toLocaleDateString('th-TH')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapViewInner; 