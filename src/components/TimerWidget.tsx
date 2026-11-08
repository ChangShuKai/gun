import React, { useState, useEffect, useRef } from 'react';
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

  // Stable reference for callback to prevent interval resets
  const tickRef = useRef(onTimerTick);
  useEffect(() => {
    tickRef.current = onTimerTick;
  }, [onTimerTick]);

  const startTimeRef = useRef<number>(0);
  const runningRef = useRef<boolean>(running);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    if (!running) return;

    startTimeRef.current = Date.now() - seconds * 1000;

    const interval = setInterval(() => {
      if (!runningRef.current) return;
      const elapsed = Math.max(0, Math.floor((Date.now() - startTimeRef.current) / 1000));
      setSeconds(elapsed);
      if (tickRef.current) {
        tickRef.current(elapsed);
      }
    }, 500);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

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
    startTimeRef.current = Date.now();
    setSeconds(0);
    if (tickRef.current) tickRef.current(0);
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
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
    marginBottom: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: THEME.colors.success,
  },
  statusDotInactive: {
    backgroundColor: THEME.colors.warning,
  },
  statusText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  timerDisplay: {
    fontSize: 48,
    fontWeight: '900',
    color: THEME.colors.text,
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
    marginBottom: 16,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borderGlass,
  },
});
