import React, { useState } from 'react';
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
import { EnvironmentTag, PhysiologicalBiasResult } from '../types';
import {
  environmentContextService,
  ENVIRONMENT_TAG_METADATA,
} from '../services/environmentContextService';

interface EnvironmentalLogModalProps {
  visible: boolean;
  selectedTags?: EnvironmentTag[];
  onClose: () => void;
  onApplyContext: (tags: EnvironmentTag[], bias: PhysiologicalBiasResult) => void;
}

export const EnvironmentalLogModal: React.FC<EnvironmentalLogModalProps> = ({
  visible,
  selectedTags: initialTags = [],
  onClose,
  onApplyContext,
}) => {
  const [currentTags, setCurrentTags] = useState<EnvironmentTag[]>(initialTags);

  const biasResult = environmentContextService.calculatePhysiologicalBias(currentTags);

  const toggleTag = (tag: EnvironmentTag) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (currentTags.includes(tag)) {
      setCurrentTags(currentTags.filter((t) => t !== tag));
    } else {
      setCurrentTags([...currentTags, tag]);
    }
  };

  const handleApply = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    onApplyContext(currentTags, biasResult);
    onClose();
  };

  const handleClear = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setCurrentTags([]);
  };

  const tempShowerTags: EnvironmentTag[] = ['COLD_WATER', 'HOT_SHOWER', 'ROOM_TEMP'];
  const physicalFatigueTags: EnvironmentTag[] = [
    'POST_WORKOUT',
    'POST_CYCLING',
    'SLEEP_DEPRIVED',
    'MORNING_GLORY',
  ];

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
                <View style={styles.headerIconCircle}>
                  <MaterialCommunityIcons name="weather-partly-cloudy" size={18} color="#38BDF8" />
                </View>
                <Text style={styles.sheetTitle}>生理環境情境校準</Text>
              </View>
              <Text style={styles.sheetSub}>
                排除低溫緊縮、會陰壓迫與疲憊干擾，客觀校正生理偏差
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Real-time Physiological Bias Engine Card */}
            <View
              style={[
                styles.biasResultCard,
                biasResult.totalBiasPercentage < 0
                  ? styles.biasResultCardNegative
                  : biasResult.isBaselineMax
                  ? styles.biasResultCardMax
                  : styles.biasResultCardNormal,
              ]}
            >
              <View style={styles.biasHeaderRow}>
                <View style={styles.biasTitleRow}>
                  <Text style={styles.biasAlertTitle}>{biasResult.alertTitle}</Text>
                  {biasResult.totalBiasPercentage !== 0 && (
                    <View
                      style={[
                        styles.biasPill,
                        biasResult.totalBiasPercentage < 0
                          ? styles.biasPillNegative
                          : styles.biasPillPositive,
                      ]}
                    >
                      <Text style={styles.biasPillText}>
                        {biasResult.totalBiasPercentage > 0 ? '+' : ''}
                        {biasResult.totalBiasPercentage}% 偏差
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.biasAlertNote}>{biasResult.alertNote}</Text>
              <View style={styles.suggestedActionRow}>
                <Ionicons name="shield-checkmark" size={14} color="#38BDF8" />
                <Text style={styles.suggestedActionText}>
                  {biasResult.suggestedAction}
                </Text>
              </View>
            </View>

            {/* Section 1: Temperature & Shower */}
            <Text style={styles.sectionHeader}>🌡️ 溫度與環境放鬆</Text>
            <View style={styles.tagsGrid}>
              {tempShowerTags.map((tag) => {
                const meta = ENVIRONMENT_TAG_METADATA[tag];
                const isSelected = currentTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagChip,
                      isSelected && styles.tagChipSelected,
                    ]}
                    onPress={() => toggleTag(tag)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.tagIcon}>{meta.icon}</Text>
                    <View style={styles.tagInfo}>
                      <Text
                        style={[
                          styles.tagLabel,
                          isSelected && styles.tagLabelSelected,
                        ]}
                      >
                        {meta.label}
                      </Text>
                      <Text style={styles.tagSub}>{meta.description}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#38BDF8"
                        style={styles.checkIcon}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Section 2: Physical Fatigue & Morning State */}
            <Text style={styles.sectionHeader}>⚡ 體能狀態與神經恢復</Text>
            <View style={styles.tagsGrid}>
              {physicalFatigueTags.map((tag) => {
                const meta = ENVIRONMENT_TAG_METADATA[tag];
                const isSelected = currentTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagChip,
                      isSelected && styles.tagChipSelected,
                    ]}
                    onPress={() => toggleTag(tag)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.tagIcon}>{meta.icon}</Text>
                    <View style={styles.tagInfo}>
                      <Text
                        style={[
                          styles.tagLabel,
                          isSelected && styles.tagLabelSelected,
                        ]}
                      >
                        {meta.label}
                      </Text>
                      <Text style={styles.tagSub}>{meta.description}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#38BDF8"
                        style={styles.checkIcon}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={handleClear}
              activeOpacity={0.7}
            >
              <Text style={styles.clearBtnText}>重置</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={handleApply}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark" size={18} color="#0F172A" />
              <Text style={styles.applyBtnText}>
                確認套用情境 ({currentTags.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
    paddingBottom: 24,
    maxHeight: '85%',
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
  headerIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
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
  scrollArea: {
    marginBottom: 12,
  },
  biasResultCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  biasResultCardNormal: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  biasResultCardNegative: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  biasResultCardMax: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  biasHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  biasTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  biasAlertTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  biasPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  biasPillNegative: {
    backgroundColor: '#EF4444',
  },
  biasPillPositive: {
    backgroundColor: '#10B981',
  },
  biasPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  biasAlertNote: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
    marginBottom: 8,
  },
  suggestedActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  suggestedActionText: {
    fontSize: 11,
    color: '#38BDF8',
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  tagsGrid: {
    gap: 8,
    marginBottom: 14,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 12,
    padding: 10,
  },
  tagChipSelected: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: '#38BDF8',
  },
  tagIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  tagInfo: {
    flex: 1,
  },
  tagLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E2E8F0',
    marginBottom: 2,
  },
  tagLabelSelected: {
    color: '#38BDF8',
  },
  tagSub: {
    fontSize: 10,
    color: '#94A3B8',
  },
  checkIcon: {
    marginLeft: 6,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  clearBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  applyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38BDF8',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
});
