import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DoctorTipContext } from '../types';
import { medicalKnowledgeService } from '../services/medicalKnowledgeService';

interface ContextualDoctorTipProps {
  context: DoctorTipContext;
  onOpenMedicalScreen?: () => void;
  style?: any;
}

export const ContextualDoctorTip: React.FC<ContextualDoctorTipProps> = ({
  context,
  onOpenMedicalScreen,
  style,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  const tip = medicalKnowledgeService.getDoctorTip(context);

  if (isDismissed || !tip) return null;

  const handleToggle = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setIsExpanded(!isExpanded);
  };

  const handleDismiss = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setIsDismissed(true);
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.headerBar}
        activeOpacity={0.85}
        onPress={handleToggle}
      >
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="stethoscope" size={14} color="#38BDF8" />
          </View>
          <View style={styles.titleInfo}>
            <View style={styles.badgeRow}>
              <Text style={styles.badgeText}>{tip.badge}</Text>
              <Text style={styles.doctorName}>
                {tip.doctorName} · {tip.doctorTitle}
              </Text>
            </View>
            <Text style={styles.tipTitle} numberOfLines={isExpanded ? 2 : 1}>
              {tip.title}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="#94A3B8"
          />
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={14} color="#64748B" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Expanded detailed content */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          <Text style={styles.tipDetail}>{tip.content}</Text>
          {onOpenMedicalScreen && (
            <TouchableOpacity
              style={styles.readMoreBtn}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                onOpenMedicalScreen();
              }}
            >
              <Text style={styles.readMoreText}>查閱泌尿專科文獻專題 ➔</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    overflow: 'hidden',
    marginVertical: 4,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  doctorName: {
    fontSize: 9,
    color: '#94A3B8',
  },
  tipTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  closeBtn: {
    padding: 2,
  },
  expandedContent: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  tipDetail: {
    fontSize: 11,
    color: '#CBD5E1',
    lineHeight: 16,
    marginBottom: 8,
  },
  readMoreBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
  },
  readMoreText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38BDF8',
  },
});
