import React from 'react';

const NotificationStatus = ({ notificationCount, lastNotificationSent, onResend, loading, disabled }) => {
  const getStatusColor = () => {
    if (notificationCount === 0) return 'text-gray-400';
    if (notificationCount <= 2) return 'text-green-600';
    if (notificationCount <= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusText = () => {
    if (notificationCount === 0) return 'ยังไม่เคยส่ง';
    if (notificationCount === 1) return 'ส่งแล้ว';
    return `ส่งแล้ว ${notificationCount} ครั้ง`;
  };

  return (
    <div className="flex flex-col items-center space-y-1">
      <div className={`text-xs font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </div>
      
      {lastNotificationSent && (
        <div className="text-xs text-gray-500">
          {new Date(lastNotificationSent).toLocaleDateString('th-TH')}
        </div>
      )}
      
      {onResend && (
        <button
          className="btn btn-xs btn-outline btn-secondary"
          onClick={onResend}
          disabled={loading || disabled}
          title="ส่งแจ้งเตือนอีกครั้ง"
        >
          {loading ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            '🔔'
          )}
        </button>
      )}
    </div>
  );
};

export default NotificationStatus; 