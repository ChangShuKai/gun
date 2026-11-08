import { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UseAppStatePrivacyOptions {
  enabled?: boolean;
  onRequireAuth?: () => void;
}

export function useAppStatePrivacy({ enabled = true, onRequireAuth }: UseAppStatePrivacyOptions = {}) {
  const [isShieldActive, setIsShieldActive] = useState<boolean>(false);
  const appState = useRef<AppStateStatus>((AppState.currentState as AppStateStatus) || 'active');

  useEffect(() => {
    if (!enabled) return;

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // Transitioning to background or inactive (e.g. app switcher pulled up)
      if (nextAppState === 'inactive' || nextAppState === 'background') {
        setIsShieldActive(true);
      } else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // Returning to active
        if (onRequireAuth) {
          onRequireAuth();
        } else {
          // Keep shield briefly during frame transition, then dismiss
          const timer = setTimeout(() => {
            setIsShieldActive(false);
          }, 150);
          return () => clearTimeout(timer);
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [enabled, onRequireAuth]);

  return {
    isShieldActive: enabled ? isShieldActive : false,
    dismissShield: () => setIsShieldActive(false),
  };
}
