import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME } from '../constants/theme';

interface TimerWidgetProps {
  isRunning?: boolean;
  onTimerTick?: (seconds: number) => void;
  initialSeconds?: number;
}

export const TimerWidget: React.FC<TimerWidgetProps> = ({
  isRunning: parentIsRunning,
  onTimerTick,
  initialSeconds = 0,
}) => {
  const [seconds, setSeconds] = useState<number>(initialSeconds);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Sync with parent running state if provided
  const running = parentIsRunning !== undefined ? parentIsRunning : isActive;

  useEffect(() => {
    let interval: any = null;
    if (running) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          const next = prev + 1;
          if (onTimerTick) onTimerTick(next);
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [running, onTimerTick]);

  const toggleRunning = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setIsActive((prev) => !prev);
  };

  const resetTimer = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setSeconds(0);
    if (onTimerTick) onTimerTick(0);
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${remMins
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.badgeRow}>
        <View style={[styles.statusDot, running ? styles.statusDotActive : styles.statusDotInactive]} />
        <Text style={styles.statusText}>{running ? '計時中・專注' : '已暫停'}</Text>
      </View>

      <Text style={styles.timerDisplay}>{formatTime(seconds)}</Text>

      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={styles.controlBtn}
          activeOpacity={0.7}
          onPress={toggleRunning}
        >
          <Ionicons
            name={running ? 'pause' : 'play'}
            size={22}
            color={THEME.colors.primaryLight}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlBtn}
          activeOpacity={0.7}
          onPress={resetTimer}
        >
          <Ionicons name="refresh" size={20} color={THEME.colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.surface,
    padding: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotActive: {
    backgroundColor: THEME.colors.success,
  },
  statusDotInactive: {
    backgroundColor: THEME.colors.warning,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.3,
  },
  timerDisplay: {
    fontSize: 52,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    color: THEME.colors.text,
    letterSpacing: 2,
    marginBottom: 14,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
