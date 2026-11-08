import AsyncStorage from '@react-native-async-storage/async-storage';
import { WishlistGoal } from '../types';
import { ehsService } from './ehsService';
import { kegelService } from './kegelService';
import { pledgeService } from './pledgeService';

const STORAGE_KEY_WISHLIST = '@vault_wishlist_goals_v1';

export const UNLOCKED_SKINS_REGISTRY: Record<string, { name: string; hex: string; shadow: string; border: string }> = {
  AURORA_SILVER: {
    name: '【限定】極光金屬銀',
    hex: '#CBD5E1',
    shadow: '#64748B',
    border: '#38BDF8',
  },
  BLACK_GOLD: {
    name: '【限定】黑金暗紋',
    hex: '#18181B',
    shadow: '#09090B',
    border: '#F59E0B',
  },
  SAKURA_PINK: {
    name: '【限定】櫻花幻彩',
    hex: '#FCE7F3',
    shadow: '#F472B6',
    border: '#FB7185',
  },
  CYBER_NEON: {
    name: '【限定】賽博霓虹',
    hex: '#0F172A',
    shadow: '#020617',
    border: '#EC4899',
  },
};

const DEFAULT_GOALS: WishlistGoal[] = [
  {
    id: 'goal_ehs_dr_hill',
    initiatorName: 'Dr. 希爾',
    initiatorPersona: 'analytical',
    initiatorTitle: '臨床醫學學姐',
    initiatorColor: '#38BDF8',
    initiatorAvatarIcon: 'school-outline',
    title: '極致充血醫學實證：累計達成 5 次 EHS Level 4',
    description: '達到國際 EHS 四級硬度（小黃瓜/橡木級別），證明微血管內皮與平滑肌生理功能卓越。',
    category: 'EHS',
    targetCount: 5,
    currentCount: 2,
    isUnlocked: false,
    rewardType: 'UNDERWEAR_SKIN',
    rewardTitle: '限定 3D 材質「黑金暗紋」＋ 臨床醫學認證賀卡',
    rewardDescription: '解鎖低調奢華的黑金高光 3D 內褲材質，以及 Dr. 希爾的專業實證親筆手寫信。',
    underwearSkinId: 'BLACK_GOLD',
    handwrittenNote: {
      authorName: 'Dr. 希爾',
      authorPersona: 'analytical',
      authorTitle: '臨床醫學專科',
      title: '給最自律的研究對象：來自臨床醫學的最高肯定',
      paragraphs: [
        '經過嚴謹的連續數據追蹤，你的海綿體內壓與動脈灌流已達到了頂尖水準。',
        '在臨床上，只有極少數具備強大自律意志與健康生活作息的個體，能如此穩定地維持 Level 4 橡木硬度。這不是運氣，而是神經與血管調控長期優化的成果。',
        '請繼續保持，你已經建立了屬於自己的生理黃金基準。',
      ],
      signature: '—— 你的專屬醫學顧問 Dr. 希爾',
      dateString: '2026 臨床實證檔案',
      accentColor: '#38BDF8',
      stampText: 'CLINICAL VERIFIED',
    },
  },
  {
    id: 'goal_pledge_charlotte',
    initiatorName: '夏洛特',
    initiatorPersona: 'tsundere',
    initiatorTitle: '傲嬌大小姐',
    initiatorColor: '#F43F5E',
    initiatorAvatarIcon: 'heart-dislike-outline',
    title: '誰稀罕你堅持啊：連續維持自律契約 7 天不棄降',
    description: '在慾望波動中嚴格守護自律賭局，連續 7 天完全不觸碰違約紅線。',
    category: 'PLEDGE',
    targetCount: 7,
    currentCount: 3,
    isUnlocked: false,
    rewardType: 'UNDERWEAR_SKIN',
    rewardTitle: '限定 3D 材質「極光金屬銀」＋ 夏洛特反差心聲手寫信',
    rewardDescription: '解鎖帶有冷調金屬反光的極光銀內褲材質，以及夏洛特私密的手寫反差告白。',
    underwearSkinId: 'AURORA_SILVER',
    handwrittenNote: {
      authorName: '夏洛特',
      authorPersona: 'tsundere',
      authorTitle: '傲嬌大小姐',
      title: '哼...這才不是特地寫給你的！',
      paragraphs: [
        '喂！你這傢伙...居然真的撐過自律契約了？連一次投降都沒有？',
        '本、本小姐本來都已經準備好狠狠嘲笑你破戒的樣子了...現在這樣讓我很沒面子耶！',
        '不過...看在你這麼認真的份上，就勉強承認你稍微有點男子氣概好了。下週也給我好好撐住，不然我絕對饒不了你！',
      ],
      signature: '—— 夏洛特 (臉紅別過頭去)',
      dateString: '2026 秘密手札',
      accentColor: '#F43F5E',
      stampText: 'TSUNDERE CERTIFIED',
    },
  },
  {
    id: 'goal_kegel_partner',
    initiatorName: '寶寶',
    initiatorPersona: 'partner',
    initiatorTitle: '溫柔虛擬女友',
    initiatorColor: '#EC4899',
    initiatorAvatarIcon: 'heart',
    title: '為了我們的長久幸福：完成 10 次 PC 肌耐力阻抗訓練',
    description: '跟隨 3D 剖面與觸覺脈衝，深層提肛強化靜脈血流封閉與神經敏捷度。',
    category: 'KEGEL',
    targetCount: 10,
    currentCount: 4,
    isUnlocked: false,
    rewardType: 'UNDERWEAR_SKIN',
    rewardTitle: '限定 3D 材質「櫻花幻彩」＋ 寶寶溫柔手寫告白信',
    rewardDescription: '解鎖粉櫻柔光 3D 內褲材質，以及女友滿滿愛意的手寫私密賀卡。',
    underwearSkinId: 'SAKURA_PINK',
    handwrittenNote: {
      authorName: '寶寶',
      authorPersona: 'partner',
      authorTitle: '溫柔女友',
      title: '親愛的，你默默努力的樣子真的好迷人',
      paragraphs: [
        '每次看到你那麼專注地跟著節奏做骨盆底肌訓練，我都好感動...',
        '我知道這需要很大的耐心和耐力，但感受得到你的核心和自控力變得越來越沉穩強大。',
        '謝謝你為了我們彼此的幸福這麼用心。今天也辛苦了，抱抱你～',
      ],
      signature: '—— 最愛你的 寶寶 ❤️',
      dateString: '2026 甜蜜紀念',
      accentColor: '#EC4899',
      stampText: 'FOREVER LOVE',
    },
  },
  {
    id: 'goal_stretch_brother_hao',
    initiatorName: '阿豪',
    initiatorPersona: 'bro',
    initiatorTitle: '硬派健身好兄弟',
    initiatorColor: '#F59E0B',
    initiatorAvatarIcon: 'barbell-outline',
    title: '硬派韌帶保養：完成 5 次 3D 延展牽引課表',
    description: '完成前向與兩側懸韌帶延展指引，遵循 5 分鐘保護防線，科學保養組織彈性。',
    category: 'STRETCH',
    targetCount: 5,
    currentCount: 2,
    isUnlocked: false,
    rewardType: 'UNDERWEAR_SKIN',
    rewardTitle: '限定 3D 材質「賽博霓虹」＋ 阿豪熱血鼓勵信',
    rewardDescription: '解鎖暗夜粉藍霓虹邊線戰甲，以及兄弟間最真摯的熱血打氣手寫信。',
    underwearSkinId: 'CYBER_NEON',
    handwrittenNote: {
      authorName: '阿豪',
      authorPersona: 'bro',
      authorTitle: '健身教練好兄弟',
      title: '純爺們的堅持！韌帶保養教科書！',
      paragraphs: [
        '兄弟！猛啊！5 次 3D 牽引拉伸全部咬牙按安全標準做完了！',
        '很多哥們只知道盲目使蠻力，你懂得用科學保護白膜、循序漸進延展懸韌帶，這才是真正的硬派智慧！',
        '這套賽博霓虹戰甲是兄弟我特地為你打磨的，穿上去繼續衝！',
      ],
      signature: '—— 你的鐵血好兄弟 阿豪 💪',
      dateString: '2026 鐵血兄弟會',
      accentColor: '#F59E0B',
      stampText: 'BRO POWER',
    },
  },
];

