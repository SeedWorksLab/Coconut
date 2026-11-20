import { useEffect, useState } from 'react';
import { readReleaseNotesCache, writeReleaseNotesCache } from '../database/release-notes-cache';
import {
  fetchReleaseNotePayload, normalizeReleaseNotes, visibleNotes,
  type PublishedNote, type ReleaseRepository,
} from './release-notes';

export function useReleaseNotes(repo: ReleaseRepository, currentVersion: string, language: 'en' | 'de' | 'hu' = 'en') {
  const [entries, setEntries] = useState<PublishedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function load() {
      try {
        const cached = normalizeReleaseNotes(await readReleaseNotesCache(repo), repo, language);
        if (active) setEntries(visibleNotes(cached, currentVersion));
      } catch {
        // A corrupt or unavailable cache must not prevent a public-feed refresh.
      }
      if (!active) return;
      timer = setTimeout(() => controller.abort(), 15000);
      try {
        const payload = await fetchReleaseNotePayload(repo, controller.signal);
        if (!active) return;
        setEntries(visibleNotes(normalizeReleaseNotes(payload, repo, language), currentVersion));
        await writeReleaseNotesCache(repo, payload).catch(() => undefined);
      } catch {
        if (active) setFailed(true);
      } finally {
        clearTimeout(timer);
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [repo, currentVersion, revision, language]);

  function refresh() {
    setLoading(true);
    setFailed(false);
    setRevision((value) => value + 1);
  }
  return { entries, loading, failed, refresh };
}
