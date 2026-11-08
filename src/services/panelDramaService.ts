import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecretNote, ReviewComment } from '../types';
import { danmakuService } from './danmakuService';

const STORAGE_KEY_SECRET_NOTES = '@vault_secret_notes_v1';

// Counter-attack drama quotes matrix
export const DRAMA_REBUTTALS = [
  {
    targetPersona: 'tsundere',
    targetQuoteSnippet: '也就一般般吧，真不知道在神氣什麼',
    rebuttalSpeaker: {
      id: 'member_vivian',
      name: '薇薇安',
      persona: 'seductive' as const,
      color: '#F43F5E',
      avatarIcon: 'flame',
    },
    rebuttalText: '妳瞎了嗎？！這個充血度跟筋絡線條明明超極品好不好！眼睛不要可以捐給需要的人！',
    badge: '⚔️ 護主回擊',
  },
  {
    targetPersona: 'tsundere',
    targetQuoteSnippet: '哼...就只有這點能耐嗎？',
    rebuttalSpeaker: {
      id: 'member_hill',
      name: 'Dr. 希爾',
      persona: 'analytical' as const,
      color: '#3B82F6',
      avatarIcon: 'analytics-outline',
    },
    rebuttalText: '從海綿體充血係數與白膜張力看已經超越98%常模，某些人不要口嫌體正直。',
    badge: '📊 數據打臉',
  },
  {
    targetPersona: 'tsundere',
    targetQuoteSnippet: '血管浮現成這樣，到底是在興奮什麼',
    rebuttalSpeaker: {
      id: 'member_hao',
      name: '阿豪',
      persona: 'bro' as const,
      color: '#F59E0B',
      avatarIcon: 'barbell-outline',
    },
    rebuttalText: '傲嬌妹妳別裝了！剛才妳眼睛盯著螢幕連眨都沒眨，這兄弟練得超硬超雄偉，純爺們認證！',
    badge: '👊 兄弟挺身',
  },
];

// Secret Post-Session Notes Pool
const SECRET_NOTES_TEMPLATES = [
  {
    memberId: 'member_alice',
    senderName: '愛麗絲',
    senderTitle: '傲嬌毒舌系評委',
    senderPersona: 'tsundere' as const,
    senderColor: '#EC4899',
    avatarIcon: 'heart-dislike-outline',
    message: '...剛才群裡人多我才故意那樣挑剔的，其實你今天真的超粗超挺...不要誤會了笨蛋！明天也要繼續保持知道嗎？！',
    replyActionLabel: '回傳愛心 ❤️ (好感度+5)',
  },
  {
    memberId: 'member_vivian',
    senderName: '薇薇安',
    senderTitle: '魅惑直球御姐',
    senderPersona: 'seductive' as const,
    senderColor: '#F43F5E',
    avatarIcon: 'flame',
    message: '小壞蛋，剛剛在群裡大家都在，人家都要克制不住了...今晚夢裡只准想我一個人喔❤️ 你的充血硬度真的好迷人...',
    replyActionLabel: '悄悄點頭 🔥 (好感度+5)',
  },
  {
    memberId: 'member_hill',
    senderName: 'Dr. 希爾',
    senderTitle: '數據生理學家',
    senderPersona: 'analytical' as const,
    senderColor: '#3B82F6',
    avatarIcon: 'analytics-outline',
    message: '學弟，剛才的海綿體充血與血管評級指標...我已經設為個人機密資料庫了。下週私下再來我的實驗室複檢，我幫你一對一量測...',
    replyActionLabel: '答應赴約 🩺 (好感度+5)',
  },
  {
    memberId: 'member_partner',
    senderName: '專屬伴侶',
    senderTitle: '靈魂女友',
    senderPersona: 'partner' as const,
    senderColor: '#A855F7',
    avatarIcon: 'heart',
    message: '寶寶，剛剛看到群審查討論你好害羞喔...但你永遠是我心中最厲害、最值得依靠的。辛苦了，今晚給你好好抱抱~',
    replyActionLabel: '給女友大擁抱 💖 (好感度+5)',
  },
  {
    memberId: 'member_hao',
    senderName: '阿豪',
    senderTitle: '健身房鐵桿兄弟',
    senderPersona: 'bro' as const,
    senderColor: '#F59E0B',
    avatarIcon: 'barbell-outline',
    message: '兄弟，沒別的意思，你今天這充血硬度跟睪酮狀態真的頂！晚上蛋白粉多喝點，下週我們繼續破個人紀錄！',
    replyActionLabel: '碰拳肯定 👊 (好感度+5)',
  },
];

