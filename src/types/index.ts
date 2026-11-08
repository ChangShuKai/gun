export type WidgetType = 'timer' | 'photo' | 'camera' | 'empty';

export type LayoutMode = 'fullscreen_timer' | 'split_view';

export interface SplitConfig {
  mode: LayoutMode;
  topWidget: WidgetType;
  bottomWidget: WidgetType;
  topRatio: number; // between 0.2 and 0.8, default 0.5
  topPhotoUri?: string | null;
  bottomPhotoUri?: string | null;
}

export interface HabitRecord {
  id: string; // ISO or unique timestamp
  timestamp: number; // millisecond timestamp
  dateString: string; // YYYY-MM-DD
  timeString: string; // HH:mm
  durationSeconds: number;
  layoutMode: LayoutMode;
  splitConfig: SplitConfig;
  videoUri?: string | null; // local sandbox uri
  notes?: string;
  rating?: number; // 1-5 optional
}

export interface DayStats {
  date: string; // YYYY-MM-DD
  count: number;
  totalDurationSeconds: number;
  records: HabitRecord[];
}

export interface AppSettings {
  isFirstLaunch: boolean;
  biometricsEnabled: boolean;
  stealthRecordingDefault: boolean;
  blurOnBackground: boolean;
  requireAuthOnResume: boolean;
}

export interface OnboardingCardData {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  badge: string;
  bulletPoints: string[];
  medicalTip: string;
}
