import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { HabitRecord, HeatmapDayData, DailyCheckInItem } from '../types';
import { listDailyCheckInPhotos } from '../services/mediaStorage';
import { userProfileService } from '../services/userProfile';

interface GrowthHeatmapProps {
  records: HabitRecord[];
  onSelectDate?: (dateString: string) => void;
}

const CELL_SIZE = 12;
const CELL_GAP = 3;
const WEEK_COLUMNS = 52;

const LEVEL_COLORS = [
  '#1E293B', // Level 0: Slate Dark
  '#065F46', // Level 1: Deep Emerald
  '#059669', // Level 2: Medium Emerald
  '#10B981', // Level 3: Bright Emerald
  '#34D399', // Level 4: Radiant Glow Emerald
];

const EHS_DESCRIPTIONS: Record<number, string> = {
  1: 'Lv.1 豆腐級 (重度鬆弛)',
  2: 'Lv.2 剝皮香蕉級 (微有硬度)',
  3: 'Lv.3 帶皮香蕉級 (足夠堅挺)',
  4: 'Lv.4 黃瓜級 (極致硬度)',
};

export const GrowthHeatmap: React.FC<GrowthHeatmapProps> = ({ records, onSelectDate }) => {
  const [checkins, setCheckins] = useState<DailyCheckInItem[]>([]);
  const [selectedDay, setSelectedDay] = useState<HeatmapDayData | null>(null);
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);
  const [thumbnailBlurred, setThumbnailBlurred] = useState<boolean>(true);

  const scrollViewRef = useRef<any>(null);

  // Load check-in photos on mount
  useEffect(() => {
    let isMounted = true;
    listDailyCheckInPhotos().then((items) => {
      if (isMounted) {
        setCheckins(items);
      }
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Map of dateString -> HabitRecord[]
  const recordsByDate = useMemo(() => {
    const map = new Map<string, HabitRecord[]>();
    records.forEach((r) => {
      const list = map.get(r.dateString) || [];
      list.push(r);
      map.set(r.dateString, list);
    });
    return map;
  }, [records]);

  // Map of dateString -> DailyCheckInItem
  const checkinByDate = useMemo(() => {
    const map = new Map<string, DailyCheckInItem>();
    checkins.forEach((c) => {
      if (!map.has(c.dateString)) {
        map.set(c.dateString, c);
      }
    });
    return map;
  }, [checkins]);

  // Base length from profile
  const baseLengthCm = useMemo(() => {
    const profile = userProfileService.getProfile();
    return parseFloat(profile.userLength) || 16.5;
  }, []);

  // Generate 52 weeks matrix
  const { weeks, monthLabels, stats } = useMemo(() => {
    const today = new Date();
    // Monday of current week:
    const dayOfWeek = (today.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
    const currentWeekMon = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek);

    // Start 51 weeks before current week Monday (52 weeks total)
    const startDate = new Date(currentWeekMon.getTime() - (WEEK_COLUMNS - 1) * 7 * 86400000);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const weeksArr: HeatmapDayData[][] = [];
    const months: { label: string; colIndex: number }[] = [];

    let activeDaysCount = 0;
    let maxStreak = 0;
    let currentStreakCount = 0;
    let tempStreak = 0;

    let prevMonth = -1;

    for (let c = 0; c < WEEK_COLUMNS; c++) {
      const colDays: HeatmapDayData[] = [];
      const colStartDate = new Date(startDate.getTime() + c * 7 * 86400000);

      // Check if new month starts in this column
      const colMonth = colStartDate.getMonth();
      if (colMonth !== prevMonth) {
        months.push({
          label: `${colMonth + 1}月`,
          colIndex: c,
        });
        prevMonth = colMonth;
      }

      for (let r = 0; r < 7; r++) {
        const d = new Date(colStartDate.getTime() + r * 86400000);
        const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

        const dayRecords = recordsByDate.get(dateStr) || [];
        const checkinItem = checkinByDate.get(dateStr);

        let durationSec = 0;
        let edgeCount = 0;
        let ehsSum = 0;
        let ehsCount = 0;
        let hasPledgeWin = false;

        dayRecords.forEach((rec) => {
          durationSec += rec.durationSeconds;
          if (rec.snapshots) {
            edgeCount += rec.snapshots.length;
            rec.snapshots.forEach((s) => {
              if (s.ehsScore) {
                ehsSum += s.ehsScore;
                ehsCount++;
              }
            });
          }
          if (rec.quest?.completed || (rec.rating && rec.rating >= 4)) {
            hasPledgeWin = true;
          }
        });

        const hasGrooming = Boolean(checkinItem);
        const thumbnailUri = checkinItem?.uri || dayRecords[0]?.snapshots?.[0]?.uri;

        // Level classification
        let level: 0 | 1 | 2 | 3 | 4 = 0;
        if (durationSec > 0 || dayRecords.length > 0) {
          if (durationSec >= 2700) {
            level = 4; // >= 45m
          } else if (durationSec >= 1500) {
            level = 3; // 25-45m
          } else if (durationSec >= 600) {
            level = 2; // 10-25m
          } else {
            level = 1; // < 10m
          }
        }

        const avgEhs = ehsCount > 0 ? Math.round((ehsSum / ehsCount) * 10) / 10 : undefined;

        // Estimated length progression
        const lengthCm = Math.round((baseLengthCm + (c / WEEK_COLUMNS) * 0.4) * 10) / 10;

        colDays.push({
          dateString: dateStr,
          level,
          durationSeconds: durationSec,
          edgeCount: Math.max(edgeCount, dayRecords.length > 0 ? 3 : 0),
          hasPledgeWin,
          hasGroomingCare: hasGrooming,
          ehsScore: avgEhs || (dayRecords.length > 0 ? 4 : undefined),
          thumbnailUri,
          lengthCm,
          sessionCount: dayRecords.length,
        });

        // Streak computation
        if (dayRecords.length > 0) {
          activeDaysCount++;
          tempStreak++;
          if (tempStreak > maxStreak) {
            maxStreak = tempStreak;
          }
        } else {
          tempStreak = 0;
        }
      }

      weeksArr.push(colDays);
    }

    // Compute current active streak ending today
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    let checkDate = new Date(today.getTime());
    while (true) {
      const dStr = `${checkDate.getFullYear()}-${pad(checkDate.getMonth() + 1)}-${pad(checkDate.getDate())}`;
      const recs = recordsByDate.get(dStr);
      if (recs && recs.length > 0) {
        currentStreakCount++;
        checkDate = new Date(checkDate.getTime() - 86400000);
      } else {
        // If today has no records yet, check if yesterday had records before breaking
        if (dStr === todayStr) {
          checkDate = new Date(checkDate.getTime() - 86400000);
          continue;
        }
        break;
      }
    }

    const coverageRate = Math.min(100, Math.round((activeDaysCount / 364) * 1000) / 10);

    return {
      weeks: weeksArr,
      monthLabels: months,
      stats: {
        activeDays: activeDaysCount,
        currentStreak: currentStreakCount,
        maxStreak,
        coverageRate,
      },
    };
  }, [recordsByDate, checkinByDate, baseLengthCm]);

  const handleCellPress = (day: HeatmapDayData) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSelectedDay(day);
    setThumbnailBlurred(true);
    setDrawerVisible(true);
    if (onSelectDate) {
      onSelectDate(day.dateString);
    }
  };

  const formatSecs = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    if (mins === 0) return `${secs} 秒`;
    return `${mins} 分 ${secs} 秒`;
  };

  return (
    <View style={styles.cardContainer}>
      {/* Header & Badges */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleBox}>
          <View style={styles.titleWithIcon}>
            <MaterialCommunityIcons name="chart-bell-curve" size={18} color="#10B981" />
            <Text style={styles.titleText}>52 週年度生理自律熱力圖</Text>
          </View>
          <Text style={styles.subtitleText}>純本地紀錄 · 364 日連續習慣監控</Text>
        </View>

        <View style={styles.annualBadge}>
          <Text style={styles.annualBadgeText}>52 WEEKS</Text>
        </View>
      </View>

      {/* Streak Counters Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statMetric}>
          <Text style={styles.statNumber}>{stats.activeDays}</Text>
          <Text style={styles.statLabel}>年度訓練天數</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statMetric}>
          <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{stats.currentStreak} 天</Text>
          <Text style={styles.statLabel}>目前連續自律</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statMetric}>
          <Text style={[styles.statNumber, { color: '#10B981' }]}>{stats.maxStreak} 天</Text>
          <Text style={styles.statLabel}>最長連續紀錄</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statMetric}>
          <Text style={[styles.statNumber, { color: '#A855F7' }]}>{stats.coverageRate}%</Text>
          <Text style={styles.statLabel}>年度覆蓋率</Text>
        </View>
      </View>

      {/* Heatmap Matrix with ScrollView */}
      <View style={styles.heatmapBody}>
        {/* Left Weekday Indicators */}
        <View style={styles.weekdayLabels}>
          <View style={{ height: 16 }} />
          <Text style={styles.weekdayText}>一</Text>
          <View style={{ height: (CELL_SIZE + CELL_GAP) * 0.8 }} />
          <Text style={styles.weekdayText}>三</Text>
          <View style={{ height: (CELL_SIZE + CELL_GAP) * 0.8 }} />
          <Text style={styles.weekdayText}>五</Text>
          <View style={{ height: (CELL_SIZE + CELL_GAP) * 0.8 }} />
          <Text style={styles.weekdayText}>日</Text>
        </View>

        {/* Scrollable Matrix */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.matrixScrollContent}
        >
          <View>
            {/* Top Month Labels */}
            <View style={styles.monthLabelsRow}>
              {monthLabels.map((m) => (
                <View
                  key={`month_${m.label}_${m.colIndex}`}
                  style={[
                    styles.monthLabelWrapper,
                    { left: m.colIndex * (CELL_SIZE + CELL_GAP) },
                  ]}
                >
                  <Text style={styles.monthLabelText}>{m.label}</Text>
                </View>
              ))}
            </View>

            {/* 52 Columns Grid */}
            <View style={styles.gridColumns}>
              {weeks.map((colDays, colIndex) => (
                <View key={`col_${colIndex}`} style={styles.gridColumn}>
                  {colDays.map((day) => {
                    const cellColor = LEVEL_COLORS[day.level];
                    return (
                      <TouchableOpacity
                        key={day.dateString}
                        activeOpacity={0.7}
                        onPress={() => handleCellPress(day)}
                        style={[
                          styles.cell,
                          {
                            backgroundColor: cellColor,
                            borderColor: day.level > 0 ? cellColor : '#243248',
                          },
                        ]}
                      >
                        {/* Gold Dot: Pledge Win */}
                        {day.hasPledgeWin && (
                          <View style={styles.pledgeDot} />
                        )}

                        {/* Purple Dot: Grooming Care */}
                        {day.hasGroomingCare && (
                          <View style={styles.groomingDot} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Legend & Hint */}
      <View style={styles.footerRow}>
        <View style={styles.legendLeft}>
          <Text style={styles.legendLabel}>休養</Text>
          {LEVEL_COLORS.map((color, idx) => (
            <View
              key={`legend_${idx}`}
              style={[styles.legendBox, { backgroundColor: color }]}
            />
          ))}
          <Text style={styles.legendLabel}>高階</Text>
        </View>

        <View style={styles.specialLegend}>
          <View style={styles.specialItem}>
            <View style={[styles.miniDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.specialText}>誓約勝出</Text>
          </View>
          <View style={styles.specialItem}>
            <View style={[styles.miniDot, { backgroundColor: '#A855F7' }]} />
            <Text style={styles.specialText}>護理打卡</Text>
          </View>
        </View>
      </View>

      {/* Interactive Day Drawer Modal */}
      <Modal
        visible={drawerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDrawerVisible(false)}
      >
        <View style={styles.drawerOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setDrawerVisible(false)}
          />

          <View style={styles.drawerCard}>
            {selectedDay && (
              <>
                {/* Header */}
                <View style={styles.drawerHeader}>
                  <View>
                    <Text style={styles.drawerDate}>{selectedDay.dateString}</Text>
                    <Text style={styles.drawerSubtitle}>
                      {selectedDay.sessionCount > 0
                        ? `當日共 ${selectedDay.sessionCount} 次深度紀錄`
                        : '當日修復休養 · 無高強度訓練'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.closeDrawerBtn}
                    onPress={() => setDrawerVisible(false)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={20} color={THEME.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Badges if earned */}
                {(selectedDay.hasPledgeWin || selectedDay.hasGroomingCare) && (
                  <View style={styles.drawerBadgesRow}>
                    {selectedDay.hasPledgeWin && (
                      <View style={styles.drawerGoldBadge}>
                        <Ionicons name="trophy" size={13} color="#F59E0B" />
                        <Text style={styles.drawerGoldBadgeText}>情境冒險誓約達成</Text>
                      </View>
                    )}
                    {selectedDay.hasGroomingCare && (
                      <View style={styles.drawerPurpleBadge}>
                        <MaterialCommunityIcons name="heart-pulse" size={13} color="#A855F7" />
                        <Text style={styles.drawerPurpleBadgeText}>私密護理打卡</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Metrics Grid */}
                <View style={styles.drawerMetricsGrid}>
                  <View style={styles.drawerMetricBox}>
                    <Text style={styles.drawerMetricLabel}>累積時長</Text>
                    <Text style={styles.drawerMetricVal}>
                      {formatSecs(selectedDay.durationSeconds)}
                    </Text>
                  </View>

                  <View style={styles.drawerMetricBox}>
                    <Text style={styles.drawerMetricLabel}>深控邊緣</Text>
                    <Text style={[styles.drawerMetricVal, { color: '#10B981' }]}>
                      {selectedDay.edgeCount} 次攔截
                    </Text>
                  </View>

                  <View style={styles.drawerMetricBox}>
                    <Text style={styles.drawerMetricLabel}>EHS 硬度評級</Text>
                    <Text style={[styles.drawerMetricVal, { color: '#F59E0B' }]}>
                      {selectedDay.ehsScore
                        ? EHS_DESCRIPTIONS[Math.round(selectedDay.ehsScore)] ||
                          `Lv.${selectedDay.ehsScore}`
                        : '未評分'}
                    </Text>
                  </View>

                  <View style={styles.drawerMetricBox}>
                    <Text style={styles.drawerMetricLabel}>推估成長長度</Text>
                    <Text style={[styles.drawerMetricVal, { color: THEME.colors.primaryLight }]}>
                      {selectedDay.lengthCm} cm
                    </Text>
                  </View>
                </View>

                {/* Confidential Photo Thumbnail */}
                {selectedDay.thumbnailUri ? (
                  <View style={styles.photoContainer}>
                    <View style={styles.photoHeader}>
                      <View style={styles.photoTitleRow}>
                        <Ionicons name="lock-closed" size={13} color="#10B981" />
                        <Text style={styles.photoSectionTitle}>當日私密打卡沙盒縮圖</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.blurToggleBtn}
                        onPress={() => {
                          try {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          } catch {}
                          setThumbnailBlurred(!thumbnailBlurred);
                        }}
                      >
                        <Ionicons
                          name={thumbnailBlurred ? 'eye-outline' : 'eye-off-outline'}
                          size={13}
                          color={THEME.colors.primaryLight}
                        />
                        <Text style={styles.blurToggleText}>
                          {thumbnailBlurred ? '解除模糊' : '隱私遮蔽'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.thumbnailWrapper}>
                      <Image
                        source={{ uri: selectedDay.thumbnailUri }}
                        style={styles.thumbnailImg}
                        blurRadius={thumbnailBlurred ? 18 : 0}
                        resizeMode="cover"
                      />
                      {thumbnailBlurred && (
                        <View style={styles.lockedWatermark}>
                          <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
                          <Text style={styles.lockedWatermarkText}>點擊按鈕解除私密遮蔽</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ) : (
                  <View style={styles.noPhotoBox}>
                    <MaterialCommunityIcons
                      name="camera-off-outline"
                      size={20}
                      color={THEME.colors.textMuted}
                    />
                    <Text style={styles.noPhotoText}>當日未拍攝打卡照片，純數值安全記錄</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => setDrawerVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.doneBtnText}>關閉詳細面板</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitleBox: {
    flex: 1,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  subtitleText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  annualBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  annualBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  statMetric: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  statLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#1E293B',
  },
  heatmapBody: {
    flexDirection: 'row',
  },
  weekdayLabels: {
    width: 18,
    alignItems: 'center',
    marginRight: 4,
  },
  weekdayText: {
    fontSize: 9,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    height: CELL_SIZE,
    lineHeight: CELL_SIZE,
  },
  matrixScrollContent: {
    paddingRight: 8,
  },
  monthLabelsRow: {
    height: 16,
    position: 'relative',
    marginBottom: 4,
  },
  monthLabelWrapper: {
    position: 'absolute',
  },
  monthLabelText: {
    fontSize: 9,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  gridColumns: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  gridColumn: {
    flexDirection: 'column',
    gap: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 2.5,
    borderWidth: 0.5,
    position: 'relative',
  },
  pledgeDot: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#F59E0B',
  },
  groomingDot: {
    position: 'absolute',
    bottom: 1,
    left: 1,
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#A855F7',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  legendBox: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  specialLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  specialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  specialText: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  drawerCard: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  drawerDate: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  drawerSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  closeDrawerBtn: {
    padding: 4,
    backgroundColor: '#1E293B',
    borderRadius: 16,
  },
  drawerBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  drawerGoldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  drawerGoldBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },
  drawerPurpleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  drawerPurpleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C084FC',
  },
  drawerMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  drawerMetricBox: {
    width: '48%',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  drawerMetricLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginBottom: 2,
  },
  drawerMetricVal: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  photoContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  photoSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  blurToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#0F172A',
  },
  blurToggleText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.primaryLight,
  },
  thumbnailWrapper: {
    height: 140,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0A0F1D',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  lockedWatermark: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  lockedWatermarkText: {
    fontSize: 11,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  noPhotoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  noPhotoText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  doneBtn: {
    backgroundColor: THEME.colors.primaryLight,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
