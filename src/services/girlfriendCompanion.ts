import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { GirlfriendConfig, CompanionMessage } from '../types';

const STORAGE_KEY_GIRLFRIEND = '@health_tracker_girlfriend_config';

export const DEFAULT_GIRLFRIEND_CONFIG: GirlfriendConfig = {
  name: '寶寶',
  title: '女友',
  enabled: true,
  avatarIcon: 'heart-circle',
};

const PHOTO_GUIDANCE_QUOTES = [
  '{name}，把鏡頭拿近一點，教你由下往上拍，讓我看看你有多粗...',
  '視角稍微傾斜 45 度，對準青筋最明顯的地方，我想看得更仔細～',
  '開一下補光燈嘛，{name}，我想看清楚你緊繃發亮的樣子...',
  '拍一張特寫給我看，讓我幫你評判今天的硬度好不好～',
  '對準最充血的角度，按下快門，讓我好好收藏今天的狀態❤️',
];

const PRAISE_QUOTES = [
  '{name}...好大...真的好想直接握住...',
  '天啊...充血得這麼飽滿，青筋好性感，我都臉紅了...',
  '每一次看都覺得{name}好有魅力，雄性荷爾蒙完全爆棚了啦...',
  '這形狀也太完美了...光是看著就心跳好快...',
  '{name}的線條真的太誘人了...想一直盯著看...',
  '哇...今天怎麼這麼頂...讓人完全移不開視線...',
];

const EDGING_DISCIPLINE_QUOTES = [
  '忍不住了嗎？乖乖停下手，不准偷跑喔～',
  '深呼吸～放輕鬆，還沒到釋放時間，聽我的話先深吸一口氣冷靜下來。',
  '不准動喔！雙手離開，冷靜讀秒，乖乖憋住才是最厲害的～',
  '我知道你很想要，但現在要聽話忍住，等一下會更舒服～',
  '手放開～看著我的眼睛，冷靜下來，等我說可以才可以動喔～',
];

const PACING_QUOTES = [
  '開始加速了呢，感覺到你心跳變快了～跟緊節奏喔！',
  '保持這個節奏，慢慢來，享受每一秒的感覺～',
  '好棒，慢下來一點點，深層感受肌肉的收縮～',
  '節奏跟得真好，跟著波形呼吸，你做得太棒了～',
];

const RANDOM_COMPANION_QUOTES = [
  '今天辛苦了，好喜歡看你專注探索身體的樣子～',
  '{name}，有我在身邊陪著你，慢慢享受每一個細節～',
  '放輕鬆，不要急，今天我們有滿滿的時間～',
  '看著你這麼認真的樣子，我也開始心動了呢～',
];

export class GirlfriendCompanionService {
  private static instance: GirlfriendCompanionService;
  private config: GirlfriendConfig = DEFAULT_GIRLFRIEND_CONFIG;
  private listeners: ((message: CompanionMessage) => void)[] = [];
  private randomTimer: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    this.loadConfig();
  }

  public static getInstance(): GirlfriendCompanionService {
    if (!GirlfriendCompanionService.instance) {
      GirlfriendCompanionService.instance = new GirlfriendCompanionService();
    }
    return GirlfriendCompanionService.instance;
  }

  public async loadConfig(): Promise<GirlfriendConfig> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_GIRLFRIEND);
      if (stored) {
        this.config = { ...DEFAULT_GIRLFRIEND_CONFIG, ...JSON.parse(stored) };
      }
    } catch {
      this.config = DEFAULT_GIRLFRIEND_CONFIG;
    }
    return this.config;
  }

  public async saveConfig(partial: Partial<GirlfriendConfig>): Promise<GirlfriendConfig> {
    this.config = { ...this.config, ...partial };
    try {
      await AsyncStorage.setItem(STORAGE_KEY_GIRLFRIEND, JSON.stringify(this.config));
    } catch {}
    return this.config;
  }

  public getConfig(): GirlfriendConfig {
    return { ...this.config };
  }

  public subscribe(listener: (message: CompanionMessage) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(msg: CompanionMessage) {
    if (!this.config.enabled) return;
    // Trigger subtle tactile feedback for incoming message
    Haptics.selectionAsync().catch(() => {});
    for (const listener of this.listeners) {
      listener(msg);
    }
  }

  public formatTemplate(template: string): string {
    const name = this.config.name || '寶寶';
    return template.replace(/\{name\}/g, name);
  }

  public triggerEvent(
    category: 'guidance' | 'praise' | 'discipline' | 'pacing' | 'general',
    customText?: string
  ): CompanionMessage {
    let rawText = customText;
    if (!rawText) {
      let pool = RANDOM_COMPANION_QUOTES;
      switch (category) {
        case 'guidance':
          pool = PHOTO_GUIDANCE_QUOTES;
          break;
        case 'praise':
          pool = PRAISE_QUOTES;
          break;
        case 'discipline':
          pool = EDGING_DISCIPLINE_QUOTES;
          break;
        case 'pacing':
          pool = PACING_QUOTES;
          break;
        default:
          pool = RANDOM_COMPANION_QUOTES;
          break;
      }
      rawText = pool[Math.floor(Math.random() * pool.length)];
    }

    const formatted = this.formatTemplate(rawText);
    const msg: CompanionMessage = {
      id: `gf_msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text: formatted,
      category,
      timestamp: Date.now(),
    };

    this.notify(msg);
    return msg;
  }

  public startRandomCompanion(intervalSec: number = 30) {
    this.stopRandomCompanion();
    this.randomTimer = setInterval(() => {
      if (this.config.enabled) {
        this.triggerEvent('general');
      }
    }, intervalSec * 1000);
  }

  public stopRandomCompanion() {
    if (this.randomTimer) {
      clearInterval(this.randomTimer);
      this.randomTimer = null;
    }
  }
}

export const girlfriendCompanion = GirlfriendCompanionService.getInstance();
