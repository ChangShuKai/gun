import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import Svg, { Polygon, Line } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  AnatomyMorphParams,
  AnatomyShaderStyle,
  Polygon3D,
} from '../types';
import {
  anatomy3DService,
  DEFAULT_ANATOMY_PARAMS,
} from '../services/anatomy3DService';

interface Anatomy3DViewerProps {
  morphParams?: AnatomyMorphParams;
  shaderStyle?: AnatomyShaderStyle;
  technique?: 'massage' | 'tickle' | 'pulse';
  interactive?: boolean;
  height?: number;
  showControls?: boolean;
  onOpenFittingModal?: () => void;
}

export const Anatomy3DViewer: React.FC<Anatomy3DViewerProps> = ({
  morphParams,
  shaderStyle = 'REALISTIC',
  technique = 'pulse',
  interactive = true,
  height = 300,
  showControls = true,
  onOpenFittingModal,
}) => {
  const [localParams, setLocalParams] = useState<AnatomyMorphParams>(DEFAULT_ANATOMY_PARAMS);
  const params = morphParams || localParams;
  const [currentStyle, setCurrentStyle] = useState<AnatomyShaderStyle>(shaderStyle);

  // 3D Camera Angles
  const [rotX, setRotX] = useState<number>(0.15); // pitch
  const [rotY, setRotY] = useState<number>(0.35); // yaw
  const [zoom, setZoom] = useState<number>(1.0);

  // Animation phase for pulse/technique
  const [animPhase, setAnimPhase] = useState<number>(0);
  const animRef = useRef<number | null>(null);

  const [containerWidth, setContainerWidth] = useState<number>(340);

  useEffect(() => {
    if (!morphParams) {
      void anatomy3DService.getParams().then(setLocalParams);
    }
  }, [morphParams]);

  // Continuous animation loop (40 BPM pulse & technique ripple)
  useEffect(() => {
    let phase = 0;
    const loop = () => {
      phase += 0.05;
      setAnimPhase(phase);
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // Pan Responder for interactive 360° rotation
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => interactive,
        onMoveShouldSetPanResponder: () => interactive,
        onPanResponderMove: (
          _evt: GestureResponderEvent,
          gestureState: PanResponderGestureState
        ) => {
          if (!interactive) return;
          setRotY((prev) => prev + gestureState.dx * 0.005);
          setRotX((prev) => Math.max(-0.9, Math.min(0.9, prev - gestureState.dy * 0.005)));
        },
      }),
    [interactive]
  );

  // Generate 3D Polygonal Mesh
  const polygons: Polygon3D[] = anatomy3DService.generateRenderPolygons(
    params,
    rotX,
    rotY,
    zoom,
    containerWidth,
    height,
    currentStyle,
    technique,
    animPhase
  );

  const setCameraPreset = (pitch: number, yaw: number) => {
    try {
      Haptics.selectionAsync().catch(() => {});
    } catch {}
    setRotX(pitch);
    setRotY(yaw);
  };

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
        {/* Holographic grid lines for Blueprint style */}
        {currentStyle === 'BLUEPRINT' && (
          <>
            <Line
              x1="10%"
              y1={height * 0.75}
              x2="90%"
              y2={height * 0.75}
              stroke="rgba(14, 165, 233, 0.2)"
              strokeDasharray="4 4"
            />
            <Line
              x1="50%"
              y1="10%"
              x2="50%"
              y2="90%"
              stroke="rgba(14, 165, 233, 0.15)"
              strokeDasharray="4 4"
            />
          </>
        )}

        {/* Depth-sorted 3D Polygons */}
        {polygons.map((poly, idx) => {
          const pointsStr = poly.points.map((pt) => `${pt[0]},${pt[1]}`).join(' ');
          return (
            <Polygon
              key={idx}
              points={pointsStr}
              fill={poly.color}
              stroke={poly.strokeColor}
              strokeWidth={poly.isWireframe ? 1 : 0.5}
              strokeLinejoin="round"
            />
          );
        })}
      </Svg>

      {/* Top Overlay Badge */}
      <View style={styles.topBadgeRow}>
        <View style={styles.modelTypePill}>
          <Text style={styles.modelTypePillText}>
            {params.modelType === 'CUSTOM' ? '🩻 專屬拍照擬合 3D' : '📐 系統標竿標準 3D'}
          </Text>
        </View>

        {showControls && onOpenFittingModal && (
          <TouchableOpacity
            style={styles.fittingBtn}
            onPress={onOpenFittingModal}
            activeOpacity={0.8}
          >
            <Ionicons name="options" size={13} color="#FFFFFF" />
            <Text style={styles.fittingBtnText}>參數微調</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom Floating Controls */}
      {showControls && (
        <View style={styles.bottomControls}>
          {/* Angle Presets */}
          <View style={styles.presetsRow}>
            <TouchableOpacity
              style={styles.angleBtn}
              onPress={() => setCameraPreset(0, 0)}
            >
              <Text style={styles.angleBtnText}>正面</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.angleBtn}
              onPress={() => setCameraPreset(0, Math.PI * 0.5)}
            >
              <Text style={styles.angleBtnText}>側面</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.angleBtn}
              onPress={() => setCameraPreset(0.3, Math.PI * 0.25)}
            >
              <Text style={styles.angleBtnText}>立體45°</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.angleBtn}
              onPress={() => setCameraPreset(Math.PI * 0.45, 0)}
            >
              <Text style={styles.angleBtnText}>俯視</Text>
            </TouchableOpacity>
          </View>

          {/* Shader & Zoom Row */}
          <View style={styles.actionsRow}>
            <View style={styles.shaderPillGroup}>
              <TouchableOpacity
                style={[
                  styles.shaderPill,
                  currentStyle === 'REALISTIC' && styles.shaderPillActive,
                ]}
                onPress={() => setCurrentStyle('REALISTIC')}
              >
                <Text
                  style={[
                    styles.shaderPillText,
                    currentStyle === 'REALISTIC' && styles.shaderPillTextActive,
                  ]}
                >
                  真實立體
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.shaderPill,
                  currentStyle === 'BLUEPRINT' && styles.shaderPillActive,
                ]}
                onPress={() => setCurrentStyle('BLUEPRINT')}
              >
                <Text
                  style={[
                    styles.shaderPillText,
                    currentStyle === 'BLUEPRINT' && styles.shaderPillTextActive,
                  ]}
                >
                  全像線框
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.shaderPill,
                  currentStyle === 'ANATOMICAL' && styles.shaderPillActive,
                ]}
                onPress={() => setCurrentStyle('ANATOMICAL')}
              >
                <Text
                  style={[
                    styles.shaderPillText,
                    currentStyle === 'ANATOMICAL' && styles.shaderPillTextActive,
                  ]}
                >
                  解剖肌理
                </Text>
              </TouchableOpacity>
            </View>

            {/* Zoom Controls */}
            <View style={styles.zoomRow}>
              <TouchableOpacity
                style={styles.zoomBtn}
                onPress={() => setZoom((z) => Math.max(0.65, z - 0.15))}
              >
                <Ionicons name="remove" size={14} color="#94A3B8" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.zoomBtn}
                onPress={() => setZoom((z) => Math.min(1.85, z + 0.15))}
              >
                <Ionicons name="add" size={14} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Interactive Drag Hint */}
      {interactive && (
        <View style={styles.dragHint}>
          <MaterialCommunityIcons name="gesture-swipe" size={12} color="#64748B" />
          <Text style={styles.dragHintText}>單指滑動 360° 空間旋轉</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#090D16',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    overflow: 'hidden',
    position: 'relative',
  },
  topBadgeRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  modelTypePill: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modelTypePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
  },
  fittingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  fittingBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    zIndex: 10,
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 6,
  },
  angleBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  angleBtnText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shaderPillGroup: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#334155',
  },
  shaderPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  shaderPillActive: {
    backgroundColor: '#3B82F6',
  },
  shaderPillText: {
    fontSize: 9,
    color: '#94A3B8',
  },
  shaderPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  zoomRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 8,
    padding: 2,
    gap: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  zoomBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  dragHint: {
    position: 'absolute',
    top: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    pointerEvents: 'none',
  },
  dragHintText: {
    fontSize: 9,
    color: '#64748B',
  },
});
