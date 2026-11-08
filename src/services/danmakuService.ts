import AsyncStorage from '@react-native-async-storage/async-storage';
import { DanmakuComment, MemberFavorability, FavorabilityStore } from '../types';

const STORAGE_KEY_DANMAKU = '@vault_danmaku_favorability_v1';

export const INITIAL_MEMBERS: Record<string, MemberFavorability> = {
  tsundere: {
    memberId: 'tsundere',
    name: '神木綾乃 (Ayano)',
    tier: 1,
    currentPoints: 20,
    nextTierPoints: 100,
    title: '傲嬌審查員',
    unlockedVoiceLine: '才不是特別想看你打卡呢...別自作多情了！',
  },
  seductive: {
    memberId: 'seductive',
    name: '九條薇拉 (Vera)',
    tier: 1,
    currentPoints: 35,
    nextTierPoints: 100,
    title: '魅惑品評家',
    unlockedVoiceLine: '小弟弟今天這身...線條藏得很辛苦呢~❤️',
  },
  analytical: {
    memberId: 'analytical',
    name: '柯林博士 (Dr. Colin)',
    tier: 1,
    currentPoints: 15,
    nextTierPoints: 100,
    title: '數據分析狂',
    unlockedVoiceLine: '海綿體白膜張力係數在安全閾值內，數據模型極為穩定。',
  },
  bro: {
    memberId: 'bro',
    name: '豪哥 (Coach Hao)',
    tier: 1,
    currentPoints: 40,
    nextTierPoints: 100,
    title: '健美鐵哥',
    unlockedVoiceLine: '兄弟！這青筋太炸了！這就是純粹的男子氣概！🔥',
  },
};

const DANMAKU_POOL_NORMAL: { text: string; sender: string; persona: any; color: string }[] = [
  { text: '這側面線條也太頂了吧...', sender: '薇拉', persona: 'seductive', color: '#EC4899' },
  { text: '哼！還以為有多厲害，也就標準水平啦！', sender: '綾乃', persona: 'tsundere', color: '#F43F5E' },
  { text: '檢測到充血率達到 94.6%，生理指標健康！', sender: '柯林', persona: 'analytical', color: '#38BDF8' },
  { text: '兄弟這個維度太狠了！繼續保持！', sender: '豪哥', persona: 'bro', color: '#F59E0B' },
  { text: '前面的別擠，擋到我看尺標了！', sender: '圍觀群眾A', persona: 'system', color: '#94A3B8' },
  { text: '這弧度是天生的嗎？真好看...', sender: '匿名粉絲', persona: 'seductive', color: '#F472B6' },
  { text: '呼氣...放鬆骨盆底肌，別緊繃！', sender: '豪哥', persona: 'bro', color: '#FBBF24' },
  { text: '笨蛋！手別放那裡啦...會被看到的...', sender: '綾乃', persona: 'tsundere', color: '#FB7185' },
  { text: '這款內褲的版型把輪廓凸顯得剛剛好🔥', sender: '時尚審查員', persona: 'seductive', color: '#C084FC' },
  { text: '實測數值無浮誇，嚴謹可信。', sender: '柯林', persona: 'analytical', color: '#7DD3FC' },
];

const DANMAKU_POOL_HIGH_PRESSURE: { text: string; sender: string; persona: any; color: string }[] = [
  { text: '🚨 BPM 破百了！穩住！千萬別繳械！', sender: '豪哥', persona: 'bro', color: '#EF4444' },
  { text: '呼吸！深吸四秒！啟動副交感神經！', sender: '柯林', persona: 'analytical', color: '#38BDF8' },
  { text: '啊啊啊...不行了...這個充血張力好危險❤️', sender: '薇拉', persona: 'seductive', color: '#F43F5E' },
  { text: '喂！要是現在敢停下來你就死定了！', sender: '綾乃', persona: 'tsundere', color: '#FB7185' },
  { text: '頂住最後 10 秒！男人不能說不行！', sender: '豪哥', persona: 'bro', color: '#F59E0B' },
  { text: '白膜微血管擴張峰值中！耐力突破！', sender: '柯林', persona: 'analytical', color: '#60A5FA' },
  { text: '好性感...心跳聲快從螢幕傳出來了...', sender: '薇拉', persona: 'seductive', color: '#EC4899' },
  { text: '笨蛋...明明就快撐不住了還逞強...///', sender: '綾乃', persona: 'tsundere', color: '#FDA4AF' },
];

class DanmakuService {
  private static instance: DanmakuService;
  private store: FavorabilityStore = {
    tokens: 120,
    members: INITIAL_MEMBERS,
    lastRewardTimestamp: Date.now(),
  };
  private isLoaded: boolean = false;

  public static getInstance(): DanmakuService {
    if (!DanmakuService.instance) {
      DanmakuService.instance = new DanmakuService();
    }
    return DanmakuService.instance;
  }

