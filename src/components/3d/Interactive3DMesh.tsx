import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import Svg, { Polygon, Line, Circle } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  AnatomyMorphParams,
  AnatomyShaderStyle,
  Polygon3D,
  Vector3D,
  TouchDeformation,
  HapticZoneType,
  CaliperMeasurement,
  UnderwearItem,
  LODLevel,
} from '../../types';
import {
  anatomy3DService,
  DEFAULT_ANATOMY_PARAMS,
} from '../../services/anatomy3DService';
import { underwear3DService } from '../../services/underwear3DService';
import { performanceManager } from '../../services/performanceManager';
import { useUserProfile } from '../../services/userProfile';
import { DanmakuOverlay } from '../DanmakuOverlay';

export type MeshInteractionMode = 'touch' | 'caliper' | 'underwear';

interface Interactive3DMeshProps {
  morphParams?: AnatomyMorphParams;
  underwearItem?: UnderwearItem | null;
  height?: number;
  initialMode?: MeshInteractionMode;
  showDanmaku?: boolean;
  onMeasurementChange?: (measurement: CaliperMeasurement) => void;
  isSplitSmall?: boolean;
  lodOverride?: LODLevel;
}

const touchRuntimeCache = {
  lastHapticTs: 0,
  decayTimer: null as number | null,
};

