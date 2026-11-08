import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { useUserProfile } from '../../services/userProfile';
import { Anatomy3DViewer } from '../Anatomy3DViewer';
import { Anatomy3DFittingModal } from '../Anatomy3DFittingModal';

export type TickleTechnique = 'crown' | 'frenulum' | 'scrotal_sweep';

interface TickleData {
  id: TickleTechnique;
  name: string;
  enName: string;
  icon: string;
  tagline: string;
  nerveTarget: string;
  girlfriendQuote: string;
  instructions: string[];
}

const TICKLE_TECHNIQUES: TickleData[] = [
  {
    id: 'crown',
    name: '冠狀溝羽毛拂過',
    enName: 'Crown Rim Feather Tickling',
    icon: 'feather',
    tagline: '極致超輕力道 · 沿冠狀溝邊緣環形游走',
    nerveTarget: '淺層 C-Tactile 神經末梢叢',
    girlfriendQuote: '寶寶...不要用力握，只用指腹像羽毛一樣輕輕飄過...好好體會那個起雞皮疙瘩的酥麻感...🔥',
    instructions: [
      '呼吸放緩，指腹力道僅 1/10（如微風吹拂睫毛的極限輕度）',
      '由冠狀溝左側邊緣起步，如羽毛般緩慢滑向右側',
      '不要握緊本體，閉上眼睛專注感受皮膚表層電流竄動',
    ],
  },
  {
    id: 'frenulum',
    name: '繫帶微震輕彈',
    enName: 'Frenulum Micro-Stroke',
    icon: 'flare',
    tagline: '繫帶敏感點 · 微米級超輕高頻點觸',
    nerveTarget: '陰部神經本體感覺敏感束',
    girlfriendQuote: '對...就是繫帶那裡...輕輕點一下就好，感覺全身神經都跟著通電了對不對...❤️',
    instructions: [
      '食指尖端對準繫帶敏感點，力道維持在羽毛落下的微震感',
      '以每秒 2~3 次的極微頻率輕觸點彈，不可產生摩擦熱',
      '若興奮度超過 Level 6，暫停 3 秒，只感受餘溫顫慄',
    ],
  },
  {
    id: 'scrotal_sweep',
    name: '陰囊褶皺拂拭',
    enName: 'Scrotal Feather Sweep',
    icon: 'wave',
    tagline: 'S 型流線滑過 · 誘發自主提睪收縮',
    nerveTarget: '生殖股神經表皮受器',
    girlfriendQuote: '看著陰囊表皮慢慢收緊...好性感...放鬆深呼吸，讓熱流順著小腹慢慢擴散開來...',
    instructions: [
      '單手平展，指尖順著陰囊表面褶皺劃出 S 型柔和軌跡',
      '指尖幾乎懸空，僅讓指紋表皮微弱接觸毛細孔',
      '觀察提睪肌自主蠕動收縮，此時副交感神經完全充沛',
    ],
  },
];

