import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export async function getItem(key: string): Promise<string | null> {
  if (isNative) {
    const { value } = await Preferences.get({ key });
    return value;
  }
  return localStorage.getItem(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  if (isNative) {
    await Preferences.set({ key, value });
  } else {
    localStorage.setItem(key, value);
  }
}

export async function removeItem(key: string): Promise<void> {
  if (isNative) {
    await Preferences.remove({ key });
  } else {
    localStorage.removeItem(key);
  }
}

export async function clear(): Promise<void> {
  if (isNative) {
    await Preferences.clear();
  } else {
    localStorage.clear();
  }
}

export function getItemSync(key: string): string | null {
  if (isNative) {
    console.warn('[Storage] Sync access not available on native, returning null');
    return null;
  }
  return localStorage.getItem(key);
}

export function setItemSync(key: string, value: string): void {
  if (isNative) {
    Preferences.set({ key, value });
    return;
  }
  localStorage.setItem(key, value);
}
