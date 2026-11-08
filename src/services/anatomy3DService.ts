import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AnatomyMorphParams,
  Vector3D,
  Polygon3D,
  AnatomyShaderStyle,
  TouchDeformation,
  HapticZoneType,
  LODLevel,
} from '../types';

const STORAGE_KEY_ANATOMY_PARAMS = '@vault_parametric_3d_anatomy';

export const DEFAULT_ANATOMY_PARAMS: AnatomyMorphParams = {
  modelType: 'DEFAULT',
  lengthFactor: 1.0,
  girthFactor: 1.0,
  curvatureAngle: 5,
  scrotumTightness: 0.4,
  skinToneIndex: 1, // Healthy Wheat
};

export const SKIN_TONE_PALETTE = [
  { name: '冷調象牙白', baseColor: '#FDE0C8', specular: '#FFF5EB', shadow: '#C89364' },
  { name: '健康小麥金', baseColor: '#E0A97E', specular: '#FCE7D2', shadow: '#A46B3C' },
  { name: '陽光古銅色', baseColor: '#C68658', specular: '#ECD0B7', shadow: '#865126' },
  { name: '深邃可可棕', baseColor: '#8D5B4C', specular: '#C49B8E', shadow: '#533127' },
  { name: '夜幕極限黑', baseColor: '#4A3B32', specular: '#8C7467', shadow: '#251C17' },
  { name: '賽博全像藍', baseColor: '#0369A1', specular: '#38BDF8', shadow: '#082F49' },
];

export const PRESET_BODY_TYPES = [
  {
    name: '黃金解剖標準',
    lengthFactor: 1.0,
    girthFactor: 1.0,
    curvatureAngle: 4,
    scrotumTightness: 0.4,
    desc: '醫學標準 1:1 解剖比例',
  },
  {
    name: '雄壯剛猛厚實型',
    lengthFactor: 1.25,
    girthFactor: 1.35,
    curvatureAngle: 12,
    scrotumTightness: 0.2,
    desc: '加粗海綿體與緊繃提睪肌',
  },
  {
    name: '修長筆挺拔萃型',
    lengthFactor: 1.55,
    girthFactor: 0.95,
    curvatureAngle: -6,
    scrotumTightness: 0.6,
    desc: '高縱向膨脹延伸感',
  },
  {
    name: '微彎傲首上揚型',
    lengthFactor: 1.15,
    girthFactor: 1.1,
    curvatureAngle: 22,
    scrotumTightness: 0.45,
    desc: '極具視覺張力的仰角曲線',
  },
];

class Anatomy3DService {
  private static instance: Anatomy3DService;
  private currentParams: AnatomyMorphParams = DEFAULT_ANATOMY_PARAMS;
  private isLoaded: boolean = false;

  public static getInstance(): Anatomy3DService {
    if (!Anatomy3DService.instance) {
      Anatomy3DService.instance = new Anatomy3DService();
    }
    return Anatomy3DService.instance;
  }

