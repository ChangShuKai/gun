export type WidgetType = 'timer' | 'photo' | 'camera' | 'text' | 'pacing' | 'self_carousel' | 'massage' | 'tickle' | 'stretch' | 'kegel' | 'empty';

export type LayoutMode = 'fullscreen_timer' | 'split_view';

export type DailyCheckInType = 'size' | 'testicles' | 'most_erotic_of_the_day';

export interface DailyCheckInItem {
  id: string;
  uri: string;
  type: DailyCheckInType;
  dateString: string; // YYYY-MM-DD
  createdAt: number;
  title: string;
  notes?: string;
}

export interface GirlfriendConfig {
  name: string; // e.g. "寶寶"
  title: string; // e.g. "女友"
  enabled: boolean;
  avatarIcon?: string;
}

export interface CompanionMessage {
  id: string;
  text: string;
  category: 'guidance' | 'praise' | 'discipline' | 'pacing' | 'general';
  timestamp: number;
}

export interface MorphingAnchor {
  rootPoint: { x: number; y: number }; // 0-1 normalized
  tipPoint: { x: number; y: number };  // 0-1 normalized
}

export interface MorphingFrame {
  id: string;
  uri: string;
  dateString: string;
  timestamp: number;
  lengthCm: number;
  title: string;
  anchor?: MorphingAnchor;
  ehsLevel?: number;
  dayIndex?: number;
}

export interface TransformCorrection {
  translateX: number;
  translateY: number;
  scale: number;
  rotateDeg: number;
}

export interface HeatmapDayData {
  dateString: string; // YYYY-MM-DD
  level: 0 | 1 | 2 | 3 | 4;
  durationSeconds: number;
  edgeCount: number;
  hasPledgeWin?: boolean;
  hasGroomingCare?: boolean;
  ehsScore?: number;
  thumbnailUri?: string;
  lengthCm?: number;
  sessionCount: number;
}

export interface SplitConfig {
  mode: LayoutMode;
  topWidget: WidgetType;
  bottomWidget: WidgetType;
  topRatio: number; // between 0.2 and 0.8, default 0.5
  topPhotoUri?: string | null;
  bottomPhotoUri?: string | null;
}

export interface SnapshotMetadata {
  id: string;
  uri: string;
  timestampSeconds: number; // e.g. 225
  timestampLabel: string; // e.g. "03:45"
  currentBPM: number;
  stage: string; // e.g. "SLOW_GRIND" | "SPEED_UP" | "SPRINT" | "EDGE_HOLD" | "WARM_UP"
  arousalLevel: number; // 1.0 - 10.0
  ehsScore?: number; // 1 - 4 (Erection Hardness Score)
  createdAt: number;
}

export type TimeMode = 'DAY' | 'NIGHT';
export type EnvironmentSafety = 'SOMEONE_AROUND' | 'SOLO';

export interface QuestDefinition {
  id: string;
  title: string;
  subtitle: string;
  timeMode: TimeMode;
  envSafety: EnvironmentSafety;
  durationSeconds: number;
  description: string;
  rules: string[];
  badgeIcon: string;
  badgeName: string;
  dangerLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
}

