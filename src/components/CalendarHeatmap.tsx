import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { THEME } from '../constants/theme';
import { HabitRecord } from '../types';

interface CalendarHeatmapProps {
  records: HabitRecord[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  daysCount?: number;
}

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({
  records,
  selectedDate,
  onSelectDate,
  daysCount = 42, // 6 weeks
}) => {
  // Aggregate record counts by date YYYY-MM-DD
  const countsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach((r) => {
      map[r.dateString] = (map[r.dateString] || 0) + 1;
    });
    return map;
  }, [records]);

  // Generate days array ending on today
  const daysGrid = useMemo(() => {
    const days: { dateStr: string; dayOfMonth: number; weekday: number }[] = [];
    const today = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      days.push({
        dateStr,
        dayOfMonth: d.getDate(),
        weekday: d.getDay(), // 0 = Sun, 1 = Mon ...
      });
    }
    return days;
  }, [daysCount]);

  // Group into columns of 7 days (weeks)
  const weeks = useMemo(() => {
    const list: (typeof daysGrid)[] = [];
    let currentWeek: typeof daysGrid = [];

    daysGrid.forEach((day, index) => {
      currentWeek.push(day);
      if (currentWeek.length === 7 || index === daysGrid.length - 1) {
        list.push(currentWeek);
        currentWeek = [];
      }
    });

    return list;
  }, [daysGrid]);

  const getCellColor = (count: number) => {
    if (!count || count === 0) return 'rgba(255, 255, 255, 0.06)';
    if (count === 1) return 'rgba(59, 130, 246, 0.45)';
    if (count === 2) return 'rgba(59, 130, 246, 0.8)';
    return '#3B82F6'; // 3+
  };

  const handleCellPress = async (dateStr: string) => {
    try {
      await Haptics.selectionAsync();
    } catch {}
    onSelectDate(dateStr);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>習慣熱點圖 (Contribution Grid)</Text>
        <View style={styles.legendRow}>
          <Text style={styles.legendLabel}>少</Text>
          <View style={[styles.legendCell, { backgroundColor: 'rgba(255, 255, 255, 0.06)' }]} />
          <View style={[styles.legendCell, { backgroundColor: 'rgba(59, 130, 246, 0.45)' }]} />
          <View style={[styles.legendCell, { backgroundColor: 'rgba(59, 130, 246, 0.8)' }]} />
          <View style={[styles.legendCell, { backgroundColor: '#3B82F6' }]} />
          <Text style={styles.legendLabel}>多</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.gridRow}>
          {weeks.map((week, weekIdx) => (
            <View key={weekIdx} style={styles.weekColumn}>
              {week.map((day) => {
                const count = countsByDate[day.dateStr] || 0;
                const isSelected = selectedDate === day.dateStr;
                return (
                  <TouchableOpacity
                    key={day.dateStr}
                    style={[
                      styles.cell,
                      { backgroundColor: getCellColor(count) },
                      isSelected && styles.selectedCell,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleCellPress(day.dateStr)}
                  >
                    {count > 0 && <Text style={styles.cellCount}>{count}</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.surface,
    padding: 16,
    borderRadius: THEME.radius.xl,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  scrollContent: {
    paddingVertical: 4,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 6,
  },
  weekColumn: {
    gap: 6,
  },
  cell: {
    width: 22,
    height: 22,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCell: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
  cellCount: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
