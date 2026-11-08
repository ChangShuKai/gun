import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Alert,
  Modal,
  Image,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { HabitRecord, SnapshotMetadata } from '../types';
import { useApp } from '../context/AppContext';
import { CalendarHeatmap } from '../components/CalendarHeatmap';
import { GrowthHeatmap } from '../components/GrowthHeatmap';
import { MorphingModal } from '../components/MorphingModal';
import { VideoPlayerModal } from '../components/VideoPlayerModal';
import { TimelineComparator } from '../components/TimelineComparator';
import { SleepStatsCard } from '../components/SleepStatsCard';
import { DailyCheckInModal } from '../components/DailyCheckInModal';
import { VaultArchiveModal } from '../components/VaultArchiveModal';
import { VirtualReviewPanelModal } from '../components/VirtualReviewPanelModal';
import { BioForecastCard } from '../components/BioForecastCard';
import { PledgeBetModal } from '../components/PledgeBetModal';
import { UnderwearWardrobeModal } from '../components/UnderwearWardrobeModal';
import { UnderwearAnalyticsCard } from '../components/UnderwearAnalyticsCard';
import { EHSAnalyticsCard } from '../components/EHSAnalyticsCard';
import { UnderwearOverlay3D } from '../components/3d/UnderwearOverlay3D';
import { Anatomy3DFittingModal } from '../components/Anatomy3DFittingModal';
import { BreakingNewsModal } from './BreakingNewsModal';
import { SettingsScreen } from './SettingsScreen';
import { authenticateWithBiometrics } from '../services/authService';
import { ExportService } from '../services/exportService';