export interface QuestRecord {
  id: string;
  questId: string;
  questTitle: string;
  badgeName: string;
  badgeIcon: string;
  timestamp: number;
  durationSeconds: number;
  completed: boolean;
  notes?: string;
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
  snapshots?: SnapshotMetadata[];
  avgEHS?: number;
  quest?: QuestRecord;
  hasPledgeWin?: boolean;
  pledgeResult?: PledgeResult;
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
  calculatorCoverEnabled?: boolean;
  masterPin?: string;
  decoyPin?: string;
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

export interface VaultModulesConfig {
  settings: boolean;
  daily_checkin: boolean;
  snapshots: boolean;
  highlights: boolean;
  logs: boolean;
}

export interface VaultManifest {
  app_version: string;
  exported_at: number;
  modules_included: VaultModulesConfig;
  file_count: number;
}

export interface VaultFileEntry {
  path: string;
  mimeType: string;
  encoding: 'utf8' | 'base64';
  data: string;
}

export interface VaultPayload {
  manifest: VaultManifest;
  entries: VaultFileEntry[];
}

export interface VaultRestoreSummary {
  restoredFilesCount: number;
  restoredModules: string[];
  manifest: VaultManifest;
}

export type PersonaType = 'tsundere' | 'seductive' | 'analytical' | 'bro';

export interface PanelMember {
  id: string;
  name: string;
  avatarUri?: string; // photo URI or preset icon
  avatarIcon: string; // Ionicons fallback
  persona: PersonaType;
  color: string; // Hex color for bubbles & glow
  title: string; // e.g. "傲嬌毒舌系", "魅惑御姐"
}

export interface ReviewComment {
  id: string;
  memberId: string;
  memberName: string;
  persona: PersonaType;
  color: string;
  avatarUri?: string;
  avatarIcon: string;
  text: string;
  rating: number; // e.g. 9.6
  badge: string; // e.g. "🔥 頂級充血", "📐 尺寸認證"
  timestamp: number;
  quotedComment?: {
    memberName: string;
    text: string;
  };
}

export interface ReviewSessionContext {
  photoUri?: string;
  userName?: string;
  userLength?: string;
  currentBPM?: number;
  arousalLevel?: number;
  groomingStyle?: string;
  checkInType?: string; // 'size' | 'testicles' | 'most_erotic_of_the_day' | 'snapshot'
}

export interface PanelVerdict {
  id: string;
  compositeScore: number; // e.g. 9.7
  consensusBadge: string;
  comments: ReviewComment[];
  summaryText: string;
  timestamp: number;
}

export type StaminaStatus = 'PEAK' | 'BALANCED' | 'FATIGUED' | 'OVERHEATED';

export interface BioForecast {
  energyPercentage: number; // 0 ~ 100
  staminaStatus: StaminaStatus;
  recommendedDurationMin: number;
  forecastText: string;
  hoursSinceLastSession: number;
  fourteenDayTotalSessions: number;
  avgEdgeCount: number;
  bedtimeSessionsCount: number;
  nextIdealWindowText: string;
}

export type PledgeRuleType = 'TARGET_TIME' | 'EDGE_COUNT' | 'NO_RELEASE';
export type PenaltyType = 'LOCKOUT_12H' | 'LOCKOUT_24H' | 'PANEL_ROAST' | 'DOUBLE_TOMORROW';

export interface PledgeContract {
  id: string;
  title: string;
  ruleType: PledgeRuleType;
  targetMinutes: number;
  targetEdgeCount: number;
  penaltyType: PenaltyType;
  stakeCredits: number;
  createdAt: number;
}

export interface PledgeResult {
  contractId: string;
  isWin: boolean;
  actualDurationSeconds: number;
  actualEdgeCount: number;
  targetMinutes: number;
  targetEdgeCount: number;
  earnedCredits: number;
  streak: number;
  penaltyActivated?: boolean;
  lockoutUntil?: number;
  timestamp: number;
}

export interface PledgeStats {
  credits: number;
  streak: number;
  totalWins: number;
  totalLosses: number;
  lockoutUntil: number | null; // Milliseconds timestamp or null
}

export type UnderwearCutType = 'BOXER' | 'BRIEF' | 'TRUNK' | 'JOCKSTRAP' | 'OTHER';

export interface UnderwearItem {
  id: string;
  name: string; // 自訂名稱，例如：「CK 經典黑平口」、「莫代爾低腰三角」
  cutType: UnderwearCutType; // 版型
  colorTag?: string; // 顏色或自訂標籤
  brand?: string;
  createdAt: number;
}

export interface UnderwearCheckInRecord {
  id: string;
  date: string; // YYYY-MM-DD
  underwearId: string;
  underwearName: string;
  cutType: UnderwearCutType;
  flatLayUri: string; // 照片 1: 僅內褲平鋪
  frontFitUri: string; // 照片 2: 穿上正面
  sideFitUri: string;  // 照片 3: 穿上側面
  notes?: string;
  timestamp: number;
}

export type AnatomyModelType = 'DEFAULT' | 'CUSTOM';
export type AnatomyShaderStyle = 'REALISTIC' | 'BLUEPRINT' | 'ANATOMICAL';

export interface AnatomyMorphParams {
  modelType: AnatomyModelType;
  lengthFactor: number;      // 0.5 ~ 2.0 (長度形變係數)
  girthFactor: number;       // 0.5 ~ 2.0 (粗細形變係數)
  curvatureAngle: number;    // -30 ~ 30 (上下/左右微彎曲角度)
  scrotumTightness: number;  // 0.0 (完全收緊) ~ 1.0 (垂墜放鬆)
  skinToneIndex: number;     // 0 ~ 5 (膚色材質色相)
  ehsLevel?: EHSLevel;       // 1 ~ 4 國際 EHS 硬度評級
  updatedAt?: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Polygon3D {
  points: [number, number][];
  depth: number;
  color: string;
  strokeColor?: string;
  isWireframe?: boolean;
}

export type HapticZoneType = 'FRENULUM' | 'CORONA' | 'BASE' | 'SCROTUM' | 'SHAFT';

export interface TouchDeformation {
  x: number;
  y: number;
  z: number;
  radius: number;
  intensity: number;
  zone?: HapticZoneType;
}

export interface CaliperMeasurement {
  pointA: Vector3D;
  pointB: Vector3D;
  distance3D: number;
  distanceCm: number;
}

export interface UnderwearCutPerformance {
  cutType: UnderwearCutType;
  cutName: string;
  avgDurationSec: number;
  avgEdgeCount: number;
  panelRatingDeltaPercent: number;
  sessionCount: number;
  recommendation: string;
}

export interface DanmakuComment {
  id: string;
  text: string;
  sender: string;
  color: string;
  persona: 'tsundere' | 'seductive' | 'analytical' | 'bro' | 'system';
  isVIP?: boolean;
  speed?: number;
  lane?: number;
}

export interface MemberFavorability {
  memberId: string;
  name: string;
  tier: number; // 1 ~ 5
  currentPoints: number;
  nextTierPoints: number;
  title: string;
  unlockedVoiceLine: string;
  avatarUri?: string;
}

export interface FavorabilityStore {
  tokens: number;
  members: Record<string, MemberFavorability>;
  lastRewardTimestamp: number;
}

export type LODLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type RenderThrottleMode =
  | 'ACTIVE_60'
  | 'THROTTLED_30'
  | 'ENERGY_SAVER_15'
  | 'IDLE_STATIC';

// --- EHS (Erection Hardness Score) ---
export type EHSLevel = 1 | 2 | 3 | 4;

export interface EHSRecord {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  level: EHSLevel;
  timeToLevel4Sec?: number;
  retentionSec?: number;
  notes?: string;
}

export interface EHSBioCorrelation {
  peakHoursRange: string;
  peakProbability: number;
  avgTimeToPeakSec: number;
  currentAvgLevel: number;
  intervals: {
    rangeLabel: string;
    sampleCount: number;
    level4Rate: number;
    avgLevel: number;
  }[];
}

// --- Review Panel Drama & Secret Notes ---
export interface SecretNote {
  id: string;
  memberId: string;
  senderName: string;
  senderTitle: string;
  senderPersona: 'tsundere' | 'seductive' | 'analytical' | 'bro' | 'partner';
  senderColor: string;
  avatarIcon?: string;
  avatarUri?: string;
  message: string;
  replyActionLabel?: string;
  isRead: boolean;
  rewardClaimed: boolean;
  timestamp: number;
}

// --- 3D Stretching Routine ---
export type StretchPhase = 'FORWARD' | 'LEFT' | 'RIGHT' | 'UPWARD' | 'REST' | 'SAFETY_CUTOFF';

export interface StretchStepConfig {
  phase: StretchPhase;
  name: string;
  englishName: string;
  durationSec: number;
  description: string;
  instruction: string;
  targetAnatomy: string;
  modelPitch: number;
  modelYaw: number;
  lengthBonus: number;
}

// --- Kegel / PC Muscle 3D Training ---
export type KegelMode = 'SPEED_FLICKS' | 'ENDURANCE_HOLDS';
export type KegelPhase = 'IDLE' | 'CONTRACT' | 'RELAX' | 'COMPLETE';

export interface KegelSessionRecord {
  id: string;
  mode: KegelMode;
  completedReps: number;
  targetReps: number;
  durationSeconds: number;
  avgHoldSeconds: number;
  timestamp: number;
  date: string; // YYYY-MM-DD
}

export interface KegelStats {
  totalSessions: number;
  totalReps: number;
  speedReps: number;
  enduranceReps: number;
  lastSessionDate?: string;
}

// --- Environmental Context & Physiological Bias ---
export type EnvironmentTag =
  | 'COLD_WATER'      // 低溫環境 (<20°C)
  | 'HOT_SHOWER'      // 剛洗完熱水澡/溫泉
  | 'ROOM_TEMP'       // 正常舒適室溫
  | 'POST_WORKOUT'    // 深蹲/重訓剛結束
  | 'POST_CYCLING'    // 長途騎乘後
  | 'SLEEP_DEPRIVED'  // 熬夜/睡眠不足
  | 'MORNING_GLORY';  // 晨間自然充血

export interface EnvironmentTagMetadata {
  tag: EnvironmentTag;
  label: string;
  category: 'TEMP_SHOWER' | 'PHYSICAL_FATIGUE';
  icon: string;
  biasPercentage: number;
  isBaselineMaxCandidate: boolean;
  description: string;
  clinicalNote: string;
}

export interface PhysiologicalBiasResult {
  totalBiasPercentage: number;
  isBaselineMax: boolean;
  alertTitle: string;
  alertNote: string;
  clinicalExplanation: string;
  suggestedAction: string;
}

export interface EnvironmentalContextLog {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  tags: EnvironmentTag[];
  biasResult: PhysiologicalBiasResult;
  notes?: string;
  associatedCheckInId?: string;
}

// --- Virtual Review Panel Wishlist & Crowdfunded Goals ---
export type WishlistGoalCategory = 'EHS' | 'PLEDGE' | 'KEGEL' | 'STRETCH' | 'CHECKIN';
export type WishlistRewardType = 'LETTER' | 'UNDERWEAR_SKIN' | 'TITLE';

export interface HandwrittenNote {
  authorName: string;
  authorPersona: string;
  authorTitle: string;
  title: string;
  paragraphs: string[];
  signature: string;
  dateString: string;
  accentColor: string;
  stampText?: string;
}

export interface WishlistGoal {
  id: string;
  initiatorName: string;
  initiatorPersona: 'tsundere' | 'seductive' | 'analytical' | 'bro' | 'partner';
  initiatorTitle: string;
  initiatorColor: string;
  initiatorAvatarIcon?: string;
  title: string;
  description: string;
  category: WishlistGoalCategory;
  targetCount: number;
  currentCount: number;
  isUnlocked: boolean;
  unlockedAt?: number;
  rewardType: WishlistRewardType;
  rewardTitle: string;
  rewardDescription: string;
  underwearSkinId?: string;
  handwrittenNote?: HandwrittenNote;
}

// --- Urology Medical Knowledge & Almanac ---
export type MedicalCategory = 'ANATOMY_GROWTH' | 'PELVIC_NEUROPATHY' | 'CARE_AND_WARNINGS';

export interface MedicalArticle {
  id: string;
  category: MedicalCategory;
  categoryLabel: string;
  title: string;
  subtitle: string;
  icon: string;
  badge: string; // e.g. "JSM 2023 臨床文獻", "EAU 臨床指引"
  readTimeMin: number;
  summary: string;
  bulletPoints: string[];
  fullContent: string;
  doctorTakeaway: string;
}

export type DoctorTipContext = 'stretching' | 'grooming' | 'ehs_low' | 'kegel' | 'arousal';

export interface DoctorTip {
  context: DoctorTipContext;
  doctorName: string;
  doctorTitle: string;
  icon: string;
  badge: string;
  title: string;
  content: string;
  referenceArticleId?: string;
}

// --- Quad-Point Handcuff Protocol ---
export interface HandcuffTouchPoint {
  x: number;
  y: number;
}

export interface HandcuffActivePoints {
  topLeft: boolean;
  bottomLeft: boolean;
  topRight: boolean;
  bottomRight: boolean;
}

export interface HandcuffState {
  isFullyLocked: boolean; // 是否 4 點均完美就位
  activePoints: HandcuffActivePoints;
  remainingSec: number;
  isViolated: boolean; // 是否中途偷放手
  violationCount: number;
}

// --- Virtual Panel Daily Mission & Evidence Protocol ---
export type MissionCategory = 'DIMENSION_AUDIT' | 'ACTION_STAMINA' | 'DISCHARGE_VOLUME';
export type MissionIssuer = 'TSUNDERE' | 'MED_SENIOR' | 'DEVOTEE' | 'PARTNER';
export type DischargeVolumeScore = 'LOW' | 'MEDIUM' | 'HIGH' | 'MASSIVE';

export interface PanelDailyMission {
  id: string;
  date: string; // YYYY-MM-DD
  issuer: MissionIssuer;
  issuerName: string;
  issuerTitle: string;
  issuerColor: string;
  issuerAvatarIcon: string;
  title: string;
  category: MissionCategory;
  categoryLabel: string;
  briefingDialog: string; // 角色專屬派工台詞
  targetRequirement: string;
  rewardTokens: number;
  isCompleted: boolean;
  completedAt?: number;
  evidenceUri?: string; // 採樣照片沙盒路徑
  volumeScore?: DischargeVolumeScore; // 液體量估評
  reviewFeedback?: string; // 審核反饋台詞
}



