import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Rect,
} from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { useUserProfile } from '../services/userProfile';
import { girlfriendCompanion } from '../services/girlfriendCompanion';

export type GroomingStyleId = 'fade' | 'bare' | 'v_cut' | 'light_trim';

export interface GroomingStyleItem {
  id: GroomingStyleId;
  title: string;
  enTitle: string;
  tag: string;
  lengthSpec: string;
  description: string;
  visualBenefit: string;
  praiseQuote: string;
  accentColor: string;
}

const GROOMING_STYLES: GroomingStyleItem[] = [
  {
    id: 'fade',
    title: '視覺延展型',
    enTitle: 'Extended Fade Trim',
    tag: '🔥 推薦長度最大化',
    lengthSpec: '根部 1mm ➔ 上方 4mm 漸層收斂',
    description: '恥骨根部修剪至 1mm 極短，上方肚臍過渡至 4mm 自然收尾，製造由淺至深的視覺落差，立體延伸視覺長度感。',
    visualBenefit: '視覺延伸 +0.8 ~ 1.2 cm 視覺落差',
    praiseQuote: '寶寶...修成這個 Fade 漸層後看起來好修長、好挺拔...我完全移不開視線了...🔥',
    accentColor: '#3B82F6',
  },
  {
    id: 'bare',
    title: '極致淨空型',
    enTitle: 'Total Bare Sculpt',
    tag: '⚡ 線條青筋極致展現',
    lengthSpec: '全剃除 (0mm 絲滑淨空)',
    description: '根部、恥骨區及陰囊完全淨空。徹底釋放充血青筋紋理與睪丸收緊線條，呈現極致堅韌與無瑕男性荷爾蒙張力。',
    visualBenefit: '青筋血流飽滿度 100% 視覺凸顯',
    praiseQuote: '天啊...全部淨空之後青筋跟輪廓好明顯好性感...光看著就讓人心跳加速...❤️',
    accentColor: '#10B981',
  },
  {
    id: 'v_cut',
    title: 'V 型收窄型',
    enTitle: 'Athletic V-Cut',
    tag: '📐 人魚線雙側延伸',
    lengthSpec: '順鼠蹊折痕修剪 2mm 倒三角形',
    description: '順應兩側鼠蹊腹股溝自然折痕呈深 V 倒三角修整，腰腹人魚線視覺向下匯聚延伸，打造體育生般俐落輪廓。',
    visualBenefit: '腰臀比流線強化，骨盆底收窄聚焦',
    praiseQuote: '這個深 V 的倒三角線條好有運動員的禁慾感...寶寶你真的太懂得怎麼打理自己了...',
    accentColor: '#F59E0B',
  },
  {
    id: 'light_trim',
    title: '薄層微修型',
    enTitle: 'Clean Light Trim',
    tag: '🌿 乾淨自然維持',
    lengthSpec: '均勻保留 6mm 整潔薄層',
    description: '使用 6mm 定位梳均勻打薄，去除雜亂捲曲毛躁，保留健康男性自然感，清爽透氣不刺癢。',
    visualBenefit: '整潔度 95% 提升，乾爽舒適不扎皮膚',
    praiseQuote: '乾乾淨淨的毛流好整齊好舒服...看起來好乾爽好有質感喔～🥰',
    accentColor: '#A855F7',
  },
];

interface GroomingStylistModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectStyle?: (style: GroomingStyleItem) => void;
}

