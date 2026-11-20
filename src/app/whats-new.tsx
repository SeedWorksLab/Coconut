import React from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from '../components/keyboard-aware-scroll-view';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Appbar, Button, Text } from 'react-native-paper';
import dayjs from 'dayjs';
import { useAppTheme } from '../theme';
import { whatsNewByLanguage } from '../config/whats-new';
import { useI18n } from '../i18n';
import { releaseInfo } from '../config/release-info';
import { useReleaseNotes } from '../updates/use-release-notes';
import { mergeReleaseNotes } from '../updates/release-notes';
import { ReleaseNoteText } from '../components/release-note-text';

export default function WhatsNewScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t, language } = useI18n();
  const feed = useReleaseNotes('Coconut', releaseInfo.version, language);
  const entries = mergeReleaseNotes(feed.entries, whatsNewByLanguage[language].map((entry) => ({
    version: entry.version,
    releasedAt: entry.releasedAt,
    notes: [entry.intro, entry.features.map((feature) => `- ${feature}`).join('\n')]
      .filter(Boolean).join('\n\n'),
  })), releaseInfo.version);

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={t('screen.whatsNew')} />
      </Appbar.Header>
      <KeyboardAwareScrollView contentContainerStyle={styles.container}>
        {feed.loading ? <ActivityIndicator accessibilityLabel={t('whatsNew.loading')} /> : null}
        {feed.failed ? <Text accessibilityRole="alert">{t('whatsNew.offline')}</Text> : null}
        {!feed.loading && !entries.length ? <Text>{t('whatsNew.empty')}</Text> : null}
        <Button onPress={feed.refresh} disabled={feed.loading} accessibilityLabel={t('whatsNew.refresh')}>
          {t('whatsNew.refresh')}
        </Button>
        {entries.map((entry, index) => {
          const releasedLabel =
            entry.releasedAt === ''
              ? t('whatsNew.upcoming')
              : dayjs(entry.releasedAt).format('D MMM YYYY');
          const isLatest = index === 0;
          return (
            <View key={entry.version} style={styles.entry}>
              <View style={styles.entryHeader}>
                <Text variant="titleMedium" style={styles.version}>
                  {entry.version}
                </Text>
                {isLatest ? (
                  <View style={[styles.badge, { backgroundColor: theme.colors.primaryContainer }]}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer }}>
                      {t('whatsNew.latest')}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text variant="bodySmall" style={styles.released}>
                {releasedLabel}
              </Text>
              <View style={styles.intro}><ReleaseNoteText notes={entry.notes} /></View>
            </View>
          );
        })}
      </KeyboardAwareScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  entry: {
    marginBottom: 24,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  version: {
    fontWeight: '600',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  released: {
    opacity: 0.6,
    marginTop: 2,
  },
  intro: {
    marginTop: 12,
  },
});
