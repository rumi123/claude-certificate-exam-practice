import { getDb } from '../client';
import { getSetting, setSetting } from '../settings';

export type Theme = 'system' | 'light' | 'dark';
export type Preferences = {
  defaultSize: number;
  defaultMode: 'study' | 'test';
  showTimer: boolean;
  theme: Theme;
};

export const THEMES: Theme[] = ['system', 'light', 'dark'];

export function getPreferences(): Preferences {
  const size = getSetting<number>('pref.defaultSize', 5);
  const mode = getSetting<string>('pref.defaultMode', 'study');
  const theme = getSetting<string>('pref.theme', 'system');
  return {
    defaultSize: Number.isInteger(size) && size >= 5 && size <= 150 ? size : 5,
    defaultMode: mode === 'test' ? 'test' : 'study',
    showTimer: getSetting<boolean>('pref.showTimer', false) === true,
    theme: THEMES.find((x) => x === theme) ?? 'system',
  };
}

export function savePreferencesRow(p: Preferences): void {
  // setSetting uses the same connection, so these four writes share one transaction.
  getDb().transaction(() => {
    setSetting('pref.defaultSize', p.defaultSize);
    setSetting('pref.defaultMode', p.defaultMode);
    setSetting('pref.showTimer', p.showTimer);
    setSetting('pref.theme', p.theme);
  });
}
