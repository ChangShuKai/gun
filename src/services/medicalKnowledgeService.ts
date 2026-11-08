import { MedicalArticle, MedicalCategory, DoctorTip, DoctorTipContext } from '../types';

export const MEDICAL_ARTICLES: MedicalArticle[] = [
  // Category 1: 海綿體解剖學與生長迷思 (ANATOMY_GROWTH)
  {
    id: 'med_tunica_albuginea',
    category: 'ANATOMY_GROWTH',
    categoryLabel: '海綿體解剖學',
    title: '白膜（Tunica Albuginea）結構解析與非侵入牽引的安全邊界',
    subtitle: '解剖學雙層膠原纖維結構與彈性極限',
    icon: 'dna',
    badge: 'JSM 臨床解剖文獻',
    readTimeMin: 4,
    summary: '白膜由緻密富含彈性蛋白與 I/III 型膠原纖維之內外雙層組成，是維持勃起硬度與承受內部液壓的基石。非侵入牽引的本質是刺激微纖維重塑，而非強行撕裂。',
    bulletPoints: [
      '外層為縱向纖維，內層為環向纖維，耐壓極限可達 1500 mmHg。',
      '過度追求撕裂性牽拉只會導致纖維微出血與結締組織硬化（Peyronie 病斑塊），適得其反。',
      '科學牽引原則：無痛微繃緊感（Tension < 300g）、單次不超過 5~10 分鐘。',
    ],
    fullContent:
      '白膜（Tunica Albuginea）包覆於陰莖海綿體外部，其內部海綿竇腔在充血時受阻抗壓力可升至 100~200 mmHg。若盲目採用大重量機械拉伸器，極易引起膠原纖維微撕裂，誘發成纖維細胞異常增生，導致白膜局部硬化斑塊甚至彎曲畸形。\n\n在安全牽引中，必須保持組織溫暖放鬆，利用低張力、持續性的微應力引導細胞外基質微重組，切不可追求任何刺痛感。',
    doctorTakeaway: '牽引力量只要維持在「微繃緊、完全無痛」即達到生長刺激閥值，痛感就是損傷的警報！',
  },
  {
    id: 'med_shower_vs_grower',
    category: 'ANATOMY_GROWTH',
    categoryLabel: '海綿體解剖學',
    title: '疲軟與充血尺寸的「伸縮比（Shower vs. Grower）」生理原理',
    subtitle: '交感神經張力與平滑肌竇狀隙彈性係數',
    icon: 'resize-outline',
    badge: '歐洲泌尿學會 EAU 指引',
    readTimeMin: 3,
    summary: '醫學研究指出，男性可分為「充血膨脹型 (Grower)」與「常態維持型 (Shower)」，兩者在完全勃起後的長度並無顯著差異，主要差異在於平時交感神經平滑肌張力。',
    bulletPoints: [
      'Grower 疲軟時平滑肌收縮率高，充血擴張率可高達 150%~200%。',
      '低溫、疲勞、焦慮會激發交感神經亢奮，導致 Grower 疲軟尺寸防禦性回縮 -10%~-20%。',
      '平時疲軟尺寸完全不代表真實能力，無須因此產生主觀尺寸焦慮。',
    ],
    fullContent:
      '陰莖平滑肌小樑受自主神經嚴密調控。在靜止狀態下，去甲腎上腺素與內皮素使平滑肌保持輕度肌張力收縮。對於神經反射敏銳的個體（Grower），遇到氣溫驟降或心理緊繃時，組織會產生顯著的防禦性內縮以保護血液核心溫度。\n\n當進入副交感神經放鬆狀態，一氧化氮（NO）介導 cGMP 使平滑肌完全鬆弛，竇狀隙瞬間灌滿動脈血，使體積呈數倍展開。',
    doctorTakeaway: '不必用疲軟時的短暫縮小自我否定，那只是交感神經高效率的自我保護機制。',
  },
  {
    id: 'med_smooth_muscle_no',
    category: 'ANATOMY_GROWTH',
    categoryLabel: '海綿體解剖學',
    title: '海綿體竇狀隙平滑肌放鬆與一氧化氮（NO）生化途徑',
    subtitle: '從神經信號到動脈阻抗舒張的生化瀑布',
    icon: 'flask-outline',
    badge: '諾貝爾生理醫學獎文獻',
    readTimeMin: 4,
    summary: '充血硬度的核心在於血管內皮細胞釋放的 NO，藉由活化鳥苷酸環化酶使 cGMP 激增，促使細胞內鈣離子流出，引起平滑肌深層舒張。',
    bulletPoints: [
      '充足深度睡眠是內皮型一氧化氮合成酶 (eNOS) 自我修復的關鍵。',
      '高糖高脂與吸菸會氧化損耗 NO 儲備，降低硬度維持時間。',
      '補充天然精胺酸 (L-Arginine) 與有氧運動能顯著強化血管內皮彈性。',
    ],
    fullContent:
      '硬度不足或中途疲軟往往不是海綿體結構受損，而是血管內皮微環境發生了氧化壓力。當副交感神經脈衝傳導至神經末梢時，合成的 NO 必須迅速穿透至鄰近海綿竇平滑肌。若微血管受損或內皮功能不良，NO 產能不足將直接導致竇隙無法充盈至足夠靜脈閉合壓。',
    doctorTakeaway: '夜間 11 點前的深度睡眠與規律心肺訓練，是保養一氧化氮系統最高性價比的天然處方。',
  },

  // Category 2: 控射神經學（Pelvic Neuropathy）
  {
    id: 'med_autonomic_reflex_loop',
    category: 'PELVIC_NEUROPATHY',
    categoryLabel: '控射神經學',
    title: '交感與副交感神經中樞切換與射精反射弧（Ejaculatory Reflex Loop）',
    subtitle: '自主神經天平：勃起靠副交感，射精歸交感',
    icon: 'pulse-outline',
    badge: '性醫學神經學專著',
    readTimeMin: 5,
    summary: '男性性反應由兩大神經系統接力主導：副交感神經主導勃起與充血維持（休整模式），交感神經主導高潮閥門與射精推進（戰鬥模式）。掌握兩者的天平是控時關鍵。',
    bulletPoints: [
      '焦慮、心率飆升 (>120 BPM) 會過早喚醒交感神經，觸發無可逆轉之射精反射。',
      '慢節奏腹式深呼吸能刺激迷走神經，強行拉回副交感放鬆模式。',
      '射精不可逆點（Point of No Return）通常在高度交感興奮持續 10~15 秒後不可逆觸發。',
    ],
    fullContent:
      '射精反射弧的中心位於脊髓 S2-S4 與 T10-L2 節段。當外生殖器背神經輸入的感覺總合超過脊髓反射閾值時，交感神經中樞發出指令，導致輸精管、前列腺平滑肌痙攣性收縮進入精液發射期（Emission）。\n\n藉由節奏訓練（如 Edge 急停），大腦皮層逐步建立抑制神經元突觸，使閾值耐受上限上移，從而大幅延長維持在興奮平台期（Plateau Phase）的時長。',
    doctorTakeaway: '心跳急促即是交感神經奪權的信號，放慢呼吸與節奏即可重奪神經主導權。',
  },
  {
    id: 'med_death_grip_syndrome',
    category: 'PELVIC_NEUROPATHY',
    categoryLabel: '控射神經學',
    title: '過度用力握持（Death Grip）導致神經鈍化與 C-Tactile 神經喚醒',
    subtitle: '打破機械化高壓依賴，重塑微神經敏感度',
    icon: 'hand-left-outline',
    badge: '臨床性心理學研究',
    readTimeMin: 4,
    summary: '長期習慣於緊握、快速、高壓的手法，會使海綿體背神經機械受體閾值嚴重鈍化，導致面對伴侶溫和陰道時無法達到高潮（遲射 / 不射精症）。',
    bulletPoints: [
      '人類陰道平均壓力僅為手握強度的 1/5~1/10。',
      '過高握力會壓迫冠狀溝微神經纖維，使帕西尼氏小體（Pacinian）對低頻撫摸失去感知。',
      '羽毛輕撫法能活化慢速傳導的 C-Tactile 神經，重新校準中樞神經敏銳度。',
    ],
    fullContent:
      '「死亡緊握症候群 (Death Grip Syndrome)」是現代自慰常見的神經適應偏差。手部能施加高達數十公斤的局部握壓，這在真實伴侶互動中是不可能存在的。神經突觸在長期超強刺激下會下調受體密度。\n\n改善處方包括：徹底戒除乾澀高速緊握，採用大量水性潤滑液，並在訓練中刻意進行 15 分鐘以上的極輕柔微摩擦（Feather Tickle），重新喚起背神經豐富的溫柔觸覺。',
    doctorTakeaway: '學會用最輕的力道感受刺激，真實伴侶互動時才能享受極致的包裹與包覆感。',
  },
  {
    id: 'med_pc_muscle_biomechanics',
    category: 'PELVIC_NEUROPATHY',
    categoryLabel: '控射神經學',
    title: 'PC 肌（恥骨尾骨肌）收縮對海綿體內壓的力學調控',
    subtitle: '提肛肌吊床與球海綿體肌的雙重泵血效應',
    icon: 'body-outline',
    badge: '骨盆底物理治療指引',
    readTimeMin: 4,
    summary: '骨盆底肌群（特別是恥骨尾骨肌 PC Muscle 與球海綿體肌 Bulbospongiosus）不僅能像水龍頭閥門般壓迫背深靜脈鎖住血液，更是控射的最終機械煞車。',
    bulletPoints: [
      '強健的 PC 肌在收縮時能使海綿體內壓瞬間上升 50~100 mmHg，產生硬度跳躍。',
      '快縮訓練（1s）提升神經突觸放電敏捷度，深鎖訓練（6s）強化等長肌耐力。',
      '訓練時切忌憋氣或使用臀大肌、腹直肌代償，必須精準感受會陰中央微上抽。',
    ],
    fullContent:
      '骨盆底如同一個支撐下腹所有臟器的肌肉彈性吊床。當男性進行 Kegel 收縮時，球海綿體肌向內環形擠壓尿道球部海綿體，並阻斷背深靜脈回流通道，這就是為什麼收縮時會有顯著跳動感的解剖學原因。\n\n然而，過度痙攣緊繃的骨盆底肌反而會壓迫陰部神經導致盆腔慢性疼痛（CPPS）。因此，「深層放鬆與腹式吸氣」與「主動收縮」同等重要。',
    doctorTakeaway: '懂收也要懂放，訓練中放鬆期的腹式呼吸質量，決定了骨盆底血流暢通度。',
  },

  // Category 3: 日常保養與醫師避坑指南 (CARE_AND_WARNINGS)
  {
    id: 'med_testicular_temperature',
    category: 'CARE_AND_WARNINGS',
    categoryLabel: '日常保養避坑',
    title: '睪丸黃金溫度（34~35°C）與久坐、緊繃散熱不良對睪固酮之損害',
    subtitle: '陰囊散熱皺褶結構與精索靜脈回流機制',
    icon: 'thermometer-outline',
    badge: '世界衛生組織 WHO 男科學',
    readTimeMin: 3,
    summary: '陰囊之所以懸掛於體腔之外，是為了維持比人體核心體溫低 2~3°C 的最佳生理溫度（34~35°C）。溫度每上升 1°C，睪固酮合成酵素與生精細胞活性即顯著下滑。',
    bulletPoints: [
      '久坐 2 小時以上會使會陰部溫度升至 36.8°C，抑制萊迪希細胞 (Leydig Cell) 分泌睪固酮。',
      '避免穿著緊繃不透氣之厚重人造纖維內褲，優先選擇透氣莫代爾或立體囊袋剪裁。',
      '睡前溫水沖涼但避免高溫熱水直接久泡睪丸，保持自然下垂散熱。',
    ],
    fullContent:
      '提睪肌與陰囊肉膜平滑肌構成了極為靈敏的生物溫控系統。遇冷時收縮靠近身體保溫，遇熱時放鬆下垂擴大表面積散熱。現代人久坐辦公椅、長時間大腿夾緊，嚴重阻礙了陰囊周圍空氣對流，導致睪丸長期處於慢性微熱應激狀態。\n\n建議每坐 50 分鐘即起身活動 5 分鐘，放鬆鼠蹊部折痕，恢復正常精索靜脈對流。',
    doctorTakeaway: '讓睪丸保持自由、涼爽、通風，是維護雄性荷爾蒙分泌最簡單強大的日常習慣。',
  },
  {
    id: 'med_traction_safety_limits',
    category: 'CARE_AND_WARNINGS',
    categoryLabel: '日常保養避坑',
    title: '過度牽拉（Traction）的安全上限：防範白膜微撕裂與 Peyronie 氏斑塊纖維化',
    subtitle: '嚴禁暴力器械，遵守無痛原則與五分鐘安全防線',
    icon: 'shield-alert-outline',
    badge: '國際性醫學會 ISSM 警語',
    readTimeMin: 4,
    summary: '臨床上每年都有因網購未經認證的暴力牽引器、真空負壓過度而導致海綿體白膜破裂、神經麻痺或局部血腫的慘痛案例。科學延展嚴格禁止痛感！',
    bulletPoints: [
      '嚴禁追求任何針刺痛感、麻木感或皮膚蒼白發冷，這代表神經血管已受缺血性壓迫。',
      '徒手牽引力量不可超過握持筆桿之 2~3 倍，單次維持在無痛繃緊感即可。',
      '系統設有 5 分鐘（300 秒）強制保護阻斷，切勿繞過安全限制超時施加應力。',
    ],
    fullContent:
      '白膜的自我修復能力遠遜於骨骼肌。骨骼肌微撕裂後能超量恢復變粗，但白膜由少血管的緻密膠原構成，微損傷修復時容易生成無彈性的纖維化瘢痕組織。瘢痕一旦硬化，在後續勃起時該區域無法伸展，便會形成嚴重的彎曲畸形（佩羅尼氏病）及勃起功能障礙。\n\n安全原則：每一次練習都必須在完全無痛、微溫和的狀態下進行。',
    doctorTakeaway: '組織生長是循序漸進的生物訊號適應，任何追求「大力出奇蹟」的想法都會帶來永久器質損傷！',
  },
  {
    id: 'med_pelvic_circulation_habits',
    category: 'CARE_AND_WARNINGS',
    categoryLabel: '日常保養避坑',
    title: '骨盆底血液循環重塑：深蹲、有氧與深層放鬆之日常處方',
    subtitle: '從根本改善骨盆底動靜脈微循環與神經活力',
    icon: 'fitness-outline',
    badge: '運動醫學與男科臨床研究',
    readTimeMin: 3,
    summary: '優質的充血硬度本質上是強大的心血管系統在末梢的投影。結合每週 150 分鐘中等強度有氧運動與適度深蹲，可降低勃起功能障礙風險達 40% 以上。',
    bulletPoints: [
      '深蹲有助於鍛鍊臀大肌與骨盆內收肌群，促進髂內動脈微循環灌注。',
      '每日補充足夠水分（體重 x 35 ml），避免血液濃稠導致末梢微循環不良。',
      '睡前進行 3 分鐘髖關節開展（蝴蝶式伸展），消除久坐累積之腹股溝肌筋膜緊繃。',
    ],
    fullContent:
      '陰部內動脈（Internal Pudendal Artery）是供應生殖器最關鍵的血管分支。若骨盆底長期緊縮僵硬，髂腰肌與梨狀肌會壓迫周圍神經束。每日撥出 10 分鐘進行骨盆底被動伸展與髖關節放鬆，能顯著改善血液回流效率，預防盆底充血淤積。',
    doctorTakeaway: '把深蹲與慢跑當作日常最頂級的保養品，你的身體會用最真實的硬度給予回饋。',
  },
];

