import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME } from '../constants/theme';
import { WishlistGoal, HandwrittenNote } from '../types';
import { wishlistService, UNLOCKED_SKINS_REGISTRY } from '../services/wishlistService';

interface WishlistModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenUnderwearStudio?: () => void;
}

export const WishlistModal: React.FC<WishlistModalProps> = ({
  visible,
  onClose,
  onOpenUnderwearStudio,
}) => {
  const [goals, setGoals] = useState<WishlistGoal[]>([]);
  const [selectedNote, setSelectedNote] = useState<{
    note: HandwrittenNote;
    skinId?: string;
  } | null>(null);

  const loadData = async () => {
    const list = await wishlistService.syncProgress();
    setGoals(list);
  };

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        void loadData();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleCardPress = (goal: WishlistGoal) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (goal.isUnlocked && goal.handwrittenNote) {
      setSelectedNote({
        note: goal.handwrittenNote,
        skinId: goal.underwearSkinId,
      });
    }
  };

  const handleQuickUnlockForTesting = async (goalId: string) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    const updated = await wishlistService.unlockGoalManually(goalId);
    setGoals(updated);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheetContainer}>
          <View style={styles.sheetHandle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleCol}>
              <View style={styles.badgeRow}>
                <View style={styles.headerIcon}>
                  <Ionicons name="trophy" size={18} color="#F59E0B" />
                </View>
                <Text style={styles.sheetTitle}>虛擬評鑑團願望清單</Text>
              </View>
              <Text style={styles.sheetSub}>
                成員專屬發起自律目標，解鎖角色親筆賀卡與限定 3D 內褲材質
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Goal List */}
          <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
            {goals.map((goal) => {
              const progressPct = Math.min(
                100,
                Math.round((goal.currentCount / goal.targetCount) * 100)
              );
              const skinMeta = goal.underwearSkinId
                ? UNLOCKED_SKINS_REGISTRY[goal.underwearSkinId]
                : null;

              return (
                <TouchableOpacity
                  key={goal.id}
                  style={[
                    styles.goalCard,
                    goal.isUnlocked && styles.goalCardUnlocked,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => handleCardPress(goal)}
                >
                  {/* Initiator Pill */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.initiatorPill}>
                      <View
                        style={[
                          styles.initiatorDot,
                          { backgroundColor: goal.initiatorColor },
                        ]}
                      />
                      <Text
                        style={[
                          styles.initiatorName,
                          { color: goal.initiatorColor },
                        ]}
                      >
                        {goal.initiatorName} · {goal.initiatorTitle}
                      </Text>
                    </View>

                    {goal.isUnlocked ? (
                      <View style={styles.unlockedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={styles.unlockedBadgeText}>已達成解鎖</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.simulateUnlockBtn}
                        onPress={() => handleQuickUnlockForTesting(goal.id)}
                      >
                        <Text style={styles.simulateUnlockBtnText}>快速達標</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Goal Title */}
                  <Text style={styles.goalTitle}>{goal.title}</Text>
                  <Text style={styles.goalDesc}>{goal.description}</Text>

                  {/* Progress Bar */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressBar,
                          {
                            width: `${progressPct}%`,
                            backgroundColor: goal.isUnlocked
                              ? '#10B981'
                              : goal.initiatorColor,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {goal.currentCount} / {goal.targetCount} ({progressPct}%)
                    </Text>
                  </View>

                  {/* Reward Box */}
                  <View
                    style={[
                      styles.rewardBox,
                      goal.isUnlocked && styles.rewardBoxUnlocked,
                    ]}
                  >
                    <View style={styles.rewardIconCircle}>
                      <MaterialCommunityIcons
                        name={goal.isUnlocked ? 'email-open-outline' : 'lock-outline'}
                        size={16}
                        color={goal.isUnlocked ? goal.initiatorColor : '#94A3B8'}
                      />
                    </View>
                    <View style={styles.rewardInfo}>
                      <Text
                        style={[
                          styles.rewardTitle,
                          goal.isUnlocked && { color: '#F8FAFC' },
                        ]}
                      >
                        {goal.rewardTitle}
                      </Text>
                      <Text style={styles.rewardDesc}>
                        {goal.isUnlocked
                          ? '✨ 點擊卡片查閱手寫信與 3D 材質'
                          : goal.rewardDescription}
                      </Text>
                    </View>
                    {skinMeta && (
                      <View
                        style={[
                          styles.skinPreviewPill,
                          { borderColor: skinMeta.border, backgroundColor: skinMeta.hex },
                        ]}
                      >
                        <Text style={styles.skinPreviewText}>{skinMeta.name.replace('【限定】', '')}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Handwritten Digital Note Popup Modal */}
        {selectedNote && (
          <Modal
            visible={!!selectedNote}
            transparent
            animationType="fade"
            onRequestClose={() => setSelectedNote(null)}
          >
            <View style={styles.letterBackdrop}>
              <View style={styles.letterParchment}>
                {/* Stamp Seal */}
                {selectedNote.note.stampText && (
                  <View
                    style={[
                      styles.stampSeal,
                      { borderColor: selectedNote.note.accentColor },
                    ]}
                  >
                    <Text
                      style={[
                        styles.stampSealText,
                        { color: selectedNote.note.accentColor },
                      ]}
                    >
                      ★ {selectedNote.note.stampText} ★
                    </Text>
                  </View>
                )}

                {/* Letter Header */}
                <View style={styles.letterHeader}>
                  <Text
                    style={[
                      styles.letterAuthorTag,
                      { color: selectedNote.note.accentColor },
                    ]}
                  >
                    💌 {selectedNote.note.authorName} ({selectedNote.note.authorTitle}) 的手寫信札
                  </Text>
                  <Text style={styles.letterTitle}>
                    {selectedNote.note.title}
                  </Text>
                </View>

                {/* Letter Body Paragraphs */}
                <ScrollView style={styles.letterBody} showsVerticalScrollIndicator={false}>
                  {selectedNote.note.paragraphs.map((p, idx) => (
                    <Text key={idx} style={styles.letterParagraph}>
                      {p}
                    </Text>
                  ))}

                  <View style={styles.letterFooterRow}>
                    <Text style={styles.letterDate}>
                      {selectedNote.note.dateString}
                    </Text>
                    <Text
                      style={[
                        styles.letterSignature,
                        { color: selectedNote.note.accentColor },
                      ]}
                    >
                      {selectedNote.note.signature}
                    </Text>
                  </View>
                </ScrollView>

                {/* Bottom Action buttons */}
                <View style={styles.letterBottomRow}>
                  {selectedNote.skinId && onOpenUnderwearStudio && (
                    <TouchableOpacity
                      style={styles.openStudioBtn}
                      onPress={() => {
                        setSelectedNote(null);
                        onClose();
                        onOpenUnderwearStudio();
                      }}
                    >
                      <MaterialCommunityIcons name="tshirt-v" size={16} color="#FFFFFF" />
                      <Text style={styles.openStudioBtnText}>前往 3D 試穿</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.letterCloseBtn}
                    onPress={() => setSelectedNote(null)}
                  >
                    <Text style={styles.letterCloseBtnText}>收下賀卡</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleCol: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  sheetSub: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#1E293B',
  },
  scrollList: {
    marginBottom: 8,
  },
  goalCard: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  goalCardUnlocked: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: '#111C2E',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  initiatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  initiatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  initiatorName: {
    fontSize: 10,
    fontWeight: '700',
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  unlockedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  simulateUnlockBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 6,
  },
  simulateUnlockBtnText: {
    fontSize: 9,
    color: '#64748B',
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  goalDesc: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
    marginBottom: 10,
  },
  progressContainer: {
    marginBottom: 10,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#CBD5E1',
    alignSelf: 'flex-end',
  },
  rewardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1F2937',
    gap: 8,
  },
  rewardBoxUnlocked: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  rewardIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardInfo: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 1,
  },
  rewardDesc: {
    fontSize: 10,
    color: '#64748B',
  },
  skinPreviewPill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  skinPreviewText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  letterBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  letterParchment: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#181411',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#78350F',
    padding: 20,
    position: 'relative',
  },
  stampSeal: {
    position: 'absolute',
    top: 14,
    right: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    transform: [{ rotate: '12deg' }],
  },
  stampSealText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  letterHeader: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#292524',
  },
  letterAuthorTag: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },
  letterTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FEF3C7',
    lineHeight: 22,
  },
  letterBody: {
    marginBottom: 14,
  },
  letterParagraph: {
    fontSize: 13,
    color: '#E7E5E4',
    lineHeight: 22,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  letterFooterRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#292524',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  letterDate: {
    fontSize: 10,
    color: '#78716C',
  },
  letterSignature: {
    fontSize: 12,
    fontWeight: '800',
  },
  letterBottomRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  openStudioBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  openStudioBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  letterCloseBtn: {
    flex: 1,
    backgroundColor: '#292524',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterCloseBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D6D3D1',
  },
});
