import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { PledgeResult } from '../types';

interface PledgeSettlementModalProps {
  visible: boolean;
  result: PledgeResult | null;
  onClose: () => void;
  onEmergencyUnlock?: () => void;
}

export const PledgeSettlementModal: React.FC<PledgeSettlementModalProps> = ({
  visible,
  result,
  onClose,
  onEmergencyUnlock,
}) => {
  if (!result) return null;

  const isWin = result.isWin;
  const actualMins = Math.floor(result.actualDurationSeconds / 60);
  const actualSecs = result.actualDurationSeconds % 60;
  const actualTimeStr = `${actualMins}:${actualSecs.toString().padStart(2, '0')}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, isWin ? styles.winBorder : styles.lossBorder]}>
          {/* Top Stamp / Icon */}
          <View style={styles.iconWrap}>
            {isWin ? (
              <View style={[styles.iconCircle, styles.winCircle]}>
                <Ionicons name="trophy" size={36} color="#F59E0B" />
              </View>
            ) : (
              <View style={[styles.iconCircle, styles.lossCircle]}>
                <MaterialCommunityIcons name="skull-crossbones" size={36} color="#EF4444" />
              </View>
            )}
          </View>

          {/* Title & Sub */}
          <Text style={[styles.title, isWin ? styles.winText : styles.lossText]}>
            {isWin ? '自律契約 · 大獲全勝！' : '自律契約 · 違約敗北！'}
          </Text>
          <Text style={styles.subtitle}>
            {isWin
              ? '說到做到！完美克制慾望並克服生理衝動！'
              : '未能撐滿約定時長或未達急停門檻，懲罰已啟動！'}
          </Text>

          {/* Metrics comparison */}
          <View style={styles.metricsBox}>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>目標訓練時長</Text>
              <Text style={styles.metricTarget}>{result.targetMinutes}:00</Text>
              <Text
                style={[
                  styles.metricActual,
                  actualMins >= result.targetMinutes ? styles.passText : styles.failText,
                ]}
              >
                實際 {actualTimeStr} {actualMins >= result.targetMinutes ? '✅' : '❌'}
              </Text>
            </View>

            <View style={[styles.metricRow, { marginTop: 8 }]}>
              <Text style={styles.metricLabel}>約定 Edge 急停</Text>
              <Text style={styles.metricTarget}>{result.targetEdgeCount} 次</Text>
              <Text
                style={[
                  styles.metricActual,
                  result.actualEdgeCount >= result.targetEdgeCount ? styles.passText : styles.failText,
                ]}
              >
                實際 {result.actualEdgeCount} 次{' '}
                {result.actualEdgeCount >= result.targetEdgeCount ? '✅' : '❌'}
              </Text>
            </View>
          </View>

          {/* Stake / Penalty Status Banner */}
          <View style={[styles.rewardBanner, isWin ? styles.rewardWin : styles.rewardLoss]}>
            {isWin ? (
              <>
                <Text style={styles.rewardTitle}>🔥 獲得榮譽賞金：+{result.earnedCredits} 點</Text>
                <Text style={styles.rewardSub}>
                  連勝紀錄推進至 {result.streak} 場！自律王者勳章已登錄日曆！
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.penaltyTitle}>
                  🚫 失去點數：{result.earnedCredits} 點 · 懲罰鎖定已生效
                </Text>
                <Text style={styles.penaltySub}>
                  連勝已歸零。Action 頁面將進入反省冷卻期，以重塑神經敏感度！
                </Text>
              </>
            )}
          </View>

          {/* Girlfriend reaction bubble */}
          <View style={styles.companionBubble}>
            <View style={styles.companionHeader}>
              <Ionicons name="heart" size={12} color="#EC4899" />
              <Text style={styles.companionName}>女友評語</Text>
            </View>
            <Text style={styles.companionText}>
              {isWin
                ? '「寶寶真的太厲害了...說好要忍住就完全忍住了，忍耐控煞的身影真的好性感❤️」'
                : '「哎呀...說好要撐滿時間的呢？不可以偷跑喔！今天好好休息反省，明天再挑戰～」'}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            {!isWin && onEmergencyUnlock && (
              <TouchableOpacity
                style={styles.unlockBtn}
                onPress={onEmergencyUnlock}
              >
                <Text style={styles.unlockBtnText}>認錯贖罪解鎖</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.confirmBtn, isWin ? styles.winConfirmBtn : styles.lossConfirmBtn]}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmBtnText}>
                {isWin ? '領取獎勵並歸檔' : '接受懲罰並冷卻'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    alignItems: 'center',
  },
  winBorder: {
    borderColor: '#F59E0B',
  },
  lossBorder: {
    borderColor: '#EF4444',
  },
  iconWrap: {
    marginTop: -40,
    marginBottom: 10,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  winCircle: {
    borderColor: '#F59E0B',
  },
  lossCircle: {
    borderColor: '#EF4444',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  winText: {
    color: '#F59E0B',
  },
  lossText: {
    color: '#EF4444',
  },
  subtitle: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 16,
  },
  metricsBox: {
    width: '100%',
    backgroundColor: '#131D33',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: '#94A3B8',
    flex: 1,
  },
  metricTarget: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
    marginRight: 10,
  },
  metricActual: {
    fontSize: 12,
    fontWeight: '800',
  },
  passText: {
    color: '#10B981',
  },
  failText: {
    color: '#EF4444',
  },
  rewardBanner: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  rewardWin: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  rewardLoss: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  rewardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FBBF24',
    marginBottom: 2,
  },
  rewardSub: {
    fontSize: 10,
    color: '#CBD5E1',
  },
  penaltyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F87171',
    marginBottom: 2,
  },
  penaltySub: {
    fontSize: 10,
    color: '#CBD5E1',
  },
  companionBubble: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.3)',
    marginBottom: 16,
  },
  companionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  companionName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EC4899',
  },
  companionText: {
    fontSize: 11,
    color: '#F1F5F9',
    lineHeight: 16,
  },
  actionRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  unlockBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  unlockBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  winConfirmBtn: {
    backgroundColor: '#F59E0B',
  },
  lossConfirmBtn: {
    backgroundColor: '#EF4444',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
});
