import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { THEME } from '../constants/theme';
import { OnboardingCardData } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CARDS_DATA: OnboardingCardData[] = [
  {
    id: 'posture',
    category: '人體工學與生理防護',
    badge: '指南 01',
    title: '正確姿勢與生理防護',
    subtitle: '健康的第一步在於姿勢與肌肉放鬆，預防微血管與關節負擔',
    bulletPoints: [
      '保持腰背支撐：切勿在軟床或沙發上過度弓背前傾，避免壓迫腰椎與坐骨神經。',
      '放鬆骨盆底肌群 (PC 肌)：避免長時間處於緊繃閉氣狀態，維持平穩腹式呼吸。',
      '充足潤滑與適當力道：避免過度摩擦造成表皮微創擦傷、毛囊炎或海綿體微血管損傷。',
      '節奏調節：適時停頓，傾聽身體回饋，避免急速暴力動作引發抽筋或局部充血腫脹。',
    ],
    medicalTip: '💡 醫學小提醒：如感到骨盆深處或腰部酸痛，請暫停並進行 5 分鐘拉筋與放鬆。',
  },
  {
    id: 'frequency',
    category: '醫學衛教與健康理論',
    badge: '指南 02',
    title: '醫學建議頻率理論值',
    subtitle: '根據國際泌尿科醫學會與流行病學研究，規律釋放具正向效益',
    bulletPoints: [
      '哈佛公衛學院世代研究：男性每月射精達 21 次以上者，相較低頻者有助於促進攝護腺液代謝與降低相關風險。',
      '年齡參考經驗值：20-29 歲每週約 3~4 次；30-39 歲每週約 2~3 次；40 歲以上每週約 1~2 次。',
      '個體差異與自適性：以上為理論統計值，最重要的核心是「個人自覺舒適度」。',
      '黃金判斷法則：只要「隔日無倦怠沉重感、注意力集中、無骨盆下墜疼痛」，即屬健康頻率。',
    ],
    medicalTip: '💡 醫學小提醒：以「不影響生活作息與身心能量」為最高原則，毋須過度焦慮次數。',
  },
  {
    id: 'privacy',
    category: '最高隱私與本地架構',
    badge: '指南 03',
    title: '100% 離線沙盒與絕對隱私',
    subtitle: '你的私密數據與紀錄只屬於你，永久隔絕於網路之外',
    bulletPoints: [
      '純本地沙盒隔離：照片與錄影均存放於 App 私有 DocumentDirectory，絕對不寫入系統公開相簿。',
      '零伺服器傳輸：全功能 100% 離線運作，無任何雲端上傳、分析 SDK 或追蹤標籤。',
      '防窺毛玻璃遮罩：App 切換至背景多工瞬間，全螢幕立即覆蓋高強度毛玻璃，防止截圖外洩。',
      '生物辨識二次鎖定：機密影像需再次通過 Face ID / 指紋認證方能解鎖檢視。',
    ],
    medicalTip: '💡 安全宣言：從代碼架構層杜絕一切外洩可能，安心專注於自我健康管理。',
  },
];

