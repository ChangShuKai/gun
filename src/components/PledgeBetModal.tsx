import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME } from '../constants/theme';
import {
  PledgeContract,
  PledgeStats,
  PledgeRuleType,
  PenaltyType,
} from '../types';
import {
  pledgeService,
  PRESET_CONTRACTS,
  DEFAULT_PLEDGE_STATS,
} from '../services/pledgeService';

interface PledgeBetModalProps {
  visible: boolean;
  onClose: () => void;
  onContractCommitted?: (contract: PledgeContract) => void;
}

const PENALTY_LABELS: Record<PenaltyType, { label: string; desc: string; icon: string }> = {
  LOCKOUT_12H: {
    label: '12H 封印鎖定',
    desc: '違約進入 12 小時冷卻反省期，無法啟動新訓練',
    icon: 'lock-closed',
  },
  LOCKOUT_24H: {
    label: '24H 嚴厲冰凍',
    desc: '整整 24 小時全面鎖定 Action 訓練按鈕',
    icon: 'shield-outline',
  },
  PANEL_ROAST: {
    label: '圍觀團公開審訊',
    desc: '強制召喚 4 位虛擬成員進行毒舌自首審查',
    icon: 'people',
  },
  DOUBLE_TOMORROW: {
    label: '明日目標翻倍',
    desc: '明日訓練強制要求時長與急停門檻加倍',
    icon: 'trending-up',
  },
};

