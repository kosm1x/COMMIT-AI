import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard, KeyboardStyle } from '@capacitor/keyboard';
import { App } from '@capacitor/app';

export const isNative = Capacitor.isNativePlatform();
export const isIOS = Capacitor.getPlatform() === 'ios';
export const isAndroid = Capacitor.getPlatform() === 'android';

export async function initializeNativePlatform(): Promise<void> {
  if (!isNative) {
    return;
  }

  await configureStatusBar();
  await configureKeyboard();
  await hideSplashScreen();
  setupAppStateHandlers();
}

async function configureStatusBar(): Promise<void> {
  if (!isNative) return;

  try {
    const isDark = document.documentElement.classList.contains('dark');
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });

    if (isIOS) {
      await StatusBar.setBackgroundColor({ color: isDark ? '#030712' : '#f9fafb' });
    }
  } catch (error) {
    console.error('[Native] Failed to configure status bar:', error);
  }
}

async function configureKeyboard(): Promise<void> {
  if (!isNative) return;

  try {
    const isDark = document.documentElement.classList.contains('dark');
    await Keyboard.setStyle({ style: isDark ? KeyboardStyle.Dark : KeyboardStyle.Light });

    if (isIOS) {
      await Keyboard.setAccessoryBarVisible({ isVisible: true });
    }
  } catch (error) {
    console.error('[Native] Failed to configure keyboard:', error);
  }
}

async function hideSplashScreen(): Promise<void> {
  if (!isNative) return;

  try {
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch (error) {
    console.error('[Native] Failed to hide splash screen:', error);
  }
}

function setupAppStateHandlers(): void {
  if (!isNative) return;

  App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      console.log('[Native] App became active');
    } else {
      console.log('[Native] App went to background');
    }
  });

  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      App.exitApp();
    }
  });
}

export async function updateStatusBarStyle(isDark: boolean): Promise<void> {
  if (!isNative) return;

  try {
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
    if (isIOS) {
      await StatusBar.setBackgroundColor({ color: isDark ? '#030712' : '#f9fafb' });
    }
    await Keyboard.setStyle({ style: isDark ? KeyboardStyle.Dark : KeyboardStyle.Light });
  } catch (error) {
    console.error('[Native] Failed to update status bar style:', error);
  }
}

export function getDeviceInfo(): { platform: string; isNative: boolean } {
  return {
    platform: Capacitor.getPlatform(),
    isNative: Capacitor.isNativePlatform(),
  };
}
