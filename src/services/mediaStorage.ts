import * as FileSystem from 'expo-file-system/legacy';

const MEDIA_DIR_NAME = 'health_tracker_media/';
const VIDEO_DIR_NAME = 'records/videos/';

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

/**
 * Initializes private sandbox directories for offline images and videos
 */
export async function initMediaSandbox(): Promise<void> {
  try {
    const mediaDir = getMediaDirectoryPath();
    const videoDir = getVideoDirectoryPath();

    const mediaInfo = await FileSystem.getInfoAsync(mediaDir);
    if (!mediaInfo.exists) {
      await FileSystem.makeDirectoryAsync(mediaDir, { intermediates: true });
    }

    const videoInfo = await FileSystem.getInfoAsync(videoDir);
    if (!videoInfo.exists) {
      await FileSystem.makeDirectoryAsync(videoDir, { intermediates: true });
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
