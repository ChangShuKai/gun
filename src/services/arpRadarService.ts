import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

export type ThreatLevel = 'GREEN' | 'YELLOW' | 'RED' | 'OFFLINE';

export interface RadarTarget {
  ip: string;
  active: boolean;
  rtt_ms: number;
  location_estimate: string;
  status_desc: string;
}

export interface SentryStatusResponse {
  high_risk_detected: boolean;
  threat_level: ThreatLevel;
  target: RadarTarget;
  isOnline: boolean;
  lastCheckedTime: number;
}

const STORAGE_KEY_SENTRY_URL = '@sentry_arp_server_url';
export const DEFAULT_SENTRY_URL = 'http://127.0.0.1:8888';

export class ArpRadarService {
  private static instance: ArpRadarService;
  private serverUrl: string = DEFAULT_SENTRY_URL;
  private pollIntervalTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: ((status: SentryStatusResponse) => void)[] = [];
  private lastThreatLevel: ThreatLevel = 'OFFLINE';

  private currentStatus: SentryStatusResponse = {
    high_risk_detected: false,
    threat_level: 'OFFLINE',
    target: {
      ip: '192.168.68.105',
      active: false,
      rtt_ms: 0,
      location_estimate: 'UNKNOWN',
      status_desc: '尚未連線至三樓哨兵服務',
    },
    isOnline: false,
    lastCheckedTime: 0,
  };

  private constructor() {
    this.loadServerUrl();
  }

  public static getInstance(): ArpRadarService {
    if (!ArpRadarService.instance) {
      ArpRadarService.instance = new ArpRadarService();
    }
    return ArpRadarService.instance;
  }

  public async loadServerUrl(): Promise<string> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_SENTRY_URL);
      if (stored) {
        this.serverUrl = stored;
      }
    } catch {}
    return this.serverUrl;
  }

  public async setServerUrl(url: string): Promise<void> {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `http://${cleanUrl}`;
    }
    cleanUrl = cleanUrl.replace(/\/+$/, '');
    this.serverUrl = cleanUrl;
    await AsyncStorage.setItem(STORAGE_KEY_SENTRY_URL, cleanUrl);
    await this.fetchStatus();
  }

  public async setTargetIp(newIp: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: newIp.trim() }),
      });
      if (response.ok) {
        await this.fetchStatus();
        return true;
      }
    } catch {}
    return false;
  }

  public getServerUrl(): string {
    return this.serverUrl;
  }

  public getStatus(): SentryStatusResponse {
    return { ...this.currentStatus };
  }

  public subscribe(listener: (status: SentryStatusResponse) => void): () => void {
    this.listeners.push(listener);
    listener(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const status = this.getStatus();
    for (const listener of this.listeners) {
      listener(status);
    }
  }

  public async fetchStatus(): Promise<SentryStatusResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);

    try {
      const response = await fetch(`${this.serverUrl}/status`, {
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        const level: ThreatLevel = json.threat_level || 'GREEN';

        // 踏入 RED 狀態（樓梯間逼近）觸發強烈震動避險警報
        if (level === 'RED' && this.lastThreatLevel !== 'RED') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        } else if (level === 'YELLOW' && this.lastThreatLevel === 'GREEN') {
          Haptics.selectionAsync().catch(() => {});
        }
        this.lastThreatLevel = level;

        this.currentStatus = {
          high_risk_detected: level === 'RED',
          threat_level: level,
          target: json.target || {
            ip: '192.168.68.105',
            active: false,
            rtt_ms: 0,
            location_estimate: 'UNKNOWN',
            status_desc: '',
          },
          isOnline: true,
          lastCheckedTime: Date.now(),
        };
      } else {
        this.setOffline();
      }
    } catch {
      clearTimeout(timeoutId);
      this.setOffline();
    }

    this.notify();
    return this.getStatus();
  }

  private setOffline() {
    this.lastThreatLevel = 'OFFLINE';
    this.currentStatus = {
      ...this.currentStatus,
      threat_level: 'OFFLINE',
      isOnline: false,
      lastCheckedTime: Date.now(),
    };
  }

  public startPolling(intervalMs: number = 2500) {
    if (this.pollIntervalTimer) return;
    this.fetchStatus();
    this.pollIntervalTimer = setInterval(() => {
      this.fetchStatus();
    }, intervalMs);
  }

  public stopPolling() {
    if (this.pollIntervalTimer) {
      clearInterval(this.pollIntervalTimer);
      this.pollIntervalTimer = null;
    }
  }
}

export const arpRadar = ArpRadarService.getInstance();