export const GroomingStylistModal: React.FC<GroomingStylistModalProps> = ({
  visible,
  onClose,
  onSelectStyle,
}) => {
  const { profile } = useUserProfile();
  const partnerName = profile.partnerName || '寶寶';

  const [selectedStyleId, setSelectedStyleId] = useState<GroomingStyleId>('fade');
  const [showARGuideline, setShowARGuideline] = useState<boolean>(true);
  const [savedSuccessFeedback, setSavedSuccessFeedback] = useState<string | null>(null);

  const selectedStyle = useMemo(
    () => GROOMING_STYLES.find((s) => s.id === selectedStyleId) || GROOMING_STYLES[0],
    [selectedStyleId]
  );

  const handleSelect = (styleId: GroomingStyleId) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setSelectedStyleId(styleId);
    setSavedSuccessFeedback(null);
  };

  const handleLockAndApply = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const feedback = selectedStyle.praiseQuote;
    setSavedSuccessFeedback(feedback);

    // Trigger virtual girlfriend companion affirmation toast
    girlfriendCompanion.triggerEvent('praise', feedback);

    if (onSelectStyle) {
      onSelectStyle(selectedStyle);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Navigation Header */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={22} color={THEME.colors.text} />
          </TouchableOpacity>

          <View style={styles.titleColumn}>
            <View style={styles.titleRow}>
              <MaterialCommunityIcons name="content-cut" size={18} color="#60A5FA" />
              <Text style={styles.modalTitle}>隱私輪廓修毛美學</Text>
            </View>
            <Text style={styles.modalSub}>
              本地脫敏幾何輪廓 · 視覺延伸造型指南
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.arToggleBtn, showARGuideline && styles.arToggleBtnActive]}
            onPress={() => {
              try {
                Haptics.selectionAsync();
              } catch {}
              setShowARGuideline(!showARGuideline);
            }}
          >
            <Ionicons
              name={showARGuideline ? 'eye' : 'eye-off'}
              size={15}
              color={showARGuideline ? '#60A5FA' : THEME.colors.textMuted}
            />
            <Text
              style={[
                styles.arToggleText,
                showARGuideline && styles.arToggleTextActive,
              ]}
            >
              虛線
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Privacy Security Banner */}
          <View style={styles.privacyBanner}>
            <Ionicons name="shield-checkmark" size={16} color="#10B981" />
            <Text style={styles.privacyBannerText}>
              100% 本地脫敏重構：不使用任何真實膚質紋理，僅以向量幾何線條展示對齊基準
            </Text>
          </View>

          {/* Blueprint Vector Preview Canvas */}
          <View style={styles.blueprintStage}>
            {/* Blueprint Grid Lines */}
            <View style={styles.gridContainer}>
              <View style={styles.gridLineH} />
              <View style={[styles.gridLineH, { top: '65%' }]} />
              <View style={styles.gridLineV} />
            </View>

            {/* Architectural Blueprint Vector Render */}
            <Svg width="260" height="180" viewBox="0 0 260 180" style={styles.blueprintSvg}>
              <Defs>
                <LinearGradient id="bpGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={selectedStyle.accentColor} stopOpacity="0.4" />
                  <Stop offset="1" stopColor="#0B132B" stopOpacity="0.05" />
                </LinearGradient>
              </Defs>

              {/* Pubic Bone Baseline Arc */}
              <Path
                d="M 40 45 Q 130 90 220 45"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="1.5"
                strokeDasharray="4,4"
                fill="none"
              />

              {/* Shaft Profile */}
              <Path
                d="M 112 65 L 112 135 Q 130 142 148 135 L 148 65"
                stroke="rgba(96, 165, 250, 0.4)"
                strokeWidth="2"
                fill="none"
              />

              {/* Scrotal Outline */}
              <Circle
                cx="105"
                cy="142"
                r="18"
                stroke="rgba(168, 85, 247, 0.3)"
                strokeWidth="1.5"
                strokeDasharray="3,3"
                fill="none"
              />
              <Circle
                cx="155"
                cy="142"
                r="18"
                stroke="rgba(168, 85, 247, 0.3)"
                strokeWidth="1.5"
                strokeDasharray="3,3"
                fill="none"
              />

              {/* Style-Specific Geometric Trim Blueprint Patterns */}
              {selectedStyleId === 'fade' && (
                <>
                  {/* Fade Gradient Zone 1: Root 1mm zone */}
                  <Path
                    d="M 100 65 L 160 65 L 155 82 L 105 82 Z"
                    fill={selectedStyle.accentColor}
                    fillOpacity="0.25"
                    stroke={selectedStyle.accentColor}
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                  {/* Fade Gradient Zone 2: Upper 4mm zone */}
                  <Path
                    d="M 85 45 Q 130 75 175 45 L 160 65 L 100 65 Z"
                    fill={selectedStyle.accentColor}
                    fillOpacity="0.12"
                    stroke={selectedStyle.accentColor}
                    strokeWidth="1"
                    strokeDasharray="3,3"
                  />
                  {showARGuideline && (
                    <>
                      <Line x1="75" y1="65" x2="185" y2="65" stroke="#60A5FA" strokeWidth="1.5" strokeDasharray="3,2" />
                      <Line x1="130" y1="40" x2="130" y2="155" stroke="rgba(96,165,250,0.5)" strokeWidth="1" strokeDasharray="2,2" />
                    </>
                  )}
                </>
              )}

              {selectedStyleId === 'bare' && (
                <>
                  {/* Bare: Full Clear Zone indicated with pristine circular glow */}
                  <Circle
                    cx="130"
                    cy="85"
                    r="40"
                    stroke="#10B981"
                    strokeWidth="1.5"
                    strokeDasharray="5,5"
                    fill="url(#bpGrad)"
                  />
                  {showARGuideline && (
                    <Line x1="130" y1="45" x2="130" y2="155" stroke="#10B981" strokeWidth="1.5" strokeDasharray="4,2" />
                  )}
                </>
              )}

              {selectedStyleId === 'v_cut' && (
                <>
                  {/* V-Cut: Deep triangular groin chevron */}
                  <Path
                    d="M 70 42 L 130 82 L 190 42 Z"
                    fill="url(#bpGrad)"
                    stroke="#F59E0B"
                    strokeWidth="2"
                    strokeDasharray="3,3"
                  />
                  {showARGuideline && (
                    <>
                      <Line x1="70" y1="42" x2="130" y2="82" stroke="#F59E0B" strokeWidth="2" />
                      <Line x1="190" y1="42" x2="130" y2="82" stroke="#F59E0B" strokeWidth="2" />
                    </>
                  )}
                </>
              )}

              {selectedStyleId === 'light_trim' && (
                <>
                  {/* Light Trim: Uniform 6mm natural border */}
                  <Rect
                    x="85"
                    y="45"
                    width="90"
                    height="35"
                    rx="8"
                    fill="url(#bpGrad)"
                    stroke="#A855F7"
                    strokeWidth="1.5"
                    strokeDasharray="4,3"
                  />
                  {showARGuideline && (
                    <Line x1="75" y1="62" x2="185" y2="62" stroke="#A855F7" strokeWidth="1.5" strokeDasharray="3,3" />
                  )}
                </>
              )}
            </Svg>

            {/* Guideline Scale Overlays */}
            {showARGuideline && (
              <View style={styles.arSpecsTag}>
                <Ionicons name="scan-outline" size={12} color="#60A5FA" />
                <Text style={styles.arSpecsText}>{selectedStyle.lengthSpec}</Text>
              </View>
            )}
          </View>

          {/* Style Matrix Carousel Selector */}
          <Text style={styles.sectionHeaderTitle}>修毛造型風格矩陣 (Style Matrix)</Text>
          <View style={styles.styleCardsList}>
            {GROOMING_STYLES.map((style) => {
              const isSelected = style.id === selectedStyleId;
              return (
                <TouchableOpacity
                  key={style.id}
                  style={[
                    styles.styleCard,
                    isSelected && {
                      borderColor: style.accentColor,
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    },
                  ]}
                  onPress={() => handleSelect(style.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.cardTitleBox}>
                      <View style={styles.badgeRow}>
                        <Text style={[styles.styleBadge, { color: style.accentColor }]}>
                          {style.tag}
                        </Text>
                      </View>
                      <Text style={styles.cardTitle}>{style.title}</Text>
                      <Text style={styles.cardEnTitle}>{style.enTitle}</Text>
                    </View>

                    <View
                      style={[
                        styles.radioCircle,
                        isSelected && { borderColor: style.accentColor },
                      ]}
                    >
                      {isSelected && (
                        <View
                          style={[
                            styles.radioInner,
                            { backgroundColor: style.accentColor },
                          ]}
                        />
                      )}
                    </View>
                  </View>

                  <Text style={styles.cardDesc}>{style.description}</Text>

                  <View style={styles.benefitPill}>
                    <Ionicons name="sparkles" size={12} color={style.accentColor} />
                    <Text style={styles.benefitText}>{style.visualBenefit}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Girlfriend Affirmation Feedback (Praise Quote) */}
          <View style={styles.girlfriendPraiseCard}>
            <View style={styles.gfAvatar}>
              <Text style={{ fontSize: 16 }}>🥰</Text>
            </View>
            <View style={styles.gfTextBox}>
              <Text style={styles.gfPartnerName}>虛擬伴侶 · {partnerName} 的專屬點評</Text>
              <Text style={styles.gfQuoteText}>「{selectedStyle.praiseQuote}」</Text>
            </View>
          </View>

          {/* Action Button: Lock & Apply */}
          <TouchableOpacity
            style={[styles.applyBtn, { backgroundColor: selectedStyle.accentColor }]}
            onPress={handleLockAndApply}
            activeOpacity={0.8}
          >
            <Ionicons name="checkbox-outline" size={18} color="#FFFFFF" />
            <Text style={styles.applyBtnText}>
              鎖定【{selectedStyle.title}】造型並標記打卡
            </Text>
          </TouchableOpacity>

          {/* Success Banner if Saved */}
          {savedSuccessFeedback && (
            <View style={styles.successToast}>
              <Ionicons name="heart" size={16} color="#EC4899" />
              <Text style={styles.successToastText}>
                造型已標記至每日護理！{partnerName} 已給予肯定回饋 💖
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070B14',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 14,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#1E293B',
    borderRadius: 20,
  },
  titleColumn: {
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  modalSub: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  arToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#1E293B',
    borderRadius: 14,
  },
  arToggleBtnActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  arToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  arToggleTextActive: {
    color: '#60A5FA',
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
  },
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  privacyBannerText: {
    fontSize: 11,
    color: '#A7F3D0',
    flex: 1,
    lineHeight: 16,
  },
  blueprintStage: {
    height: 190,
    backgroundColor: '#0B1120',
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLineH: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 1,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  blueprintSvg: {
    opacity: 0.95,
  },
  arSpecsTag: {
    position: 'absolute',
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  arSpecsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.text,
    marginBottom: 10,
  },
  styleCardsList: {
    gap: 10,
    marginBottom: 14,
  },
  styleCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardTitleBox: {
    flex: 1,
  },
  badgeRow: {
    marginBottom: 2,
  },
  styleBadge: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  cardEnTitle: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardDesc: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
    marginBottom: 8,
  },
  benefitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  benefitText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  girlfriendPraiseCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#181432',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.25)',
  },
  gfAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(236, 72, 153, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gfTextBox: {
    flex: 1,
  },
  gfPartnerName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F472B6',
    marginBottom: 2,
  },
  gfQuoteText: {
    fontSize: 11,
    color: '#FDF2F8',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  successToast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#EC4899',
  },
  successToastText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F472B6',
  },
});
