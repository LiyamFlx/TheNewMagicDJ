import { useState, useCallback } from 'react';
import { NavigationView } from '../components/Navigation';

interface NavigationState {
  currentView: NavigationView;
  history: NavigationView[];
  breadcrumbs: Array<{ label: string; onClick?: () => void }>;
}

export const useNavigation = (initialView: NavigationView = 'home') => {
  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentView: initialView,
    history: [initialView],
    breadcrumbs: []
  });

  const navigate = useCallback((view: NavigationView, updateHistory = true) => {
    setNavigationState(prev => {
      const newHistory = updateHistory 
        ? [...prev.history, view]
        : prev.history;
      
      return {
        ...prev,
        currentView: view,
        history: newHistory
      };
    });
  }, []);

  const goBack = useCallback(() => {
    setNavigationState(prev => {
      if (prev.history.length <= 1) {
        return prev;
      }
      
      const newHistory = prev.history.slice(0, -1);
      const previousView = newHistory[newHistory.length - 1];
      
      return {
        ...prev,
        currentView: previousView,
        history: newHistory
      };
    });
  }, []);

  const setBreadcrumbs = useCallback((breadcrumbs: Array<{ label: string; onClick?: () => void }>) => {
    setNavigationState(prev => ({
      ...prev,
      breadcrumbs
    }));
  }, []);

  const clearBreadcrumbs = useCallback(() => {
    setNavigationState(prev => ({
      ...prev,
      breadcrumbs: []
    }));
  }, []);

  const canGoBack = navigationState.history.length > 1;
  const previousView = navigationState.history[navigationState.history.length - 2];

  return {
    currentView: navigationState.currentView,
    breadcrumbs: navigationState.breadcrumbs,
    navigate,
    goBack,
    setBreadcrumbs,
    clearBreadcrumbs,
    canGoBack,
    previousView,
    history: navigationState.history
  };
};