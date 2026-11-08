/**
 * Performance Manager Service
 *
 * Implements adaptive frame rate throttling, thermal mitigation,
 * and Level-of-Detail (LOD) mesh simplification for 3D rendering.
 */

export type LODLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type RenderThrottleMode =
  | 'ACTIVE_60'        // Continuous interaction or high BPM animation (60fps)
  | 'THROTTLED_30'     // Mild animation or transitioning to idle (30fps)
  | 'ENERGY_SAVER_15'  // Idle with background animation (15fps)
  | 'IDLE_STATIC';     // Pure static scene - freeze redraws until state invalidation

export interface PerformanceMetrics {
  currentFps: number;
  lod: LODLevel;
  mode: RenderThrottleMode;
  isInteracting: boolean;
  lastInteractionTs: number;
  isThermalThrottled: boolean;
}

type PerformanceListener = (metrics: PerformanceMetrics) => void;

class PerformanceManager {
  private lastInteractionTs: number = Date.now();
  private lastAnimationActivityTs: number = Date.now();
  private isInteracting: boolean = false;
  private isThermalThrottled: boolean = false;
  private currentMode: RenderThrottleMode = 'ACTIVE_60';
  private listeners: Set<PerformanceListener> = new Set();
  private idleCheckTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startIdleMonitoring();
  }

  /**
   * Report user touch/drag gesture interaction
   * Instantly lifts rendering to 60fps
   */
  public reportInteraction(): void {
    this.lastInteractionTs = Date.now();
    this.isInteracting = true;
    this.setMode('ACTIVE_60');
  }

  /**
   * Report touch gesture release
   */
  public reportInteractionEnd(): void {
    this.lastInteractionTs = Date.now();
    this.isInteracting = false;
  }

  /**
   * Report continuous animation (e.g. BPM pulsation or active danmaku)
   */
  public reportAnimationActivity(): void {
    this.lastAnimationActivityTs = Date.now();
  }

  /**
   * Set thermal throttling state manually or via system telemetry
   */
  public setThermalThrottled(throttled: boolean): void {
    this.isThermalThrottled = throttled;
    this.evaluateThrottleMode();
  }

  /**
   * Determine Level of Detail based on container size and thermal condition
   */
  public getLODLevel(containerHeight?: number, isSplitViewSmall?: boolean): LODLevel {
    if (this.isThermalThrottled) {
      return 'LOW';
    }

    if (isSplitViewSmall || (containerHeight !== undefined && containerHeight < 260)) {
      return 'LOW';
    }

    if (containerHeight !== undefined && containerHeight < 360) {
      return 'MEDIUM';
    }

    return 'HIGH';
  }

  /**
   * Check if the current frame should be skipped based on target throttle mode
   */
  public shouldSkipFrame(mode: RenderThrottleMode, lastRenderTs: number, now: number): boolean {
    const elapsed = now - lastRenderTs;
    switch (mode) {
      case 'ACTIVE_60':
        return elapsed < 16; // ~60fps
      case 'THROTTLED_30':
        return elapsed < 33; // ~30fps
      case 'ENERGY_SAVER_15':
        return elapsed < 66; // ~15fps
      case 'IDLE_STATIC':
        return true; // Frozen unless invalidated
      default:
        return false;
    }
  }

  /**
   * Get current render throttle mode
   */
  public getCurrentMode(): RenderThrottleMode {
    return this.currentMode;
  }

  /**
   * Subscribe to performance metrics changes
   */
  public subscribe(listener: PerformanceListener): () => void {
    this.listeners.add(listener);
    listener(this.getMetrics());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getMetrics(): PerformanceMetrics {
    const fpsMap: Record<RenderThrottleMode, number> = {
      ACTIVE_60: 60,
      THROTTLED_30: 30,
      ENERGY_SAVER_15: 15,
      IDLE_STATIC: 0,
    };

    return {
      currentFps: fpsMap[this.currentMode],
      lod: this.getLODLevel(),
      mode: this.currentMode,
      isInteracting: this.isInteracting,
      lastInteractionTs: this.lastInteractionTs,
      isThermalThrottled: this.isThermalThrottled,
    };
  }

  private setMode(newMode: RenderThrottleMode): void {
    if (this.currentMode !== newMode) {
      this.currentMode = newMode;
      const metrics = this.getMetrics();
      this.listeners.forEach((fn) => {
        try {
          fn(metrics);
        } catch {}
      });
    }
  }

  private evaluateThrottleMode(): void {
    const now = Date.now();
    const idleSeconds = (now - this.lastInteractionTs) / 1000;
    const animIdleSeconds = (now - this.lastAnimationActivityTs) / 1000;

    if (this.isInteracting) {
      this.setMode('ACTIVE_60');
      return;
    }

    if (this.isThermalThrottled) {
      this.setMode(idleSeconds < 3 ? 'THROTTLED_30' : 'ENERGY_SAVER_15');
      return;
    }

    if (idleSeconds < 3.0) {
      this.setMode('ACTIVE_60');
    } else if (idleSeconds < 8.0 || animIdleSeconds < 2.0) {
      this.setMode('THROTTLED_30');
    } else if (animIdleSeconds < 6.0) {
      this.setMode('ENERGY_SAVER_15');
    } else {
      this.setMode('IDLE_STATIC');
    }
  }

  private startIdleMonitoring(): void {
    if (this.idleCheckTimer) clearInterval(this.idleCheckTimer);
    this.idleCheckTimer = setInterval(() => {
      this.evaluateThrottleMode();
    }, 1000);
  }
}

export const performanceManager = new PerformanceManager();
