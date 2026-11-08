import { TimeMode, EnvironmentSafety, QuestDefinition } from '../types';

export const QUEST_DATABASE: QuestDefinition[] = [
  {
    id: 'day_silent_stealth',
    title: '無聲潛伏挑戰',
    subtitle: '環境分貝極限壓抑・在危險察覺邊緣靜默完成',
    timeMode: 'DAY',
    envSafety: 'SOMEONE_AROUND',
    durationSeconds: 180, // 3 分鐘
    description:
      '日間周遭有人環境下，以極限靜音模式進行。全程壓抑呼吸與摩擦聲響，調動全身警覺感官。',
    rules: [
      '全程不可發出劇烈喘息或摩擦聲響 (分貝控制在環境背景音以下)',
      '保持衣著便於 0.5 秒內復原偽裝',
      '於第 2 分鐘前達成至少 1 次急停冰凍 (EDGE_HOLD)',
    ],
    badgeIcon: 'volume-mute',
    badgeName: '暗影潛伏者',
    dangerLevel: 'HIGH',
  },
  {
    id: 'day_forbidden_cruise',
    title: '禁忌巡航挑戰',
    subtitle: '卸下防備靠近房門・刺激心跳巡航體驗',
    timeMode: 'DAY',
    envSafety: 'SOLO',
    durationSeconds: 240, // 4 分鐘
    description:
      '確認獨處狀態下的心理衝擊試煉。將房門保留一指隙縫，在門口死角限時打手槍並即時回報。',
    rules: [
      '不穿外衣，靠近房門 1 公尺範圍內展開',
      '持續側耳監聽走道與外界動靜',
      '限時內完成 2 輪階梯控射後安全返回',
    ],
    badgeIcon: 'door-open',
    badgeName: '走廊冒險家',
    dangerLevel: 'EXTREME',
  },
  {
    id: 'night_dead_zone',
    title: '極限死角挑戰',
    subtitle: '關閉主光源・尋匿房間深層無視線死角',
    timeMode: 'NIGHT',
    envSafety: 'SOMEONE_AROUND',
    durationSeconds: 300, // 5 分鐘
    description:
      '深夜環境下，隔壁或同住者可能尚未入睡。尋覓室內最深處的絕對視覺死角，進行純感官摸索。',
    rules: [
      '全面關閉室內照明，僅靠螢幕最低亮度冷光視物',
      '身體後背緊貼牆角或家具陰影處',
      '配合 4-4 深呼吸，在寂靜中體會神經擴張',
    ],
    badgeIcon: 'shield-half-full',
    badgeName: '死角掌控者',
    dangerLevel: 'MEDIUM',
  },
  {
    id: 'night_curtain_shadow',
    title: '窗簾暗光挑戰',
    subtitle: '微隙夜光投影・窗前陰影極限張力試煉',
    timeMode: 'NIGHT',
    envSafety: 'SOLO',
    durationSeconds: 240, // 4 分鐘
    description:
      '拉開窗簾約 3~5 公分細微縫隙，借室外路燈或月光灑入陰影處。在明暗交界的刺激中感受骨盆底張力。',
    rules: [
      '微啟窗簾細縫，置身於投射的光斑與陰影交界',
      '目光保持警戒室外，感受隱秘與微暴露的雙重快感',
      '在衝刺階段前強制進行 30 秒冰凍冷卻',
    ],
    badgeIcon: 'weather-night',
    badgeName: '夜幕引渡人',
    dangerLevel: 'HIGH',
  },
];

export class ScenarioQuestEngine {
  /**
   * 根據本地系統時間 (06:00 - 22:00 為日間，其餘為夜間)
   */
  public static getCurrentTimeMode(date: Date = new Date()): TimeMode {
    const hours = date.getHours();
    if (hours >= 6 && hours < 22) {
      return 'DAY';
    }
    return 'NIGHT';
  }

  /**
   * 取得環境前置確認題目卡
   */
  public static getPreQuestQuestion(timeMode: TimeMode): {
    title: string;
    subtitle: string;
    optionSomeone: string;
    optionSolo: string;
  } {
    if (timeMode === 'DAY') {
      return {
        title: '確認環境：你身邊現在是否有人？',
        subtitle: '日間模式 (06:00 - 22:00) 已啟動，請回報周遭人員狀況',
        optionSomeone: '有人在附近 / 隨時可能有人',
        optionSolo: '目前獨處 / 絕對無人打擾',
      };
    }
    return {
      title: '深夜確認：你覺得你身邊還會有人嗎？',
      subtitle: '夜間模式 (22:00 - 06:00) 已啟動，寂靜黑夜中的心跳試煉',
      optionSomeone: '好像有人沒睡 / 隔壁有人',
      optionSolo: '萬籟俱寂 / 絕無他人',
    };
  }

  /**
   * 依據時段與環境安全回報匹配專屬挑戰
   */
  public static matchQuest(
    timeMode: TimeMode,
    envSafety: EnvironmentSafety
  ): QuestDefinition {
    const matched = QUEST_DATABASE.find(
      (q) => q.timeMode === timeMode && q.envSafety === envSafety
    );
    if (matched) return matched;
    // 預設 fallback
    return timeMode === 'DAY' ? QUEST_DATABASE[0] : QUEST_DATABASE[3];
  }
}
