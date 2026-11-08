import React, { useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { HabitRecord } from '../types';

interface SleepStatsCardProps {
  records: HabitRecord[];
  currentDateStr?: string;
}

export const SleepStatsCard: React.FC<SleepStatsCardProps> = ({
  records,
  currentDateStr,
}) => {
  const stats = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const todayStr = currentDateStr || `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const yesterday = new Date(now.getTime() - 86400000);
    const yesterdayStr = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;

    // A session is considered "bedtime / 睡前" if hour is >= 21 or hour < 4 (21:00 ~ 03:59)
    const isBedtimeHour = (timeString: string, timestamp: number) => {
      if (timeString && timeString.includes(':')) {
        const parts = timeString.split(':');
        const hour = parseInt(parts[0], 10);
        if (!isNaN(hour)) {
          return hour >= 21 || hour < 4;
        }
      }
      const date = new Date(timestamp);
      const h = date.getHours();
      return h >= 21 || h < 4;
    };

    const getSessionHour = (r: HabitRecord): number => {
      if (r.timeString && r.timeString.includes(':')) {
        const h = parseInt(r.timeString.split(':')[0], 10);
        if (!isNaN(h)) return h;
      }
      return new Date(r.timestamp).getHours();
    };

    // 1. Bedtime sessions today
    const todayBedtime = records.filter(
      (r) => r.dateString === todayStr && isBedtimeHour(r.timeString, r.timestamp)
    );
    const todayBedtimeCount = todayBedtime.length;

    // 2. Bedtime sessions yesterday
    const yesterdayBedtime = records.filter(
      (r) => r.dateString === yesterdayStr && isBedtimeHour(r.timeString, r.timestamp)
    );
    const yesterdayBedtimeCount = yesterdayBedtime.length;

    // 3. Difference
    const diff = todayBedtimeCount - yesterdayBedtimeCount;
    let diffText = '與昨日持平';
    let diffColor = THEME.colors.textSecondary;
    if (diff > 0) {
      diffText = `較昨日 +${diff} 次 ↗`;
      diffColor = '#F59E0B'; // warm warning/alert
    } else if (diff < 0) {
      diffText = `較昨日 -${Math.abs(diff)} 次 ↘`;
      diffColor = THEME.colors.success;
    }

    // 4. Past 7 days bedtime stats
    const sevenDaysAgo = now.getTime() - 7 * 86400000;
    const past7DaysRecords = records.filter((r) => r.timestamp >= sevenDaysAgo);
    const past7DaysBedtime = past7DaysRecords.filter((r) =>
      isBedtimeHour(r.timeString, r.timestamp)
    );
    const weeklyAverage = (past7DaysBedtime.length / 7).toFixed(1);

    // Bedtime ratio over total sessions in past 7 days
    const total7DaysCount = past7DaysRecords.length;
    const bedtimeRatioPct =
      total7DaysCount > 0
        ? Math.round((past7DaysBedtime.length / total7DaysCount) * 100)
        : 0;

    // 5. Hourly distribution across bedtime window (21, 22, 23, 00, 01, 02, 03)
    const hoursOrder = [21, 22, 23, 0, 1, 2, 3];
    const hourLabels: Record<number, string> = {
      21: '21h',
      22: '22h',
      23: '23h',
      0: '00h',
      1: '01h',
      2: '02h',
      3: '03h',
    };

    const hourlyCounts: Record<number, number> = {
      21: 0,
      22: 0,
      23: 0,
      0: 0,
      1: 0,
      2: 0,
      3: 0,
    };

    for (const r of past7DaysBedtime) {
      const h = getSessionHour(r);
      if (hoursOrder.includes(h)) {
        hourlyCounts[h] = (hourlyCounts[h] || 0) + 1;
      }
    }

    const maxCount = Math.max(...Object.values(hourlyCounts), 1);

    // Peak hour
    let peakHour = 23;
    let maxHourCount = -1;
    for (const h of hoursOrder) {
      if (hourlyCounts[h] > maxHourCount) {
        maxHourCount = hourlyCounts[h];
        peakHour = h;
      }
    }

    const peakHourText =
      maxHourCount > 0
        ? `🔥 本週睡前高峰時段：${hourLabels[peakHour]} (${maxHourCount} 次)`
        : '🌙 本週尚未累積足夠睡前數據';

    return {
      todayBedtimeCount,
      yesterdayBedtimeCount,
      diffText,
      diffColor,
      weeklyAverage,
      bedtimeRatioPct,
      hoursOrder,
      hourLabels,
      hourlyCounts,
      maxCount,
      peakHourText,
    };
  }, [records, currentDateStr]);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconBox}>
            <Ionicons name="moon" size={16} color="#A78BFA" />
          </View>
          <View>
            <Text style={styles.title}>睡前頻率統計</Text>
            <Text style={styles.subtitle}>每日 21:00 ~ 04:00 深度入眠前釋放監控</Text>
          </View>
        </View>
        <View style={styles.badge}>
          <MaterialCommunityIcons name="weather-night" size={12} color="#C4B5FD" />
          <Text style={styles.badgeText}>深夜模式</Text>
        </View>
      </View>

      {/* Grid: Today vs Weekly */}
      <View style={styles.grid}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>今日睡前次數</Text>
          <View style={styles.metricValueRow}>
            <Text style={styles.metricValue}>{stats.todayBedtimeCount}</Text>
            <Text style={styles.metricUnit}>次</Text>
          </View>
          <Text style={[styles.metricSub, { color: stats.diffColor }]}>
            {stats.diffText}
          </Text>
        </View>

        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>本週睡前日均</Text>
          <View style={styles.metricValueRow}>
            <Text style={styles.metricValue}>{stats.weeklyAverage}</Text>
            <Text style={styles.metricUnit}>次/天</Text>
          </View>
          <Text style={styles.metricSub}>
            佔全部釋放 {stats.bedtimeRatioPct}%
          </Text>
        </View>
      </View>

      {/* Hourly Bar Chart Distribution */}
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>睡前時段頻率分佈 (近 7 日)</Text>
          <Text style={styles.chartSub}>21:00 ~ 03:59</Text>
        </View>

        <View style={styles.barsRow}>
          {stats.hoursOrder.map((hour) => {
            const count = stats.hourlyCounts[hour] || 0;
            const barHeightPct = Math.max(12, (count / stats.maxCount) * 100);
            const isPeak = count === stats.maxCount && count > 0;

            return (
              <View key={hour} style={styles.barCol}>
                <Text style={styles.barCountText}>{count > 0 ? count : ''}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${barHeightPct}%` },
                      isPeak && styles.barFillPeak,
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, isPeak && styles.barLabelPeak]}>
                  {stats.hourLabels[hour]}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Peak insight banner */}
      <View style={styles.insightBanner}>
        <Ionicons name="sparkles" size={13} color="#C4B5FD" />
        <Text style={styles.insightText}>{stats.peakHourText}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(23, 23, 43, 0.92)',
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.22)',
    marginBottom: 14,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(167, 139, 250, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F1F5F9',
  },
  subtitle: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.radius.full,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DDD6FE',
  },
  grid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  metricBox: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  metricLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginVertical: 4,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  metricUnit: {
    fontSize: 12,
    color: '#A78BFA',
    fontWeight: '700',
  },
  metricSub: {
    fontSize: 10,
    fontWeight: '600',
  },
  chartContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 10,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  chartTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  chartSub: {
    fontSize: 10,
    color: '#64748B',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 75,
    paddingTop: 8,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barCountText: {
    fontSize: 9,
    color: '#C4B5FD',
    fontWeight: '800',
    marginBottom: 2,
  },
  barTrack: {
    width: 14,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: 'rgba(167, 139, 250, 0.45)',
    borderRadius: 7,
  },
  barFillPeak: {
    backgroundColor: '#A78BFA',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  barLabel: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  barLabelPeak: {
    color: '#DDD6FE',
    fontWeight: '800',
  },
  insightBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.25)',
  },
  insightText: {
    fontSize: 11,
    color: '#E2E8F0',
    fontWeight: '700',
  },
});