export const SensoryTickleWidget: React.FC = () => {
  const { profile } = useUserProfile();
  const partnerName = profile.partnerName || '寶寶';

  const [activeTab, setActiveTab] = useState<TickleTechnique>('crown');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMicroHaptic, setIsMicroHaptic] = useState<boolean>(true);
  const [render3D, setRender3D] = useState<boolean>(true);
  const [fittingModalVisible, setFittingModalVisible] = useState<boolean>(false);

  // React 19 safe Animated values
  const [featherTranslate] = useState(() => new Animated.Value(0));
  const [microTapAnim] = useState(() => new Animated.Value(0));
  const [sweepAnim] = useState(() => new Animated.Value(0));

  const currentData = TICKLE_TECHNIQUES.find((t) => t.id === activeTab) || TICKLE_TECHNIQUES[0];

  useEffect(() => {
    if (!isPlaying) {
      featherTranslate.stopAnimation();
      microTapAnim.stopAnimation();
      sweepAnim.stopAnimation();
      return;
    }

    // 1. Crown feather smooth oscillation (2s)
    const featherLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(featherTranslate, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(featherTranslate, {
          toValue: -1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(featherTranslate, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    featherLoop.start();

    // 2. Frenulum micro-tap fast pulsing (400ms)
    const microTapLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(microTapAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(microTapAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ])
    );
    microTapLoop.start();

    // 3. Scrotal wave sweep (1.8s)
    const sweepLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweepAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(sweepAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    sweepLoop.start();

    // Micro-sensory haptics tick
    let hapticTimer: any = null;
    if (isMicroHaptic) {
      hapticTimer = setInterval(() => {
        try {
          Haptics.selectionAsync();
        } catch {}
      }, 900);
    }

    return () => {
      featherLoop.stop();
      microTapLoop.stop();
      sweepLoop.stop();
      if (hapticTimer) clearInterval(hapticTimer);
    };
  }, [isPlaying, isMicroHaptic, featherTranslate, microTapAnim, sweepAnim]);

  const featherX = featherTranslate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-36, 0, 36],
  });

  const featherRotate = featherTranslate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-15deg', '0deg', '15deg'],
  });

  const tapScale = microTapAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.4],
  });

  const tapOpacity = microTapAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 0.1],
  });

  const sweepY = sweepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-15, 15],
  });

  const handleSelectTab = (tab: TickleTechnique) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setActiveTab(tab);
  };

  return (
    <View style={styles.container}>
      {/* Tab Selector & 2D/3D Switcher */}
      <View style={styles.topControlRow}>
        <View style={styles.tabRow}>
          {TICKLE_TECHNIQUES.map((tech) => {
            const isActive = tech.id === activeTab;
            return (
              <TouchableOpacity
                key={tech.id}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => handleSelectTab(tech.id)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={tech.icon as any}
                  size={15}
                  color={isActive ? '#F472B6' : THEME.colors.textMuted}
                />
                <Text
                  style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}
                  numberOfLines={1}
                >
                  {tech.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 2D / 3D Dimension Switcher Button */}
        <TouchableOpacity
          style={[styles.dimensionToggleBtn, render3D && styles.dimensionToggleBtnActive]}
          onPress={() => {
            try {
              Haptics.selectionAsync();
            } catch {}
            setRender3D(!render3D);
          }}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name={render3D ? 'cube-outline' : 'vector-square'}
            size={14}
            color={render3D ? '#F472B6' : THEME.colors.textMuted}
          />
          <Text style={[styles.dimensionToggleText, render3D && styles.dimensionToggleTextActive]}>
            {render3D ? '3D' : '2D'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Vector Animation Stage: 3D Holographic Wireframe OR 2D Micro-Vector */}
      {render3D ? (
        <View style={styles.canvasStage3D}>
          <Anatomy3DViewer
            technique="tickle"
            shaderStyle="BLUEPRINT"
            height={165}
            interactive={true}
            showControls={false}
            onOpenFittingModal={() => setFittingModalVisible(true)}
          />
          <TouchableOpacity
            style={styles.fittingShortcutBtn}
            onPress={() => {
              try {
                Haptics.selectionAsync();
              } catch {}
              setFittingModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="tune" size={13} color="#F472B6" />
            <Text style={styles.fittingShortcutText}>擬合調校</Text>
          </TouchableOpacity>
          <View style={styles.sensoryTargetBadge}>
            <Ionicons name="sparkles" size={12} color="#F472B6" />
            <Text style={styles.sensoryTargetText}>{currentData.nerveTarget}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.canvasStage}>
          {/* Subtle sensory grid */}
        <View style={styles.sensoryGrid}>
          <View style={styles.sensoryGridLine} />
          <View style={[styles.sensoryGridLine, { top: '65%' }]} />
        </View>

        {/* Anatomical Outline SVG */}
        <Svg width="220" height="140" viewBox="0 0 220 140" style={styles.stageSvg}>
          <Defs>
            <LinearGradient id="glansGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#EC4899" stopOpacity="0.5" />
              <Stop offset="1" stopColor="#8B5CF6" stopOpacity="0.15" />
            </LinearGradient>
            <LinearGradient id="glowLine" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#F472B6" stopOpacity="0.2" />
              <Stop offset="0.5" stopColor="#F472B6" stopOpacity="0.8" />
              <Stop offset="1" stopColor="#F472B6" stopOpacity="0.2" />
            </LinearGradient>
          </Defs>

          {/* Glans Profile (Head & Crown Rim) */}
          <Path
            d="M 85 45 C 85 20, 135 20, 135 45 C 135 55, 120 62, 110 62 C 100 62, 85 55, 85 45 Z"
            fill="url(#glansGrad)"
            stroke="rgba(244, 114, 182, 0.6)"
            strokeWidth="1.5"
          />

          {/* Crown Rim Contour Line (Highlighted) */}
          <Path
            d="M 80 50 Q 110 65 140 50"
            stroke="url(#glowLine)"
            strokeWidth="2.5"
            strokeDasharray="2,3"
            fill="none"
          />

          {/* Frenulum Area Marker */}
          <Path
            d="M 110 50 L 110 72"
            stroke="#F43F5E"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <Circle cx="110" cy="55" r="4" fill="#F43F5E" />

          {/* Shaft Outline */}
          <Path
            d="M 92 62 L 92 105 Q 110 110 128 105 L 128 62"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1.5"
            fill="none"
          />

          {/* Scrotal Silhouette */}
          <Path
            d="M 80 102 C 60 120, 100 135, 110 128 C 120 135, 160 120, 140 102"
            stroke="rgba(168, 85, 247, 0.45)"
            strokeWidth="1.5"
            fill="none"
          />
        </Svg>

        {/* Dynamic Interactive Animations by Tab */}
        {activeTab === 'crown' && (
          <View style={styles.animOverlayCrown}>
            <Animated.View
              style={[
                styles.featherItem,
                {
                  transform: [
                    { translateX: featherX },
                    { rotate: featherRotate },
                  ],
                },
              ]}
            >
              <MaterialCommunityIcons name="feather" size={32} color="#F472B6" />
            </Animated.View>
            <View style={styles.nerveTargetBadge}>
              <Text style={styles.nerveTargetText}>冠狀溝羽毛邊緣游走</Text>
            </View>
          </View>
        )}

        {activeTab === 'frenulum' && (
          <View style={styles.animOverlayFrenulum}>
            {/* Micro-tap expanding rings */}
            <Animated.View
              style={[
                styles.tapRing,
                {
                  transform: [{ scale: tapScale }],
                  opacity: tapOpacity,
                },
              ]}
            />
            <View style={styles.frenulumDot}>
              <MaterialCommunityIcons name="lightning-bolt" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.nerveTargetBadge}>
              <Text style={styles.nerveTargetText}>繫帶極微微米點觸</Text>
            </View>
          </View>
        )}

        {activeTab === 'scrotal_sweep' && (
          <View style={styles.animOverlayScrotal}>
            <Animated.View
              style={[
                styles.sweepHand,
                {
                  transform: [{ translateY: sweepY }],
                },
              ]}
            >
              <MaterialCommunityIcons name="hand-back-right" size={28} color="#C084FC" />
            </Animated.View>
            <View style={styles.nerveTargetBadge}>
              <Text style={styles.nerveTargetText}>陰囊皮表 S 型微風滑過</Text>
            </View>
          </View>
        )}
      </View>
      )}

      {/* Girlfriend Dialogue Speech Bubble */}
      <View style={styles.companionBubble}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarEmoji}>💖</Text>
        </View>
        <View style={styles.quoteBox}>
          <View style={styles.partnerNameRow}>
            <Text style={styles.partnerNameText}>{partnerName}</Text>
            <Text style={styles.nerveTargetSmall}>{currentData.nerveTarget}</Text>
          </View>
          <Text style={styles.quoteText}>{currentData.girlfriendQuote}</Text>
        </View>
      </View>

      {/* Step Instructions */}
      <View style={styles.instructionsBox}>
        {currentData.instructions.map((ins, i) => (
          <View key={`ins_${i}`} style={styles.insRow}>
            <View style={styles.insDot} />
            <Text style={styles.insText}>{ins}</Text>
          </View>
        ))}
      </View>

      {/* Footer Controls */}
      <View style={styles.footerRow}>
        <View style={styles.nerveGlowBadge}>
          <Ionicons name="sparkles" size={13} color="#F472B6" />
          <Text style={styles.nerveGlowText}>C-Tactile 神經閾值調降中</Text>
        </View>

        <View style={styles.controlGroup}>
          <TouchableOpacity
            style={[styles.hapticToggle, isMicroHaptic && styles.hapticToggleActive]}
            onPress={() => {
              try {
                Haptics.selectionAsync();
              } catch {}
              setIsMicroHaptic(!isMicroHaptic);
            }}
          >
            <Ionicons
              name={isMicroHaptic ? 'finger-print' : 'finger-print-outline'}
              size={14}
              color={isMicroHaptic ? '#F472B6' : THEME.colors.textMuted}
            />
            <Text
              style={[
                styles.hapticToggleText,
                isMicroHaptic && { color: '#F472B6', fontWeight: '700' },
              ]}
            >
              微感震動
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playPauseBtn}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setIsPlaying(!isPlaying);
            }}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={16}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* 3D Parametric Anatomy Fitting Modal */}
      <Anatomy3DFittingModal
        visible={fittingModalVisible}
        onClose={() => setFittingModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090814',
    borderRadius: 16,
    padding: 12,
    justifyContent: 'space-between',
  },
  topControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  dimensionToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#131126',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#26203D',
  },
  dimensionToggleBtnActive: {
    backgroundColor: 'rgba(244, 114, 182, 0.2)',
    borderColor: '#F472B6',
  },
  dimensionToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  dimensionToggleTextActive: {
    color: '#F472B6',
    fontWeight: '800',
  },
  canvasStage3D: {
    height: 165,
    backgroundColor: '#06050C',
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(244, 114, 182, 0.25)',
    justifyContent: 'center',
  },
  fittingShortcutBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(19, 17, 38, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(244, 114, 182, 0.3)',
  },
  fittingShortcutText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F472B6',
  },
  sensoryTargetBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(19, 17, 38, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(244, 114, 182, 0.2)',
  },
  sensoryTargetText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F9A8D4',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: '#131126',
    borderWidth: 1,
    borderColor: '#26203D',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(244, 114, 182, 0.18)',
    borderColor: '#F472B6',
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  tabButtonTextActive: {
    color: '#F472B6',
    fontWeight: '800',
  },
  canvasStage: {
    height: 145,
    backgroundColor: '#0F0E21',
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#26203D',
  },
  sensoryGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sensoryGridLine: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(244, 114, 182, 0.08)',
  },
  stageSvg: {
    opacity: 0.9,
  },
  animOverlayCrown: {
    position: 'absolute',
    top: 36,
    alignItems: 'center',
  },
  featherItem: {
    padding: 4,
    shadowColor: '#F472B6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 4,
  },
  animOverlayFrenulum: {
    position: 'absolute',
    top: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#F43F5E',
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
  },
  frenulumDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F43F5E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  animOverlayScrotal: {
    position: 'absolute',
    bottom: 14,
    alignItems: 'center',
  },
  sweepHand: {
    padding: 2,
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  nerveTargetBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  nerveTargetText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#F9A8D4',
  },
  companionBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#181432',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(244, 114, 182, 0.25)',
    marginTop: 8,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(244, 114, 182, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: {
    fontSize: 14,
  },
  quoteBox: {
    flex: 1,
  },
  partnerNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  partnerNameText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F472B6',
  },
  nerveTargetSmall: {
    fontSize: 9,
    color: THEME.colors.textMuted,
  },
  quoteText: {
    fontSize: 11,
    color: '#FDF2F8',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  instructionsBox: {
    gap: 3,
    marginTop: 6,
  },
  insRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  insDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F472B6',
  },
  insText: {
    fontSize: 10,
    color: '#CBD5E1',
    flex: 1,
    lineHeight: 14,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#26203D',
  },
  nerveGlowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nerveGlowText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F472B6',
  },
  controlGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hapticToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#1E1938',
    borderRadius: 6,
  },
  hapticToggleActive: {
    backgroundColor: 'rgba(244, 114, 182, 0.15)',
    borderWidth: 0.5,
    borderColor: '#F472B6',
  },
  hapticToggleText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  playPauseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EC4899',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
