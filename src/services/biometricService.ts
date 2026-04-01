import { NativeBiometric, BiometryType } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';
import { getItem, setItem } from './storageService';
import { logger } from '../utils/logger';

const BIOMETRIC_ENABLED_KEY = 'commit_biometric_enabled';

export interface BiometricStatus {
  isAvailable: boolean;
  biometryType: 'faceId' | 'touchId' | 'fingerprint' | 'none';
  isEnabled: boolean;
}

export async function checkBiometricAvailability(): Promise<BiometricStatus> {
  if (!Capacitor.isNativePlatform()) {
    return { isAvailable: false, biometryType: 'none', isEnabled: false };
  }

  try {
    const result = await NativeBiometric.isAvailable();
    const enabledStr = await getItem(BIOMETRIC_ENABLED_KEY);
    const isEnabled = enabledStr === 'true';

    let biometryType: BiometricStatus['biometryType'] = 'none';
    switch (result.biometryType) {
      case BiometryType.FACE_ID:
        biometryType = 'faceId';
        break;
      case BiometryType.TOUCH_ID:
        biometryType = 'touchId';
        break;
      case BiometryType.FINGERPRINT:
        biometryType = 'fingerprint';
        break;
    }

    return {
      isAvailable: result.isAvailable,
      biometryType,
      isEnabled,
    };
  } catch {
    return { isAvailable: false, biometryType: 'none', isEnabled: false };
  }
}

export async function authenticateWithBiometric(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    const status = await checkBiometricAvailability();
    if (!status.isAvailable) {
      return false;
    }

    let reason = 'Authenticate to access COMMIT';
    if (status.biometryType === 'faceId') {
      reason = 'Use Face ID to access COMMIT';
    } else if (status.biometryType === 'touchId') {
      reason = 'Use Touch ID to access COMMIT';
    }

    await NativeBiometric.verifyIdentity({
      reason,
      title: 'COMMIT',
      subtitle: 'Secure Authentication',
      description: 'Verify your identity to continue',
    });

    return true;
  } catch {
    return false;
  }
}

export async function saveBiometricCredentials(email: string, password: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    await NativeBiometric.setCredentials({
      username: email,
      password: password,
      server: 'com.commit.journal',
    });
    await setItem(BIOMETRIC_ENABLED_KEY, 'true');
    return true;
  } catch {
    return false;
  }
}

export async function getBiometricCredentials(): Promise<{ email: string; password: string } | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  try {
    const credentials = await NativeBiometric.getCredentials({
      server: 'com.commit.journal',
    });
    return {
      email: credentials.username,
      password: credentials.password,
    };
  } catch {
    return null;
  }
}

export async function deleteBiometricCredentials(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await NativeBiometric.deleteCredentials({
      server: 'com.commit.journal',
    });
    await setItem(BIOMETRIC_ENABLED_KEY, 'false');
  } catch {
    logger.error('[Biometric] Failed to delete credentials');
  }
}

export async function enableBiometric(): Promise<void> {
  await setItem(BIOMETRIC_ENABLED_KEY, 'true');
}

export async function disableBiometric(): Promise<void> {
  await setItem(BIOMETRIC_ENABLED_KEY, 'false');
  await deleteBiometricCredentials();
}