export const OnboardingScreen: React.FC = () => {
  const { completeOnboarding } = useApp();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (currentIndex < CARDS_DATA.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    } else {
      // Complete onboarding
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      await completeOnboarding();
    }
  };

  const handleSkip = async () => {
    try {
      await Haptics.selectionAsync();
    } catch {}
    await completeOnboarding();
  };

  const renderCard = ({ item, index }: { item: OnboardingCardData; index: number }) => {
    return (
      <View style={styles.cardContainer}>
        <View style={styles.cardContent}>
          {/* Badge & Category */}
          <View style={styles.badgeRow}>
            <View style={styles.badgeTag}>
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>

          {/* Title & Subtitle */}
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardSubtitle}>{item.subtitle}</Text>

          {/* Visual Illustration Placeholder / Diagram Box */}
          <View style={styles.illustrationBox}>
            {index === 0 && (
              <View style={styles.illustrationInner}>
                <View style={styles.avatarCircle}>
                  <MaterialCommunityIcons name="human-male" size={44} color={THEME.colors.primaryLight} />
                </View>
                <View style={styles.postureHints}>
                  <View style={styles.posturePill}>
                    <Ionicons name="checkmark-circle" size={16} color={THEME.colors.success} />
                    <Text style={styles.posturePillText}>脊椎中立・腰椎支撐</Text>
                  </View>
                  <View style={styles.posturePill}>
                    <Ionicons name="checkmark-circle" size={16} color={THEME.colors.success} />
                    <Text style={styles.posturePillText}>骨盆底肌自然放鬆</Text>
                  </View>
                </View>
              </View>
            )}

            {index === 1 && (
              <View style={styles.frequencyIllustration}>
                <View style={styles.freqBarGroup}>
                  <View style={styles.freqBarCol}>
                    <Text style={styles.freqLabel}>20s</Text>
                    <View style={[styles.freqBar, { height: 60, backgroundColor: THEME.colors.primary }]} />
                    <Text style={styles.freqCount}>3-4次/週</Text>
                  </View>
                  <View style={styles.freqBarCol}>
                    <Text style={styles.freqLabel}>30s</Text>
                    <View style={[styles.freqBar, { height: 48, backgroundColor: THEME.colors.primaryLight }]} />
                    <Text style={styles.freqCount}>2-3次/週</Text>
                  </View>
                  <View style={styles.freqBarCol}>
                    <Text style={styles.freqLabel}>40s+</Text>
                    <View style={[styles.freqBar, { height: 36, backgroundColor: THEME.colors.accent }]} />
                    <Text style={styles.freqCount}>1-2次/週</Text>
                  </View>
                </View>
                <Text style={styles.harvardNote}>★ 醫學理論值・以個人充沛活力為準</Text>
              </View>
            )}

            {index === 2 && (
              <View style={styles.privacyIllustration}>
                <View style={styles.privacyLockRing}>
                  <Ionicons name="shield-checkmark" size={38} color={THEME.colors.success} />
                </View>
                <View style={styles.privacySpecs}>
                  <Text style={styles.privacySpecText}>✔ 100% 本地 DocumentDirectory</Text>
                  <Text style={styles.privacySpecText}>✔ 杜絕系統相簿索引與雲端備份</Text>
                  <Text style={styles.privacySpecText}>✔ 背景毛玻璃多工防截圖</Text>
                </View>
              </View>
            )}
          </View>

          {/* Bullet Points */}
          <View style={styles.bulletsList}>
            {item.bulletPoints.map((point, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>{point}</Text>
              </View>
            ))}
          </View>

          {/* Medical tip banner */}
          <View style={styles.tipBanner}>
            <Text style={styles.tipText}>{item.medicalTip}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Top Header: App Name & Skip */}
      <View style={styles.topBar}>
        <View style={styles.topLogoRow}>
          <Ionicons name="fitness" size={20} color={THEME.colors.primary} />
          <Text style={styles.topLogoText}>健康尻尻</Text>
        </View>
        <TouchableOpacity onPress={handleSkip} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.skipButtonText}>跳過引導</Text>
        </TouchableOpacity>
      </View>

      {/* Carousel list */}
      <FlatList
        ref={flatListRef}
        data={CARDS_DATA}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(newIndex);
        }}
        style={styles.carousel}
      />

      {/* Footer: Pagination dots & Action button */}
      <View style={styles.footer}>
        <View style={styles.dotsRow}>
          {CARDS_DATA.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                currentIndex === i ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.85}
          onPress={handleNext}
        >
          <Text style={styles.actionButtonText}>
            {currentIndex === CARDS_DATA.length - 1 ? '完成引導，進入主程式' : '下一則衛教'}
          </Text>
          <Feather
            name={currentIndex === CARDS_DATA.length - 1 ? 'check' : 'arrow-right'}
            size={18}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  topLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topLogoText: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.text,
    letterSpacing: 0.5,
  },
  skipButtonText: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  carousel: {
    flex: 1,
  },
  cardContainer: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  cardContent: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  badgeTag: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primaryLight,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.text,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  illustrationBox: {
    height: 120,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  illustrationInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postureHints: {
    gap: 8,
  },
  posturePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
  },
  posturePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  frequencyIllustration: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  freqBarGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 28,
    height: 70,
  },
  freqBarCol: {
    alignItems: 'center',
    gap: 4,
  },
  freqBar: {
    width: 22,
    borderRadius: 6,
  },
  freqLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  freqCount: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontWeight: '700',
  },
  harvardNote: {
    marginTop: 6,
    fontSize: 11,
    color: THEME.colors.primaryLight,
    fontWeight: '600',
  },
  privacyIllustration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
  },
  privacyLockRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  privacySpecs: {
    gap: 4,
  },
  privacySpecText: {
    fontSize: 12,
    color: THEME.colors.text,
    fontWeight: '600',
  },
  bulletsList: {
    gap: 8,
    marginBottom: 16,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: THEME.colors.primaryLight,
    marginTop: 6,
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
  tipBanner: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: THEME.radius.sm,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.primary,
  },
  tipText: {
    fontSize: 11,
    color: THEME.colors.text,
    lineHeight: 16,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 18,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 24,
    backgroundColor: THEME.colors.primary,
  },
  inactiveDot: {
    width: 6,
    backgroundColor: THEME.colors.surfaceSubtle,
  },
  actionButton: {
    height: 52,
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
