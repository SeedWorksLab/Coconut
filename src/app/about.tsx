import React from 'react';
import { StyleSheet, View, Linking, Alert } from 'react-native';
import { KeyboardAwareScrollView } from '../components/keyboard-aware-scroll-view';
import { useRouter } from 'expo-router';
import { Appbar, List, Text } from 'react-native-paper';
import dayjs from 'dayjs';
import { CoconutLogo } from '../components/coconut-logo';
import { useAppTheme } from '../theme';
import { releaseInfo } from '../config/release-info';
import { GITHUB_REPO_URL } from '../config/repository';
import { useI18n } from '../i18n';

export default function AboutScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useI18n();

  const builtVersion =
    releaseInfo.releasedAt === ''
      ? releaseInfo.version
      : `${releaseInfo.version} (build ${releaseInfo.versionCode})`;
  const releasedLabel =
    releaseInfo.releasedAt === ''
      ? t('about.notReleased')
      : dayjs(releaseInfo.releasedAt).format('D MMM YYYY, HH:mm');

  const openGitHub = async () => {
    try {
      await Linking.openURL(GITHUB_REPO_URL);
    } catch {
      Alert.alert(t('about.linkError'));
    }
  };

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={t('about.title')} />
      </Appbar.Header>
      <KeyboardAwareScrollView contentContainerStyle={styles.container}>
        <View style={styles.logo}>
          <CoconutLogo size={64} />
        </View>
        <Text variant="titleLarge" style={styles.name}>
          Coconut
        </Text>
        <Text variant="bodyMedium" style={styles.tagline}>
          {t('about.tagline')}
        </Text>

        <List.Section>
          <List.Item
            title={t('about.developer')}
            description="Henrik Kerezsi"
            left={(props) => <List.Icon {...props} icon="account-outline" />}
          />
          <List.Item
            title={t('about.version')}
            description={builtVersion}
            left={(props) => <List.Icon {...props} icon="tag-outline" />}
          />
          <List.Item
            title={t('about.released')}
            description={releasedLabel}
            left={(props) => <List.Icon {...props} icon="clock-outline" />}
          />
          <List.Item
            title={t('about.github')}
            description={GITHUB_REPO_URL}
            left={(props) => (
              <List.Icon {...props} icon="github" color={theme.colors.primary} />
            )}
            onPress={openGitHub}
          />
        </List.Section>

        <Text variant="bodySmall" style={styles.about}>
          {t('about.description')}
        </Text>
      </KeyboardAwareScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 24,
    paddingBottom: 32,
  },
  logo: {
    alignItems: 'center',
  },
  name: {
    textAlign: 'center',
    marginTop: 12,
  },
  tagline: {
    textAlign: 'center',
    opacity: 0.6,
    marginBottom: 12,
  },
  about: {
    textAlign: 'center',
    opacity: 0.6,
    marginTop: 24,
    paddingHorizontal: 32,
  },
});