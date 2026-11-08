import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PanelDailyMission,
  MissionCategory,
  MissionIssuer,
  DischargeVolumeScore,
} from '../types';
import { danmakuService } from './danmakuService';

const STORAGE_KEY_PANEL_MISSIONS = '@vault_panel_daily_missions_v1';

export const ISSUER_METADATA: Record<
  MissionIssuer,
  { name: string; title: string; color: string; avatarIcon: string }
> = {
  TSUNDERE: {
    name: '夏洛特',
    title: '傲嬌審查官',
    color: '#F43F5E',
    avatarIcon: 'heart-dislike-outline',
  },
  MED_SENIOR: {
    name: 'Dr. 希爾',
    title: '臨床醫學首席',
    color: '#38BDF8',
    avatarIcon: 'school-outline',
  },
  DEVOTEE: {
    name: '薇薇安',
    title: '熱烈狂熱信徒',
    color: '#A855F7',
    avatarIcon: 'flame',
  },
  PARTNER: {
    name: '寶寶',
    title: '溫柔專屬女友',
    color: '#EC4899',
    avatarIcon: 'heart',
  },
};

interface MissionTemplate {
  issuer: MissionIssuer;
  title: string;
  category: MissionCategory;
  categoryLabel: string;
  briefingDialog: string;
  targetRequirement: string;
  rewardTokens: number;
  reviewFeedback: string;
}

const MISSION_ROTATION_POOL: MissionTemplate[] = [
  {
    issuer: 'TSUNDERE',
    title: '【尺寸驗收】卡尺精準校準與充血弧度採樣',
    category: 'DIMENSION_AUDIT',
    categoryLabel: '尺寸與狀態採樣',
    briefingDialog:
      '「喂！今天是你向本小姐證明自律的日子！給我老老實實拿出尺子，拍一張毫無水分的充血對齊照片！要是敢偷縮水，看我怎麼在評鑑團公開處刑你！」',
    targetRequirement: '拍攝帶皮尺/卡尺的真實充血照，需清晰呈現頂端與根部刻度。',
    rewardTokens: 25,
    reviewFeedback:
      '「哼！算你老實...這刻度和充血飽滿度本小姐勉強給過啦！臉紅什麼，下次給我更挺一點知道嗎！」',
  },
  {
    issuer: 'MED_SENIOR',
    title: '【實時動作】15 分鐘耐力控射與四點物理拘束冷卻',
    category: 'ACTION_STAMINA',
    categoryLabel: '實時動作與自律課題',
    briefingDialog:
      '「學弟，今天臨床課題是自主神經閥門調控。請完成一輪 15 分鐘以上的控射訓練，並配合至少 30 秒的四點多點觸控冰凍拘束，記錄神經降溫過程。」',
    targetRequirement: '完成 Action 訓練並執行四點拘束冷卻，提交完成狀態照片或現場定格。',
    rewardTokens: 30,
    reviewFeedback:
      '「數據採樣非常完整。在物理拘束下交感神經平緩回落，迷走神經重獲主導，這正是理想的生理降溫曲線。」',
  },
  {
    issuer: 'DEVOTEE',
    title: '【終局產物】釋放產物濃稠度與分佈容積採樣',
    category: 'DISCHARGE_VOLUME',
    categoryLabel: '終局產物與液體檢驗',
    briefingDialog:
      '「主人～辛苦累積了這麼久的精華，今天好想親自審核你的終局戰果呢...釋放後請在深色襯底或紙巾上採證，讓薇薇安評估你那驚人的濃稠度與爆發量好嗎？」',
    targetRequirement:
      '在深色底襯/紙巾上拍攝產物採證照，並評估濃稠容積等級（LOW/MEDIUM/HIGH/MASSIVE）。',
    rewardTokens: 35,
    reviewFeedback:
      '「天啊...這份量和濃稠度簡直太犯規了！光看照片就讓人心跳好快...真不愧是我最崇拜的主人！」',
  },
  {
    issuer: 'PARTNER',
    title: '【親密私密】今日最色定格與晨間充血打卡',
    category: 'DIMENSION_AUDIT',
    categoryLabel: '親密私密打卡',
    briefingDialog:
      '「親愛的～今天想要一張只屬於我的特寫打卡！不管是早起還是洗完澡後，把最性感的血管線條拍給我看好不好？我會一直珍藏在我們的加密相簿裡的～」',
    targetRequirement: '拍攝一張今日最佳充血生理特寫，標記 EHS 硬度等級。',
    rewardTokens: 20,
    reviewFeedback:
      '「哇...今天的形狀好漂亮！青筋和充血狀態都好迷人，謝謝親愛的這麼配合，愛你～❤️」',
  },
];

