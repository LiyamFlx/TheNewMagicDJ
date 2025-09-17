import { useNotifications } from '../components/NotificationSystem';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  dedupe?: boolean;
  duration?: number;
  persistent?: boolean;
}

interface UseToastReturn {
  showToast: (message: string, type?: ToastType, options?: ToastOptions) => void;
}

export function useToast(): UseToastReturn {
  const { addNotification } = useNotifications();

  const showToast = (
    message: string,
    type: ToastType = 'info',
    options: ToastOptions = {}
  ) => {
    const { dedupe = false, duration, persistent = false } = options;

    // Simple dedupe logic - could be enhanced with a more sophisticated system
    if (dedupe) {
      // For now, just add a small delay to avoid rapid duplicates
      // In a more sophisticated implementation, you'd track recent messages
      setTimeout(() => {
        addNotification({
          type,
          title: type.charAt(0).toUpperCase() + type.slice(1),
          message,
          duration,
          persistent,
        });
      }, 100);
    } else {
      addNotification({
        type,
        title: type.charAt(0).toUpperCase() + type.slice(1),
        message,
        duration,
        persistent,
      });
    }
  };

  return { showToast };
}