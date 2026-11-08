import * as FileSystem from 'expo-file-system/legacy';
import { SnapshotMetadata, DailyCheckInItem, DailyCheckInType } from '../types';

const MEDIA_DIR_NAME = 'health_tracker_media/';
const VIDEO_DIR_NAME = 'records/videos/';
const SNAPSHOT_DIR_NAME = 'Vault/Snapshots/';
const DAILY_CHECKIN_DIR_NAME = 'Vault/DailyCheckIn/';
const UNDERWEAR_DIR_NAME = 'Vault/Underwear/';

function getBaseDirectory(): string {
  // Fallback to cache directory if documentDirectory is null (e.g., in some test environments)
  return FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
}

export function getMediaDirectoryPath(): string {
  return `${getBaseDirectory()}${MEDIA_DIR_NAME}`;
}

export function getVideoDirectoryPath(): string {
  return `${getBaseDirectory()}${VIDEO_DIR_NAME}`;
}

export function getSnapshotDirectoryPath(): string {
  return `${getBaseDirectory()}${SNAPSHOT_DIR_NAME}`;
}

export function getDailyCheckInDirectoryPath(): string {
  return `${getBaseDirectory()}${DAILY_CHECKIN_DIR_NAME}`;
}

export function getUnderwearDirectoryPath(): string {
  return `${getBaseDirectory()}${UNDERWEAR_DIR_NAME}`;
}

/**
 * Initializes private sandbox directories for offline images, videos, and confidential snapshots
 */
export async function initMediaSandbox(): Promise<void> {
  try {
    const mediaDir = getMediaDirectoryPath();
    const videoDir = getVideoDirectoryPath();
    const snapshotDir = getSnapshotDirectoryPath();
    const checkinDir = getDailyCheckInDirectoryPath();

    const mediaInfo = await FileSystem.getInfoAsync(mediaDir);
    if (!mediaInfo.exists) {
      await FileSystem.makeDirectoryAsync(mediaDir, { intermediates: true });
    }

    const videoInfo = await FileSystem.getInfoAsync(videoDir);
    if (!videoInfo.exists) {
      await FileSystem.makeDirectoryAsync(videoDir, { intermediates: true });
    }

    const snapshotInfo = await FileSystem.getInfoAsync(snapshotDir);
    if (!snapshotInfo.exists) {
      await FileSystem.makeDirectoryAsync(snapshotDir, { intermediates: true });
    }

    const checkinInfo = await FileSystem.getInfoAsync(checkinDir);
    if (!checkinInfo.exists) {
      await FileSystem.makeDirectoryAsync(checkinDir, { intermediates: true });
    }

    const underwearDir = getUnderwearDirectoryPath();
    const underwearInfo = await FileSystem.getInfoAsync(underwearDir);
    if (!underwearInfo.exists) {
      await FileSystem.makeDirectoryAsync(underwearDir, { intermediates: true });
    }
  } catch (error) {
    console.warn('[MediaStorage] Failed to initialize media sandbox:', error);
  }
}

/**
 * Copies an image into the app's local document directory sandbox.
 * Never touches system photo library.
 */
export async function copyImageToSandbox(sourceUri: string): Promise<string> {
  await initMediaSandbox();
  const filename = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
  const destination = `${getMediaDirectoryPath()}${filename}`;

  await FileSystem.copyAsync({
    from: sourceUri,
    to: destination,
  });

  return destination;
}

/**
 * Lists all images stored in the private sandbox directory
 */
export async function listSandboxImages(): Promise<string[]> {
  try {
    await initMediaSandbox();
    const mediaDir = getMediaDirectoryPath();
    const files = await FileSystem.readDirectoryAsync(mediaDir);
    
    // Sort reverse chronological
    const imageFiles = files
      .filter((file) => /\.(jpg|jpeg|png|webp|gif)$/i.test(file))
      .map((file) => `${mediaDir}${file}`)
      .reverse();

    return imageFiles;
  } catch (error) {
    console.warn('[MediaStorage] Failed to read sandbox images:', error);
    return [];
  }
}