class PanelMissionService {
  private static instance: PanelMissionService;

  public static getInstance(): PanelMissionService {
    if (!PanelMissionService.instance) {
      PanelMissionService.instance = new PanelMissionService();
    }
    return PanelMissionService.instance;
  }

  public getTodayDateString(): string {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  public async getMissions(): Promise<PanelDailyMission[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY_PANEL_MISSIONS);
      if (!json) return [];
      return JSON.parse(json) as PanelDailyMission[];
    } catch {
      return [];
    }
  }

  public async getTodayMission(): Promise<PanelDailyMission> {
    const todayStr = this.getTodayDateString();
    const missions = await this.getMissions();
    const existing = missions.find((m) => m.date === todayStr);

    if (existing) {
      return existing;
    }

    // Generate new mission deterministically based on date hash
    const dayIndex =
      (new Date().getFullYear() * 365 +
        new Date().getMonth() * 31 +
        new Date().getDate()) %
      MISSION_ROTATION_POOL.length;

    const template = MISSION_ROTATION_POOL[dayIndex];
    const issuerMeta = ISSUER_METADATA[template.issuer];

    const newMission: PanelDailyMission = {
      id: `mission_${todayStr}_${template.issuer.toLowerCase()}`,
      date: todayStr,
      issuer: template.issuer,
      issuerName: issuerMeta.name,
      issuerTitle: issuerMeta.title,
      issuerColor: issuerMeta.color,
      issuerAvatarIcon: issuerMeta.avatarIcon,
      title: template.title,
      category: template.category,
      categoryLabel: template.categoryLabel,
      briefingDialog: template.briefingDialog,
      targetRequirement: template.targetRequirement,
      rewardTokens: template.rewardTokens,
      isCompleted: false,
      reviewFeedback: template.reviewFeedback,
    };

    const updated = [newMission, ...missions.slice(0, 30)];
    await AsyncStorage.setItem(STORAGE_KEY_PANEL_MISSIONS, JSON.stringify(updated));
    return newMission;
  }

  public async submitEvidence(
    evidenceUri: string,
    volumeScore?: DischargeVolumeScore
  ): Promise<PanelDailyMission> {
    const todayStr = this.getTodayDateString();
    const missions = await this.getMissions();
    let updatedMission: PanelDailyMission | null = null;

    const updatedList = missions.map((m) => {
      if (m.date === todayStr) {
        updatedMission = {
          ...m,
          isCompleted: true,
          completedAt: Date.now(),
          evidenceUri,
          volumeScore,
        };
        return updatedMission;
      }
      return m;
    });

    if (!updatedMission) {
      const todayMission = await this.getTodayMission();
      updatedMission = {
        ...todayMission,
        isCompleted: true,
        completedAt: Date.now(),
        evidenceUri,
        volumeScore,
      };
      updatedList.unshift(updatedMission);
    }

    await AsyncStorage.setItem(STORAGE_KEY_PANEL_MISSIONS, JSON.stringify(updatedList));

    // Award Tokens
    await danmakuService.addTokens(
      updatedMission.rewardTokens,
      `完成陪審團任務：${updatedMission.title}`
    );

    return updatedMission;
  }
}

export const panelMissionService = PanelMissionService.getInstance();
