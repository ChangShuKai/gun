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
  Line,
} from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Anatomy3DViewer } from '../Anatomy3DViewer';
import { Anatomy3DFittingModal } from '../Anatomy3DFittingModal';

export type MassageTechnique = 'perineum' | 'root' | 'scrotal';

interface TechniqueData {
  id: MassageTechnique;
  name: string;
  enName: string;
  icon: string;
  tagline: string;
  benefit: string;
  steps: string[];
}

const TECHNIQUES: TechniqueData[] = [
  {
    id: 'perineum',
    name: '會陰深層揉壓',
    enName: 'Perineum Pressure',
    icon: 'circle-slice-8',
    tagline: '雙指緩慢畫圓下壓 · 釋放前列腺高壓',
    benefit: '放鬆骨盆底深層神經，消解射精管張力痙攣',
    steps: [
      '取坐姿或微屈膝躺臥，指腹定位陰囊與肛門正中之會陰點',
      '食指與中指併攏，以 3/10 溫柔力道緩慢畫圓下壓',
      '順時針 5 圈後逆時針 5 圈，配合 40 BPM 吐氣節奏完全放鬆',
    ],
  },
  {
    id: 'root',
    name: '根部韌帶撥動',
    enName: 'Root Ligament Release',
    icon: 'ray-start-arrow',
    tagline: '恥骨交接處向左右輕緩撥推',
    benefit: '舒緩懸韌帶緊繃，擴張海綿體充血動脈通道',
    steps: [
      '拇指輕置於本體根部與恥骨交接的韌帶錨點處',
      '緩緩向左橫向撥推 2 秒，感受韌帶微微彈動與微溫灌注',
      '換邊向右橫向輕撥，切忌粗暴下掐，維持勻速深層放鬆',
    ],
  },
  {
    id: 'scrotal',
    name: '提睪肌輕托緩解',
    enName: 'Scrotal Lift',
    icon: 'hand-heart-outline',
    tagline: '指腹自下而上溫和托捏提振',
    benefit: '緩解下腹緊繃感，調解溫度與精索靜脈回流',
    steps: [
      '四指併攏從陰囊底端溫和托起，感受提睪肌自然放鬆',
      '輕微向上托舉 1~2 公分，維持 3 秒後緩緩放下',
      '感覺全身骨盆底肌群沉靜下墜，徹底隔絕交感神經躁動',
    ],
  },
];

