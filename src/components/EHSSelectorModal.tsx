import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME } from '../constants/theme';
import { EHSLevel, EHSRecord } from '../types';
import { ehsService, EHS_LEVEL_METADATA } from '../services/ehsService';

interface EHSSelectorModalProps {
  visible: boolean;
  initialLevel?: EHSLevel;
  onClose: () => void;
  onSaved?: (record: EHSRecord) => void;
}

export const EHSSelectorModal: React.FC<EHSSelectorModalProps> = ({
  visible,
  initialLevel = 4,
  onClose,
  onSaved,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<EHSLevel>(initialLevel);
  const [timeToPeak, setTimeToPeak] = useState<string>('95');
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleSelectLevel = (lvl: EHSLevel) => {
    try {
      void Haptics.impactAsync(
        lvl === 4
          ? Haptics.ImpactFeedbackStyle.Heavy
          : lvl === 3
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light
      );
    } catch {}
    setSelectedLevel(lvl);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const timeSec = parseInt(timeToPeak, 10) || (selectedLevel === 4 ? 95 : undefined);

      const record = await ehsService.saveRecord({
        date: todayStr,
        timestamp: Date.now(),
        level: selectedLevel,
        timeToLevel4Sec: timeSec,
        notes: notes.trim() || undefined,
      });

      try {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      if (onSaved) onSaved(record);
      onClose();
    } catch (e) {
      console.warn('Failed to save EHS:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const currentMeta = EHS_LEVEL_METADATA[selectedLevel];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="lightning-bolt" size={20} color="#EF4444" />
              </View>
              <View>
                <Text style={styles.modalTitle}>國際 EHS 硬度量表評估</Text>
                <Text style={styles.modalSubtitle}>Erection Hardness Score (1~4 級)</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={THEME.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Level Cards */}
            <View style={styles.cardsContainer}>
              {([1, 2, 3, 4] as EHSLevel[]).map((lvl) => {
                const meta = EHS_LEVEL_METADATA[lvl];
                const isSelected = selectedLevel === lvl;

                return (
                  <TouchableOpacity
                    key={`ehs_${lvl}`}
                    style={[
                      styles.levelCard,
                      isSelected && { borderColor: meta.color, backgroundColor: 'rgba(30, 41, 59, 0.95)' },
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleSelectLevel(lvl)}
                  >
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.badgeRow}>
                        <View style={[styles.indicatorDot, { backgroundColor: meta.color }]} />
                        <Text style={[styles.cardTitle, isSelected && { color: meta.color }]}>
                          {meta.title}
                        </Text>
                      </View>
                      <View style={[styles.analogyBadge, isSelected && { backgroundColor: meta.color }]}>
                        <Text style={[styles.analogyText, isSelected && { color: '#FFFFFF' }]}>
                          {meta.analogy}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.cardDesc}>{meta.description}</Text>

                    {/* Hardness Bar */}
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${meta.hardnessPercent}%`,
                            backgroundColor: meta.color,
                          },
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Supplementary Inputs */}
            <View style={styles.inputSection}>
              {selectedLevel >= 3 && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>達到該硬度耗時（秒）：</Text>
                  <TextInput
                    style={styles.textInput}
                    value={timeToPeak}
                    onChangeText={setTimeToPeak}
                    placeholder="95"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>備註筆記（可選）：</Text>
                <TextInput
                  style={[styles.textInput, styles.notesInput]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="例如：禁慾 52 小時後進入，青筋怒張充血良好..."
                  placeholderTextColor="#64748B"
                  multiline
                />
              </View>
            </View>

            {/* Level 4 Preview Hint */}
            {selectedLevel === 4 && (
              <View style={styles.level4HintBox}>
                <MaterialCommunityIcons name="cube-outline" size={18} color="#EF4444" />
                <Text style={styles.level4HintText}>
                  已啟用 Level 4 巔峰！3D 仿真模型將即時調高血管飽和度並突出背側微青筋法線。
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: currentMeta.color }]}
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.confirmBtnText}>
              {isSaving ? '記錄中...' : `確認評估為 ${currentMeta.analogy} (${currentMeta.hardnessPercent}%)`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderColor: '#1E293B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  closeBtn: {
    padding: 6,
  },
  scrollBody: {
    marginBottom: 16,
  },
  cardsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  levelCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  indicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  analogyBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  analogyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  cardDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
    marginBottom: 10,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  inputSection: {
    gap: 12,
    marginBottom: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  textInput: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
  },
  notesInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  level4HintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  level4HintText: {
    flex: 1,
    fontSize: 12,
    color: '#FCA5A5',
    lineHeight: 16,
  },
  confirmBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