export const CONTEXTUAL_DOCTOR_TIPS: Record<DoctorTipContext, DoctorTip> = {
  stretching: {
    context: 'stretching',
    doctorName: 'Dr. 希爾',
    doctorTitle: '臨床泌尿科副主任',
    icon: 'shield-alert-outline',
    badge: '牽拉安全提醒',
    title: '牽引力量請維持在「微繃緊、完全無痛」',
    content:
      '牽拉的生物學本質是刺激組織膠原重組，切勿追求強烈痛感！痛感代表白膜微纖維正在承受撕裂應力，若產生刺痛或麻木感請立即放鬆並停止。',
    referenceArticleId: 'med_tunica_albuginea',
  },
  grooming: {
    context: 'grooming',
    doctorName: 'Dr. 希爾',
    doctorTitle: '臨床皮膚與泌尿衛教',
    icon: 'content-cut',
    badge: '除毛衛教常識',
    title: '刀具請務必順毛修剪並定期酒精消毒',
    content:
      '私密處皮膚薄嫩且微菌叢豐富。修剪時務必順著毛髮生長方向輕推，切忌緊貼皮膚逆向刮拔，以免造成毛囊炎、皮下倒生毛或微小擦傷感染。',
    referenceArticleId: 'med_testicular_temperature',
  },
  ehs_low: {
    context: 'ehs_low',
    doctorName: 'Dr. 希爾',
    doctorTitle: '男性性醫學專科',
    icon: 'pulse-outline',
    badge: '生理狀態叮嚀',
    title: '近期睡眠與壓力為影響夜間/晨間充血之首要因素',
    content:
      '若連續兩次 EHS 評級在 Level 1~2，請不必焦慮！人體自發充血極度受睡眠深淺（REM期）與皮質醇影響。建議今晚提早 1 小時就寢並補充足量溫水。',
    referenceArticleId: 'med_smooth_muscle_no',
  },
  kegel: {
    context: 'kegel',
    doctorName: 'Dr. 希爾',
    doctorTitle: '骨盆底物理復健專科',
    icon: 'lightning-bolt',
    badge: 'PC 肌收縮要訣',
    title: '提肛時保持自然腹式呼吸，切勿憋氣代償',
    content:
      '收縮骨盆底肌時，應想像中斷尿流的向上提抽感，腹部、臀大肌應保持放鬆。放鬆期（Relax）與收縮期同等重要，充分鬆弛才能促進骨盆腔靜脈血液重充盈。',
    referenceArticleId: 'med_pc_muscle_biomechanics',
  },
  arousal: {
    context: 'arousal',
    doctorName: 'Dr. 希爾',
    doctorTitle: '性神經醫學專科',
    icon: 'heart-pulse',
    badge: '控射神經天平',
    title: '心跳急促即是交感神經亢奮信號',
    content:
      '當性興奮等級接近臨界點時，強迫自己進行 4 秒吸氣、6 秒慢吐氣之深長腹式呼吸，能有效激活副交感神經，為射精閥門爭取寶貴的降溫緩衝。',
    referenceArticleId: 'med_autonomic_reflex_loop',
  },
};

class MedicalKnowledgeService {
  private static instance: MedicalKnowledgeService;

  public static getInstance(): MedicalKnowledgeService {
    if (!MedicalKnowledgeService.instance) {
      MedicalKnowledgeService.instance = new MedicalKnowledgeService();
    }
    return MedicalKnowledgeService.instance;
  }

  public getArticles(category?: MedicalCategory, query?: string): MedicalArticle[] {
    let list = MEDICAL_ARTICLES;

    if (category) {
      list = list.filter((a) => a.category === category);
    }

    if (query && query.trim().length > 0) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.subtitle.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.fullContent.toLowerCase().includes(q) ||
          a.doctorTakeaway.toLowerCase().includes(q)
      );
    }

    return list;
  }

  public getArticleById(id: string): MedicalArticle | undefined {
    return MEDICAL_ARTICLES.find((a) => a.id === id);
  }

  public getDoctorTip(context: DoctorTipContext): DoctorTip {
    return CONTEXTUAL_DOCTOR_TIPS[context];
  }
}

export const medicalKnowledgeService = MedicalKnowledgeService.getInstance();