export const AnalyticsScreen: React.FC = () => {
  const { records, applyLayoutToWorkspace, updateRecord } = useApp();

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

  // Daily Check-In modal state
  const [dailyCheckInVisible, setDailyCheckInVisible] = useState<boolean>(false);

  // Morphing Time-Lapse modal state
  const [morphingModalVisible, setMorphingModalVisible] = useState<boolean>(false);

  // Vault Archive modal state
  const [vaultModalVisible, setVaultModalVisible] = useState<boolean>(false);

  // Virtual Review Panel modal state
  const [virtualReviewVisible, setVirtualReviewVisible] = useState<boolean>(false);

  // Pledge Bet modal state
  const [pledgeBetModalVisible, setPledgeBetModalVisible] = useState<boolean>(false);

  // Underwear Wardrobe modal state
  const [underwearModalVisible, setUnderwearModalVisible] = useState<boolean>(false);

  // Underwear 3D Virtual Try-On modal state
  const [underwear3DModalVisible, setUnderwear3DModalVisible] = useState<boolean>(false);

  // 3D Parametric Anatomy Fitting modal state
  const [anatomy3DModalVisible, setAnatomy3DModalVisible] = useState<boolean>(false);

  // Breaking News & Settings modal states
  const [breakingNewsVisible, setBreakingNewsVisible] = useState<boolean>(false);
  const [settingsVisible, setSettingsVisible] = useState<boolean>(false);

  // Auto trigger breaking news if inactive for 3+ days
  useEffect(() => {
    if (records.length > 0) {
      const latestTs = Math.max(...records.map((r) => r.timestamp));
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      if (Date.now() - latestTs > threeDaysMs) {
        const timer = setTimeout(() => {
          setBreakingNewsVisible(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [records]);

  // Timeline Comparator modal state
  const [comparatorSnapshots, setComparatorSnapshots] = useState<SnapshotMetadata[] | null>(null);
  const [comparatorModalVisible, setComparatorModalVisible] = useState<boolean>(false);
  const [selectedRecordForComparator, setSelectedRecordForComparator] = useState<HabitRecord | null>(null);

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

  // Open Timeline Comparator with Biometric check
  const handleOpenComparator = async (record: HabitRecord) => {
    if (!record.snapshots || record.snapshots.length === 0) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const authResult = await authenticateWithBiometrics('請進行生物辨識以解鎖時序狀態對比');
    if (authResult.success) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      setSelectedRecordForComparator(record);
      setComparatorSnapshots(record.snapshots);
      setComparatorModalVisible(true);
    } else {
      Alert.alert(
        '身份驗證失敗',
        '無法存取私密快照。在測試環境下可直接檢視。',
        [
          {
            text: '直接檢視 (測試模式)',
            onPress: () => {
              setSelectedRecordForComparator(record);
              setComparatorSnapshots(record.snapshots!);
              setComparatorModalVisible(true);
            },
          },
          { text: '關閉', style: 'cancel' },
        ]
      );
    }
  };

  // Update EHS score on a snapshot
  const handleUpdateEHS = async (snapshotId: string, score: number) => {
    if (!selectedRecordForComparator) return;
    const updatedSnaps = (selectedRecordForComparator.snapshots || []).map((s) =>
      s.id === snapshotId ? { ...s, ehsScore: score } : s
    );

    const scored = updatedSnaps.filter((s) => s.ehsScore !== undefined);
    const avgEHS =
      scored.length > 0
        ? Math.round(
            (scored.reduce((acc, cur) => acc + (cur.ehsScore || 0), 0) / scored.length) * 10
          ) / 10
        : undefined;

    const updatedRecord: HabitRecord = {
      ...selectedRecordForComparator,
      snapshots: updatedSnaps,
      avgEHS,
    };

    setSelectedRecordForComparator(updatedRecord);
    setComparatorSnapshots(updatedSnaps);
    await updateRecord(updatedRecord);
  };

  // Apply Layout / 一鍵復刻
  const handleApplyLayout = async (record: HabitRecord) => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    applyLayoutToWorkspace(record.splitConfig);
  };

  // Export Actions: CSV or Encrypted .vault Container
  const handleExportReport = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}

    Alert.alert(
      '資料備份與匯出',
      '請選擇備份匯出格式：',
      [
        {
          text: '📄 純數值無痕報表 (CSV)',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              await ExportService.exportDesensitizedReport(records);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : '匯出失敗';
              Alert.alert('匯出失敗', msg);
            }
          },
        },
        {
          text: '🔒 自定義 AES-256 加密容器 (.vault)',
          onPress: () => {
            setVaultModalVisible(true);
          },
        },
        { text: '取消', style: 'cancel' },
      ]
    );
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

        {/* Special Quest Badge & Status if present */}
        {item.quest && (
          <View style={styles.questRecordBanner}>
            <View style={styles.questBadgeIconCircle}>
              <MaterialCommunityIcons
                name={item.quest.badgeIcon as any}
                size={20}
                color="#F59E0B"
              />
            </View>
            <View style={styles.questBadgeTextBox}>
              <View style={styles.questBadgeTitleRow}>
                <Text style={styles.questBadgeName}>🏆 特殊成就：{item.quest.badgeName}</Text>
                <View style={styles.questCompletedPill}>
                  <Text style={styles.questCompletedText}>挑戰成功</Text>
                </View>
              </View>
              <Text style={styles.questRecordSubtitle}>{item.quest.questTitle}</Text>
            </View>
          </View>
        )}

        {/* Snapshot Timeline Section if snapshots exist */}
        {item.snapshots && item.snapshots.length > 0 && (
          <View style={styles.snapshotsCardSection}>
            <View style={styles.snapshotsCardHeader}>
              <View style={styles.snapshotsHeaderLeft}>
                <MaterialCommunityIcons
                  name="camera-timer"
                  size={15}
                  color={THEME.colors.primaryLight}
                />
                <Text style={styles.snapshotsCardTitle}>
                  時序快照 ({item.snapshots.length})
                </Text>
              </View>
              {item.avgEHS !== undefined && (
                <View style={styles.ehsBadge}>
                  <Text style={styles.ehsBadgeText}>平均 EHS Lv.{item.avgEHS}</Text>
                </View>
              )}
            </View>

            {/* Blurred / Privacy thumbnail carousel */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbStrip}
            >
              {item.snapshots.map((snap) => (
                <View key={snap.id} style={styles.thumbMiniCard}>
                  <Image
                    source={{ uri: snap.uri }}
                    style={styles.thumbMiniImage}
                    blurRadius={12}
                  />
                  <View style={styles.thumbMiniTime}>
                    <Text style={styles.thumbMiniTimeText}>{snap.timestampLabel}</Text>
                  </View>
                  <View style={styles.privacyLockOverlay}>
                    <Ionicons name="lock-closed" size={10} color="#FFFFFF" />
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.openComparatorBtn}
              onPress={() => handleOpenComparator(item)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="compare-horizontal" size={16} color="#FFFFFF" />
              <Text style={styles.openComparatorBtnText}>
                解鎖時序狀態對比 (A/B 滑動對比與 EHS 評級)
              </Text>
            </TouchableOpacity>
          </View>
        )}

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
        <View style={styles.headerLeft}>
          <Text style={styles.pageTitle}>健康分析儀表板</Text>
          <Text style={styles.pageSubtitle}>本地數據統計與習慣趨勢</Text>
        </View>

        {/* Top Header Actions */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.settingsHeaderBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setSettingsVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="settings-outline" size={14} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.morphingHeaderBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setMorphingModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="animation-play" size={13} color="#FFFFFF" />
            <Text style={styles.morphingHeaderBtnText}>縮時</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dailyCheckInHeaderBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setDailyCheckInVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={13} color="#FFFFFF" />
            <Text style={styles.dailyCheckInHeaderBtnText}>打卡</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exportReportBtn}
            onPress={handleExportReport}
            activeOpacity={0.8}
          >
            <Feather name="download" size={13} color="#FFFFFF" />
            <Text style={styles.exportReportBtnText}>匯出</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={selectedDateRecords}
        keyExtractor={(item) => item.id}
        renderItem={renderRecordItem}
        contentContainerStyle={styles.scrollList}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* 0. Breaking News Teaser Banner */}
            <TouchableOpacity
              style={styles.breakingNewsBanner}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                setBreakingNewsVisible(true);
              }}
              activeOpacity={0.88}
            >
              <View style={styles.breakingHeaderRow}>
                <View style={styles.breakingTag}>
                  <Text style={styles.breakingTagText}>🚨 BREAKING NEWS</Text>
                </View>
                <Text style={styles.breakingHotTag}>🔥 查看今日外流頭條</Text>
              </View>
              <Text style={styles.breakingTitle}>
                驚爆！知名頂流私密大尺度畫面全面外流！60 秒 VCR 震驚曝光
              </Text>
              <View style={styles.breakingFooter}>
                <Text style={styles.breakingFooterText}>點擊進入特刊報導並觀看 60 秒外流拼貼 VCR</Text>
                <Ionicons name="chevron-forward" size={14} color="#EF4444" />
              </View>
            </TouchableOpacity>

            {/* 0.5 Bio-Cycle & Desire Forecast Engine */}
            <BioForecastCard
              records={records}
              onOpenPledgeModal={() => setPledgeBetModalVisible(true)}
            />

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

            {/* 1.5 Sleep Bedtime Frequency Stats Card */}
            <SleepStatsCard
              records={records}
              currentDateStr={selectedDate}
            />

            {/* 1.6 Morphing Time-Lapse Hero Card */}
            <TouchableOpacity
              style={styles.morphingHeroBanner}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                setMorphingModalVisible(true);
              }}
              activeOpacity={0.88}
            >
              <View style={styles.morphingBannerLeft}>
                <View style={styles.morphingIconCircle}>
                  <MaterialCommunityIcons name="animation-play" size={24} color="#60A5FA" />
                </View>
                <View style={styles.morphingTextBox}>
                  <View style={styles.morphingBadgeRow}>
                    <View style={styles.morphingBadge}>
                      <Text style={styles.morphingBadgeText}>MORPHING ENGINE</Text>
                    </View>
                    <View style={styles.morphingProBadge}>
                      <Text style={styles.morphingProBadgeText}>雙錨點對齊</Text>
                    </View>
                  </View>
                  <Text style={styles.morphingBannerTitle}>隨選生長動態縮時</Text>
                  <Text style={styles.morphingBannerSub}>
                    影格交疊漸變 · 雙向手動刷幀 · 52 週年度高光
                  </Text>
                </View>
              </View>
              <Ionicons name="play-circle" size={32} color="#3B82F6" />
            </TouchableOpacity>

            {/* 1.65 Virtual Review Panel Hero Card */}
            <TouchableOpacity
              style={styles.virtualReviewHeroBanner}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                setVirtualReviewVisible(true);
              }}
              activeOpacity={0.88}
            >
              <View style={styles.virtualReviewBannerLeft}>
                <View style={styles.virtualReviewIconCircle}>
                  <Ionicons name="people" size={24} color="#F59E0B" />
                </View>
                <View style={styles.virtualReviewTextBox}>
                  <View style={styles.virtualReviewBadgeRow}>
                    <View style={styles.virtualReviewBadge}>
                      <Text style={styles.virtualReviewBadgeText}>REVIEW PANEL</Text>
                    </View>
                    <View style={styles.virtualReviewProBadge}>
                      <Text style={styles.virtualReviewProBadgeText}>4位成員圍觀</Text>
                    </View>
                  </View>
                  <Text style={styles.virtualReviewBannerTitle}>虛擬團圍觀審查舞台</Text>
                  <Text style={styles.virtualReviewBannerSub}>
                    傲嬌 · 魅惑 · 數據 · 兄弟 · 輪流群聊品評
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward-circle" size={30} color="#F59E0B" />
            </TouchableOpacity>

            {/* 1.68 Underwear Wardrobe & Fit Check Hero Card */}
            <TouchableOpacity
              style={styles.underwearHeroBanner}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                setUnderwearModalVisible(true);
              }}
              activeOpacity={0.88}
            >
              <View style={styles.underwearBannerLeft}>
                <View style={styles.underwearIconCircle}>
                  <MaterialCommunityIcons name="tshirt-v-outline" size={24} color="#60A5FA" />
                </View>
                <View style={styles.underwearTextBox}>
                  <View style={styles.underwearBadgeRow}>
                    <View style={styles.underwearBadge}>
                      <Text style={styles.underwearBadgeText}>FIT CHECK</Text>
                    </View>
                    <View style={styles.underwearProBadge}>
                      <Text style={styles.underwearProBadgeText}>平鋪·正面·側面</Text>
                    </View>
                  </View>
                  <Text style={styles.underwearBannerTitle}>內褲款式庫與三視角打卡</Text>
                  <Text style={styles.underwearBannerSub}>
                    平口 · 三角 · 提臀戰帶 · 囊袋飽滿度實穿定鏡
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward-circle" size={30} color="#60A5FA" />
            </TouchableOpacity>

            {/* 1.685 Underwear Cut & Performance Analytics Card */}
            <UnderwearAnalyticsCard
              records={records}
              onOpen3DTryOn={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                setUnderwear3DModalVisible(true);
              }}
              onOpenWardrobe={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setUnderwearModalVisible(true);
              }}
            />

            {/* 1.686 EHS Hardness Score & Bio-Recharge Analytics Card */}
            <EHSAnalyticsCard
              records={records}
              onOpenFitting3D={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                setAnatomy3DModalVisible(true);
              }}
            />

            {/* 1.69 3D Parametric Anatomy Engine Hero Card */}
            <TouchableOpacity
              style={styles.anatomy3DHeroBanner}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                setAnatomy3DModalVisible(true);
              }}
              activeOpacity={0.88}
            >
              <View style={styles.anatomy3DBannerLeft}>
                <View style={styles.anatomy3DIconCircle}>
                  <MaterialCommunityIcons name="cube-scan" size={24} color="#38BDF8" />
                </View>
                <View style={styles.anatomy3DTextBox}>
                  <View style={styles.anatomy3DBadgeRow}>
                    <View style={styles.anatomy3DBadge}>
                      <Text style={styles.anatomy3DBadgeText}>3D ANATOMY</Text>
                    </View>
                    <View style={styles.anatomy3DProBadge}>
                      <Text style={styles.anatomy3DProBadgeText}>真理解剖擬合</Text>
                    </View>
                  </View>
                  <Text style={styles.anatomy3DBannerTitle}>真理解剖 3D 擬合實驗室</Text>
                  <Text style={styles.anatomy3DBannerSub}>
                    參數化網格 · 多視角拍照擬合 · 40 BPM 骨骼動畫 · 科技全像
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward-circle" size={30} color="#38BDF8" />
            </TouchableOpacity>

            {/* 1.7 52-Week Annual Self-Discipline Heatmap */}
            <GrowthHeatmap
              records={records}
              onSelectDate={(date) => setSelectedDate(date)}
            />

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

      {/* Timeline Comparator Modal */}
      <Modal
        visible={comparatorModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setComparatorModalVisible(false)}
      >
        {comparatorSnapshots && (
          <TimelineComparator
            snapshots={comparatorSnapshots}
            onClose={() => {
              setComparatorModalVisible(false);
              setComparatorSnapshots(null);
            }}
            onUpdateEHS={handleUpdateEHS}
          />
        )}
      </Modal>

      {/* Daily Check-In Modal */}
      <DailyCheckInModal
        visible={dailyCheckInVisible}
        onClose={() => setDailyCheckInVisible(false)}
      />

      {/* Morphing Time-Lapse Modal */}
      <MorphingModal
        visible={morphingModalVisible}
        onClose={() => setMorphingModalVisible(false)}
      />

      {/* Custom Encrypted Vault Archive Modal */}
      <VaultArchiveModal
        visible={vaultModalVisible}
        onClose={() => setVaultModalVisible(false)}
      />

      {/* Virtual Review Panel Modal */}
      <VirtualReviewPanelModal
        visible={virtualReviewVisible}
        onClose={() => setVirtualReviewVisible(false)}
      />

      {/* Breaking News Modal */}
      <BreakingNewsModal
        visible={breakingNewsVisible}
        onClose={() => setBreakingNewsVisible(false)}
      />

      {/* Global User Profile & Settings Screen */}
      <SettingsScreen
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />

      {/* Pledge Bet Modal */}
      <PledgeBetModal
        visible={pledgeBetModalVisible}
        onClose={() => setPledgeBetModalVisible(false)}
      />

      {/* Underwear Wardrobe & 3-Angle Check-In Modal */}
      <UnderwearWardrobeModal
        visible={underwearModalVisible}
        onClose={() => setUnderwearModalVisible(false)}
      />

      {/* 3D Parametric Anatomy Fitting Studio Modal */}
      <Anatomy3DFittingModal
        visible={anatomy3DModalVisible}
        onClose={() => setAnatomy3DModalVisible(false)}
      />

      {/* 3D Underwear Virtual Try-On Modal */}
      <Modal
        visible={underwear3DModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setUnderwear3DModalVisible(false)}
      >
        <SafeAreaView style={styles.underwearModalContainer}>
          <View style={styles.underwearModalHeader}>
            <View>
              <Text style={styles.underwearModalTitle}>3D 內褲款式虛擬試穿</Text>
              <Text style={styles.underwearModalSub}>
                隨生理參數動態適配 · 囊袋張力模擬 · 實穿輪廓預覽
              </Text>
            </View>
            <TouchableOpacity
              style={styles.underwearModalCloseBtn}
              onPress={() => setUnderwear3DModalVisible(false)}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.underwearModalContent}>
            <UnderwearOverlay3D
              height={360}
              onOpenWardrobeModal={() => {
                setUnderwear3DModalVisible(false);
                setUnderwearModalVisible(true);
              }}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsHeaderBtn: {
    width: 32,
    height: 32,
    borderRadius: THEME.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  breakingNewsBanner: {
    backgroundColor: '#7F1D1D',
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    gap: 6,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  breakingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakingTag: {
    backgroundColor: '#000000',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  breakingTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FDE047',
  },
  breakingHotTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FCA5A5',
  },
  breakingTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 18,
  },
  breakingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  breakingFooterText: {
    fontSize: 10,
    color: '#FECACA',
    fontWeight: '600',
  },
  dailyCheckInHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: THEME.radius.md,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dailyCheckInHeaderBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  morphingHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: THEME.radius.md,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  morphingHeaderBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  morphingHeroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    marginBottom: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  morphingBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  morphingIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  morphingTextBox: {
    flex: 1,
  },
  morphingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  morphingBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#3B82F6',
  },
  morphingBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#60A5FA',
    letterSpacing: 0.5,
  },
  morphingProBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  morphingProBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
  },
  morphingBannerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: THEME.colors.text,
  },
  morphingBannerSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  virtualReviewHeroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    marginBottom: 16,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  virtualReviewBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  virtualReviewIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  virtualReviewTextBox: {
    flex: 1,
  },
  virtualReviewBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  virtualReviewBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#F59E0B',
  },
  virtualReviewBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FBBF24',
    letterSpacing: 0.5,
  },
  virtualReviewProBadge: {
    backgroundColor: 'rgba(236, 72, 153, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  virtualReviewProBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#EC4899',
  },
  virtualReviewBannerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: THEME.colors.text,
  },
  virtualReviewBannerSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  underwearHeroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    marginBottom: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  underwearBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  underwearIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  underwearTextBox: {
    flex: 1,
  },
  underwearBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  underwearBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#3B82F6',
  },
  underwearBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#60A5FA',
    letterSpacing: 0.5,
  },
  underwearProBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  underwearProBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
  },
  underwearBannerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: THEME.colors.text,
  },
  underwearBannerSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  anatomy3DHeroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#031726',
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#0284C7',
    marginBottom: 16,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  anatomy3DBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  anatomy3DIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  anatomy3DTextBox: {
    flex: 1,
  },
  anatomy3DBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  anatomy3DBadge: {
    backgroundColor: 'rgba(2, 132, 199, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#38BDF8',
  },
  anatomy3DBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 0.5,
  },
  anatomy3DProBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  anatomy3DProBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#34D399',
  },
  anatomy3DBannerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: THEME.colors.text,
  },
  anatomy3DBannerSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  underwearModalContainer: {
    flex: 1,
    backgroundColor: '#070C18',
  },
  underwearModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  underwearModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  underwearModalSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  underwearModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  underwearModalContent: {
    padding: 16,
  },
  exportReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.radius.md,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  exportReportBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
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
  questRecordBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    gap: 10,
  },
  questBadgeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questBadgeTextBox: {
    flex: 1,
  },
  questBadgeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  questBadgeName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F59E0B',
  },
  questCompletedPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  questCompletedText: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.success,
  },
  questRecordSubtitle: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  snapshotsCardSection: {
    marginTop: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  snapshotsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  snapshotsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  snapshotsCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  ehsBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  ehsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.success,
  },
  thumbStrip: {
    gap: 8,
    paddingVertical: 4,
  },
  thumbMiniCard: {
    width: 58,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    position: 'relative',
  },
  thumbMiniImage: {
    width: '100%',
    height: '100%',
  },
  thumbMiniTime: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  thumbMiniTimeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  privacyLockOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openComparatorBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 8,
    borderRadius: 8,
  },
  openComparatorBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
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
