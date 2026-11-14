import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AccessibilitySettings } from '../types';
import { audioEngine } from '../services/audioEngine';

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSetting: <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => void;
  resetDefaults: () => void;
  liveAnnouncement: string;
  announceToScreenReader: (message: string) => void;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  highContrast: false,
  audioGuide: true,
  sonificationEnabled: true,
  reducedMotion: false,
  largeText: 'standard',
  keyboardHelp: false,
  screenReaderTables: false,
  volume: 0.6,
  soundSpeed: 1.0,
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    try {
      const saved = localStorage.getItem('earthpulse_accessibility');
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_SETTINGS;
  });

  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  useEffect(() => {
    try {
      localStorage.setItem('earthpulse_accessibility', JSON.stringify(settings));
    } catch {}

    // Apply high-contrast class to document
    if (settings.highContrast) {
      document.documentElement.classList.add('theme-high-contrast');
    } else {
      document.documentElement.classList.remove('theme-high-contrast');
    }

    // Sync volume with audio engine
    audioEngine.setVolume(settings.volume);
  }, [settings]);

  const updateSetting = <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    announceToScreenReader('Accessibility settings have been reset to factory defaults.');
  };

  const announceToScreenReader = (message: string) => {
    setLiveAnnouncement(message);
  };

  return (
    <AccessibilityContext.Provider
      value={{
        settings,
        updateSetting,
        resetDefaults,
        liveAnnouncement,
        announceToScreenReader,
      }}
    >
      {children}
      {/* Hidden ARIA Live region for screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {liveAnnouncement}
      </div>
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
