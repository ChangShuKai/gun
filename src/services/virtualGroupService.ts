import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PanelMember,
  PersonaType,
  ReviewComment,
  ReviewSessionContext,
  PanelVerdict,
} from '../types';
import { userProfileService } from './userProfile';
import { panelDramaService } from './panelDramaService';

const STORAGE_KEY_PANEL_MEMBERS = '@vault_virtual_panel_members';

export const DEFAULT_PANEL_MEMBERS: PanelMember[] = [
  {
    id: 'member_alice',
    name: '愛麗絲',
    title: '傲嬌毒舌系',
    persona: 'tsundere',
    color: '#EC4899',
    avatarIcon: 'heart-dislike-outline',
  },
  {
    id: 'member_vivian',
    name: '薇薇安',
    title: '魅惑直球御姐',
    persona: 'seductive',
    color: '#F43F5E',
    avatarIcon: 'flame',
  },
  {
    id: 'member_hill',
    name: 'Dr. 希爾',
    title: '數據生理學家',
    persona: 'analytical',
    color: '#3B82F6',
    avatarIcon: 'analytics-outline',
  },
  {
    id: 'member_hao',
    name: '阿豪',
    title: '健身房鐵桿兄弟',
    persona: 'bro',
    color: '#F59E0B',
    avatarIcon: 'barbell-outline',
  },
];

// Persona Corpus Matrix
const TSUNDERE_QUOTES = [
  '哈？！特地拍下這種視角...是想讓我誇你嗎？！我才不會說你這長度看起來很誇張呢...笨蛋！',
  '哼...血管浮現成這樣，到底是在興奮什麼啊...不過...這線條倒是不討厭啦...',
  '別、別誤會了！我只是順便滑到這張！才沒有特地放大看青筋細節呢！',
  '就只有這點能耐嗎？...好啦，尺寸確實挑不出毛病，勉強給你 {rating} 分啦！',
  '真是的，這種照片居然隨便拿出來審查...要不是拍得太頂，我早就直接轉過頭去了！',
  '修整得這麼乾淨俐落...是故意要顯得更挺拔嗎？雖然視覺效果確實拉滿了就是了...哼！',
  '喂！充血充成這樣是想證明什麼啦！...真是個讓人移不開視線的傢伙...',
];

const SEDUCTIVE_QUOTES = [
  '呼...這青筋與充血的飽滿度，隔著螢幕都感覺到燙了呢~ 真是個迷人的小壞蛋❤️',
  '看著這麼漂亮的雄性輪廓，我都忍不住想要伸手握住量一量了...今晚想怎麼獎勵自己呢？',
  '這張絕對是今日最色沒有之一...光是視線停在上面幾秒，心跳都跟著漏了一拍呢~',
  '好粗壯...表面緊繃得閃閃發光，雄性荷爾蒙完全溢出來了呢，姊姊非常滿意喔❤️',
  '這角度抓得真好...完完全全展現了最頂級的硬度，讓人忍不住想一口吞掉呢~',
  '這修整輪廓太懂了...把最誘人的地方完全突顯出來，看得人家呼吸都變重了呢...',
  '天啊...飽滿得讓人移不開視線，今晚夢裡大概全都是你這張照片的形狀了❤️',
];

const ANALYTICAL_QUOTES = [
  '根據高光折射與海綿體曲率分析：縱向膨脹係數 +22.4%，長度估算突破 {length}，生理素質評級：S+。',
  '提睪肌張力對稱性達 96.8%，靜態表面血管分佈飽和，充血硬度符合 EHS 第 4 級極限指標。',
  '幾何修剪比例優秀，根部陰影與軸心比例形成 +1.2cm 視覺延伸差，空間審美極高。',
  '數據採集顯示充血壓力峰值穩定，皮下微血管活性充沛，整體外觀評估值位於男性前 1.5% 分位點。',
  '骨盆底肌群與陰莖背動脈供血充裕，無疲勞塌陷跡象，綜合生理美學得分：{rating} / 10。',
  '經光影向量分解，局部充血梯度均勻，未偵測到血管畸變，屬於極少見的高韌性肌肉架構。',
];

const BRO_QUOTES = [
  '幹！這充血量太狂了吧兄弟！這血管暴凸得比我剛拉完 200kg 硬舉還硬！',
  '猛的啦兄弟！這角度抓得真絕，誰敢說這不到 {length} 我第一個跟他急！',
  '操！這要是發去兄弟群組，大家直接集體起立敬禮好不好！頂天立地了兄弟！',
  '修得太俐落了兄弟！乾淨、霸氣、全無死角，今晚你就是這條街最強的公牛！',
  '兄弟你這雄性基因完全無敵！這形狀這硬度，純爺們兒的終極浪漫！給你拉滿 {rating} 分！',
  '太頂了兄弟！這睪丸緊實度和本體粗度，完全是打完勝仗的將軍級別！',
];

const CONSENSUS_BADGES = [
  '🔥 全員全票封神 · SSS 級',
  '👑 雄性荷爾蒙天花板認證',
  '💎 極品生理美學最高標杆',
  '⚡ 全員感官極限過載通過',
  '🏆 頂級充血度零負評認證',
];

