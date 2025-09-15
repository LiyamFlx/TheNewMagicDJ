import { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { AppError } from '../utils/errorHandler';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
}

interface NotificationSystemProps {
  maxNotifications?: number;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({ 
  maxNotifications = 5 
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Listen for app errors
    const handleAppError = (event: CustomEvent<AppError>) => {
      const error = event.detail;
      
      if (error.severity === 'high' || error.severity === 'critical') {
        addNotification({
          type: 'error',
          title: 'Error',
          message: error.userMessage,
          persistent: error.severity === 'critical'
        });
      } else if (error.severity === 'medium') {
        addNotification({
          type: 'warning',
          title: 'Warning',
          message: error.userMessage,
          duration: 8000
        });
      }
    };

    window.addEventListener('app-error', handleAppError as EventListener);
    
    return () => {
      window.removeEventListener('app-error', handleAppError as EventListener);
    };
  }, []);

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      id,
      duration: 5000,
      ...notification
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      return updated.slice(0, maxNotifications);
    });

    // Auto-remove non-persistent notifications
    if (!newNotification.persistent && newNotification.duration) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getStyles = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-900/50 border-green-500/50';
      case 'error':
        return 'bg-red-900/50 border-red-500/50';
      case 'warning':
        return 'bg-yellow-900/50 border-yellow-500/50';
      case 'info':
        return 'bg-blue-900/50 border-blue-500/50';
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`${getStyles(notification.type)} backdrop-blur-sm rounded-lg border p-4 shadow-lg animate-slide-in-right`}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              {getIcon(notification.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-white mb-1">
                {notification.title}
              </h4>
              <p className="text-sm text-gray-300 leading-relaxed">
                {notification.message}
              </p>
            </div>
            
            <button
              onClick={() => removeNotification(notification.id)}
              className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Export function to add notifications programmatically
export const useNotifications = () => {
  const addNotification = (notification: Omit<Notification, 'id'>) => {
    window.dispatchEvent(new CustomEvent('add-notification', { 
      detail: notification 
    }));
  };

  return { addNotification };
};

export default NotificationSystem;