  public async getFavorabilityStore(): Promise<FavorabilityStore> {
    if (!this.isLoaded) {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY_DANMAKU);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.store = {
            tokens: parsed.tokens ?? 120,
            members: { ...INITIAL_MEMBERS, ...(parsed.members || {}) },
            lastRewardTimestamp: parsed.lastRewardTimestamp ?? Date.now(),
          };
        }
      } catch {
        // Fallback to default
      }
      this.isLoaded = true;
    }
    return { ...this.store };
  }

  public async addTokens(amount: number, reason: string): Promise<number> {
    const store = await this.getFavorabilityStore();
    store.tokens += amount;
    this.store = store;
    await this.persist();
    return this.store.tokens;
  }

  public async giftMember(
    memberId: string,
    tokenCost: number = 20
  ): Promise<{ success: boolean; newTier?: number; message: string }> {
    const store = await this.getFavorabilityStore();
    if (store.tokens < tokenCost) {
      return { success: false, message: '自律代幣不足！完成打卡或履約以賺取點數。' };
    }

    const member = store.members[memberId];
    if (!member) {
      return { success: false, message: '成員不存在' };
    }

    store.tokens -= tokenCost;
    member.currentPoints += tokenCost;

    let leveledUp = false;
    if (member.currentPoints >= member.nextTierPoints && member.tier < 5) {
      member.tier += 1;
      member.currentPoints = member.currentPoints - member.nextTierPoints;
      member.nextTierPoints = Math.round(member.nextTierPoints * 1.6);
      leveledUp = true;
      this.updateMemberTierAssets(member);
    }

    await this.persist();
    return {
      success: true,
      newTier: leveledUp ? member.tier : undefined,
      message: leveledUp
        ? `好感度突破！${member.name} 晉升為 Tier ${member.tier}「${member.title}」！`
        : `成功贈送！${member.name} 好感度 +${tokenCost}`,
    };
  }

  private updateMemberTierAssets(member: MemberFavorability): void {
    if (member.memberId === 'tsundere') {
      if (member.tier === 2) {
        member.title = '口嫌體正直審查官';
        member.unlockedVoiceLine = '笨蛋學弟...看在你的努力份上，今天就特別表揚你一下！';
      } else if (member.tier === 3) {
        member.title = '傲嬌專屬守護者';
        member.unlockedVoiceLine = '就算尺寸真的很大又怎樣...我才沒有每天偷看你的記錄呢！';
      } else if (member.tier === 4) {
        member.title = '臉紅心跳沉淪者';
        member.unlockedVoiceLine = '唔...不要一直看著我啦！你這個自律怪物...最喜歡你了啦！';
      } else if (member.tier === 5) {
        member.title = '【稀有】頂流掌控者綾乃';
        member.unlockedVoiceLine = '從今天開始，你就是無可挑剔的頂流！不准讓別人看，只能給我看！🔥';
      }
    } else if (member.memberId === 'seductive') {
      if (member.tier === 2) {
        member.title = '心動品評御姐';
        member.unlockedVoiceLine = '親愛的，今天這身戰袍真懂姐姐的喜好呢~';
      } else if (member.tier === 3) {
        member.title = '親密專屬顧問';
        member.unlockedVoiceLine = '看著那幾根青筋跳動...姐姐的呼吸也跟著亂了呢~❤️';
      } else if (member.tier === 4) {
        member.title = '極致魅惑愛侶';
        member.unlockedVoiceLine = '今晚不要看螢幕了，讓姐姐親自來驗證你的耐力，好不好？';
      } else if (member.tier === 5) {
        member.title = '【稀有】魅魔女帝薇拉';
        member.unlockedVoiceLine = '你已經徹底征服我了...今生今世，只為你的堅毅而傾倒。';
      }
    } else if (member.memberId === 'analytical') {
      if (member.tier === 2) {
        member.title = '生物大數據主任';
        member.unlockedVoiceLine = '置信區間縮小至 99%，你正在改寫人體自律極限數據庫。';
      } else if (member.tier === 5) {
        member.title = '【稀有】奇異點首席院士柯林';
        member.unlockedVoiceLine = '恭喜達成生理自律終極奇異點，整體表現超出常模 3.8 個標準差！';
      }
    } else if (member.memberId === 'bro') {
      if (member.tier === 2) {
        member.title = '過命交情鐵哥';
        member.unlockedVoiceLine = '兄弟！今天這組做完，全場你最硬！誰敢質疑我跟他拼了！';
      } else if (member.tier === 5) {
        member.title = '【稀有】傳奇斯巴達戰神豪哥';
        member.unlockedVoiceLine = '真正的自律王者誕生！從今以後，你就是全男人的精神圖騰！';
      }
    }
  }

  public getRandomDanmakuList(
    count: number = 8,
    intensity: 'normal' | 'high' | 'extreme' = 'normal'
  ): DanmakuComment[] {
    const pool = intensity === 'normal' ? DANMAKU_POOL_NORMAL : DANMAKU_POOL_HIGH_PRESSURE;
    const result: DanmakuComment[] = [];

    for (let i = 0; i < count; i++) {
      const item = pool[Math.floor(Math.random() * pool.length)];
      const member = this.store.members[item.persona];
      const isVIP = member ? member.tier >= 4 : false;

      result.push({
        id: `danmaku_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        text: item.text,
        sender: member ? member.name.split(' ')[0] : item.sender,
        color: item.color,
        persona: item.persona,
        isVIP,
        speed: 7000 + Math.random() * 4000,
        lane: i % 4,
      });
    }

    return result;
  }

  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_DANMAKU, JSON.stringify(this.store));
    } catch {
      // Ignored
    }
  }
}

export const danmakuService = DanmakuService.getInstance();
