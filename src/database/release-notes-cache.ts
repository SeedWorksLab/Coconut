import Storage from 'expo-sqlite/kv-store';

export async function readReleaseNotesCache(repo: string): Promise<unknown> {
  const text = await Storage.getItem(`release-notes:v1:${repo}`);
  return text ? JSON.parse(text) : [];
}

export async function writeReleaseNotesCache(repo: string, payload: unknown[]): Promise<void> {
  await Storage.setItem(`release-notes:v1:${repo}`, JSON.stringify(payload));
}
