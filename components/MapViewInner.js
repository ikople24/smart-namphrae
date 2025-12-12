import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FaFilter, FaEye, FaEyeSlash, FaInfoCircle, FaMapMarkedAlt, FaGlobeAsia, FaMap } from 'react-icons/fa';
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

// สีสำหรับแต่ละ polygon ขอบเขตหมู่บ้าน
const boundaryColors = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
];

// ประเภทแผนที่
const MAP_TYPES = {
  street: {
    name: 'แผนที่ถนน',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
  },
  satellite: {
    name: 'ดาวเทียม',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, Maxar, Earthstar Geographics',
  },
  terrain: {
    name: 'ภูมิประเทศ',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap contributors',
  },
};

const MapViewInner = ({ data, year }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const geoJsonLayerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const initialFitDoneRef = useRef(false); // ติดตามว่า fit bounds ครั้งแรกทำแล้วหรือยัง
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [showBoundary, setShowBoundary] = useState(true);
  const [mapType, setMapType] = useState('street'); // street, satellite, terrain
  
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

  // โหลด GeoJSON data สำหรับแสดง boundary
  useEffect(() => {
    const loadGeoJSON = async () => {
      try {
        // ใช้ API route เพื่อรองรับทั้ง localhost และ production
        const geoJsonUrl = '/api/geojson/namphrae';
        
        console.log('🗺️ Fetching GeoJSON from API:', geoJsonUrl);
        
        const res = await fetch(geoJsonUrl);
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        console.log('🗺️ GeoJSON loaded successfully:', data);
        console.log('🗺️ Features count:', data.features?.length);
        setGeoJsonData(data);
      } catch (err) {
        console.error('❌ Error loading GeoJSON:', err);
        console.error('❌ Error details:', err.message);
        
        // Fallback: ลองโหลดจาก static file ถ้า API ไม่ทำงาน
        try {
          console.log('🗺️ Trying fallback: static file...');
          const fallbackRes = await fetch('/cmu_namphare.geojson');
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            console.log('🗺️ GeoJSON loaded from fallback:', fallbackData);
            setGeoJsonData(fallbackData);
          }
        } catch (fallbackErr) {
          console.error('❌ Fallback also failed:', fallbackErr);
        }
      }
    };
    
    loadGeoJSON();
  }, []);

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

    // สร้างแผนที่ - ตั้งค่าเริ่มต้นที่ตำบลน้ำแพร่ หางดง เชียงใหม่
    const map = L.map(mapRef.current).setView([18.71, 98.88], 13); // ต.น้ำแพร่ อ.หางดง จ.เชียงใหม่

    // เพิ่ม tile layer เริ่มต้น
    const initialTile = MAP_TYPES.street;
    tileLayerRef.current = L.tileLayer(initialTile.url, {
      attribution: initialTile.attribution,
      maxZoom: 18,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, []);

  // เปลี่ยนประเภทแผนที่
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    const newTile = MAP_TYPES[mapType];
    if (newTile) {
      // ลบ tile layer เก่า
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
      
      // เพิ่ม tile layer ใหม่
      tileLayerRef.current = L.tileLayer(newTile.url, {
        attribution: newTile.attribution,
        maxZoom: 18,
      }).addTo(mapInstanceRef.current);
      
      // ย้าย tile layer ไปด้านหลังสุด
      tileLayerRef.current.bringToBack();
    }
  }, [mapType]);

  // เพิ่ม GeoJSON layer เมื่อข้อมูลพร้อม และ zoom ไปที่ขอบเขต
  useEffect(() => {
    if (!mapInstanceRef.current || !geoJsonData) return;

    // ลบ layer เก่าถ้ามี
    if (geoJsonLayerRef.current) {
      mapInstanceRef.current.removeLayer(geoJsonLayerRef.current);
    }

    if (!showBoundary) return;

    // สร้าง GeoJSON layer
    geoJsonLayerRef.current = L.geoJSON(geoJsonData, {
      style: (feature) => {
        const featureIndex = geoJsonData.features.indexOf(feature);
        return {
          fillColor: boundaryColors[featureIndex % boundaryColors.length],
          fillOpacity: 0.2,
          color: boundaryColors[featureIndex % boundaryColors.length],
          weight: 2,
          opacity: 0.8,
        };
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        
        // เพิ่ม tooltip แสดงชื่อหมู่บ้านเมื่อ hover เท่านั้น
        layer.bindTooltip(props.title || 'ไม่ระบุ', {
          permanent: false,
          direction: 'center',
          className: 'bg-white px-2 py-1 rounded shadow-lg font-medium text-sm',
          sticky: true
        });

        // Hover effect
        layer.on({
          mouseover: (e) => {
            const layer = e.target;
            layer.setStyle({
              fillOpacity: 0.4,
              weight: 3,
            });
          },
          mouseout: (e) => {
            geoJsonLayerRef.current.resetStyle(e.target);
          },
          click: (e) => {
            // แสดง popup เมื่อคลิกที่ polygon โดยตรง (ไม่ใช่คลิกที่ marker)
            const popupContent = `
              <div class="p-3 min-w-[200px]">
                <h3 class="font-bold text-gray-800 text-lg mb-2">🏘️ ${props.title || 'ไม่ระบุชื่อ'}</h3>
                <p class="text-gray-600"><strong>ตำบล:</strong> ${props.bondaryor || 'ไม่ระบุ'}</p>
              </div>
            `;
            L.popup()
              .setLatLng(e.latlng)
              .setContent(popupContent)
              .openOn(mapInstanceRef.current);
          }
        });
      }
    }).addTo(mapInstanceRef.current);

    // Fit map bounds ไปที่ขอบเขต GeoJSON เพื่อให้แสดงกึ่งกลางแผนที่ (ทำครั้งแรกเท่านั้น)
    if (!initialFitDoneRef.current) {
      const bounds = geoJsonLayerRef.current.getBounds();
      if (bounds.isValid()) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [20, 20] });
        initialFitDoneRef.current = true; // บันทึกว่าทำ fit bounds ครั้งแรกแล้ว
      }
    }

    console.log('🗺️ GeoJSON layer added to map and fitted to bounds');
  }, [geoJsonData, showBoundary]);

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
        const marker = L.marker([item.location.lat, item.location.lng], {
          icon: createCustomIcon(item.category)
        }).addTo(mapInstanceRef.current);

        // เพิ่ม event listener - แสดงเฉพาะ panel ด้านล่างเมื่อคลิกที่ marker
        marker.on('click', (e) => {
          // ปิด popup และ tooltip ทั้งหมดก่อน
          mapInstanceRef.current.closePopup();
          mapInstanceRef.current.eachLayer((layer) => {
            if (layer.closeTooltip) {
              layer.closeTooltip();
            }
          });
          setSelectedMarker(item);
          L.DomEvent.stopPropagation(e);
        });

        markersRef.current.push(marker);
      }
    });

    // ปรับ zoom ให้เห็น markers ทั้งหมด (เฉพาะเมื่อยังไม่เคย fit bounds จาก GeoJSON)
    if (markersRef.current.length > 0 && !initialFitDoneRef.current) {
      const group = new L.featureGroup(markersRef.current);
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
      initialFitDoneRef.current = true;
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
          
          {/* Boundary Toggle Button */}
          <button
            onClick={() => setShowBoundary(!showBoundary)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium hover:bg-gray-50 w-full border-b border-gray-200 ${showBoundary ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <FaMapMarkedAlt className={showBoundary ? 'text-blue-600' : 'text-gray-400'} />
            แสดงขอบเขตหมู่บ้าน
            {showBoundary ? <FaEye className="ml-auto text-blue-600" /> : <FaEyeSlash className="ml-auto text-gray-400" />}
          </button>

          {/* Map Type Selector */}
          <div className="p-2 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-2 px-2">ประเภทแผนที่:</p>
            <div className="flex gap-1">
              <button
                onClick={() => setMapType('street')}
                className={`flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded text-xs transition-colors ${
                  mapType === 'street' 
                    ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
                }`}
              >
                <FaMap className={mapType === 'street' ? 'text-blue-600' : 'text-gray-400'} />
                <span>ถนน</span>
              </button>
              <button
                onClick={() => setMapType('satellite')}
                className={`flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded text-xs transition-colors ${
                  mapType === 'satellite' 
                    ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
                }`}
              >
                <FaGlobeAsia className={mapType === 'satellite' ? 'text-blue-600' : 'text-gray-400'} />
                <span>ดาวเทียม</span>
              </button>
              <button
                onClick={() => setMapType('terrain')}
                className={`flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded text-xs transition-colors ${
                  mapType === 'terrain' 
                    ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
                }`}
              >
                <FaMapMarkedAlt className={mapType === 'terrain' ? 'text-blue-600' : 'text-gray-400'} />
                <span>ภูมิประเทศ</span>
              </button>
            </div>
          </div>

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
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-3 max-w-xs">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <FaInfoCircle className="text-primary" />
            ข้อมูลแผนที่
          </div>
          <div className="space-y-1 text-xs text-gray-600">
            <p>ปี: {year}</p>
            <p>จำนวนจุด: {markersRef.current.length}</p>
            <p>หมวดหมู่ที่แสดง: {selectedCategories.length || allCategories.length}</p>
          </div>
          
          {/* Boundary Legend */}
          {showBoundary && geoJsonData && geoJsonData.features && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                <FaMapMarkedAlt className="text-blue-500" />
                ขอบเขตหมู่บ้าน ({geoJsonData.features.length} พื้นที่)
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {geoJsonData.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <div 
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: boundaryColors[index % boundaryColors.length], opacity: 0.6 }}
                    />
                    <span className="truncate">{feature.properties?.title || `พื้นที่ ${index + 1}`}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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