/**
 * Moves or copies a recorded video file to the persistent records sandbox directory
 */
export async function saveVideoToSandbox(sourceUri: string): Promise<string> {
  await initMediaSandbox();
  const filename = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.mp4`;
  const destination = `${getVideoDirectoryPath()}${filename}`;

  try {
    // Try move first for speed, fallback to copy
    await FileSystem.moveAsync({
      from: sourceUri,
      to: destination,
    });
  } catch {
    await FileSystem.copyAsync({
      from: sourceUri,
      to: destination,
    });
  }

  return destination;
}

/**
 * Lists all recorded videos in the sandbox
 */
export async function listSandboxVideos(): Promise<string[]> {
  try {
    await initMediaSandbox();
    const videoDir = getVideoDirectoryPath();
    const files = await FileSystem.readDirectoryAsync(videoDir);
    return files
      .filter((file) => /\.(mp4|mov|m4v)$/i.test(file))
      .map((file) => `${videoDir}${file}`)
      .reverse();
  } catch (error) {
    console.warn('[MediaStorage] Failed to read sandbox videos:', error);
    return [];
  }
}

/**
 * Deletes a file from the sandbox
 */
export async function deleteSandboxMedia(fileUri: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (info.exists) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }
  } catch (error) {
    console.warn('[MediaStorage] Failed to delete media:', error);
  }
}

/**
 * Saves a snapshot to the private /Documents/Vault/Snapshots/ sandbox directory
 * with bound session metadata.
 */
export async function saveSnapshotToSandbox(
  tempUri: string,
  meta: Omit<SnapshotMetadata, 'id' | 'uri' | 'createdAt'>
): Promise<SnapshotMetadata> {
  await initMediaSandbox();
  const id = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const filename = `${id}.jpg`;
  const destination = `${getSnapshotDirectoryPath()}${filename}`;

  try {
    await FileSystem.moveAsync({
      from: tempUri,
      to: destination,
    });
  } catch {
    await FileSystem.copyAsync({
      from: tempUri,
      to: destination,
    });
  }

  const snapshot: SnapshotMetadata = {
    ...meta,
    id,
    uri: destination,
    createdAt: Date.now(),
  };

  return snapshot;
}

/**
 * Lists all snapshot images stored in the confidential Vault
 */
export async function listSandboxSnapshots(): Promise<string[]> {
  try {
    await initMediaSandbox();
    const snapDir = getSnapshotDirectoryPath();
    const files = await FileSystem.readDirectoryAsync(snapDir);
    return files
      .filter((file) => /\.(jpg|jpeg|png)$/i.test(file))
      .map((file) => `${snapDir}${file}`)
      .reverse();
  } catch (error) {
    console.warn('[MediaStorage] Failed to read sandbox snapshots:', error);
    return [];
  }
}

/**
 * Saves a daily check-in photo to /Documents/Vault/DailyCheckIn/
 */
export async function saveDailyCheckInPhoto(
  tempUri: string,
  type: DailyCheckInType,
  dateString?: string
): Promise<DailyCheckInItem> {
  await initMediaSandbox();
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const actualDateStr = dateString || `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const typeLabels: Record<DailyCheckInType, string> = {
    size: '尺寸大小紀錄照',
    testicles: '睪丸樣式/收緊狀態照',
    most_erotic_of_the_day: '今日最色精選照',
  };

  const id = `checkin_${actualDateStr}_${type}_${Date.now()}`;
  const filename = `${id}.jpg`;
  const destination = `${getDailyCheckInDirectoryPath()}${filename}`;

  try {
    await FileSystem.moveAsync({
      from: tempUri,
      to: destination,
    });
  } catch {
    await FileSystem.copyAsync({
      from: tempUri,
      to: destination,
    });
  }

  const checkInItem: DailyCheckInItem = {
    id,
    uri: destination,
    type,
    dateString: actualDateStr,
    createdAt: Date.now(),
    title: typeLabels[type] || '每日生理打卡照',
  };

  return checkInItem;
}

/**
 * Lists all daily check-in photos from the sandbox vault
 */