export const PledgeBetModal: React.FC<PledgeBetModalProps> = ({
  visible,
  onClose,
  onContractCommitted,
}) => {
  const [stats, setStats] = useState<PledgeStats>(DEFAULT_PLEDGE_STATS);
  const [activeContract, setActiveContract] = useState<PledgeContract | null>(null);

  // Custom contract configuration
  const [targetMinutes, setTargetMinutes] = useState<number>(20);
  const [targetEdgeCount, setTargetEdgeCount] = useState<number>(3);
  const [ruleType, setRuleType] = useState<PledgeRuleType>('TARGET_TIME');
  const [penaltyType, setPenaltyType] = useState<PenaltyType>('LOCKOUT_12H');
  const [stakeCredits, setStakeCredits] = useState<number>(200);

  const loadData = async () => {
    const s = await pledgeService.getStats();
    setStats(s);
    const c = await pledgeService.getActiveContract();
    setActiveContract(c);
  };

  const handleModalShow = () => {
    void loadData();
  };

  const handleApplyPreset = (preset: (typeof PRESET_CONTRACTS)[0]) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setTargetMinutes(preset.targetMinutes);
    setTargetEdgeCount(preset.targetEdgeCount);
    setRuleType(preset.ruleType);
    setPenaltyType(preset.penaltyType);
    setStakeCredits(preset.stakeCredits);
  };

  const handleCommitContract = async () => {
    if (stats.credits < stakeCredits) {
      Alert.alert('榮譽積分不足', `當前僅有 ${stats.credits} 點，請調整押注籌碼`);
      return;
    }

    const newContract: PledgeContract = {
      id: `pledge_${Date.now()}`,
      title: `${targetMinutes}分鐘・${targetEdgeCount}次Edge自律契約`,
      ruleType,
      targetMinutes,
      targetEdgeCount,
      penaltyType,
      stakeCredits,
      createdAt: Date.now(),
    };

    await pledgeService.setActiveContract(newContract);
    setActiveContract(newContract);

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    Alert.alert(
      '🔥 自律契約正式簽署！',
      `本次目標：撐滿 ${targetMinutes} 分鐘並完成 ${targetEdgeCount} 次 Edge 急停！\n勝出可得 +${Math.round(
        stakeCredits * 1.5
      )} 點，違約將觸發「${PENALTY_LABELS[penaltyType].label}」！`
    );

    if (onContractCommitted) {
      onContractCommitted(newContract);
    }
    onClose();
  };

  const handleCancelContract = async () => {
    Alert.alert(
      '放棄當前契約？',
      '在正式開始前放棄不會觸發懲罰，確定要撤銷嗎？',
      [
        { text: '保留契約', style: 'cancel' },
        {
          text: '確定撤銷',
          style: 'destructive',
          onPress: async () => {
            await pledgeService.setActiveContract(null);
            setActiveContract(null);
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={handleModalShow}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="sword-cross" size={20} color="#F59E0B" />
              </View>
              <View>
                <Text style={styles.title}>自律契約賭局機制</Text>
                <Text style={styles.subtitle}>Action 訓練承諾 · 勝敗結算與懲罰約束</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Stats Overview Banner */}
            <View style={styles.statsBanner}>
              <View style={styles.statsCol}>
                <Text style={styles.statsNum}>{stats.credits}</Text>
                <Text style={styles.statsLabel}>榮譽點數</Text>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsCol}>
                <Text style={[styles.statsNum, { color: '#F59E0B' }]}>
                  {stats.streak} 連勝 🔥
                </Text>
                <Text style={styles.statsLabel}>當前紀錄</Text>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsCol}>
                <Text style={[styles.statsNum, { color: '#10B981' }]}>
                  {stats.totalWins}勝 {stats.totalLosses}敗
                </Text>
                <Text style={styles.statsLabel}>歷史戰績</Text>
              </View>
            </View>

            {/* If active contract already exists */}
            {activeContract && (
              <View style={styles.activeCard}>
                <View style={styles.activeHeader}>
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>🔥 契約待履行中</Text>
                  </View>
                  <TouchableOpacity onPress={handleCancelContract}>
                    <Text style={styles.cancelLinkText}>撤銷契約</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.activeTitle}>{activeContract.title}</Text>
                <Text style={styles.activeSub}>
                  承諾押注：{activeContract.stakeCredits} 點 · 違約懲罰：
                  {PENALTY_LABELS[activeContract.penaltyType].label}
                </Text>
              </View>
            )}

            {/* Presets Row */}
            <Text style={styles.sectionHeader}>1. 快速選擇賭局模板</Text>
            <View style={styles.presetsRow}>
              {PRESET_CONTRACTS.map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  style={styles.presetCard}
                  onPress={() => handleApplyPreset(preset)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.presetTitle}>{preset.title}</Text>
                  <Text style={styles.presetDesc}>{preset.desc}</Text>
                  <View style={styles.presetStake}>
                    <Text style={styles.presetStakeText}>押注 {preset.stakeCredits} 點</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Rules Settings */}
            <Text style={styles.sectionHeader}>2. 自訂目標時長與 Edge 急停門檻</Text>
            <View style={styles.configCard}>
              {/* Target Duration Stepper */}
              <View style={styles.configRow}>
                <View>
                  <Text style={styles.configLabel}>目標訓練時長</Text>
                  <Text style={styles.configSub}>必須完整撐滿此時間</Text>
                </View>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setTargetMinutes((prev) => Math.max(5, prev - 5))}
                  >
                    <Ionicons name="remove" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={styles.stepValue}>{targetMinutes} 分鐘</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setTargetMinutes((prev) => Math.min(60, prev + 5))}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Target Edge Count Stepper */}
              <View style={[styles.configRow, { marginTop: 14 }]}>
                <View>
                  <Text style={styles.configLabel}>最少 Edge 急停次數</Text>
                  <Text style={styles.configSub}>臨界點收手冷靜次數</Text>
                </View>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setTargetEdgeCount((prev) => Math.max(1, prev - 1))}
                  >
                    <Ionicons name="remove" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={styles.stepValue}>{targetEdgeCount} 次</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setTargetEdgeCount((prev) => Math.min(15, prev + 1))}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Stake Credits Stepper */}
              <View style={[styles.configRow, { marginTop: 14 }]}>
                <View>
                  <Text style={styles.configLabel}>押注榮譽籌碼</Text>
                  <Text style={styles.configSub}>獲勝可拿回 1.5 倍點數</Text>
                </View>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setStakeCredits((prev) => Math.max(50, prev - 50))}
                  >
                    <Ionicons name="remove" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={[styles.stepValue, { color: '#F59E0B' }]}>
                    {stakeCredits} 點
                  </Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setStakeCredits((prev) => Math.min(1000, prev + 50))}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Penalty Type Selection */}
            <Text style={styles.sectionHeader}>3. 選擇違約懲罰條件</Text>
            <View style={styles.penaltyGrid}>
              {(['LOCKOUT_12H', 'LOCKOUT_24H', 'PANEL_ROAST', 'DOUBLE_TOMORROW'] as PenaltyType[]).map(
                (p) => {
                  const isSel = penaltyType === p;
                  const item = PENALTY_LABELS[p];
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[styles.penaltyCard, isSel && styles.penaltyCardSelected]}
                      onPress={() => setPenaltyType(p)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.penaltyHeader}>
                        <Ionicons
                          name={item.icon as keyof typeof Ionicons.glyphMap}
                          size={16}
                          color={isSel ? '#EF4444' : '#94A3B8'}
                        />
                        <Text style={[styles.penaltyLabel, isSel && { color: '#EF4444' }]}>
                          {item.label}
                        </Text>
                      </View>
                      <Text style={styles.penaltyDesc}>{item.desc}</Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </View>

            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Bottom Action Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.commitBtn}
              onPress={handleCommitContract}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="sword-cross" size={18} color="#0F172A" />
              <Text style={styles.commitBtnText}>簽署並立下自律契約</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: '#334155',
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  statsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#131D33',
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  statsCol: {
    alignItems: 'center',
  },
  statsNum: {
    fontSize: 15,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  statsLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  statsDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#1E293B',
  },
  activeCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginBottom: 16,
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  activeBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
  },
  cancelLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  activeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  activeSub: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 3,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 10,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  presetCard: {
    flex: 1,
    backgroundColor: '#131D33',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  presetTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  presetDesc: {
    fontSize: 9,
    color: '#94A3B8',
    lineHeight: 13,
    marginBottom: 8,
  },
  presetStake: {
    backgroundColor: '#1E293B',
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
  },
  presetStakeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#F59E0B',
  },
  configCard: {
    backgroundColor: '#131D33',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  configLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  configSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  stepValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    minWidth: 55,
    textAlign: 'center',
  },
  penaltyGrid: {
    gap: 8,
  },
  penaltyCard: {
    backgroundColor: '#131D33',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  penaltyCardSelected: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  penaltyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  penaltyLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  penaltyDesc: {
    fontSize: 10,
    color: '#94A3B8',
    lineHeight: 14,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  commitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F59E0B',
    paddingVertical: 13,
    borderRadius: 12,
  },
  commitBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
});
