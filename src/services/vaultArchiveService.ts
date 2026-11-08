import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  VaultModulesConfig,
  VaultManifest,
  VaultFileEntry,
  VaultPayload,
  VaultRestoreSummary,
  HabitRecord,
} from '../types';
import {
  getDailyCheckInDirectoryPath,
  getSnapshotDirectoryPath,
  getVideoDirectoryPath,
  initMediaSandbox,
} from './mediaStorage';
import { getAllRecords } from './storage';
import { userProfileService, UserProfile } from './userProfile';

const CONTAINER_HEADER_MAGIC = '=== VAULT_SECURE_CONTAINER_V1 ===';
const CONTAINER_FOOTER_MAGIC = '=== END_VAULT_CONTAINER ===';
const APP_VERSION = '1.0.0';
const PBKDF2_ITERATIONS = 100000;
const STORAGE_KEY_RECORDS = '@health_tracker_records_v1';
const STORAGE_KEY_SETTINGS = '@health_tracker_settings_v1';
const STORAGE_KEY_GIRLFRIEND = '@health_tracker_girlfriend_config';
const STORAGE_KEY_RADAR = '@health_tracker_arp_radar_config';

/**
 * Robust chunked Base64 encoding/decoding for arbitrary Uint8Array buffers
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return (globalThis.btoa || btoa)(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = (globalThis.atob || atob)(base64.trim());
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export class VaultArchiveService {
  private static instance: VaultArchiveService;

  private constructor() {}

  public static getInstance(): VaultArchiveService {
    if (!VaultArchiveService.instance) {
      VaultArchiveService.instance = new VaultArchiveService();
    }
    return VaultArchiveService.instance;
  }

  /**
   * Derives a 256-bit AES-GCM key using PBKDF2 with SHA-256 and 100,000 iterations
   */
  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const subtle = globalThis.crypto?.subtle || (globalThis as any).crypto?.subtle;
    if (!subtle) {
      throw new Error('當前環境未支援 Web Crypto API (SubtleCrypto missing)');
    }

    const keyMaterial = await subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return await subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as any,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts plaintext string using AES-256-GCM with derived key, salt and IV
   */
  private async encryptPayload(password: string, plaintext: string): Promise<string> {
    const enc = new TextEncoder();
    const subtle = globalThis.crypto?.subtle || (globalThis as any).crypto?.subtle;
    if (!subtle) {
      throw new Error('當前環境未支援 Web Crypto API (SubtleCrypto missing)');
    }

    // 16-byte random Salt & 12-byte random IV
    const salt = Crypto.getRandomValues(new Uint8Array(16));
    const iv = Crypto.getRandomValues(new Uint8Array(12));

    const key = await this.deriveKey(password, salt);

    const ciphertextBuffer = await subtle.encrypt(
      { name: 'AES-GCM', iv: iv as any },
      key,
      enc.encode(plaintext)
    );

    const saltB64 = uint8ArrayToBase64(salt);
    const ivB64 = uint8ArrayToBase64(iv);
    const cipherB64 = uint8ArrayToBase64(new Uint8Array(ciphertextBuffer));

    return [
      CONTAINER_HEADER_MAGIC,
      'VERSION: 1',
      'KDF: PBKDF2-SHA256',
      `ITERATIONS: ${PBKDF2_ITERATIONS}`,
      'CIPHER: AES-256-GCM',
      `SALT: ${saltB64}`,
      `IV: ${ivB64}`,
      'AUTH_TAG_LEN: 16',
      'PAYLOAD:',
      cipherB64,
      CONTAINER_FOOTER_MAGIC,
    ].join('\n');
  }

  /**
   * Decrypts container string using AES-256-GCM.
   * Throws if password is wrong or Auth Tag verification fails.
   */
  public async decryptContainer(password: string, containerString: string): Promise<string> {
    const lines = containerString.split('\n');
    let saltB64 = '';
    let ivB64 = '';
    let inPayload = false;
    const payloadLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('SALT: ')) {
        saltB64 = trimmed.substring(6).trim();
      } else if (trimmed.startsWith('IV: ')) {
        ivB64 = trimmed.substring(4).trim();
      } else if (trimmed === 'PAYLOAD:') {
        inPayload = true;
      } else if (trimmed === CONTAINER_FOOTER_MAGIC) {
        inPayload = false;
      } else if (inPayload && trimmed) {
        payloadLines.push(trimmed);
      }
    }

    if (!saltB64 || !ivB64 || payloadLines.length === 0) {
      throw new Error('無效或損毀的 Vault 加密容器格式 (Invalid Container Structure)');
    }

    const salt = base64ToUint8Array(saltB64);
    const iv = base64ToUint8Array(ivB64);
    const ciphertext = base64ToUint8Array(payloadLines.join(''));

    const subtle = globalThis.crypto?.subtle || (globalThis as any).crypto?.subtle;
    if (!subtle) {
      throw new Error('當前環境未支援 Web Crypto API');
    }

    const key = await this.deriveKey(password, salt);

    try {
      const decryptedBuffer = await subtle.decrypt(
        { name: 'AES-GCM', iv: iv as any },
        key,
        ciphertext as any
      );
      const dec = new TextDecoder();
      return dec.decode(decryptedBuffer);
    } catch {
      throw new Error('密碼錯誤或檔案遭竄改 (AES-GCM Auth Tag 驗證失敗)');
    }
  }

  /**
   * Exports specified modules into an encrypted .vault container
   */
  public async exportVault(
    password: string,
    modules: VaultModulesConfig
  ): Promise<{ vaultFilePath: string; manifest: VaultManifest }> {
    if (!password || password.trim().length < 6) {
      throw new Error('主密碼長度不得少於 6 位字元');
    }

    await initMediaSandbox();
    const entries: VaultFileEntry[] = [];

    // 1. Module: Settings
    if (modules.settings) {
      const profile = userProfileService.getProfile();
      entries.push({
        path: 'settings/profile.json',
        mimeType: 'application/json',
        encoding: 'utf8',
        data: JSON.stringify(profile, null, 2),
      });

      try {
        const appSettingsStr = await AsyncStorage.getItem(STORAGE_KEY_SETTINGS);
        if (appSettingsStr) {
          entries.push({
            path: 'settings/app_settings.json',
            mimeType: 'application/json',
            encoding: 'utf8',
            data: appSettingsStr,
          });
        }
        const girlfriendStr = await AsyncStorage.getItem(STORAGE_KEY_GIRLFRIEND);
        if (girlfriendStr) {
          entries.push({
            path: 'settings/girlfriend.json',
            mimeType: 'application/json',
            encoding: 'utf8',
            data: girlfriendStr,
          });
        }
        const radarStr = await AsyncStorage.getItem(STORAGE_KEY_RADAR);
        if (radarStr) {
          entries.push({
            path: 'settings/radar.json',
            mimeType: 'application/json',
            encoding: 'utf8',
            data: radarStr,
          });
        }
      } catch (err) {
        console.warn('[VaultArchive] Failed to package settings:', err);
      }
    }

    // 2. Module: Daily Check-In
    if (modules.daily_checkin) {
      const checkinDir = getDailyCheckInDirectoryPath();
      try {
        const checkinInfo = await FileSystem.getInfoAsync(checkinDir);
        if (checkinInfo.exists) {
          const files = await FileSystem.readDirectoryAsync(checkinDir);
          for (const file of files) {
            if (/\.(jpg|jpeg|png)$/i.test(file)) {
              const fileUri = `${checkinDir}${file}`;
              const base64 = await FileSystem.readAsStringAsync(fileUri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              entries.push({
                path: `Vault/DailyCheckIn/${file}`,
                mimeType: 'image/jpeg',
                encoding: 'base64',
                data: base64,
              });
            }
          }
        }
      } catch (err) {
        console.warn('[VaultArchive] Failed to package check-in photos:', err);
      }
    }

    // 3. Module: Snapshots
    if (modules.snapshots) {
      const snapDir = getSnapshotDirectoryPath();
      try {
        const snapInfo = await FileSystem.getInfoAsync(snapDir);
        if (snapInfo.exists) {
          const files = await FileSystem.readDirectoryAsync(snapDir);
          for (const file of files) {
            if (/\.(jpg|jpeg|png)$/i.test(file)) {
              const fileUri = `${snapDir}${file}`;
              const base64 = await FileSystem.readAsStringAsync(fileUri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              entries.push({
                path: `Vault/Snapshots/${file}`,
                mimeType: 'image/jpeg',
                encoding: 'base64',
                data: base64,
              });
            }
          }
        }
      } catch (err) {
        console.warn('[VaultArchive] Failed to package snapshots:', err);
      }
    }

    // 4. Module: Highlights / Videos
    if (modules.highlights) {
      const videoDir = getVideoDirectoryPath();
      try {
        const videoInfo = await FileSystem.getInfoAsync(videoDir);
        if (videoInfo.exists) {
          const files = await FileSystem.readDirectoryAsync(videoDir);
          for (const file of files) {
            if (/\.(mp4|mov)$/i.test(file)) {
              const fileUri = `${videoDir}${file}`;
              const base64 = await FileSystem.readAsStringAsync(fileUri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              entries.push({
                path: `records/videos/${file}`,
                mimeType: 'video/mp4',
                encoding: 'base64',
                data: base64,
              });
            }
          }
        }
      } catch (err) {
        console.warn('[VaultArchive] Failed to package videos:', err);
      }
    }

    // 5. Module: Logs
    if (modules.logs) {
      try {
        const records = await getAllRecords();
        entries.push({
          path: 'data/habit_records.json',
          mimeType: 'application/json',
          encoding: 'utf8',
          data: JSON.stringify(records, null, 2),
        });
      } catch (err) {
        console.warn('[VaultArchive] Failed to package logs:', err);
      }
    }

    const manifest: VaultManifest = {
      app_version: APP_VERSION,
      exported_at: Date.now(),
      modules_included: modules,
      file_count: entries.length,
    };

    const payload: VaultPayload = {
      manifest,
      entries,
    };

    // Encrypt payload JSON
    const containerString = await this.encryptPayload(password, JSON.stringify(payload));

    // Save to private sandbox file with .vault extension
    const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
    const vaultFilename = `VaultBackup_${timestampStr}.vault`;
    const vaultFilePath = `${baseDir}${vaultFilename}`;

    await FileSystem.writeAsStringAsync(vaultFilePath, containerString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return { vaultFilePath, manifest };
  }

  /**
   * Inspects and decrypts a .vault file with password to preview its Manifest
   */
  public async inspectVaultFile(vaultFileUri: string, password: string): Promise<VaultPayload> {
    const containerString = await FileSystem.readAsStringAsync(vaultFileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (!containerString.includes(CONTAINER_HEADER_MAGIC)) {
      throw new Error('此檔案不是合法的自定義 .vault 加密容器');
    }

    const decryptedJson = await this.decryptContainer(password, containerString);
    const payload: VaultPayload = JSON.parse(decryptedJson);

    if (!payload.manifest || !payload.entries) {
      throw new Error('解密封包資料結構損壞');
    }

    return payload;
  }

  /**
   * Restores selected modules from decrypted VaultPayload into local sandbox
   */
  public async restoreVault(
    payload: VaultPayload,
    selectedModules: Partial<VaultModulesConfig>
  ): Promise<VaultRestoreSummary> {
    await initMediaSandbox();
    let restoredFilesCount = 0;
    const restoredModules: string[] = [];

    // 1. Restore Settings
    if (selectedModules.settings) {
      let restoredSettings = false;
      for (const entry of payload.entries) {
        if (entry.path === 'settings/profile.json') {
          try {
            const profile: UserProfile = JSON.parse(entry.data);
            await userProfileService.updateProfile(profile);
            restoredSettings = true;
          } catch {}
        } else if (entry.path === 'settings/app_settings.json') {
          try {
            await AsyncStorage.setItem(STORAGE_KEY_SETTINGS, entry.data);
            restoredSettings = true;
          } catch {}
        } else if (entry.path === 'settings/girlfriend.json') {
          try {
            await AsyncStorage.setItem(STORAGE_KEY_GIRLFRIEND, entry.data);
            restoredSettings = true;
          } catch {}
        } else if (entry.path === 'settings/radar.json') {
          try {
            await AsyncStorage.setItem(STORAGE_KEY_RADAR, entry.data);
            restoredSettings = true;
          } catch {}
        }
      }
      if (restoredSettings) {
        restoredModules.push('基本資料與偏好設定');
      }
    }

    // 2. Restore Daily Check-In Photos
    if (selectedModules.daily_checkin) {
      const checkinDir = getDailyCheckInDirectoryPath();
      const dirInfo = await FileSystem.getInfoAsync(checkinDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(checkinDir, { intermediates: true });
      }

      for (const entry of payload.entries) {
        if (entry.path.startsWith('Vault/DailyCheckIn/')) {
          const filename = entry.path.replace('Vault/DailyCheckIn/', '');
          const destUri = `${checkinDir}${filename}`;
          await FileSystem.writeAsStringAsync(destUri, entry.data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          restoredFilesCount++;
        }
      }
      restoredModules.push('每日生理打卡私密照');
    }

    // 3. Restore Snapshots
    if (selectedModules.snapshots) {
      const snapDir = getSnapshotDirectoryPath();
      const dirInfo = await FileSystem.getInfoAsync(snapDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(snapDir, { intermediates: true });
      }

      for (const entry of payload.entries) {
        if (entry.path.startsWith('Vault/Snapshots/')) {
          const filename = entry.path.replace('Vault/Snapshots/', '');
          const destUri = `${snapDir}${filename}`;
          await FileSystem.writeAsStringAsync(destUri, entry.data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          restoredFilesCount++;
        }
      }
      restoredModules.push('訓練時序快照');
    }

    // 4. Restore Highlights / Videos
    if (selectedModules.highlights) {
      const videoDir = getVideoDirectoryPath();
      const dirInfo = await FileSystem.getInfoAsync(videoDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(videoDir, { intermediates: true });
      }

      for (const entry of payload.entries) {
        if (entry.path.startsWith('records/videos/')) {
          const filename = entry.path.replace('records/videos/', '');
          const destUri = `${videoDir}${filename}`;
          await FileSystem.writeAsStringAsync(destUri, entry.data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          restoredFilesCount++;
        }
      }
      restoredModules.push('深度訓練影像');
    }

    // 5. Restore Logs
    if (selectedModules.logs) {
      for (const entry of payload.entries) {
        if (entry.path === 'data/habit_records.json') {
          try {
            const importedRecords: HabitRecord[] = JSON.parse(entry.data);
            const currentRecords = await getAllRecords();

            // Merge by ID
            const recordMap = new Map<string, HabitRecord>();
            currentRecords.forEach((r) => recordMap.set(r.id, r));
            importedRecords.forEach((r) => recordMap.set(r.id, r));

            const merged = Array.from(recordMap.values()).sort(
              (a, b) => b.timestamp - a.timestamp
            );

            await AsyncStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(merged));
            restoredModules.push(`訓練紀錄日誌 (${importedRecords.length} 筆)`);
            restoredFilesCount++;
          } catch (err) {
            console.warn('[VaultArchive] Failed to merge records:', err);
          }
        }
      }
    }

    return {
      restoredFilesCount,
      restoredModules,
      manifest: payload.manifest,
    };
  }

  /**
   * Shares the generated .vault container file via native share sheet
   */
  public async shareVaultFile(vaultFilePath: string): Promise<void> {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('此設備未支援分享功能');
    }
    await Sharing.shareAsync(vaultFilePath, {
      mimeType: 'application/octet-stream',
      dialogTitle: '分享自定義 AES-256 加密容器 (.vault)',
      UTI: 'com.antigravity.vault',
    });
  }
}

export const vaultArchiveService = VaultArchiveService.getInstance();
