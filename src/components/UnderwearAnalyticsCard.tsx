import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { HabitRecord, UnderwearCheckInRecord, UnderwearCutPerformance } from '../types';
import { underwearService } from '../services/underwearService';
import { underwear3DService } from '../services/underwear3DService';

interface UnderwearAnalyticsCardProps {
  records: HabitRecord[];
  onOpen3DTryOn?: () => void;
  onOpenWardrobe?: () => void;
}

export const UnderwearAnalyticsCard: React.FC<UnderwearAnalyticsCardProps> = ({
  records,
  onOpen3DTryOn,
  onOpenWardrobe,
}) => {
  const [performances, setPerformances] = useState<UnderwearCutPerformance[]>([]);
  const [selectedCutIdx, setSelectedCutIdx] = useState<number>(0);

  useEffect(() => {
    void underwearService.getCheckIns().then((checkIns: UnderwearCheckInRecord[]) => {
      const stats = underwear3DService.getUnderwearCutPerformance(records, checkIns);
      setPerformances(stats);
    });
  }, [records]);

  if (performances.length === 0) return null;

  const currentCut = performances[selectedCutIdx] || performances[0];

  return (
    <View style={styles.cardContainer}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="chart-bell-curve-cumulative" size={18} color="#60A5FA" />
          </View>
          <View>
            <View style={styles.titleBadgeRow}>
              <Text style={styles.cardTitle}>內褲版型與生理表現關聯</Text>
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>3D 穿搭大數據</Text>
              </View>
            </View>
            <Text style={styles.cardSubtitle}>
              版型剪裁 · 囊袋張力 · 評鑑團好感度分析
            </Text>
          </View>
        </View>

        {onOpen3DTryOn && (
          <TouchableOpacity
            style={styles.tryOnBtn}
            onPress={() => {
              try { Haptics.selectionAsync(); } catch {}
              onOpen3DTryOn();
            }}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="cube-scan" size={14} color="#FFFFFF" />
            <Text style={styles.tryOnBtnText}>3D 試穿</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Cut Type Selection Tabs */}
      <View style={styles.tabRow}>
        {performances.map((perf, idx) => {
          const isSelected = idx === selectedCutIdx;
          const isPositive = perf.panelRatingDeltaPercent >= 0;
          return (
            <TouchableOpacity
              key={perf.cutType}
              style={[styles.tabItem, isSelected && styles.tabItemActive]}
              onPress={() => {
                try { Haptics.selectionAsync(); } catch {}
                setSelectedCutIdx(idx);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, isSelected && styles.tabTextActive]}>
                {perf.cutType}
              </Text>
              <Text
                style={[
                  styles.tabDeltaText,
                  { color: isPositive ? '#34D399' : '#F87171' },
                ]}
              >
                {isPositive ? `+${perf.panelRatingDeltaPercent}%` : `${perf.panelRatingDeltaPercent}%`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Performance Metric Grid for Current Cut */}
      <View style={styles.metricGrid}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>平均耐力持時</Text>
          <Text style={styles.metricValue}>
            {Math.floor(currentCut.avgDurationSec / 60)} 分 {currentCut.avgDurationSec % 60} 秒
          </Text>
          <Text style={styles.metricSub}>
            較常態延長 {currentCut.panelRatingDeltaPercent >= 0 ? `+${Math.round(currentCut.panelRatingDeltaPercent * 0.12)}m` : '-1m'}
          </Text>
        </View>

        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>評鑑團熱度增幅</Text>
          <Text
            style={[
              styles.metricValue,
              { color: currentCut.panelRatingDeltaPercent >= 0 ? '#34D399' : '#F87171' },
            ]}
          >
            {currentCut.panelRatingDeltaPercent >= 0
              ? `+${currentCut.panelRatingDeltaPercent}% ↗`
              : `${currentCut.panelRatingDeltaPercent}% ↘`}
          </Text>
          <Text style={styles.metricSub}>虛擬評審正面反饋</Text>
        </View>

        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>急停掌控穩定度</Text>
          <Text style={styles.metricValue}>
            {currentCut.avgEdgeCount} 次/輪
          </Text>
          <Text style={styles.metricSub}>骨盆神經警覺閾值</Text>
        </View>
      </View>

      {/* Actionable Report Card Callout */}
      <View style={styles.reportCallout}>
        <View style={styles.calloutHeader}>
          <Ionicons name="sparkles" size={14} color="#F59E0B" />
          <Text style={styles.calloutTitle}>戰力分析報告：{currentCut.cutName}</Text>
        </View>
        <Text style={styles.calloutDesc}>{currentCut.recommendation}</Text>
      </View>

      {/* Wardrobe Check-in Shortcut Footer */}
      {onOpenWardrobe && (
        <TouchableOpacity style={styles.wardrobeFooterBtn} onPress={onOpenWardrobe} activeOpacity={0.8}>
          <MaterialCommunityIcons name="tshirt-v-outline" size={15} color="#60A5FA" />
          <Text style={styles.wardrobeFooterText}>新增今日內褲實穿打卡記錄</Text>
          <Ionicons name="chevron-forward" size={13} color="#60A5FA" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  aiBadge: {
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#60A5FA',
  },
  cardSubtitle: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  tryOnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563EB',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tryOnBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  tabItem: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3B82F6',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#60A5FA',
    fontWeight: '900',
  },
  tabDeltaText: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#070C18',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  metricLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  metricSub: {
    fontSize: 9,
    color: '#64748B',
  },
  reportCallout: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    marginBottom: 10,
  },
  calloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  calloutTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
  },
  calloutDesc: {
    fontSize: 11,
    color: '#FEF3C7',
    lineHeight: 16,
  },
  wardrobeFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  wardrobeFooterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#60A5FA',
  },
});