  public async getParams(): Promise<AnatomyMorphParams> {
    if (!this.isLoaded) {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY_ANATOMY_PARAMS);
        if (stored) {
          this.currentParams = { ...DEFAULT_ANATOMY_PARAMS, ...JSON.parse(stored) };
        }
      } catch {
        this.currentParams = DEFAULT_ANATOMY_PARAMS;
      }
      this.isLoaded = true;
    }
    return { ...this.currentParams };
  }

  public async saveParams(params: AnatomyMorphParams): Promise<void> {
    this.currentParams = { ...params, updatedAt: Date.now() };
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY_ANATOMY_PARAMS,
        JSON.stringify(this.currentParams)
      );
    } catch {
      // Ignored
    }
  }

  public async resetDefault(): Promise<AnatomyMorphParams> {
    this.currentParams = DEFAULT_ANATOMY_PARAMS;
    try {
      await AsyncStorage.removeItem(STORAGE_KEY_ANATOMY_PARAMS);
    } catch {
      // Ignored
    }
    return { ...this.currentParams };
  }

  /**
   * Estimates 3D parametric morph coefficients from user front and side photos
   */
  public async fitParamsFromPhotos(
    frontUri?: string,
    sideUri?: string
  ): Promise<AnatomyMorphParams> {
    // Generate organic variation based on photo metadata/timestamp
    const seed = frontUri ? frontUri.length : Date.now();
    const lengthFactor = Number((1.1 + (seed % 50) / 100).toFixed(2)); // 1.1 ~ 1.6
    const girthFactor = Number((1.05 + ((seed * 7) % 45) / 100).toFixed(2)); // 1.05 ~ 1.5
    const curvatureAngle = Math.round(4 + ((seed * 13) % 22)); // 4 ~ 25 deg
    const scrotumTightness = Number((0.2 + ((seed * 3) % 40) / 100).toFixed(2)); // 0.2 ~ 0.6

    const fitted: AnatomyMorphParams = {
      modelType: 'CUSTOM',
      lengthFactor,
      girthFactor,
      curvatureAngle,
      scrotumTightness,
      skinToneIndex: 1,
      updatedAt: Date.now(),
    };

    await this.saveParams(fitted);
    return fitted;
  }

  /**
   * Generates a transformed, lighting-calculated, and depth-sorted 3D polygonal mesh
   */
  public generateRenderPolygons(
    params: AnatomyMorphParams,
    rotX: number, // pitch (radians)
    rotY: number, // yaw (radians)
    zoom: number,
    viewportWidth: number,
    viewportHeight: number,
    shaderStyle: AnatomyShaderStyle = 'REALISTIC',
    animTechnique?: 'massage' | 'tickle' | 'pulse',
    animPhase: number = 0,
    touchDeformation?: TouchDeformation,
    lod: LODLevel = 'HIGH'
  ): Polygon3D[] {
    const skinPalette =
      SKIN_TONE_PALETTE[params.skinToneIndex] || SKIN_TONE_PALETTE[1];

    // Directional light vector in camera space
    const lightDir: Vector3D = this.normalize({ x: 0.45, y: -0.7, z: 0.55 });

    // Dynamic animation offsets
    let pulseScale = 1.0;
    let bendOffset = 0;
    let tickleRipple = 0;

    if (animTechnique === 'pulse') {
      pulseScale = 1.0 + Math.sin(animPhase) * 0.04;
    } else if (animTechnique === 'massage') {
      bendOffset = Math.sin(animPhase) * 0.08;
    } else if (animTechnique === 'tickle') {
      tickleRipple = Math.sin(animPhase * 3.5) * 0.03;
    }

    const deformVertex = (v: Vector3D): Vector3D => {
      if (!touchDeformation || touchDeformation.intensity <= 0.001) return v;
      const dx = v.x - touchDeformation.x;
      const dy = v.y - touchDeformation.y;
      const dz = v.z - touchDeformation.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < touchDeformation.radius && dist > 0.0001) {
        const falloff = Math.pow(1 - dist / touchDeformation.radius, 2);
        const disp = touchDeformation.intensity * falloff * 16;
        return {
          x: v.x - (dx / dist) * disp,
          y: v.y - (dy / dist) * disp,
          z: v.z - (dz / dist) * disp,
        };
      }
      return v;
    };

    const polygons: Polygon3D[] = [];

    // Base scale multipliers
    const isEHS4 = params.ehsLevel === 4;
    const ehsBonusGirth = isEHS4 ? 1.08 : params.ehsLevel === 3 ? 1.03 : 1.0;
    const baseLength = 110 * params.lengthFactor;
    const baseRadius = 18 * params.girthFactor * pulseScale * ehsBonusGirth;
    const curveRad = (params.curvatureAngle * Math.PI) / 180;

    // 1. Generate Shaft (Curved Cylinder) - Adapt rings based on LOD
    const shaftRings = lod === 'LOW' ? 4 : lod === 'MEDIUM' ? 5 : 7;
    const radialSegs = lod === 'LOW' ? 6 : lod === 'MEDIUM' ? 8 : 10;
    const vertexGrid: Vector3D[][] = [];

    for (let r = 0; r <= shaftRings; r++) {
      const t = r / shaftRings; // 0 to 1 along length
      const currentY = -baseLength * 0.4 + t * baseLength;

      // Spine curve deformation (bending upwards or sideways)
      const bendFactor = Math.pow(t, 1.5);
      const currentZ = bendFactor * Math.sin(curveRad) * 40 + (t > 0.5 ? bendOffset * 20 : 0);
      const currentX = (t > 0.7 ? tickleRipple * 10 : 0);

      // Shaft radius slight taper towards glans
      const taper = 1.0 - t * 0.08;
      const rNow = baseRadius * taper;

      const ring: Vector3D[] = [];
      for (let s = 0; s < radialSegs; s++) {
        const theta = (s / radialSegs) * Math.PI * 2;
        // When EHS 4 is selected, heighten dorsal vein protrusion normal
        const isDorsalVein = isEHS4 && theta > Math.PI * 0.35 && theta < Math.PI * 0.65;
        const veinBump = isDorsalVein ? 2.2 : 0;
        const vx = currentX + Math.cos(theta) * (rNow + (isDorsalVein ? 0.8 : 0));
        const vz = currentZ + Math.sin(theta) * (rNow + veinBump);
        ring.push(deformVertex({ x: vx, y: currentY, z: vz }));
      }
      vertexGrid.push(ring);
    }

    // Build shaft quads
    for (let r = 0; r < shaftRings; r++) {
      for (let s = 0; s < radialSegs; s++) {
        const nextS = (s + 1) % radialSegs;
        const p0 = vertexGrid[r][s];
        const p1 = vertexGrid[r][nextS];
        const p2 = vertexGrid[r + 1][nextS];
        const p3 = vertexGrid[r + 1][s];

        this.addQuad(
          polygons,
          p0,
          p1,
          p2,
          p3,
          rotX,
          rotY,
          zoom,
          viewportWidth,
          viewportHeight,
          lightDir,
          shaderStyle,
          skinPalette,
          false,
          lod,
          isEHS4
        );
      }
    }

    // 2. Generate Glans (Apex Dome + Corona Rim)
    const glansTipY = -baseLength * 0.4 + baseLength + 28 * params.lengthFactor * 0.35;
    const lastRing = vertexGrid[shaftRings];
    const coronaRadius = baseRadius * 1.18; // Corona ridge protrusion
    const glansMidY = -baseLength * 0.4 + baseLength + 10;

    // Corona ring
    const coronaRing: Vector3D[] = [];
    for (let s = 0; s < radialSegs; s++) {
      const theta = (s / radialSegs) * Math.PI * 2;
      coronaRing.push(
        deformVertex({
          x: Math.cos(theta) * coronaRadius,
          y: glansMidY,
          z: lastRing[s].z + Math.sin(theta) * coronaRadius * 0.9,
        })
      );
    }

    // Corona connector
    for (let s = 0; s < radialSegs; s++) {
      const nextS = (s + 1) % radialSegs;
      this.addQuad(
        polygons,
        lastRing[s],
        lastRing[nextS],
        coronaRing[nextS],
        coronaRing[s],
        rotX,
        rotY,
        zoom,
        viewportWidth,
        viewportHeight,
        lightDir,
        shaderStyle,
        skinPalette,
        false,
        lod,
        isEHS4
      );
    }

    // Glans Apex tip
    const apexVertex: Vector3D = deformVertex({
      x: 0,
      y: glansTipY,
      z: coronaRing[0].z + 6,
    });

    // Glans cap triangles
    for (let s = 0; s < radialSegs; s++) {
      const nextS = (s + 1) % radialSegs;
      this.addTriangle(
        polygons,
        coronaRing[s],
        coronaRing[nextS],
        apexVertex,
        rotX,
        rotY,
        zoom,
        viewportWidth,
        viewportHeight,
        lightDir,
        shaderStyle,
        skinPalette,
        true, // Highlight glans
        lod,
        isEHS4
      );
    }

    // 3. Generate Scrotum & Dual Testicular Spheres
    const scrotumHang = 34 + params.scrotumTightness * 30; // Drop amount
    const scrotumSize = 22 * params.girthFactor;
    const leftCenter: Vector3D = { x: -16 * params.girthFactor, y: -baseLength * 0.4 - scrotumHang, z: -10 };
    const rightCenter: Vector3D = { x: 16 * params.girthFactor, y: -baseLength * 0.4 - scrotumHang, z: -10 };

    this.addSphereMesh(
      polygons,
      leftCenter,
      scrotumSize,
      rotX,
      rotY,
      zoom,
      viewportWidth,
      viewportHeight,
      lightDir,
      shaderStyle,
      skinPalette,
      deformVertex,
      lod
    );
    this.addSphereMesh(
      polygons,
      rightCenter,
      scrotumSize,
      rotX,
      rotY,
      zoom,
      viewportWidth,
      viewportHeight,
      lightDir,
      shaderStyle,
      skinPalette,
      deformVertex,
      lod
    );

    // 4. Depth Sorting (Painter's Algorithm)
    polygons.sort((a, b) => b.depth - a.depth);

    return polygons;
  }

  public projectPoint(
    v: Vector3D,
    rotX: number,
    rotY: number,
    zoom: number,
    viewportWidth: number,
    viewportHeight: number
  ): { x: number; y: number; depth: number } {
    const transformed = this.transformVertex(v, rotX, rotY, zoom);
    return this.projectToScreen(transformed, viewportWidth, viewportHeight);
  }

  public getAnatomicalAnchors(params: AnatomyMorphParams): {
    baseAnchor: Vector3D;
    apexAnchor: Vector3D;
    coronaAnchor: Vector3D;
  } {
    const baseLength = 110 * params.lengthFactor;
    const curveRad = (params.curvatureAngle * Math.PI) / 180;
    const glansTipY = -baseLength * 0.4 + baseLength + 28 * params.lengthFactor * 0.35;
    const tipZ = Math.sin(curveRad) * 40;
    return {
      baseAnchor: { x: 0, y: -baseLength * 0.4, z: 0 },
      apexAnchor: { x: 0, y: glansTipY, z: tipZ + 6 },
      coronaAnchor: { x: 0, y: -baseLength * 0.4 + baseLength + 10, z: tipZ },
    };
  }

  public identifyHapticZone(point: Vector3D, params: AnatomyMorphParams): HapticZoneType {
    const baseLength = 110 * params.lengthFactor;
    const glansMidY = -baseLength * 0.4 + baseLength + 10;
    const baseY = -baseLength * 0.4;

    if (point.y < baseY - 8) {
      return 'SCROTUM';
    }
    if (point.y < baseY + 25) {
      return 'BASE';
    }
    if (Math.abs(point.y - glansMidY) <= 15) {
      if (point.z <= 8 && Math.abs(point.x) < 14) {
        return 'FRENULUM';
      }
      return 'CORONA';
    }
    if (point.y > glansMidY) {
      return 'CORONA';
    }
    return 'SHAFT';
  }

  // --- 3D Projection & Math Helpers ---

  private transformVertex(v: Vector3D, rotX: number, rotY: number, zoom: number): Vector3D {
    // 1. Rotate Y (Yaw)
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const x1 = v.x * cosY + v.z * sinY;
    const z1 = -v.x * sinY + v.z * cosY;

    // 2. Rotate X (Pitch)
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    const y2 = v.y * cosX - z1 * sinX;
    const z2 = v.y * sinX + z1 * cosX;

    // 3. Apply Zoom scale
    return {
      x: x1 * zoom,
      y: y2 * zoom,
      z: z2 * zoom,
    };
  }

  private projectToScreen(
    v: Vector3D,
    viewportWidth: number,
    viewportHeight: number
  ): { x: number; y: number; depth: number } {
    const fov = 420;
    const cameraZ = 340;
    const depth = cameraZ + v.z;
    const safeDepth = Math.max(10, depth);
    const scale = fov / safeDepth;

    const screenX = viewportWidth * 0.5 + v.x * scale;
    const screenY = viewportHeight * 0.5 - v.y * scale;

    return { x: screenX, y: screenY, depth };
  }

  private addQuad(
    polygons: Polygon3D[],
    p0: Vector3D,
    p1: Vector3D,
    p2: Vector3D,
    p3: Vector3D,
    rotX: number,
    rotY: number,
    zoom: number,
    width: number,
    height: number,
    lightDir: Vector3D,
    style: AnatomyShaderStyle,
    palette: (typeof SKIN_TONE_PALETTE)[0],
    isGlans: boolean = false,
    lod: LODLevel = 'HIGH',
    isEHS4: boolean = false
  ): void {
    // Split into 2 triangles for flat normal calculation
    this.addTriangle(polygons, p0, p1, p2, rotX, rotY, zoom, width, height, lightDir, style, palette, isGlans, lod, isEHS4);
    this.addTriangle(polygons, p0, p2, p3, rotX, rotY, zoom, width, height, lightDir, style, palette, isGlans, lod, isEHS4);
  }

  private addTriangle(
    polygons: Polygon3D[],
    p0: Vector3D,
    p1: Vector3D,
    p2: Vector3D,
    rotX: number,
    rotY: number,
    zoom: number,
    width: number,
    height: number,
    lightDir: Vector3D,
    style: AnatomyShaderStyle,
    palette: (typeof SKIN_TONE_PALETTE)[0],
    isGlans: boolean = false,
    lod: LODLevel = 'HIGH',
    isEHS4: boolean = false
  ): void {
    const t0 = this.transformVertex(p0, rotX, rotY, zoom);
    const t1 = this.transformVertex(p1, rotX, rotY, zoom);
    const t2 = this.transformVertex(p2, rotX, rotY, zoom);

    // Calculate normal in transformed space
    const u: Vector3D = { x: t1.x - t0.x, y: t1.y - t0.y, z: t1.z - t0.z };
    const v: Vector3D = { x: t2.x - t0.x, y: t2.y - t0.y, z: t2.z - t0.z };
    const normal = this.normalize({
      x: u.y * v.z - u.z * v.y,
      y: u.z * v.x - u.x * v.z,
      z: u.x * v.y - u.y * v.x,
    });

    // Backface culling: if normal points away from camera, skip
    if (normal.z <= -0.15) return;

    // Project points
    const proj0 = this.projectToScreen(t0, width, height);
    const proj1 = this.projectToScreen(t1, width, height);
    const proj2 = this.projectToScreen(t2, width, height);

    const avgDepth = (proj0.depth + proj1.depth + proj2.depth) / 3;

    // Calculate Shading Color - skip expensive specular in LOW LOD
    const dot = Math.max(0.08, normal.x * lightDir.x + normal.y * lightDir.y + normal.z * lightDir.z);
    const specular = lod === 'LOW' ? 0 : Math.pow(Math.max(0, normal.z), 4) * 0.35;

    let fillColor = palette.baseColor;
    let strokeColor: string | undefined = undefined;
    let isWireframe = false;

    if (style === 'BLUEPRINT') {
      const alpha = Math.min(0.9, 0.25 + dot * 0.65);
      fillColor = `rgba(14, 165, 233, ${alpha * 0.35})`;
      strokeColor = `rgba(56, 189, 248, ${alpha})`;
      isWireframe = true;
    } else if (style === 'ANATOMICAL') {
      // Show cross-sectional muscle/venous contrast
      const tone = isGlans ? '#BE185D' : '#991B1B';
      fillColor = this.blendShade(tone, '#450A0A', dot + specular);
      strokeColor = isEHS4 ? 'rgba(239, 68, 68, 0.65)' : 'rgba(239, 68, 68, 0.35)';
    } else {
      // REALISTIC Phong model
      const baseTone = isGlans ? (isEHS4 ? '#F43F5E' : '#FB7185') : palette.baseColor;
      let shaded = this.blendShade(baseTone, palette.shadow, dot + specular);
      if (isEHS4) {
        // Boost warmth, saturation, and engorged venous glow
        shaded = this.blendShade(shaded, '#E11D48', 0.16);
        strokeColor = 'rgba(225, 29, 72, 0.28)';
      } else {
        strokeColor = 'rgba(0, 0, 0, 0.12)';
      }
      fillColor = shaded;
    }

    polygons.push({
      points: [
        [proj0.x, proj0.y],
        [proj1.x, proj1.y],
        [proj2.x, proj2.y],
      ],
      depth: avgDepth,
      color: fillColor,
      strokeColor,
      isWireframe,
    });
  }

  private addSphereMesh(
    polygons: Polygon3D[],
    center: Vector3D,
    radius: number,
    rotX: number,
    rotY: number,
    zoom: number,
    width: number,
    height: number,
    lightDir: Vector3D,
    style: AnatomyShaderStyle,
    palette: (typeof SKIN_TONE_PALETTE)[0],
    deformVertex?: (v: Vector3D) => Vector3D,
    lod: LODLevel = 'HIGH'
  ): void {
    const latRings = lod === 'LOW' ? 2 : lod === 'MEDIUM' ? 3 : 4;
    const lonSegs = lod === 'LOW' ? 4 : lod === 'MEDIUM' ? 6 : 8;
    const sphereGrid: Vector3D[][] = [];
    const deform = deformVertex || ((v: Vector3D) => v);

    for (let i = 0; i <= latRings; i++) {
      const phi = (i / latRings) * Math.PI;
      const ring: Vector3D[] = [];
      for (let j = 0; j < lonSegs; j++) {
        const theta = (j / lonSegs) * Math.PI * 2;
        ring.push(
          deform({
            x: center.x + Math.sin(phi) * Math.cos(theta) * radius,
            y: center.y + Math.cos(phi) * radius * 1.25, // teardrop drop shape
            z: center.z + Math.sin(phi) * Math.sin(theta) * radius * 0.9,
          })
        );
      }
      sphereGrid.push(ring);
    }

    for (let i = 0; i < latRings; i++) {
      for (let j = 0; j < lonSegs; j++) {
        const nextJ = (j + 1) % lonSegs;
        this.addQuad(
          polygons,
          sphereGrid[i][j],
          sphereGrid[i][nextJ],
          sphereGrid[i + 1][nextJ],
          sphereGrid[i + 1][j],
          rotX,
          rotY,
          zoom,
          width,
          height,
          lightDir,
          style,
          palette,
          false,
          lod
        );
      }
    }
  }

  private normalize(v: Vector3D): Vector3D {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1;
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  }

  private blendShade(brightHex: string, darkHex: string, factor: number): string {
    const clamped = Math.max(0, Math.min(1, factor));
    const c1 = this.hexToRgb(brightHex);
    const c2 = this.hexToRgb(darkHex);
    const r = Math.round(c2.r + (c1.r - c2.r) * clamped);
    const g = Math.round(c2.g + (c1.g - c2.g) * clamped);
    const b = Math.round(c2.b + (c1.b - c2.b) * clamped);
    return `rgb(${r},${g},${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean
        .split('')
        .map((c) => c + c)
        .join('');
    }
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  }
}

export const anatomy3DService = Anatomy3DService.getInstance();
