import AsyncStorage from '@react-native-async-storage/async-storage';
import { UnderwearItem, UnderwearCheckInRecord, UnderwearCutType } from '../types';

const STORAGE_KEY_WARDROBE = '@vault_underwear_wardrobe';
const STORAGE_KEY_CHECKINS = '@vault_underwear_checkins';

export const PRESET_UNDERWEAR: UnderwearItem[] = [
  {
    id: 'item_ck_trunk',
    name: 'CK 經典純黑貼身平口',
    cutType: 'TRUNK',
    colorTag: '#0F172A',
    brand: 'Calvin Klein',
    createdAt: 1700000000000,
  },
  {
    id: 'item_modal_brief',
    name: '莫代爾深灰低腰三角',
    cutType: 'BRIEF',
    colorTag: '#475569',
    brand: 'Modal Comfort',
    createdAt: 1700000001000,
  },
  {
    id: 'item_airism_boxer',
    name: 'AIRism 透氣無痕平口',
    cutType: 'BOXER',
    colorTag: '#1E293B',
    brand: 'UNIQLO',
    createdAt: 1700000002000,
  },
  {
    id: 'item_jockstrap_combat',
    name: '極限戰袍高彈提臀帶',
    cutType: 'JOCKSTRAP',
    colorTag: '#DC2626',
    brand: 'Pro Athletic',
    createdAt: 1700000003000,
  },
];

export const CUT_TYPE_CONFIG: Record<
  UnderwearCutType,
  { label: string; desc: string; icon: string }
> = {
  TRUNK: {
    label: '貼身平口 (Trunk)',
    desc: '中腰貼合・修飾大腿根部線條',
    icon: 'cube-outline',
  },
  BRIEF: {
    label: '俐落三角 (Brief)',
    desc: '高衩拉長腿長・突顯囊袋飽滿弧度',
    icon: 'triangle-outline',
  },
  BOXER: {
    label: '寬鬆平口 (Boxer)',
    desc: '通風透氣・自由無拘束感',
    icon: 'square-outline',
  },
  JOCKSTRAP: {
    label: '提臀戰帶 (Jockstrap)',
    desc: '背部淨空彈力帶・極致提臀緊實',
    icon: 'shield-outline',
  },
  OTHER: {
    label: '其他款式 (Other)',
    desc: '自訂特殊剪裁款式',
    icon: 'pricetag-outline',
  },
};

class UnderwearService {
  private static instance: UnderwearService;
  private wardrobe: UnderwearItem[] = [];
  private checkIns: UnderwearCheckInRecord[] = [];
  private isLoaded: boolean = false;

  public static getInstance(): UnderwearService {
    if (!UnderwearService.instance) {
      UnderwearService.instance = new UnderwearService();
    }
    return UnderwearService.instance;
  }

  private async loadData(): Promise<void> {
    try {
      const storedWardrobe = await AsyncStorage.getItem(STORAGE_KEY_WARDROBE);
      if (storedWardrobe) {
        const parsed = JSON.parse(storedWardrobe);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.wardrobe = parsed;
        } else {
          this.wardrobe = PRESET_UNDERWEAR;
        }
      } else {
        this.wardrobe = PRESET_UNDERWEAR;
      }

      const storedCheckIns = await AsyncStorage.getItem(STORAGE_KEY_CHECKINS);
      if (storedCheckIns) {
        this.checkIns = JSON.parse(storedCheckIns);
      } else {
        this.checkIns = [];
      }
    } catch {
      this.wardrobe = PRESET_UNDERWEAR;
      this.checkIns = [];
    }
    this.isLoaded = true;
  }

  public async getWardrobe(): Promise<UnderwearItem[]> {
    if (!this.isLoaded) {
      await this.loadData();
    }
    return [...this.wardrobe];
  }

  public async addUnderwear(
    item: Omit<UnderwearItem, 'id' | 'createdAt'>
  ): Promise<UnderwearItem> {
    const list = await this.getWardrobe();
    const newItem: UnderwearItem = {
      ...item,
      id: `uw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
    };
    list.unshift(newItem);
    this.wardrobe = list;
    try {
      await AsyncStorage.setItem(STORAGE_KEY_WARDROBE, JSON.stringify(list));
    } catch {
      // Ignored
    }
    return newItem;
  }

  public async deleteUnderwear(id: string): Promise<void> {
    const list = await this.getWardrobe();
    const filtered = list.filter((item) => item.id !== id);
    this.wardrobe = filtered;
    try {
      await AsyncStorage.setItem(STORAGE_KEY_WARDROBE, JSON.stringify(filtered));
    } catch {
      // Ignored
    }
  }

  public async getCheckIns(): Promise<UnderwearCheckInRecord[]> {
    if (!this.isLoaded) {
      await this.loadData();
    }
    return [...this.checkIns].sort((a, b) => b.timestamp - a.timestamp);
  }

  public async saveCheckIn(
    recordData: Omit<UnderwearCheckInRecord, 'id' | 'timestamp'>
  ): Promise<UnderwearCheckInRecord> {
    const list = await this.getCheckIns();
    const newRecord: UnderwearCheckInRecord = {
      ...recordData,
      id: `uw_checkin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    };
    list.unshift(newRecord);
    this.checkIns = list;
    try {
      await AsyncStorage.setItem(STORAGE_KEY_CHECKINS, JSON.stringify(list));
    } catch {
      // Ignored
    }
    return newRecord;
  }

  public async deleteCheckIn(id: string): Promise<void> {
    const list = await this.getCheckIns();
    const filtered = list.filter((r) => r.id !== id);
    this.checkIns = filtered;
    try {
      await AsyncStorage.setItem(STORAGE_KEY_CHECKINS, JSON.stringify(filtered));
    } catch {
      // Ignored
    }
  }

  public async getCheckInForDate(dateStr: string): Promise<UnderwearCheckInRecord | null> {
    const list = await this.getCheckIns();
    return list.find((r) => r.date === dateStr) || null;
  }
}

export const underwearService = UnderwearService.getInstance();
