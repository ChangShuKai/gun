import * as LocalAuthentication from 'expo-local-authentication';

export interface BiometricStatus {
  hasHardware: boolean;
  isEnrolled: boolean;
  types: LocalAuthentication.AuthenticationType[];
  typeLabel: string;
}

export async function getBiometricStatus(): Promise<BiometricStatus> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    let typeLabel = '生物辨識';
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      typeLabel = 'Face ID / 面孔辨識';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      typeLabel = '指紋辨識';
    } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      typeLabel = '虹膜辨識';
    }

    return {
      hasHardware,
      isEnrolled,
      types,
      typeLabel,
    };
  } catch (error) {
    console.warn('[AuthService] Error checking biometric status:', error);
    return {
      hasHardware: false,
      isEnrolled: false,
      types: [],
      typeLabel: '生物辨識',
    };
  }
}

/**
 * Authenticates user via Face ID, Fingerprint or Device Passcode.
 * In development simulator where biometrics isn't enrolled, provides fallback.
 */
export async function authenticateWithBiometrics(
  promptMessage: string = '請進行生物辨識以確認身份'
): Promise<{ success: boolean; error?: string }> {
  try {
    const status = await getBiometricStatus();

    // If device doesn't have biometric hardware enrolled (e.g. simulator without mock enrolled)
    if (!status.hasHardware || !status.isEnrolled) {
      console.log('[AuthService] Biometrics not enrolled on device, using fallback');
      // On real devices without biometrics or emulators, authenticateAsync will still trigger device passcode fallback
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: '使用密碼解鎖',
      cancelLabel: '取消',
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    }

    return {
      success: false,
      error: result.error || '驗證未通過',
    };
  } catch (error: any) {
    console.warn('[AuthService] Authentication error:', error);
    // In simulator environments, treat as success if user explicitly bypasses or allow testing
    return {
      success: false,
      error: error?.message || '驗證過程發生錯誤',
    };
  }
}
