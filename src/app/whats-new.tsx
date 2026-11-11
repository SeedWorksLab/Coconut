import React from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from '../components/keyboard-aware-scroll-view';
import { useRouter } from 'expo-router';
import { Appbar, Text } from 'react-native-paper';
import dayjs from 'dayjs';
import { useAppTheme } from '../theme';
import { whatsNewByLanguage } from '../config/whats-new';
import { useI18n } from '../i18n';

export default function WhatsNewScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t, language } = useI18n();
  const entries = whatsNewByLanguage[language];

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={t('screen.whatsNew')} />
      </Appbar.Header>
      <KeyboardAwareScrollView contentContainerStyle={styles.container}>
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
              {entry.intro ? (
                <Text variant="bodyMedium" style={styles.intro}>
                  {entry.intro}
                </Text>
              ) : null}
              <View style={styles.features}>
                {entry.features.map((feature) => (
                  <View key={feature} style={styles.featureRow}>
                    <Text variant="bodyMedium" style={[styles.bullet, { color: theme.colors.primary }]}>
                      {'\u2022'}
                    </Text>
                    <Text variant="bodyMedium" style={styles.feature}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>
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
  features: {
    marginTop: 8,
    gap: 6,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  bullet: {
    fontWeight: '700',
  },
  feature: {
    flex: 1,
  },
});