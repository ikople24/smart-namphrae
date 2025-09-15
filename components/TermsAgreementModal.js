import React, { useState } from 'react';
import Image from 'next/image';
import { CheckCircle, Shield, AlertTriangle, Database, FileCheck } from 'lucide-react';

const TermsAgreementModal = ({ isOpen, onAccept }) => {
  const [isAccepted, setIsAccepted] = useState(false);

  const handleAccept = () => {
    if (isAccepted) {
      // Store acceptance in localStorage
      localStorage.setItem('termsAccepted', 'true');
      localStorage.setItem('termsAcceptedDate', new Date().toISOString());
      onAccept();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <Image
                src="/LogoNP.png"
                alt="เทศบาลตำบลน้ำแพร่พัฒนา"
                width={80}
                height={80}
                className="rounded-full shadow-lg"
              />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              ข้อตกลงและเงื่อนไขการใช้งาน
            </h2>
            <p className="text-sm text-gray-600">
              SMART-NAMPHARE <b>เทศบาลตำบลน้ำแพร่พัฒนา</b>
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="font-semibold text-blue-800">1. การยินยอมข้อมูล</h3>
              </div>
              <p className="text-sm text-gray-700">
                ท่านยินยอมให้ข้อมูลที่เป็นจริงทุกประการ
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Shield className="w-5 h-5 text-green-600 mr-2" />
                <h3 className="font-semibold text-blue-800">2. การรักษาความเป็นส่วนตัว</h3>
              </div>
              <p className="text-sm text-gray-700">
                ข้อมูลชื่อเบอร์โทรศัพท์ของท่านมีไว้สำหรับติดต่อในคำร้องเท่านั้น 
                เทศบาลจะไม่เปิดเผยข้อมูลให้แก่บุคคลอื่นทุกกรณี
              </p>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                <h3 className="font-semibold text-blue-800">3. การใช้ข้อมูลอย่างถูกต้อง</h3>
              </div>
              <p className="text-sm text-gray-700">
                หากท่านแสดงข้อมูลอันเป็นเท็จหรือก่อให้เกิดความเสียหายไม่ว่าทางตรงหรือทางอ้อม 
                อันเป็นการดูหมิ่นเสียดสี หรือทำให้บุคคลอื่นเกิดความเสียหาย 
                เทศบาลจะระงับสิทธิ์การเข้าถึงข้อมูลของท่านโดยมิต้องแจ้งให้ทราบล่วงหน้า
              </p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Database className="w-5 h-5 text-purple-600 mr-2" />
                <h3 className="font-semibold text-blue-800">4. การจัดเก็บข้อมูล</h3>
              </div>
              <p className="text-sm text-gray-700">
                ข้อมูลของท่านจะถูกจัดเก็บไว้ในระบบคลาว์คอมพิวเตอร์โดยจะเข้ารหัสไว้อย่างปลอดภัย 
                และมีกำหนดอายุ 2 ปี ทางเทศบาลจะทำลายข้อมูลส่วนบุคคลของท่าน 
                หากต้องการดำเนินการติดต่อเจ้าหน้าที่เพื่อดำเนินการเพิกถอนข้อมูลของท่านภายใน 30 วัน
              </p>
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <FileCheck className="w-5 h-5 text-indigo-600 mr-2" />
                <h3 className="font-semibold text-blue-800">5. การยอมรับข้อตกลง</h3>
              </div>
              <p className="text-sm text-gray-700">
                หากท่านได้อ่านเงื่อนไขดังกล่าวทั้งหมดแล้ว ให้กดปุ่ม [ยอมรับข้อตกลง] 
                เพื่อเริ่มดำเนินการใช้งาน SMART-NAMPHARE ได้ทันที
              </p>
            </div>
          </div>

          <div className="flex items-center mb-6">
            <input
              type="checkbox"
              id="termsCheckbox"
              checked={isAccepted}
              onChange={(e) => setIsAccepted(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="termsCheckbox" className="ml-2 text-sm text-gray-700">
              ฉันได้อ่านและยอมรับข้อตกลงและเงื่อนไขการใช้งานทั้งหมด
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleAccept}
              disabled={!isAccepted}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                isAccepted
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              ยอมรับข้อตกลง
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            การยอมรับข้อตกลงนี้จะถูกบันทึกในอุปกรณ์ของคุณเพียงครั้งเดียวเท่านั้น
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsAgreementModal;
