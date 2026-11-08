import {
  MorphingAnchor,
  MorphingFrame,
  TransformCorrection,
  HabitRecord,
} from '../types';
import {
  listDailyCheckInPhotos,
  listSandboxSnapshots,
  listSandboxImages,
} from './mediaStorage';
import { userProfileService } from './userProfile';

export class MorphingService {
  private static instance: MorphingService;

  private constructor() {}

  public static getInstance(): MorphingService {
    if (!MorphingService.instance) {
      MorphingService.instance = new MorphingService();
    }
    return MorphingService.instance;
  }

  /**
   * Dual-Anchor alignment algorithm:
   * Corrects translation, rotation, and scale so that frameB's root and tip align with frameA's root and tip.
   */
  public calculateAnchorAlignment(
    anchorA: MorphingAnchor,
    anchorB: MorphingAnchor,
    canvasWidth: number = 300,
    canvasHeight: number = 400
  ): TransformCorrection {
    const rootAx = anchorA.rootPoint.x * canvasWidth;
    const rootAy = anchorA.rootPoint.y * canvasHeight;
    const tipAx = anchorA.tipPoint.x * canvasWidth;
    const tipAy = anchorA.tipPoint.y * canvasHeight;

    const rootBx = anchorB.rootPoint.x * canvasWidth;
    const rootBy = anchorB.rootPoint.y * canvasHeight;
    const tipBx = anchorB.tipPoint.x * canvasWidth;
    const tipBy = anchorB.tipPoint.y * canvasHeight;

    // 1. Translation to align roots
    const translateX = rootAx - rootBx;
    const translateY = rootAy - rootBy;

    // 2. Rotation compensation
    const angleA = Math.atan2(tipAy - rootAy, tipAx - rootAx);
    const angleB = Math.atan2(tipBy - rootBy, tipBx - rootBx);
    const rotateRad = angleA - angleB;
    const rotateDeg = Math.round((rotateRad * 180) / Math.PI);

    // 3. Scale compensation
    const distA = Math.hypot(tipAx - rootAx, tipAy - rootAy);
    const distB = Math.hypot(tipBx - rootBx, tipBy - rootBy);
    const scale = distB > 0 ? Math.min(1.5, Math.max(0.7, distA / distB)) : 1.0;

    return {
      translateX,
      translateY,
      scale,
      rotateDeg,
    };
  }

  /**
   * Loads all available check-in and snapshot frames from private sandbox vault.
   * If fewer than 2 photos are stored, falls back to available sandbox media
   * so the user can immediately experience the Morphing functionality.
   */
  public async loadMorphingFrames(): Promise<MorphingFrame[]> {
    const frames: MorphingFrame[] = [];
    const userProfile = userProfileService.getProfile();
    const currentBaseLength = parseFloat(userProfile.userLength) || 16.5;

    // 1. Check DailyCheckIn photos
    try {
      const checkins = await listDailyCheckInPhotos();
      checkins.forEach((c, index) => {
        // Growth progression curve estimation
        const lengthOffset = -Math.min(1.2, (checkins.length - 1 - index) * 0.15);
        const estLength = Math.max(10, currentBaseLength + lengthOffset);

        frames.push({
          id: c.id,
          uri: c.uri,
          dateString: c.dateString,
          timestamp: c.createdAt,
          lengthCm: Math.round(estLength * 10) / 10,
          title: c.title,
          ehsLevel: 4,
          anchor: {
            rootPoint: { x: 0.5, y: 0.82 },
            tipPoint: { x: 0.5, y: 0.28 },
          },
        });
      });
    } catch {}

    // 2. Check Snapshots if checkins are sparse
    if (frames.length < 2) {
      try {
        const snaps = await listSandboxSnapshots();
        snaps.forEach((uri, idx) => {
          frames.push({
            id: `snap_morph_${idx}`,
            uri,
            dateString: '時序高光',
            timestamp: Date.now() - (idx + 1) * 86400000 * 3,
            lengthCm: Math.round((currentBaseLength - idx * 0.2) * 10) / 10,
            title: '時序定格',
            ehsLevel: 4,
            anchor: {
              rootPoint: { x: 0.5, y: 0.8 },
              tipPoint: { x: 0.5, y: 0.3 },
            },
          });
        });
      } catch {}
    }

    // 3. Check general sandbox images
    if (frames.length < 2) {
      try {
        const photos = await listSandboxImages();
        photos.forEach((uri, idx) => {
          frames.push({
            id: `media_morph_${idx}`,
            uri,
            dateString: '沙盒私密',
            timestamp: Date.now() - (idx + 1) * 86400000 * 7,
            lengthCm: Math.round((currentBaseLength - idx * 0.3) * 10) / 10,
            title: '私密存檔',
            ehsLevel: 3,
            anchor: {
              rootPoint: { x: 0.5, y: 0.82 },
              tipPoint: { x: 0.5, y: 0.28 },
            },
          });
        });
      } catch {}
    }

    // Sort chronologically (oldest to newest for growth timelapse)
    frames.sort((a, b) => a.timestamp - b.timestamp);

    // Assign day index relative to first frame
    if (frames.length > 0) {
      const firstTs = frames[0].timestamp;
      frames.forEach((f) => {
        const dayDiff = Math.max(1, Math.round((f.timestamp - firstTs) / 86400000) + 1);
        f.dayIndex = dayDiff;
      });
    }

    return frames;
  }

