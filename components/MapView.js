import React from 'react';
import dynamic from 'next/dynamic';

// Dynamic import for Leaflet to avoid SSR issues
const MapView = dynamic(() => import('./MapViewInner'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
      <div className="text-center">
        <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
        <p className="text-gray-600">กำลังโหลดแผนที่...</p>
      </div>
    </div>
  ),
});

export default MapView; 