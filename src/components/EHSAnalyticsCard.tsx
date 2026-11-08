import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { HabitRecord, EHSRecord, EHSBioCorrelation } from '../types';
import { ehsService, EHS_LEVEL_METADATA } from '../services/ehsService';
import { EHSSelectorModal } from './EHSSelectorModal';

interface EHSAnalyticsCardProps {
  records: HabitRecord[];
  onOpenFitting3D?: () => void;
}

export const EHSAnalyticsCard: React.FC<EHSAnalyticsCardProps> = ({
  records,
  onOpenFitting3D,
}) => {
  const [ehsList, setEhsList] = useState<EHSRecord[]>([]);
  const [correlation, setCorrelation] = useState<EHSBioCorrelation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedIntervalIdx, setSelectedIntervalIdx] = useState<number>(3); // Default 48~72h

  const loadData = useCallback(async () => {
    const list = await ehsService.getRecords();
    setEhsList(list);
    const stats = ehsService.analyzeBioCycleCorrelation(list, records);
    setCorrelation(stats);
  }, [records]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  if (!correlation) return null;

  const currentInterval = correlation.intervals[selectedIntervalIdx] || correlation.intervals[0];
  const latestEhs = ehsList.length > 0 ? ehsList[0] : null;
  const latestMeta = latestEhs ? EHS_LEVEL_METADATA[latestEhs.level] : EHS_LEVEL_METADATA[4];

  return (
    <View style={styles.cardContainer}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="speedometer" size={18} color="#EF4444" />
          </View>
          <View>
            <Text style={styles.cardTitle}>EHS 國際硬度評級與蓄能效率</Text>
            <Text style={styles.cardSubtitle}>Erection Hardness Score & Recharge Peak</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logBtn}
          activeOpacity={0.75}
          onPress={() => {
            try {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {}
            setIsModalOpen(true);
          }}
        >
          <Ionicons name="add-circle-outline" size={15} color="#60A5FA" />
          <Text style={styles.logBtnText}>評估記錄</Text>
        </TouchableOpacity>
      </View>

      {/* Top Stat Badges */}
      <View style={styles.statGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>最近評估硬度</Text>
          <View style={styles.statValueRow}>
            <Text style={[styles.statValue, { color: latestMeta.color }]}>
              Level {latestEhs ? latestEhs.level : 4}
            </Text>
            <View style={[styles.analogyPill, { backgroundColor: latestMeta.color }]}>
              <Text style={styles.analogyPillText}>{latestMeta.analogy}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>巔峰 4 級機率</Text>
          <View style={styles.statValueRow}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {correlation.peakProbability}%
            </Text>
            <Text style={styles.statSubText}>(蓄能 {correlation.peakHoursRange})</Text>
          </View>
        </View>
      </View>

      {/* Recharge Hours vs Level 4 Rate Graph */}
      <View style={styles.chartSection}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartSectionTitle}>禁慾蓄能時長 vs Level 4 堅硬達成率</Text>
          <Text style={styles.chartLegend}>點擊切換區間</Text>
        </View>

        <View style={styles.barsRow}>
          {correlation.intervals.map((item, idx) => {
            const isSelected = idx === selectedIntervalIdx;
            const barHeight = Math.max(16, (item.level4Rate / 100) * 85);
            const isPeak = idx === 3; // 48~72h

            return (
              <TouchableOpacity
                key={`interval_${item.rangeLabel}`}
                style={styles.barCol}
                activeOpacity={0.7}
                onPress={() => {
                  try {
                    void Haptics.selectionAsync();
                  } catch {}
                  setSelectedIntervalIdx(idx);
                }}
              >
                <Text style={[styles.rateLabel, isSelected && styles.rateLabelSelected]}>
                  {item.level4Rate}%
                </Text>

                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: barHeight,
                        backgroundColor: isPeak
                          ? '#EF4444'
                          : isSelected
                          ? '#3B82F6'
                          : '#475569',
                      },
                    ]}
                  />
                </View>

                <Text style={[styles.rangeText, isSelected && styles.rangeTextSelected]}>
                  {item.rangeLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Interval Detail Card */}
        <View style={styles.intervalDetailBox}>
          <View style={styles.detailLeft}>
            <Text style={styles.detailTitle}>
              蓄能區間：<Text style={styles.detailHighlight}>{currentInterval.rangeLabel}</Text>
            </Text>
            <Text style={styles.detailDesc}>
              平均硬度：Level {currentInterval.avgLevel}・樣本數：{currentInterval.sampleCount} 次訓練
            </Text>
          </View>
          <View style={styles.detailRight}>
            <Text style={styles.detailRate}>{currentInterval.level4Rate}%</Text>
            <Text style={styles.detailRateLabel}>Level 4 達成率</Text>
          </View>
        </View>
      </View>

      {/* Physiological Peak Recommendation Box */}
      <View style={styles.peakBox}>
        <View style={styles.peakIconCircle}>
          <MaterialCommunityIcons name="lightning-bolt" size={16} color="#F59E0B" />
        </View>
        <View style={styles.peakContent}>
          <Text style={styles.peakTitle}>演算法個人硬度巔峰推估：</Text>
          <Text style={styles.peakText}>
            在禁慾蓄能 <Text style={styles.peakBold}>{correlation.peakHoursRange}</Text> 區間內，充血硬度維持在 Level 4 橡木堅硬的機率高達 <Text style={styles.peakBold}>{correlation.peakProbability}%</Text>，平均達到巔峰僅需 {correlation.avgTimeToPeakSec} 秒。
          </Text>
        </View>
      </View>

      {/* 3D Link CTA */}
      {onOpenFitting3D && (
        <TouchableOpacity
          style={styles.model3DLink}
          activeOpacity={0.75}
          onPress={() => {
            try {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {}
            onOpenFitting3D();
          }}
        >
          <MaterialCommunityIcons name="cube-scan" size={16} color="#60A5FA" />
          <Text style={styles.model3DLinkText}>於 3D 擬真模型預覽 EHS 4 級青筋充血效果</Text>
          <Ionicons name="chevron-forward" size={14} color="#60A5FA" />
        </TouchableOpacity>
      )}

      {/* Selector Modal */}
      <EHSSelectorModal
        visible={isModalOpen}
        initialLevel={latestEhs ? latestEhs.level : 4}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => {
          void loadData();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
  },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  logBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#60A5FA',
  },
  statGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 4,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  analogyPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  analogyPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statSubText: {
    fontSize: 11,
    color: '#64748B',
  },
  chartSection: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  chartLegend: {
    fontSize: 11,
    color: '#64748B',
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    marginBottom: 10,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  rateLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  rateLabelSelected: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  barTrack: {
    width: 22,
    height: 85,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  rangeText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
  },
  rangeTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  intervalDetailBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  detailLeft: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
    marginBottom: 2,
  },
  detailHighlight: {
    color: '#38BDF8',
  },
  detailDesc: {
    fontSize: 11,
    color: '#94A3B8',
  },
  detailRight: {
    alignItems: 'flex-end',
  },
  detailRate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  detailRateLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  peakBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  peakIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  peakContent: {
    flex: 1,
  },
  peakTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FBBF24',
    marginBottom: 2,
  },
  peakText: {
    fontSize: 12,
    color: '#FDE68A',
    lineHeight: 17,
  },
  peakBold: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  model3DLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  model3DLinkText: {
    flex: 1,
    fontSize: 12,
    color: '#60A5FA',
    fontWeight: '600',
    marginLeft: 8,
  },
});