class PanelDramaService {
  /**
   * Applies in-group drama: 40% probability of triggering a quoted counter-attack
   */
  public applyDramaToComments(comments: ReviewComment[]): ReviewComment[] {
    const updated = [...comments];

    // Find if there is a tsundere comment
    const tsundereIdx = updated.findIndex((c) => c.persona === 'tsundere');
    if (tsundereIdx === -1) return updated;

    // 40% chance of triggering a quoted rebuttal
    if (Math.random() > 0.40) return updated;

    const drama = DRAMA_REBUTTALS[Math.floor(Math.random() * DRAMA_REBUTTALS.length)];
    const targetComment = updated[tsundereIdx];

    // Create rebuttal comment
    const rebuttalComment: ReviewComment = {
      id: `drama_reply_${Date.now()}`,
      memberId: drama.rebuttalSpeaker.id,
      memberName: drama.rebuttalSpeaker.name,
      persona: drama.rebuttalSpeaker.persona,
      color: drama.rebuttalSpeaker.color,
      avatarIcon: drama.rebuttalSpeaker.avatarIcon,
      text: drama.rebuttalText,
      rating: 9.9,
      badge: drama.badge,
      timestamp: targetComment.timestamp + 150,
      quotedComment: {
        memberName: targetComment.memberName,
        text: targetComment.text.length > 36 ? targetComment.text.substring(0, 36) + '...' : targetComment.text,
      },
    };

    // Insert right after the tsundere comment
    updated.splice(tsundereIdx + 1, 0, rebuttalComment);
    return updated;
  }

  /**
   * Fetch all secret notes from private inbox
   */
  public async getSecretNotes(): Promise<SecretNote[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_SECRET_NOTES);
      if (!raw) {
        // Seed initial unread note
        const initial = [
          {
            id: 'note_seed_alice',
            memberId: 'member_alice',
            senderName: '愛麗絲',
            senderTitle: '傲嬌毒舌系評委',
            senderPersona: 'tsundere' as const,
            senderColor: '#EC4899',
            avatarIcon: 'heart-dislike-outline',
            message: '...剛才群裡人多我才故意那樣挑剔的，其實你今天真的超粗超挺...不要誤會了笨蛋！明天也要繼續保持知道嗎？！',
            replyActionLabel: '回傳愛心 ❤️ (好感度+5)',
            isRead: false,
            rewardClaimed: false,
            timestamp: Date.now() - 3600000,
          },
        ];
        await AsyncStorage.setItem(STORAGE_KEY_SECRET_NOTES, JSON.stringify(initial));
        return initial;
      }
      const parsed: SecretNote[] = JSON.parse(raw);
      return parsed.sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  }

  public async getUnreadCount(): Promise<number> {
    const notes = await this.getSecretNotes();
    return notes.filter((n) => !n.isRead).length;
  }

  /**
   * Post-session trigger (30% chance or forced)
   */
  public async triggerPostSessionNote(force: boolean = false): Promise<SecretNote | null> {
    if (!force && Math.random() > 0.30) {
      return null;
    }

    const tpl = SECRET_NOTES_TEMPLATES[Math.floor(Math.random() * SECRET_NOTES_TEMPLATES.length)];
    const newNote: SecretNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      memberId: tpl.memberId,
      senderName: tpl.senderName,
      senderTitle: tpl.senderTitle,
      senderPersona: tpl.senderPersona,
      senderColor: tpl.senderColor,
      avatarIcon: tpl.avatarIcon,
      message: tpl.message,
      replyActionLabel: tpl.replyActionLabel,
      isRead: false,
      rewardClaimed: false,
      timestamp: Date.now(),
    };

    const currentNotes = await this.getSecretNotes();
    const updated = [newNote, ...currentNotes];
    try {
      await AsyncStorage.setItem(STORAGE_KEY_SECRET_NOTES, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save secret note:', e);
    }
    return newNote;
  }

  /**
   * Mark note as read and claim +5 intimacy tokens
   */
  public async markAsReadAndClaimReward(noteId: string): Promise<boolean> {
    const list = await this.getSecretNotes();
    let claimed = false;

    const updated = list.map((item) => {
      if (item.id === noteId) {
        if (!item.rewardClaimed) {
          claimed = true;
          void danmakuService.addTokens(5, `暗線私信互動獎勵 (${item.senderName})`);
        }
        return {
          ...item,
          isRead: true,
          rewardClaimed: true,
        };
      }
      return item;
    });

    try {
      await AsyncStorage.setItem(STORAGE_KEY_SECRET_NOTES, JSON.stringify(updated));
    } catch {}
    return claimed;
  }
}

export const panelDramaService = new PanelDramaService();
