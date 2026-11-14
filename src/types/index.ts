export interface TemperatureDataPoint {
  year: number;
  anomaly: number; // in °C relative to 1951-1980 baseline
  fiveYearMean: number;
  uncertainty: number;
  arcticAnomaly: number;
  nhAnomaly: number; // Northern Hemisphere
  shAnomaly: number; // Southern Hemisphere
  oceanAnomaly: number;
  milestone?: string;
  narration?: string;
}

export interface SeaIceDataPoint {
  year: number;
  extent: number; // Million square kilometers
  anomaly: number;
  milestone?: string;
}

export interface WildfireDataPoint {
  year: number;
  carbonEmissions: number; // Megatons C
  fireCountIndex: number;
  milestone?: string;
}

export type StoryId = 'temperature' | 'oceans' | 'wildfires' | 'carbon';

export interface Story {
  id: StoryId;
  title: string;
  subtitle: string;
  description: string;
  longDescription: string;
  source: string;
  sourceUrl: string;
  baseline: string;
  timeRange: string;
  unit: string;
  audioGuideIntro: string;
  badgeLabel: string;
  color: string;
  accentColor: string;
  isComingSoon?: boolean;
}

export interface AccessibilitySettings {
  highContrast: boolean; // Black & Yellow WCAG AAA theme
  audioGuide: boolean; // Spoken narrative commentary
  sonificationEnabled: boolean; // Musical pitch sonification
  reducedMotion: boolean; // Disable heavy animations & globe auto-spin
  largeText: 'standard' | 'large' | 'xlarge';
  keyboardHelp: boolean;
  screenReaderTables: boolean;
  volume: number; // 0 to 1
  soundSpeed: number; // 0.5, 1.0, 1.5, 2.0
}

export type ViewMode = 'home' | 'stories' | 'dashboard' | 'accessibility' | 'about';
export type GlobeProjection = '3d-orthographic' | '2d-flat';
