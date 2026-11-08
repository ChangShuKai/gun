import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { girlfriendCompanion } from './girlfriendCompanion';

export interface UserProfile {
  gender: 'male' | 'female' | 'other';
  userName: string;
  partnerName: string;
  userLength: string; // e.g. "16.5"
  updatedAt: number;
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  gender: 'male',
  userName: '頂流男神',
  partnerName: '寶寶',
  userLength: '16.5',
  updatedAt: Date.now(),
};

const STORAGE_KEY_PROFILE = '@health_tracker_user_profile';

class UserProfileService {
  private static instance: UserProfileService;
  private currentProfile: UserProfile = DEFAULT_USER_PROFILE;
  private isLoaded: boolean = false;
  private listeners: ((profile: UserProfile) => void)[] = [];

  private constructor() {
    this.loadProfile();
  }

  public static getInstance(): UserProfileService {
    if (!UserProfileService.instance) {
      UserProfileService.instance = new UserProfileService();
    }
    return UserProfileService.instance;
  }

  public async loadProfile(): Promise<UserProfile> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_PROFILE);
      if (stored) {
        this.currentProfile = {
          ...DEFAULT_USER_PROFILE,
          ...JSON.parse(stored),
        };
      }
    } catch {
      this.currentProfile = DEFAULT_USER_PROFILE;
    }
    this.isLoaded = true;
    this.notify();
    return this.currentProfile;
  }

  public getProfile(): UserProfile {
    return { ...this.currentProfile };
  }

  public isProfileLoaded(): boolean {
    return this.isLoaded;
  }

  public async updateProfile(partial: Partial<UserProfile>): Promise<UserProfile> {
    this.currentProfile = {
      ...this.currentProfile,
      ...partial,
      updatedAt: Date.now(),
    };

    try {
      await AsyncStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(this.currentProfile));
    } catch {}

    // If partnerName changed, also sync with girlfriend companion
    if (partial.partnerName) {
      void girlfriendCompanion.saveConfig({ name: partial.partnerName });
    }

    this.notify();
    return this.getProfile();
  }

  public subscribe(listener: (profile: UserProfile) => void): () => void {
    this.listeners.push(listener);
    listener(this.getProfile());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const prof = this.getProfile();
    for (const listener of this.listeners) {
      listener(prof);
    }
  }
}

export const userProfileService = UserProfileService.getInstance();

/**
 * Global React Hook for accessing and updating user profile
 */
export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile>(userProfileService.getProfile());
  const [isLoaded, setIsLoaded] = useState<boolean>(userProfileService.isProfileLoaded());

  useEffect(() => {
    userProfileService.loadProfile().then((p) => {
      setProfile(p);
      setIsLoaded(true);
    });

    const unsubscribe = userProfileService.subscribe((latest) => {
      setProfile(latest);
      setIsLoaded(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const updateProfile = async (partial: Partial<UserProfile>) => {
    const updated = await userProfileService.updateProfile(partial);
    setProfile(updated);
    return updated;
  };

  return {
    profile,
    updateProfile,
    isLoaded,
    userName: profile.userName || '頂流男神',
    partnerName: profile.partnerName || '寶寶',
    userLength: profile.userLength || '16.5',
    gender: profile.gender || 'male',
  };
}
