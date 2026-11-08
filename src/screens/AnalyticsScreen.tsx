import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons, Feather } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { HabitRecord } from '../types';
import { useApp } from '../context/AppContext';
import { CalendarHeatmap } from '../components/CalendarHeatmap';
import { VideoPlayerModal } from '../components/VideoPlayerModal';
import { authenticateWithBiometrics } from '../services/authService';

export const AnalyticsScreen: React.FC = () => {
  const { records, applyLayoutToWorkspace } = useApp();

  // Selected date for heatmap filter: default to today (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Video player modal state
  const [activeVideoUri, setActiveVideoUri] = useState<string | null>(null);
  const [videoModalVisible, setVideoModalVisible] = useState<boolean>(false);

  // 1. Calculate Today's Stats, Yesterday's Stats, and Weekly Average
  const stats = useMemo(() => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 86400000);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yesterdayStr = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(
      yesterday.getDate()
    )}`;

    const todayRecords = records.filter((r) => r.dateString === todayStr);
    const yesterdayRecords = records.filter((r) => r.dateString === yesterdayStr);

    const todayCount = todayRecords.length;
    const yesterdayCount = yesterdayRecords.length;

    // Diff
    const diff = todayCount - yesterdayCount;
    let diffText = '持平';
    let diffColor = THEME.colors.textSecondary;
    if (diff > 0) {
      diffText = `多 ${diff} 次 ↗`;
      diffColor = THEME.colors.primaryLight;
    } else if (diff < 0) {
      diffText = `少 ${Math.abs(diff)} 次 ↘`;
      diffColor = THEME.colors.success;
    }

    // Weekly Average (past 7 days)
    const sevenDaysAgo = today.getTime() - 7 * 86400000;
    const last7DaysRecords = records.filter((r) => r.timestamp >= sevenDaysAgo);
    const weeklyAverage = (last7DaysRecords.length / 7).toFixed(1);

    // Total Duration Today
    const todayDurationSecs = todayRecords.reduce((acc, r) => acc + r.durationSeconds, 0);
    const todayDurationMins = Math.round(todayDurationSecs / 60);

    return {
      todayCount,
      diffText,
      diffColor,
      weeklyAverage,
      todayDurationMins,
    };
  }, [records, todayStr]);

  // Filter records for currently selected date
  const selectedDateRecords = useMemo(() => {
    return records.filter((r) => r.dateString === selectedDate);
  }, [records, selectedDate]);

  // Media Unlock with Biometrics
  const handleWatchVideo = async (videoUri: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const authResult = await authenticateWithBiometrics('請進行生物辨識以解鎖機密錄影');

    if (authResult.success) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      setActiveVideoUri(videoUri);
      setVideoModalVisible(true);
    } else {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      Alert.alert(
        '解鎖失敗',
        '生物辨識未通過或已取消，機密視訊已受到安全保護。',
        [
          { text: '重新驗證', onPress: () => handleWatchVideo(videoUri) },
          {
            text: '直接觀看 (測試模式)',
            onPress: () => {
              setActiveVideoUri(videoUri);
              setVideoModalVisible(true);
            },
          },
          { text: '關閉', style: 'cancel' },
        ]
      );
    }
  };

  // Apply Layout / 一鍵復刻
  const handleApplyLayout = async (record: HabitRecord) => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    applyLayoutToWorkspace(record.splitConfig);
  };

  const renderRecordItem = ({ item }: { item: HabitRecord }) => {
    const mins = Math.floor(item.durationSeconds / 60);
    const secs = item.durationSeconds % 60;
    const isSplit = item.layoutMode === 'split_view';

    return (
      <View style={styles.recordCard}>
        <View style={styles.recordHeader}>
          <View style={styles.timeTag}>
            <Ionicons name="time-outline" size={14} color={THEME.colors.primaryLight} />
            <Text style={styles.timeText}>{item.timeString}</Text>
          </View>
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>
              {mins > 0 ? `${mins} 分 ` : ''}{secs} 秒
            </Text>
          </View>
        </View>

        {/* Layout description */}
        <View style={styles.layoutInfoRow}>
          <Feather
            name={isSplit ? 'columns' : 'maximize'}
            size={14}
            color={THEME.colors.textSecondary}
          />
          <Text style={styles.layoutText}>
            {isSplit
              ? `上下分割：${item.splitConfig.topWidget} + ${item.splitConfig.bottomWidget} (${Math.round(
                  item.splitConfig.topRatio * 100
                )}% 比例)`
              : '全螢幕計時器'}
          </Text>
        </View>

        {/* Actions Row */}
        <View style={styles.recordActionsRow}>
          {/* Watch video button (if videoUri exists) */}
          {item.videoUri ? (
            <TouchableOpacity
              style={styles.watchVideoBtn}
              onPress={() => handleWatchVideo(item.videoUri!)}
              activeOpacity={0.8}
            >
              <Ionicons name="lock-closed" size={14} color="#FFFFFF" />
              <Text style={styles.watchVideoBtnText}>🔒 觀看錄影</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.noVideoPlaceholder}>
              <Text style={styles.noVideoText}>無背景錄影</Text>
            </View>
          )}

          {/* Apply Layout / 一鍵復刻 Button */}
          <TouchableOpacity
            style={styles.applyLayoutBtn}
            onPress={() => handleApplyLayout(item)}
            activeOpacity={0.8}
          >
            <Feather name="copy" size={13} color={THEME.colors.primaryLight} />
            <Text style={styles.applyLayoutBtnText}>一鍵復刻佈局</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>健康分析儀表板</Text>
        <Text style={styles.pageSubtitle}>本地數據統計與習慣趨勢</Text>
      </View>

      <FlatList
        data={selectedDateRecords}
        keyExtractor={(item) => item.id}
        renderItem={renderRecordItem}
        contentContainerStyle={styles.scrollList}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* 1. Today Stats Card */}
            <View style={styles.statsCard}>
              <View style={styles.statsCardTop}>
                <Text style={styles.cardHeaderTitle}>今日狀態指標</Text>
                <View style={styles.offlineShield}>
                  <Ionicons name="shield-checkmark" size={12} color={THEME.colors.success} />
                  <Text style={styles.offlineShieldText}>本地隱私</Text>
                </View>
              </View>

              <View style={styles.statsGrid}>
                {/* Metric 1: Today's count */}
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>今日次數</Text>
                  <Text style={styles.metricValue}>{stats.todayCount} 次</Text>
                  <Text style={[styles.metricSub, { color: stats.diffColor }]}>
                    與昨日相比：{stats.diffText}
                  </Text>
                </View>

                {/* Metric 2: Weekly average */}
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>本週日均</Text>
                  <Text style={styles.metricValue}>{stats.weeklyAverage} 次/天</Text>
                  <Text style={styles.metricSub}>近 7 日生活節奏</Text>
                </View>
              </View>

              {/* Today duration banner */}
              <View style={styles.durationBanner}>
                <Ionicons name="hourglass-outline" size={14} color={THEME.colors.primaryLight} />
                <Text style={styles.durationBannerText}>
                  今日累計專注時長：{stats.todayDurationMins} 分鐘
                </Text>
              </View>
            </View>

            {/* 2. Calendar Heatmap */}
            <View style={styles.heatmapWrapper}>
              <CalendarHeatmap
                records={records}
                selectedDate={selectedDate}
                onSelectDate={(date) => setSelectedDate(date)}
              />
            </View>

            {/* 3. Section Title for Selected Date */}
            <View style={styles.recordsSectionHeader}>
              <Text style={styles.recordsSectionTitle}>
                {selectedDate === todayStr ? '今日紀錄清單' : `${selectedDate} 紀錄清單`}
              </Text>
              <Text style={styles.recordsSectionCount}>
                共 {selectedDateRecords.length} 筆
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyRecords}>
            <Ionicons name="calendar-outline" size={40} color={THEME.colors.textMuted} />
            <Text style={styles.emptyRecordsTitle}>該日期無活動紀錄</Text>
            <Text style={styles.emptyRecordsSub}>
              點擊熱點圖上的其他有色日期，或至「尻尻」頁面展開新體驗
            </Text>
          </View>
        }
      />

      {/* Biometric-Unlocked Video Player Modal */}
      <VideoPlayerModal
        visible={videoModalVisible}
        videoUri={activeVideoUri}
        onClose={() => {
          setVideoModalVisible(false);
          setActiveVideoUri(null);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.text,
    letterSpacing: 0.5,
  },
  pageSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  scrollList: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Space for bottom dock
  },
  listHeader: {
    gap: 16,
    marginBottom: 8,
  },
  statsCard: {
    backgroundColor: THEME.colors.surface,
    padding: 18,
    borderRadius: THEME.radius.xl,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
  },
  statsCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  offlineShield: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.radius.full,
  },
  offlineShieldText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.success,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metricItem: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceSubtle,
    padding: 14,
    borderRadius: THEME.radius.md,
  },
  metricLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.text,
    marginBottom: 4,
  },
  metricSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  durationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.radius.sm,
  },
  durationBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.primaryLight,
  },
  heatmapWrapper: {},
  recordsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  recordsSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  recordsSectionCount: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  recordCard: {
    backgroundColor: THEME.colors.surface,
    padding: 16,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
    marginBottom: 12,
    gap: 10,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  durationBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: THEME.radius.full,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primaryLight,
  },
  layoutInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  layoutText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  recordActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    gap: 8,
  },
  watchVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.md,
  },
  watchVideoBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  noVideoPlaceholder: {
    paddingVertical: 6,
  },
  noVideoText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  applyLayoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
  },
  applyLayoutBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primaryLight,
  },
  emptyRecords: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  emptyRecordsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginTop: 6,
  },
  emptyRecordsSub: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
  },
});
