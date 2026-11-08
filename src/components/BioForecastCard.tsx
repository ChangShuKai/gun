import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME } from '../constants/theme';
import { HabitRecord, BioForecast, StaminaStatus } from '../types';
import { bioCycleService } from '../services/bioCycleService';

interface BioForecastCardProps {
  records: HabitRecord[];
  onOpenPledgeModal?: () => void;
}

const STATUS_CONFIG: Record<
  StaminaStatus,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  PEAK: {
    label: '蓄能波峰',
    color: '#EC4899',
    bgColor: 'rgba(236, 72, 153, 0.15)',
    icon: 'flash',
  },
  BALANCED: {
    label: '黃金耐力',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    icon: 'shield-checkmark',
  },
  FATIGUED: {
    label: '微疲勞期',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    icon: 'hourglass',
  },
  OVERHEATED: {
    label: '系統過熱',
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    icon: 'flame',
  },
};

export const BioForecastCard: React.FC<BioForecastCardProps> = ({
  records,
  onOpenPledgeModal,
}) => {
  const forecast: BioForecast = useMemo(() => {
    return bioCycleService.calculateForecast(records);
  }, [records]);

  const cfg = STATUS_CONFIG[forecast.staminaStatus];

  const handlePledgePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    if (onOpenPledgeModal) {
      onOpenPledgeModal();
    }
  };

  return (
    <View style={[styles.card, { borderColor: cfg.color + '66' }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconCircle, { backgroundColor: cfg.bgColor }]}>
            <Ionicons name={cfg.icon as keyof typeof Ionicons.glyphMap} size={18} color={cfg.color} />
          </View>
          <View>
            <Text style={styles.title}>生理耐力與慾望波動預報</Text>
            <Text style={styles.subtitle}>近 14 日多維海綿體蓄能對數模型</Text>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: cfg.bgColor, borderColor: cfg.color }]}>
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      {/* Energy Level Bar */}
      <View style={styles.energySection}>
        <View style={styles.energyHeader}>
          <Text style={styles.energyLabel}>當前海綿體蓄能飽和度</Text>
          <Text style={[styles.energyValue, { color: cfg.color }]}>
            {forecast.energyPercentage}%
          </Text>
        </View>

        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              {
                width: `${forecast.energyPercentage}%`,
                backgroundColor: cfg.color,
              },
            ]}
          />
        </View>
      </View>

      {/* Forecast Text Banner */}
      <View style={[styles.forecastBanner, { backgroundColor: cfg.bgColor }]}>
        <Text style={styles.forecastText}>{forecast.forecastText}</Text>
      </View>

      {/* Quick Metrics Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>休整間隔</Text>
          <Text style={styles.metricValue}>{forecast.hoursSinceLastSession}h</Text>
          <Text style={styles.metricSub}>上次釋放流逝</Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>建議時長</Text>
          <Text style={[styles.metricValue, { color: '#60A5FA' }]}>
            {forecast.recommendedDurationMin}m
          </Text>
          <Text style={styles.metricSub}>耐力平衡目標</Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>均場急停</Text>
          <Text style={styles.metricValue}>{forecast.avgEdgeCount}次</Text>
          <Text style={styles.metricSub}>Edge 控煞深度</Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>睡前頻率</Text>
          <Text style={styles.metricValue}>{forecast.bedtimeSessionsCount}次</Text>
          <Text style={styles.metricSub}>21:00~04:00</Text>
        </View>
      </View>

      {/* Window recommendation footnote */}
      <View style={styles.windowRow}>
        <MaterialCommunityIcons name="clock-time-four-outline" size={14} color="#94A3B8" />
        <Text style={styles.windowText}>推薦窗口：{forecast.nextIdealWindowText}</Text>
      </View>

      {/* Pledge Challenge Action */}
      {onOpenPledgeModal && (
        <TouchableOpacity
          style={styles.pledgeBtn}
          onPress={handlePledgePress}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="sword-cross" size={16} color="#0F172A" />
          <Text style={styles.pledgeBtnText}>立下自律契約賭局 (Pledge Bet)</Text>
          <Ionicons name="chevron-forward" size={16} color="#0F172A" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F172A',
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
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
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  energySection: {
    marginBottom: 12,
  },
  energyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  energyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  energyValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  barTrack: {
    height: 8,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  forecastBanner: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  forecastText: {
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 18,
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#131D33',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F1F5F9',
  },
  metricSub: {
    fontSize: 8,
    color: '#94A3B8',
    marginTop: 2,
  },
  windowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  windowText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  pledgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F59E0B',
    paddingVertical: 11,
    borderRadius: 10,
  },
  pledgeBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
});