export const Interactive3DMesh: React.FC<Interactive3DMeshProps> = ({
  morphParams,
  underwearItem = null,
  height = 320,
  initialMode = 'touch',
  showDanmaku = false,
  onMeasurementChange,
  isSplitSmall = false,
  lodOverride,
}) => {
  const { profile } = useUserProfile();
  const userLengthNum = parseFloat(profile.userLength || '16.0') || 16.0;

  const [localParams, setLocalParams] = useState<AnatomyMorphParams>(DEFAULT_ANATOMY_PARAMS);
  const activeParams = morphParams || localParams;

  const [mode, setMode] = useState<MeshInteractionMode>(initialMode);
  const [shaderStyle, setShaderStyle] = useState<AnatomyShaderStyle>('REALISTIC');

  // Adaptive LOD & Thermal Protection
  const effectiveLOD = useMemo(
    () => lodOverride || performanceManager.getLODLevel(height, isSplitSmall),
    [lodOverride, height, isSplitSmall]
  );

  // 3D Camera Angles
  const [rotX, setRotX] = useState<number>(0.15); // pitch
  const [rotY, setRotY] = useState<number>(0.35); // yaw
  const [zoom] = useState<number>(1.0);

  const [containerWidth, setContainerWidth] = useState<number>(340);

  // Dynamic Physical Touch Deformation State
  const [touchDeform, setTouchDeform] = useState<TouchDeformation | null>(null);
  const [activeHapticZone, setActiveHapticZone] = useState<HapticZoneType | null>(null);

  // Caliper Marker Points
  const anchors = useMemo(
    () => anatomy3DService.getAnatomicalAnchors(activeParams),
    [activeParams]
  );
  const [offsetYA, setOffsetYA] = useState<number>(0);
  const [offsetYB, setOffsetYB] = useState<number>(0);
  const [activeDragMarker, setActiveDragMarker] = useState<'A' | 'B' | null>(null);

  const markerA = useMemo<Vector3D>(() => ({
    ...anchors.baseAnchor,
    y: anchors.baseAnchor.y + offsetYA,
  }), [anchors, offsetYA]);

  const markerB = useMemo<Vector3D>(() => ({
    ...anchors.apexAnchor,
    y: anchors.apexAnchor.y + offsetYB,
  }), [anchors, offsetYB]);

  useEffect(() => {
    if (!morphParams) {
      void anatomy3DService.getParams().then(setLocalParams);
    }
  }, [morphParams]);

  // Calculate live Caliper 3D distance and real cm conversion
  const caliperData = useMemo(() => {
    const dx = markerB.x - markerA.x;
    const dy = markerB.y - markerA.y;
    const dz = markerB.z - markerA.z;
    const dist3D = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const baseLen = 110 * activeParams.lengthFactor + 34;
    const ratio = dist3D / baseLen;
    const measuredCm = Math.max(2.0, Math.round(userLengthNum * ratio * 10) / 10);

    return {
      dist3D,
      measuredCm,
    };
  }, [markerA, markerB, activeParams.lengthFactor, userLengthNum]);

  // Notify parent of measurement update
  useEffect(() => {
    if (onMeasurementChange) {
      onMeasurementChange({
        pointA: markerA,
        pointB: markerB,
        distance3D: caliperData.dist3D,
        distanceCm: caliperData.measuredCm,
      });
    }
  }, [caliperData, markerA, markerB, onMeasurementChange]);

  // Touch Release Spring Recovery
  const triggerSpringRecovery = useCallback(() => {
    if (touchRuntimeCache.decayTimer) cancelAnimationFrame(touchRuntimeCache.decayTimer);

    let intensity = 0.8;
    const step = () => {
      intensity *= 0.72; // Spring back decay rate
      if (intensity < 0.02) {
        setTouchDeform(null);
        setActiveHapticZone(null);
      } else {
        setTouchDeform((prev) => (prev ? { ...prev, intensity } : null));
        touchRuntimeCache.decayTimer = requestAnimationFrame(step);
      }
    };
    touchRuntimeCache.decayTimer = requestAnimationFrame(step);
  }, []);

  const handleTouchAtScreen = useCallback((screenX: number, screenY: number) => {
    const relX = (screenX - containerWidth * 0.5) / zoom;
    const relY = -(screenY - height * 0.5) / zoom;

    const hitPoint3D: Vector3D = {
      x: relX * 0.8,
      y: relY * 0.8,
      z: 12,
    };

    const zone = anatomy3DService.identifyHapticZone(hitPoint3D, activeParams);
    setActiveHapticZone(zone);

    // Throttle haptics for sensitive zones
    const now = Date.now();
    if (zone === 'FRENULUM' || zone === 'CORONA') {
      if (now - touchRuntimeCache.lastHapticTs > 120) {
        touchRuntimeCache.lastHapticTs = now;
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}
      }
    }

    setTouchDeform({
      x: hitPoint3D.x,
      y: hitPoint3D.y,
      z: hitPoint3D.z,
      radius: 38,
      intensity: 1.0,
      zone,
    });
  }, [containerWidth, zoom, height, activeParams]);

  // Caliper Screen Projections for Point A & B
  const screenMarkerA = useMemo(
    () => anatomy3DService.projectPoint(markerA, rotX, rotY, zoom, containerWidth, height),
    [markerA, rotX, rotY, zoom, containerWidth, height]
  );
  const screenMarkerB = useMemo(
    () => anatomy3DService.projectPoint(markerB, rotX, rotY, zoom, containerWidth, height),
    [markerB, rotX, rotY, zoom, containerWidth, height]
  );

  // PanResponder
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt: GestureResponderEvent) => {
          performanceManager.reportInteraction();
          const { locationX, locationY } = evt.nativeEvent;

          if (mode === 'caliper') {
            const distA = Math.hypot(screenMarkerA.x - locationX, screenMarkerA.y - locationY);
            const distB = Math.hypot(screenMarkerB.x - locationX, screenMarkerB.y - locationY);

            if (distA < 36) {
              try { Haptics.selectionAsync(); } catch {}
              setActiveDragMarker('A');
            } else if (distB < 36) {
              try { Haptics.selectionAsync(); } catch {}
              setActiveDragMarker('B');
            } else {
              setActiveDragMarker(null);
            }
          } else if (mode === 'touch') {
            handleTouchAtScreen(locationX, locationY);
          }
        },
        onPanResponderMove: (
          evt: GestureResponderEvent,
          gestureState: PanResponderGestureState
        ) => {
          performanceManager.reportInteraction();
          const { locationX, locationY } = evt.nativeEvent;

          if (mode === 'caliper') {
            if (activeDragMarker === 'A') {
              setOffsetYA((prev) => Math.max(-50, Math.min(prev - gestureState.dy * 0.4, 40)));
            } else if (activeDragMarker === 'B') {
              setOffsetYB((prev) => Math.max(-40, Math.min(prev - gestureState.dy * 0.4, 50)));
            } else {
              setRotY((prev) => prev + gestureState.dx * 0.005);
              setRotX((prev) => Math.max(-0.9, Math.min(0.9, prev - gestureState.dy * 0.005)));
            }
          } else if (mode === 'touch') {
            handleTouchAtScreen(locationX, locationY);
          } else {
            setRotY((prev) => prev + gestureState.dx * 0.005);
            setRotX((prev) => Math.max(-0.9, Math.min(0.9, prev - gestureState.dy * 0.005)));
          }
        },
        onPanResponderRelease: () => {
          performanceManager.reportInteractionEnd();
          setActiveDragMarker(null);
          if (mode === 'touch') {
            triggerSpringRecovery();
          }
        },
      }),
    [mode, activeDragMarker, screenMarkerA, screenMarkerB, handleTouchAtScreen, triggerSpringRecovery]
  );

  // Generate Base Anatomical 3D Polygons
  const basePolygons: Polygon3D[] = useMemo(() => {
    return anatomy3DService.generateRenderPolygons(
      activeParams,
      rotX,
      rotY,
      zoom,
      containerWidth,
      height,
      shaderStyle,
      'pulse',
      0,
      touchDeform || undefined,
      effectiveLOD
    );
  }, [activeParams, rotX, rotY, zoom, containerWidth, height, shaderStyle, touchDeform, effectiveLOD]);

  // Generate Underwear 3D Polygons if in underwear mode or selected
  const underwearPolygons: Polygon3D[] = useMemo(() => {
    if (mode !== 'underwear' && !underwearItem) return [];
    const cut = underwearItem?.cutType || 'BRIEF';
    const color = underwearItem?.colorTag || '#1E293B';
    return underwear3DService.generateUnderwearPolygons(
      activeParams,
      cut,
      color,
      rotX,
      rotY,
      zoom,
      containerWidth,
      height
    );
  }, [mode, underwearItem, activeParams, rotX, rotY, zoom, containerWidth, height]);

  // Combined Render Polygons (Anatomy + Underwear)
  const renderedPolygons = useMemo(() => {
    if (underwearPolygons.length === 0) return basePolygons;
    const combined = [...basePolygons, ...underwearPolygons];
    combined.sort((a, b) => b.depth - a.depth);
    return combined;
  }, [basePolygons, underwearPolygons]);

  return (
    <View
      style={[styles.container, { height }]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setContainerWidth(w);
      }}
      {...panResponder.panHandlers}
    >
      {/* 3D SVG Render Canvas */}
      <Svg width="100%" height={height} style={StyleSheet.absoluteFill}>
        {renderedPolygons.map((poly, idx) => (
          <Polygon
            key={`mesh_${idx}`}
            points={poly.points.map((p) => `${p[0]},${p[1]}`).join(' ')}
            fill={poly.color}
            stroke={poly.strokeColor || 'none'}
            strokeWidth={poly.isWireframe ? 1.0 : 0.4}
            strokeLinejoin="round"
          />
        ))}

        {/* Sensitive Zone Glowing Touch Halo */}
        {touchDeform && (touchDeform.zone === 'FRENULUM' || touchDeform.zone === 'CORONA') && (
          <Circle
            cx={containerWidth * 0.5 + touchDeform.x * zoom}
            cy={height * 0.5 - touchDeform.y * zoom}
            r={32 * touchDeform.intensity}
            fill="rgba(244, 63, 94, 0.25)"
            stroke="#FB7185"
            strokeWidth={1.5}
          />
        )}

        {/* Caliper Virtual Ruler Overlay Lines */}
        {mode === 'caliper' && (
          <>
            {/* Dashed connecting dimension line */}
            <Line
              x1={screenMarkerA.x}
              y1={screenMarkerA.y}
              x2={screenMarkerB.x}
              y2={screenMarkerB.y}
              stroke="#38BDF8"
              strokeWidth={2}
              strokeDasharray="4,4"
            />
            {/* Marker A Crossbar */}
            <Line
              x1={screenMarkerA.x - 14}
              y1={screenMarkerA.y}
              x2={screenMarkerA.x + 14}
              y2={screenMarkerA.y}
              stroke="#38BDF8"
              strokeWidth={2.5}
            />
            {/* Marker B Crossbar */}
            <Line
              x1={screenMarkerB.x - 14}
              y1={screenMarkerB.y}
              x2={screenMarkerB.x + 14}
              y2={screenMarkerB.y}
              stroke="#38BDF8"
              strokeWidth={2.5}
            />
          </>
        )}
      </Svg>

      {/* Caliper Interactive Draggable Marker Points (HTML/Native Layer) */}
      {mode === 'caliper' && (
        <>
          <View
            style={[
              styles.markerHandle,
              { left: screenMarkerA.x - 14, top: screenMarkerA.y - 14 },
            ]}
          >
            <View style={[styles.markerDot, { backgroundColor: '#38BDF8' }]} />
            <Text style={styles.markerLabel}>A (根部)</Text>
          </View>

          <View
            style={[
              styles.markerHandle,
              { left: screenMarkerB.x - 14, top: screenMarkerB.y - 14 },
            ]}
          >
            <View style={[styles.markerDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.markerLabel}>B (頂端)</Text>
          </View>

          {/* Floating Caliper Measurement Reading HUD */}
          <View
            style={[
              styles.caliperReadingBadge,
              {
                left: Math.max(16, (screenMarkerA.x + screenMarkerB.x) * 0.5 - 75),
                top: Math.max(20, (screenMarkerA.y + screenMarkerB.y) * 0.5 - 28),
              },
            ]}
          >
            <MaterialCommunityIcons name="ruler" size={16} color="#38BDF8" />
            <View>
              <Text style={styles.caliperValueText}>
                {caliperData.measuredCm} cm
              </Text>
              <Text style={styles.caliperSubText}>實體換算長度 (±0.1cm)</Text>
            </View>
          </View>
        </>
      )}

      {/* Sensitive Nerve Zone Alert Indicator */}
      {touchDeform && activeHapticZone && (
        <View style={styles.hapticFeedbackBadge}>
          <MaterialCommunityIcons
            name={activeHapticZone === 'FRENULUM' ? 'flare' : 'feather'}
            size={14}
            color="#FB7185"
          />
          <Text style={styles.hapticFeedbackText}>
            {activeHapticZone === 'FRENULUM'
              ? '⚡ 繫帶敏感叢微震刺激中'
              : activeHapticZone === 'CORONA'
              ? '✨ 冠狀溝神經末梢觸摸反饋'
              : activeHapticZone === 'BASE'
              ? '⚓ 懸韌帶根部下壓'
              : '🌊 陰囊提睪肌放鬆'}
          </Text>
        </View>
      )}

      {/* Top Mode Selector Pills */}
      <View style={styles.modeSelectorBar}>
        <TouchableOpacity
          style={[styles.modePill, mode === 'touch' && styles.modePillActive]}
          onPress={() => {
            try { Haptics.selectionAsync(); } catch {}
            setMode('touch');
          }}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="gesture-tap"
            size={13}
            color={mode === 'touch' ? '#60A5FA' : '#94A3B8'}
          />
          <Text style={[styles.modePillText, mode === 'touch' && styles.modePillTextActive]}>
            物理觸碰
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modePill, mode === 'caliper' && styles.modePillActive]}
          onPress={() => {
            try { Haptics.selectionAsync(); } catch {}
            setMode('caliper');
          }}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="ruler"
            size={13}
            color={mode === 'caliper' ? '#38BDF8' : '#94A3B8'}
          />
          <Text style={[styles.modePillText, mode === 'caliper' && styles.modePillTextActive]}>
            測量卡尺
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modePill, mode === 'underwear' && styles.modePillActive]}
          onPress={() => {
            try { Haptics.selectionAsync(); } catch {}
            setMode('underwear');
          }}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="tshirt-v-outline"
            size={13}
            color={mode === 'underwear' ? '#A78BFA' : '#94A3B8'}
          />
          <Text style={[styles.modePillText, mode === 'underwear' && styles.modePillTextActive]}>
            3D 試穿
          </Text>
        </TouchableOpacity>
      </View>

      {/* Shader Style Quick Selector (Bottom Left) */}
      <View style={styles.shaderToggleRow}>
        {(['REALISTIC', 'BLUEPRINT', 'ANATOMICAL'] as AnatomyShaderStyle[]).map((st) => (
          <TouchableOpacity
            key={st}
            style={[styles.shaderBtn, shaderStyle === st && styles.shaderBtnActive]}
            onPress={() => {
              try { Haptics.selectionAsync(); } catch {}
              setShaderStyle(st);
            }}
          >
            <Text style={[styles.shaderBtnText, shaderStyle === st && styles.shaderBtnTextActive]}>
              {st === 'REALISTIC' ? '立體' : st === 'BLUEPRINT' ? '線框' : '肌理'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Live Danmaku Overlay Layer */}
      {showDanmaku && <DanmakuOverlay isActive={true} densityMultiplier={1.2} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#030712',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  modeSelectorBar: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    padding: 3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 10,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modePillActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
  },
  modePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  modePillTextActive: {
    color: '#60A5FA',
    fontWeight: '800',
  },
  markerHandle: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 20,
  },
  markerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  markerLabel: {
    position: 'absolute',
    bottom: -14,
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  caliperReadingBadge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(3, 105, 161, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 15,
  },
  caliperValueText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  caliperSubText: {
    fontSize: 9,
    color: '#E0F2FE',
  },
  hapticFeedbackBadge: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FB7185',
    zIndex: 15,
  },
  hapticFeedbackText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FDA4AF',
  },
  shaderToggleRow: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    padding: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  shaderBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  shaderBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
  },
  shaderBtnText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  shaderBtnTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
});