export async function listDailyCheckInPhotos(): Promise<DailyCheckInItem[]> {
  try {
    await initMediaSandbox();
    const checkinDir = getDailyCheckInDirectoryPath();
    const files = await FileSystem.readDirectoryAsync(checkinDir);

    const typeLabels: Record<DailyCheckInType, string> = {
      size: '尺寸大小紀錄照',
      testicles: '睪丸樣式/收緊狀態照',
      most_erotic_of_the_day: '今日最色精選照',
    };

    const items: DailyCheckInItem[] = [];

    for (const file of files) {
      if (!/\.(jpg|jpeg|png)$/i.test(file)) continue;

      // filename pattern: checkin_YYYY-MM-DD_type_timestamp.jpg
      const match = file.match(/^checkin_(\d{4}-\d{2}-\d{2})_([a-z_]+)_(\d+)\.jpg$/i);
      let dateString = '';
      let type: DailyCheckInType = 'size';
      let createdAt = 0;

      if (match) {
        dateString = match[1];
        type = match[2] as DailyCheckInType;
        createdAt = parseInt(match[3], 10);
      } else {
        dateString = '歷史打卡';
        createdAt = Date.now();
      }

      items.push({
        id: file.replace(/\.jpg$/i, ''),
        uri: `${checkinDir}${file}`,
        type,
        dateString,
        createdAt,
        title: typeLabels[type] || '每日生理打卡照',
      });
    }

    // Sort newest first
    return items.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.warn('[MediaStorage] Failed to read daily check-in photos:', error);
    return [];
  }
}

export interface SelfCarouselImageItem {
  id: string;
  uri: string;
  category: 'checkin' | 'snapshot' | 'photo';
  typeLabel: string;
  dateLabel: string;
}

/**
 * Retrieves all private self images (Daily Check-ins + Highlighting Snapshots + Media Sandbox)
 * for the "看看自己" Carousel Widget.
 */
export async function getAllSelfCarouselImages(): Promise<SelfCarouselImageItem[]> {
  const result: SelfCarouselImageItem[] = [];
  const seenUris = new Set<string>();

  // 1. Add Daily Check-ins
  const checkins = await listDailyCheckInPhotos();
  for (const item of checkins) {
    if (!seenUris.has(item.uri)) {
      seenUris.add(item.uri);
      result.push({
        id: item.id,
        uri: item.uri,
        category: 'checkin',
        typeLabel: item.title,
        dateLabel: item.dateString,
      });
    }
  }

  // 2. Add confidential Snapshots
  const snapshots = await listSandboxSnapshots();
  for (const snapUri of snapshots) {
    if (!seenUris.has(snapUri)) {
      seenUris.add(snapUri);
      result.push({
        id: snapUri.split('/').pop() || snapUri,
        uri: snapUri,
        category: 'snapshot',
        typeLabel: '時序高光截圖',
        dateLabel: '歷史階段',
      });
    }
  }

  // 3. Add any Sandbox Photos
  const mediaPhotos = await listSandboxImages();
  for (const photoUri of mediaPhotos) {
    if (!seenUris.has(photoUri)) {
      seenUris.add(photoUri);
      result.push({
        id: photoUri.split('/').pop() || photoUri,
        uri: photoUri,
        category: 'photo',
        typeLabel: '沙盒私密相片',
        dateLabel: '本機素材',
      });
    }
  }

  return result;
}

/**
 * Saves an underwear check-in photo (flat-lay, front, side) to /Documents/Vault/Underwear/
 */
export async function saveUnderwearPhoto(
  tempUri: string,
  angleType: 'flat' | 'front' | 'side',
  dateString?: string
): Promise<string> {
  await initMediaSandbox();
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const actualDateStr =
    dateString || `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const filename = `underwear_${actualDateStr}_${angleType}_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 6)}.jpg`;
  const destination = `${getUnderwearDirectoryPath()}${filename}`;

  try {
    await FileSystem.moveAsync({
      from: tempUri,
      to: destination,
    });
  } catch {
    await FileSystem.copyAsync({
      from: tempUri,
      to: destination,
    });
  }

  return destination;
}
