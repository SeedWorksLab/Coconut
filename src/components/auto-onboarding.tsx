import { useEffect } from 'react';
import { useRootNavigationState, useRouter } from 'expo-router';

import { useAppData } from '../data/DataProvider';
import { getGreeterSeen, setGreeterSeen } from '../database/greeterPrefs';
import { getTutorialSeen } from '../database/tutorialPrefs';

export function AutoOnboarding() {
  const router = useRouter();
  const { ready } = useAppData();
  const navigationState = useRootNavigationState();
  const canNavigate = navigationState?.key != null;

  useEffect(() => {
    if (!ready || !canNavigate) {
      return;
    }
    let active = true;
    void (async () => {
      try {
        const tutorialSeen = await getTutorialSeen();
        const greeterSeen = await getGreeterSeen();
        if (!greeterSeen) {
          // Installs that already ran the app before the greeter existed are
          // adopted silently, so only a truly first launch gets the greeting.
          if (tutorialSeen) {
            await setGreeterSeen();
          } else if (active) {
            router.push('/greeter' as never);
            return;
          }
        }
        if (!tutorialSeen && active) {
          router.push('/tutorial');
        }
      } catch {
        // the check is best-effort; never break app startup over onboarding
      }
    })();
    return () => {
      active = false;
    };
  }, [ready, canNavigate, router]);

  return null;
}
