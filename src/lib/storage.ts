import {
  DEFAULT_SETTINGS,
  emptyProfile,
  type Profile,
  type ResumeFile,
  type Settings,
} from '@/types/profile';

const KEYS = {
  profile: 'profile',
  settings: 'settings',
  resume: 'resumeFile',
} as const;

export async function getProfile(): Promise<Profile> {
  const result = await browser.storage.local.get(KEYS.profile);
  return { ...emptyProfile(), ...(result[KEYS.profile] as Profile | undefined) };
}

export async function saveProfile(profile: Profile): Promise<void> {
  await browser.storage.local.set({ [KEYS.profile]: profile });
}

export async function getSettings(): Promise<Settings> {
  const result = await browser.storage.local.get(KEYS.settings);
  return { ...DEFAULT_SETTINGS, ...(result[KEYS.settings] as Settings | undefined) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({ [KEYS.settings]: settings });
}

export async function getResumeFile(): Promise<ResumeFile | null> {
  const result = await browser.storage.local.get(KEYS.resume);
  return (result[KEYS.resume] as ResumeFile | undefined) ?? null;
}

export async function saveResumeFile(file: ResumeFile | null): Promise<void> {
  if (file) {
    await browser.storage.local.set({ [KEYS.resume]: file });
    return;
  }
  await browser.storage.local.remove(KEYS.resume);
}

export async function getFillContext() {
  const [profile, settings, resume] = await Promise.all([
    getProfile(),
    getSettings(),
    getResumeFile(),
  ]);
  return { profile, settings, resume };
}
