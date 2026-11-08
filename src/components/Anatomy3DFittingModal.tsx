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
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { THEME } from '../constants/theme';
import { AnatomyMorphParams, EHSLevel } from '../types';
import { EHS_LEVEL_METADATA } from '../services/ehsService';
import {
  anatomy3DService,
  DEFAULT_ANATOMY_PARAMS,
  PRESET_BODY_TYPES,
  SKIN_TONE_PALETTE,
} from '../services/anatomy3DService';
import { Interactive3DMesh } from './3d/Interactive3DMesh';

interface Anatomy3DFittingModalProps {
  visible: boolean;
  onClose: () => void;
  onParamsSaved?: (params: AnatomyMorphParams) => void;
}

export const Anatomy3DFittingModal: React.FC<Anatomy3DFittingModalProps> = ({
  visible,
  onClose,
  onParamsSaved,
}) => {
  const [params, setParams] = useState<AnatomyMorphParams>(DEFAULT_ANATOMY_PARAMS);
  const [frontPhotoUri, setFrontPhotoUri] = useState<string | null>(null);
  const [sidePhotoUri, setSidePhotoUri] = useState<string | null>(null);
  const [isFitting, setIsFitting] = useState<boolean>(false);

  const loadCurrentParams = async () => {
    const loaded = await anatomy3DService.getParams();
    setParams(loaded);
  };

  const handleModalShow = () => {
    void loadCurrentParams();
  };

  const handlePickPhoto = async (type: 'front' | 'side') => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!res.canceled && res.assets && res.assets[0].uri) {
        if (type === 'front') setFrontPhotoUri(res.assets[0].uri);
        if (type === 'side') setSidePhotoUri(res.assets[0].uri);
      }
    } catch {
      Alert.alert('提示', '無法存取相簿');
    }
  };

  const handleRunAutoFitting = async () => {
    if (!frontPhotoUri && !sidePhotoUri) {
      Alert.alert('請先選取照片', '請至少提供正面或側面照片以利輪廓提取');
      return;
    }

    setIsFitting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const fitted = await anatomy3DService.fitParamsFromPhotos(
        frontPhotoUri || undefined,
        sidePhotoUri || undefined
      );
      setParams(fitted);

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      Alert.alert(
        '🎯 幾何輪廓提取完成！',
        `自動擬合係數：\n長度係數：${fitted.lengthFactor}x\n粗細係數：${fitted.girthFactor}x\n彎曲角度：${fitted.curvatureAngle}°\n可於下方滑桿進一步手動微調。`
      );
    } catch {
      Alert.alert('擬合失敗', '請確認照片清晰度');
    } finally {
      setIsFitting(false);
    }
  };

  const handleApplyPreset = (preset: (typeof PRESET_BODY_TYPES)[0]) => {
    try {
      Haptics.selectionAsync().catch(() => {});
    } catch {}
    setParams((prev) => ({
      ...prev,
      modelType: 'CUSTOM',
      lengthFactor: preset.lengthFactor,
      girthFactor: preset.girthFactor,
      curvatureAngle: preset.curvatureAngle,
      scrotumTightness: preset.scrotumTightness,
    }));
  };

  const handleSave = async () => {
    await anatomy3DService.saveParams(params);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    if (onParamsSaved) {
      onParamsSaved(params);
    }
    Alert.alert('已儲存', '3D 解剖參數已寫入本地私有沙盒');
    onClose();
  };

  const handleReset = async () => {
    const res = await anatomy3DService.resetDefault();
    setParams(res);
    setFrontPhotoUri(null);
    setSidePhotoUri(null);
    Alert.alert('已重設', '已恢復為系統標準 1:1 解剖黃金比例');
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
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="cube-scan" size={20} color="#38BDF8" />
              </View>
              <View>
                <Text style={styles.title}>真理解剖 3D 擬合實驗室</Text>
                <Text style={styles.subtitle}>參數化網格骨骼形變 · 本地 100% 離線擬真</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Live 3D Preview Box with Physical Touch, Caliper & Underwear Layer */}
            <View style={styles.viewerWrapper}>
              <Interactive3DMesh
                morphParams={params}
                height={280}
                showDanmaku={true}
              />
            </View>

            {/* Model Type Selector */}
            <View style={styles.modelTypeToggle}>
              <TouchableOpacity
                style={[
                  styles.modelTypeBtn,
                  params.modelType === 'DEFAULT' && styles.modelTypeBtnActive,
                ]}
                onPress={() => setParams((p) => ({ ...p, modelType: 'DEFAULT' }))}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={14}
                  color={params.modelType === 'DEFAULT' ? '#38BDF8' : '#64748B'}
                />
                <Text
                  style={[
                    styles.modelTypeBtnText,
                    params.modelType === 'DEFAULT' && styles.modelTypeBtnTextActive,
                  ]}
                >
                  系統標準模型 (1:1 預設)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modelTypeBtn,
                  params.modelType === 'CUSTOM' && styles.modelTypeBtnActive,
                ]}
                onPress={() => setParams((p) => ({ ...p, modelType: 'CUSTOM' }))}
              >
                <Ionicons
                  name="camera"
                  size={14}
                  color={params.modelType === 'CUSTOM' ? '#38BDF8' : '#64748B'}
                />
                <Text
                  style={[
                    styles.modelTypeBtnText,
                    params.modelType === 'CUSTOM' && styles.modelTypeBtnTextActive,
                  ]}
                >
                  拍照自訂擬合模型
                </Text>
              </TouchableOpacity>
            </View>

            {/* EHS Hardness Level Switcher for 3D Preview */}
            <View style={styles.ehsSwitchSection}>
              <View style={styles.ehsSwitchHeader}>
                <Text style={styles.ehsSwitchTitle}>充血 EHS 硬度預覽：</Text>
                <Text style={styles.ehsSwitchSub}>Level 4 著色器即時調高飽和度與青筋法線</Text>
              </View>
              <View style={styles.ehsRow}>
                {([1, 2, 3, 4] as EHSLevel[]).map((lvl) => {
                  const meta = EHS_LEVEL_METADATA[lvl];
                  const isSel = (params.ehsLevel || 4) === lvl;
                  return (
                    <TouchableOpacity
                      key={`fitting_ehs_${lvl}`}
                      style={[
                        styles.ehsBtn,
                        isSel && { borderColor: meta.color, backgroundColor: meta.color + '25' },
                      ]}
                      onPress={() => {
                        try {
                          void Haptics.selectionAsync();
                        } catch {}
                        setParams((prev) => ({ ...prev, ehsLevel: lvl }));
                      }}
                    >
                      <Text style={[styles.ehsBtnText, isSel && { color: meta.color, fontWeight: '700' }]}>
                        L{lvl} {meta.analogy}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Section 1: Multi-Angle Photo Fitting Guide */}
            {params.modelType === 'CUSTOM' && (
              <View style={styles.fittingSection}>
                <Text style={styles.sectionTitle}>1. 多視角照片引導擬合</Text>
                <View style={styles.photoRow}>
                  <TouchableOpacity
                    style={styles.photoBox}
                    onPress={() => handlePickPhoto('front')}
                  >
                    <Ionicons
                      name={frontPhotoUri ? 'checkmark-circle' : 'camera-outline'}
                      size={22}
                      color={frontPhotoUri ? '#10B981' : '#64748B'}
                    />
                    <Text style={styles.photoLabel}>
                      {frontPhotoUri ? '正面照片已載入' : '正面視角照 (粗細)'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.photoBox}
                    onPress={() => handlePickPhoto('side')}
                  >
                    <Ionicons
                      name={sidePhotoUri ? 'checkmark-circle' : 'camera-outline'}
                      size={22}
                      color={sidePhotoUri ? '#10B981' : '#64748B'}
                    />
                    <Text style={styles.photoLabel}>
                      {sidePhotoUri ? '側面照片已載入' : '側面 90° 照 (長度/曲率)'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.autoFitBtn}
                  onPress={handleRunAutoFitting}
                  disabled={isFitting}
                >
                  <MaterialCommunityIcons name="auto-fix" size={16} color="#0F172A" />
                  <Text style={styles.autoFitBtnText}>
                    {isFitting ? '正在提取幾何特徵...' : '自動分析線條並擬合 3D 網格'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Section 2: Preset Templates */}
            <Text style={styles.sectionTitle}>2. 快速套用體態模板</Text>
            <View style={styles.presetsGrid}>
              {PRESET_BODY_TYPES.map((preset, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.presetChip}
                  onPress={() => handleApplyPreset(preset)}
                >
                  <Text style={styles.presetChipTitle}>{preset.name}</Text>
                  <Text style={styles.presetChipDesc}>{preset.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Section 3: Fine-Tuning Parameter Steppers */}
            <Text style={styles.sectionTitle}>3. 參數化形變精準微調</Text>

            {/* Length factor */}
            <View style={styles.stepperCard}>
              <View>
                <Text style={styles.stepperLabel}>長度形變係數 (Length Factor)</Text>
                <Text style={styles.stepperSub}>縮放縱向海綿體長度比例</Text>
              </View>
              <View style={styles.stepperControls}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() =>
                    setParams((p) => ({
                      ...p,
                      lengthFactor: Math.max(0.6, Number((p.lengthFactor - 0.1).toFixed(2))),
                    }))
                  }
                >
                  <Ionicons name="remove" size={16} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.stepVal}>{params.lengthFactor}x</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() =>
                    setParams((p) => ({
                      ...p,
                      lengthFactor: Math.min(2.0, Number((p.lengthFactor + 0.1).toFixed(2))),
                    }))
                  }
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Girth factor */}
            <View style={styles.stepperCard}>
              <View>
                <Text style={styles.stepperLabel}>粗度形變係數 (Girth Factor)</Text>
                <Text style={styles.stepperSub}>徑向充血截面周長</Text>
              </View>
              <View style={styles.stepperControls}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() =>
                    setParams((p) => ({
                      ...p,
                      girthFactor: Math.max(0.6, Number((p.girthFactor - 0.1).toFixed(2))),
                    }))
                  }
                >
                  <Ionicons name="remove" size={16} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.stepVal}>{params.girthFactor}x</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() =>
                    setParams((p) => ({
                      ...p,
                      girthFactor: Math.min(2.0, Number((p.girthFactor + 0.1).toFixed(2))),
                    }))
                  }
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Curvature angle */}
            <View style={styles.stepperCard}>
              <View>
                <Text style={styles.stepperLabel}>仰角微彎弧度 (Curvature)</Text>
                <Text style={styles.stepperSub}>-30° (向下) ~ +30° (上揚)</Text>
              </View>
              <View style={styles.stepperControls}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() =>
                    setParams((p) => ({
                      ...p,
                      curvatureAngle: Math.max(-30, p.curvatureAngle - 5),
                    }))
                  }
                >
                  <Ionicons name="remove" size={16} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.stepVal}>{params.curvatureAngle}°</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() =>
                    setParams((p) => ({
                      ...p,
                      curvatureAngle: Math.min(30, p.curvatureAngle + 5),
                    }))
                  }
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Scrotum Tightness */}
            <View style={styles.stepperCard}>
              <View>
                <Text style={styles.stepperLabel}>提睪肌緊緻度 (Scrotal Tone)</Text>
                <Text style={styles.stepperSub}>0.0 (緊縮) ~ 1.0 (垂墜)</Text>
              </View>
              <View style={styles.stepperControls}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() =>
                    setParams((p) => ({
                      ...p,
                      scrotumTightness: Math.max(0.0, Number((p.scrotumTightness - 0.1).toFixed(2))),
                    }))
                  }
                >
                  <Ionicons name="remove" size={16} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.stepVal}>{params.scrotumTightness}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() =>
                    setParams((p) => ({
                      ...p,
                      scrotumTightness: Math.min(1.0, Number((p.scrotumTightness + 0.1).toFixed(2))),
                    }))
                  }
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Skin Tone Palette */}
            <Text style={[styles.sectionTitle, { marginTop: 14 }]}>4. 膚色材質色相光譜</Text>
            <View style={styles.paletteRow}>
              {SKIN_TONE_PALETTE.map((item, idx) => {
                const isSel = params.skinToneIndex === idx;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.paletteCircle,
                      { backgroundColor: item.baseColor },
                      isSel && styles.paletteCircleSelected,
                    ]}
                    onPress={() => setParams((p) => ({ ...p, skinToneIndex: idx }))}
                  />
                );
              })}
            </View>

            <View style={{ height: 30 }} />
          </ScrollView>

          {/* Bottom Actions */}
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Text style={styles.resetBtnText}>恢復預設</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Ionicons name="save" size={16} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>儲存 3D 模型配置</Text>
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
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: '#334155',
    maxHeight: '94%',
    paddingBottom: 20,
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
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
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
    paddingTop: 12,
  },
  viewerWrapper: {
    marginBottom: 12,
  },
  modelTypeToggle: {
    flexDirection: 'row',
    backgroundColor: '#131D33',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
    gap: 4,
  },
  modelTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  modelTypeBtnActive: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  modelTypeBtnText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  modelTypeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  ehsSwitchSection: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  ehsSwitchHeader: {
    marginBottom: 8,
  },
  ehsSwitchTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  ehsSwitchSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  ehsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  ehsBtn: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  ehsBtnText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 8,
  },
  fittingSection: {
    backgroundColor: '#131D33',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  photoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  photoBox: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  photoLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 6,
    textAlign: 'center',
  },
  autoFitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#38BDF8',
    paddingVertical: 10,
    borderRadius: 10,
  },
  autoFitBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    width: '48%',
    backgroundColor: '#131D33',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  presetChipTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F1F5F9',
    marginBottom: 2,
  },
  presetChipDesc: {
    fontSize: 9,
    color: '#64748B',
  },
  stepperCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#131D33',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  stepperLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  stepperSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  stepVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38BDF8',
    minWidth: 46,
    textAlign: 'center',
  },
  paletteRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  paletteCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  paletteCircleSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