  /**
   * Filter presets
   */
  public filterLatest2(frames: MorphingFrame[]): MorphingFrame[] {
    if (frames.length <= 2) return [...frames];
    return frames.slice(-2);
  }

  public filterThisWeek(frames: MorphingFrame[]): MorphingFrame[] {
    if (frames.length <= 2) return [...frames];
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    const filtered = frames.filter((f) => f.timestamp >= sevenDaysAgo);
    return filtered.length >= 2 ? filtered : frames.slice(-2);
  }

  public filterThisMonth(frames: MorphingFrame[]): MorphingFrame[] {
    if (frames.length <= 2) return [...frames];
    const thirtyDaysAgo = Date.now() - 30 * 86400000;
    const filtered = frames.filter((f) => f.timestamp >= thirtyDaysAgo);
    return filtered.length >= 2 ? filtered : frames.slice(-Math.min(frames.length, 5));
  }

  /**
   * 52-Week Annual Milestone Evaluation
   */
  public checkAnnualMilestoneUnlocked(
    frames: MorphingFrame[],
    records: HabitRecord[]
  ): {
    isUnlocked: boolean;
    weeksCount: number;
    totalFrames: number;
    estimatedDurationSec: number;
    growthDeltaCm: number;
  } {
    const totalFrames = frames.length;
    let weeksCount = 0;
    let isUnlocked = false;

    // Check time span in records or frames
    const allTimestamps: number[] = [];
    records.forEach((r) => allTimestamps.push(r.timestamp));
    frames.forEach((f) => allTimestamps.push(f.timestamp));

    if (allTimestamps.length >= 2) {
      const minTs = Math.min(...allTimestamps);
      const maxTs = Math.max(...allTimestamps);
      const spanDays = (maxTs - minTs) / 86400000;
      weeksCount = Math.max(1, Math.round(spanDays / 7));

      // Considered unlocked if records span 52 weeks or if 12+ frames exist
      isUnlocked = weeksCount >= 52 || totalFrames >= 12;
    }

    let growthDeltaCm = 0;
    if (frames.length >= 2) {
      growthDeltaCm =
        Math.round((frames[frames.length - 1].lengthCm - frames[0].lengthCm) * 10) / 10;
    }

    const estimatedDurationSec = Math.min(60, Math.max(15, totalFrames * 0.5));

    return {
      isUnlocked,
      weeksCount,
      totalFrames,
      estimatedDurationSec,
      growthDeltaCm,
    };
  }
}

export const morphingService = MorphingService.getInstance();
