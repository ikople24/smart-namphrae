import React from 'react';
import Image from 'next/image';

export default function ImageModal({ isOpen, onClose, imageUrl, title }) {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-50">
      <div className="relative max-w-4xl max-h-[90vh] p-4">
        <button
          className="absolute top-2 right-2 text-white bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 transition-colors z-10"
          onClick={onClose}
        >
          ✕
        </button>
        
        <div className="bg-white rounded-lg overflow-hidden shadow-2xl">
          {title && (
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">{title}</h3>
            </div>
          )}
          
          <div className="relative">
            <Image
              src={imageUrl}
              alt={title || "ภาพปัญหา"}
              width={800}
              height={600}
              sizes="(max-width: 768px) 100vw, 800px"
              className="max-w-full max-h-[70vh] object-contain"
              onError={(e) => {
                e.target.src = '/default-icon.png';
                e.target.alt = 'ไม่สามารถโหลดภาพได้';
              }}
            />
          </div>
          
          <div className="p-4 border-t bg-gray-50">
            <div className="flex justify-between items-center">
              <a
                href={imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm"
              >
                เปิดในแท็บใหม่
              </a>
              <button
                onClick={onClose}
                className="btn btn-primary btn-sm"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