export const AnatomyMassageWidget: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MassageTechnique>('perineum');
  const [isVibrating, setIsVibrating] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [render3D, setRender3D] = useState<boolean>(true);
  const [fittingModalVisible, setFittingModalVisible] = useState<boolean>(false);

  // Animation values adhering to React 19 hook guidelines
  const [pulseAnim] = useState(() => new Animated.Value(0));
  const [rotateAnim] = useState(() => new Animated.Value(0));
  const [lateralAnim] = useState(() => new Animated.Value(0));

  const currentTechnique = TECHNIQUES.find((t) => t.id === activeTab) || TECHNIQUES[0];

  // 40 BPM breathing loop (1.5s per cycle: 750ms in, 750ms out)
  useEffect(() => {
    if (!isPlaying) {
      pulseAnim.stopAnimation();
      rotateAnim.stopAnimation();
      lateralAnim.stopAnimation();
      return;
    }

    // 1. Breathing pulse loop
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // 2. Continuous rotation for Perineum circle
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    );
    rotateLoop.start();

    // 3. Lateral shift loop for Root Release
    const lateralLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(lateralAnim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(lateralAnim, {
          toValue: -1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(lateralAnim, {
          toValue: 0,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    lateralLoop.start();

    // Low-frequency 40 BPM haptic sync
    let hapticTimer: any = null;
    if (isVibrating) {
      hapticTimer = setInterval(() => {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}
      }, 1500);
    }

    return () => {
      pulseLoop.stop();
      rotateLoop.stop();
      lateralLoop.stop();
      if (hapticTimer) clearInterval(hapticTimer);
    };
  }, [isPlaying, isVibrating, pulseAnim, rotateAnim, lateralAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const lateralTranslate = lateralAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-24, 0, 24],
  });

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.15],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.95],
  });

  const handleSelectTab = (tab: MassageTechnique) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setActiveTab(tab);
  };

  return (
    <View style={styles.container}>
      {/* Top Header & Technique Selector */}
      <View style={styles.topControlRow}>
        <View style={styles.tabRow}>
          {TECHNIQUES.map((tech) => {
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
                  size={16}
                  color={isActive ? '#60A5FA' : THEME.colors.textMuted}
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
            color={render3D ? '#60A5FA' : THEME.colors.textMuted}
          />
          <Text style={[styles.dimensionToggleText, render3D && styles.dimensionToggleTextActive]}>
            {render3D ? '3D' : '2D'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Canvas: 3D Anatomical Mesh OR 2D Medical Vector Demonstration */}
      {render3D ? (
        <View style={styles.canvasWrapper3D}>
          <Anatomy3DViewer
            technique="massage"
            shaderStyle="ANATOMICAL"
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
            <MaterialCommunityIcons name="tune" size={13} color="#93C5FD" />
            <Text style={styles.fittingShortcutText}>擬合調校</Text>
          </TouchableOpacity>
          <View style={styles.floatingBadge}>
            <MaterialCommunityIcons name="shield-check" size={13} color="#10B981" />
            <Text style={styles.floatingBadgeText}>{currentTechnique.benefit}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.canvasWrapper}>
          <View style={styles.gridOverlay}>
          {/* Subtle medical blueprint grid lines */}
          <View style={styles.gridHorizLine} />
          <View style={[styles.gridHorizLine, { top: '65%' }]} />
          <View style={styles.gridVertLine} />
        </View>

        {/* Vector Anatomical Background Illustration */}
        <Svg width="220" height="150" viewBox="0 0 220 150" style={styles.anatomySvg}>
          <Defs>
            <LinearGradient id="boneGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#3B82F6" stopOpacity="0.6" />
              <Stop offset="1" stopColor="#1D4ED8" stopOpacity="0.2" />
            </LinearGradient>
            <LinearGradient id="glowGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#10B981" stopOpacity="0.8" />
              <Stop offset="1" stopColor="#059669" stopOpacity="0.2" />
            </LinearGradient>
          </Defs>

          {/* Pelvic Pubic Arch Bone (Symmetric Vector Blueprint) */}
          <Path
            d="M 40 40 Q 110 85 180 40"
            stroke="url(#boneGrad)"
            strokeWidth="3.5"
            strokeDasharray="4,4"
            fill="none"
          />
          {/* Sacrum & Pelvic Floor Silhouette */}
          <Path
            d="M 70 30 Q 110 50 150 30"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="2"
            fill="none"
          />

          {/* Penis Root & Suspensory Ligament Base */}
          <Path
            d="M 95 62 L 95 110 Q 110 118 125 110 L 125 62 Z"
            stroke="rgba(96, 165, 250, 0.45)"
            strokeWidth="1.5"
            fill="rgba(59, 130, 246, 0.08)"
          />

          {/* Testicular Contour Sacks */}
          <Circle
            cx="85"
            cy="115"
            r="18"
            stroke="rgba(168, 85, 247, 0.4)"
            strokeWidth="1.5"
            fill="rgba(168, 85, 247, 0.06)"
          />
          <Circle
            cx="135"
            cy="115"
            r="18"
            stroke="rgba(168, 85, 247, 0.4)"
            strokeWidth="1.5"
            fill="rgba(168, 85, 247, 0.06)"
          />

          {/* Perineum Central Point Anchor */}
          <Circle
            cx="110"
            cy="135"
            r="5"
            fill="#10B981"
            stroke="#FFFFFF"
            strokeWidth="1"
          />

          {/* Coordinate Guide Markers */}
          <Line x1="100" y1="135" x2="120" y2="135" stroke="rgba(16, 185, 129, 0.6)" strokeWidth="1" />
          <Line x1="110" y1="125" x2="110" y2="145" stroke="rgba(16, 185, 129, 0.6)" strokeWidth="1" />
        </Svg>

        {/* Dynamic Animated Interactive Overlay Layer */}
        {activeTab === 'perineum' && (
          <View style={styles.animatedCenterBox}>
            {/* Pulsating concentric circles */}
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  transform: [{ scale: pulseScale }],
                  opacity: pulseOpacity,
                },
              ]}
            />
            {/* Rotating Circular Massage Arrows */}
            <Animated.View
              style={[
                styles.rotatingCircleBox,
                {
                  transform: [{ rotate: spin }],
                },
              ]}
            >
              <MaterialCommunityIcons name="rotate-right" size={50} color="#10B981" />
            </Animated.View>
            <View style={styles.touchFingerDot}>
              <MaterialCommunityIcons name="fingerprint" size={20} color="#FFFFFF" />
            </View>
          </View>
        )}

        {activeTab === 'root' && (
          <View style={styles.animatedRootBox}>
            {/* Lateral Oscillation Finger Indicator */}
            <Animated.View
              style={[
                styles.lateralFinger,
                {
                  transform: [{ translateX: lateralTranslate }],
                },
              ]}
            >
              <MaterialCommunityIcons name="swap-horizontal-bold" size={36} color="#3B82F6" />
            </Animated.View>
            <Text style={styles.ligamentLabel}>恥骨前懸韌帶 · 橫向撥動</Text>
          </View>
        )}

        {activeTab === 'scrotal' && (
          <View style={styles.animatedScrotalBox}>
            {/* Upward Lifting Wave Arrows */}
            <Animated.View
              style={[
                styles.liftingWave,
                {
                  transform: [{ scaleY: pulseScale }],
                  opacity: pulseOpacity,
                },
              ]}
            >
              <MaterialCommunityIcons name="chevron-double-up" size={40} color="#C084FC" />
            </Animated.View>
            <Text style={styles.scrotalLabel}>指腹輕托 · 提睪放鬆</Text>
          </View>
        )}

        {/* Floating Benefit Badge */}
        <View style={styles.floatingBadge}>
          <MaterialCommunityIcons name="shield-check" size={13} color="#10B981" />
          <Text style={styles.floatingBadgeText}>{currentTechnique.benefit}</Text>
        </View>
      </View>
      )}

      {/* Guide Card & Step List */}
      <View style={styles.guideCard}>
        <View style={styles.guideHeader}>
          <Text style={styles.guideTitle}>{currentTechnique.name}</Text>
          <Text style={styles.guideTagline}>{currentTechnique.tagline}</Text>
        </View>

        <View style={styles.stepsContainer}>
          {currentTechnique.steps.map((step, idx) => (
            <View key={`step_${idx}`} style={styles.stepRow}>
              <View style={styles.stepNumPill}>
                <Text style={styles.stepNumText}>{idx + 1}</Text>
              </View>
              <Text style={styles.stepDescText}>{step}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Footer Controls: 40 BPM Rhythm & Vibration Toggle */}
      <View style={styles.footerBar}>
        <View style={styles.bpmTag}>
          <Ionicons name="pulse" size={14} color="#10B981" />
          <Text style={styles.bpmTagText}>40 BPM 舒緩引導</Text>
        </View>

        <View style={styles.actionGroup}>
          <TouchableOpacity
            style={[styles.ctrlBtn, isVibrating && styles.ctrlBtnActive]}
            onPress={() => {
              try {
                Haptics.selectionAsync();
              } catch {}
              setIsVibrating(!isVibrating);
            }}
          >
            <Ionicons
              name={isVibrating ? 'radio' : 'radio-outline'}
              size={14}
              color={isVibrating ? '#10B981' : THEME.colors.textMuted}
            />
            <Text
              style={[
                styles.ctrlBtnText,
                isVibrating && { color: '#10B981', fontWeight: '700' },
              ]}
            >
              微震{isVibrating ? '開' : '關'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playBtn}
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
    backgroundColor: '#070C18',
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
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  dimensionToggleBtnActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3B82F6',
  },
  dimensionToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  dimensionToggleTextActive: {
    color: '#60A5FA',
    fontWeight: '800',
  },
  canvasWrapper3D: {
    height: 165,
    backgroundColor: '#050A14',
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    justifyContent: 'center',
  },
  fittingShortcutBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  fittingShortcutText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#93C5FD',
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
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    borderColor: '#3B82F6',
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  tabButtonTextActive: {
    color: '#60A5FA',
    fontWeight: '800',
  },
  canvasWrapper: {
    height: 155,
    backgroundColor: '#0B1120',
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridHorizLine: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  gridVertLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 1,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  anatomySvg: {
    opacity: 0.88,
  },
  animatedCenterBox: {
    position: 'absolute',
    bottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  rotatingCircleBox: {
    width: 54,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchFingerDot: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  animatedRootBox: {
    position: 'absolute',
    top: 50,
    alignItems: 'center',
  },
  lateralFinger: {
    padding: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  ligamentLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#93C5FD',
    marginTop: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  animatedScrotalBox: {
    position: 'absolute',
    bottom: 16,
    alignItems: 'center',
  },
  liftingWave: {
    padding: 2,
  },
  scrotalLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#D8B4FE',
    marginTop: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  floatingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  floatingBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  guideCard: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginTop: 8,
  },
  guideHeader: {
    marginBottom: 6,
  },
  guideTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  guideTagline: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  stepsContainer: {
    gap: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  stepNumPill: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  stepNumText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#60A5FA',
  },
  stepDescText: {
    fontSize: 10,
    color: '#CBD5E1',
    flex: 1,
    lineHeight: 14,
  },
  footerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  bpmTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bpmTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#1E293B',
    borderRadius: 6,
  },
  ctrlBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 0.5,
    borderColor: '#10B981',
  },
  ctrlBtnText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  playBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