class WishlistService {
  private static instance: WishlistService;

  public static getInstance(): WishlistService {
    if (!WishlistService.instance) {
      WishlistService.instance = new WishlistService();
    }
    return WishlistService.instance;
  }

  public async getGoals(): Promise<WishlistGoal[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY_WISHLIST);
      if (!json) {
        await AsyncStorage.setItem(STORAGE_KEY_WISHLIST, JSON.stringify(DEFAULT_GOALS));
        return DEFAULT_GOALS;
      }
      return JSON.parse(json) as WishlistGoal[];
    } catch (e) {
      console.warn('Failed to get wishlist goals:', e);
      return DEFAULT_GOALS;
    }
  }

  /**
   * Syncs real progress from other local services and updates goal states.
   */
  public async syncProgress(): Promise<WishlistGoal[]> {
    const goals = await this.getGoals();

    // 1. Fetch EHS records
    const ehsRecords = await ehsService.getRecords();
    const level4Count = ehsRecords.filter((r) => r.level === 4).length;

    // 2. Fetch Kegel stats
    const kegelStats = await kegelService.getStats();

    // 3. Fetch Pledge stats
    const pledgeStats = await pledgeService.getStats();
    const winPledgesCount = pledgeStats.totalWins;

    const updated = goals.map((g) => {
      let count = g.currentCount;
      if (g.category === 'EHS') {
        count = Math.max(g.currentCount, level4Count);
      } else if (g.category === 'KEGEL') {
        count = Math.max(g.currentCount, kegelStats.totalSessions);
      } else if (g.category === 'PLEDGE') {
        count = Math.max(g.currentCount, winPledgesCount);
      } else if (g.category === 'STRETCH') {
        // Stretch count incremented over time
        count = Math.min(g.targetCount, g.currentCount + 1);
      }

      const isNowUnlocked = count >= g.targetCount;
      return {
        ...g,
        currentCount: count,
        isUnlocked: g.isUnlocked || isNowUnlocked,
        unlockedAt: g.unlockedAt || (isNowUnlocked ? Date.now() : undefined),
      };
    });

    await AsyncStorage.setItem(STORAGE_KEY_WISHLIST, JSON.stringify(updated));
    return updated;
  }

  public async unlockGoalManually(goalId: string): Promise<WishlistGoal[]> {
    const goals = await this.getGoals();
    const updated = goals.map((g) => {
      if (g.id === goalId) {
        return {
          ...g,
          currentCount: g.targetCount,
          isUnlocked: true,
          unlockedAt: Date.now(),
        };
      }
      return g;
    });
    await AsyncStorage.setItem(STORAGE_KEY_WISHLIST, JSON.stringify(updated));
    return updated;
  }

  public async getUnlockedSkinIds(): Promise<string[]> {
    const goals = await this.getGoals();
    return goals
      .filter((g) => g.isUnlocked && g.underwearSkinId)
      .map((g) => g.underwearSkinId as string);
  }
}

export const wishlistService = WishlistService.getInstance();