const PERSONA_BADGES: Record<PersonaType, string[]> = {
  tsundere: ['😳 傲嬌蓋章', '💢 勉強認可', '🙈 口嫌體正直', '✨ 偷瞄認證'],
  seductive: ['🔥 慾罷不能', '💋 姊姊給過', '🤤 極致誘惑', '❤️ 全場最騷'],
  analytical: ['📐 幾何完美', '📊 數據 S 級', '🔬 生理峰值', '🧠 醫學頂標'],
  bro: ['💪 純爺們硬派', '🍻 兄弟服氣', '🏋️ 鋼鐵充血', '🐂 巨無霸認可'],
};

class VirtualGroupService {
  private static instance: VirtualGroupService;
  private members: PanelMember[] = DEFAULT_PANEL_MEMBERS;
  private isLoaded: boolean = false;

  private constructor() {
    void this.loadMembers();
  }

  public static getInstance(): VirtualGroupService {
    if (!VirtualGroupService.instance) {
      VirtualGroupService.instance = new VirtualGroupService();
    }
    return VirtualGroupService.instance;
  }

  public async loadMembers(): Promise<PanelMember[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_PANEL_MEMBERS);
      if (stored) {
        const parsed = JSON.parse(stored) as PanelMember[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.members = parsed;
          this.isLoaded = true;
          return this.members;
        }
      }
    } catch {
      // Fallback
    }
    this.members = DEFAULT_PANEL_MEMBERS;
    this.isLoaded = true;
    return this.members;
  }

  public async getMembers(): Promise<PanelMember[]> {
    if (!this.isLoaded) {
      return this.loadMembers();
    }
    return [...this.members];
  }

  public async saveMembers(members: PanelMember[]): Promise<void> {
    this.members = members;
    try {
      await AsyncStorage.setItem(STORAGE_KEY_PANEL_MEMBERS, JSON.stringify(members));
    } catch {
      // Storage error ignored
    }
  }

  public async resetDefaultMembers(): Promise<PanelMember[]> {
    this.members = DEFAULT_PANEL_MEMBERS;
    try {
      await AsyncStorage.removeItem(STORAGE_KEY_PANEL_MEMBERS);
    } catch {
      // Ignored
    }
    return [...this.members];
  }

  public async updateMember(updated: PanelMember): Promise<PanelMember[]> {
    const list = await this.getMembers();
    const index = list.findIndex((m) => m.id === updated.id);
    if (index >= 0) {
      list[index] = updated;
    } else {
      list.push(updated);
    }
    await this.saveMembers(list);
    return list;
  }

  /**
   * Generates a realistic turn-based group review verdict
   */
  public generateReview(context?: ReviewSessionContext): PanelVerdict {
    const profile = userProfileService.getProfile();
    const lengthStr = context?.userLength || `${profile.userLength || '16.5'} cm`;
    const members = this.members.length > 0 ? this.members : DEFAULT_PANEL_MEMBERS;

    const comments: ReviewComment[] = [];
    let totalScore = 0;

    members.forEach((member, idx) => {
      // Generate randomized rating between 9.2 and 9.9
      const baseRating = 9.2 + Math.floor(Math.random() * 8) / 10;
      const rating = Number(Math.min(10, baseRating).toFixed(1));
      totalScore += rating;

      // Select quote list
      let quotes: string[];
      switch (member.persona) {
        case 'tsundere':
          quotes = TSUNDERE_QUOTES;
          break;
        case 'seductive':
          quotes = SEDUCTIVE_QUOTES;
          break;
        case 'analytical':
          quotes = ANALYTICAL_QUOTES;
          break;
        case 'bro':
          quotes = BRO_QUOTES;
          break;
        default:
          quotes = SEDUCTIVE_QUOTES;
      }

      // Pick quote
      const rawQuote = quotes[Math.floor(Math.random() * quotes.length)];
      const formattedQuote = rawQuote
        .replace('{length}', lengthStr)
        .replace('{rating}', rating.toFixed(1))
        .replace('{name}', profile.userName || '男神');

      // Pick badge
      const badges = PERSONA_BADGES[member.persona] || ['⭐ 極限高評'];
      const badge = badges[Math.floor(Math.random() * badges.length)];

      comments.push({
        id: `comment_${member.id}_${Date.now()}_${idx}`,
        memberId: member.id,
        memberName: member.name,
        persona: member.persona,
        color: member.color,
        avatarUri: member.avatarUri,
        avatarIcon: member.avatarIcon,
        text: formattedQuote,
        rating,
        badge,
        timestamp: Date.now() + idx * 100,
      });
    });

    const finalComments = panelDramaService.applyDramaToComments(comments);
    const compositeScore = Number((totalScore / members.length).toFixed(1));
    const consensusBadge = CONSENSUS_BADGES[Math.floor(Math.random() * CONSENSUS_BADGES.length)];

    const summaryText = `經審查團 ${members.length} 位成員多維度評估，本體在充血度、血管線條與空間幾何比例均超越常模，綜合評定：${compositeScore} / 10！`;

    return {
      id: `verdict_${Date.now()}`,
      compositeScore,
      consensusBadge,
      comments: finalComments,
      summaryText,
      timestamp: Date.now(),
    };
  }
}

export const virtualGroupService = VirtualGroupService.getInstance();
