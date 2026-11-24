import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Avatar, Card, Icon, Text } from 'react-native-paper';
import { getSupabaseSessionUser } from '../sync/supabase';
import { getSeedProfilePicture } from '../sync/profile-picture';
import { useI18n } from '../i18n';

interface AccountBubbleProps {
  username: string | null;
  isCustom: boolean;
  onPress: () => void;
}

export function AccountBubble({ username, isCustom, onPress }: AccountBubbleProps) {
  const { t } = useI18n();
  const [account, setAccount] = useState<{ id: string; email: string | null } | null>(null);
  const [picture, setPicture] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    async function loadAccount() {
      const user = await getSupabaseSessionUser();
      if (!active) return;
      setAccount(user ? { id: user.id, email: user.email ?? null } : null);
      setPicture(null);
      if (user && !isCustom) {
        try {
          const photo = await getSeedProfilePicture();
          if (active) setPicture(photo);
        } catch {
          // Account settings must remain reachable when the picture API is offline.
        }
      }
    }
    void loadAccount();
    return () => { active = false; };
  }, [isCustom]));

  return (
    <Card
      mode="contained"
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('settings.cloudSync')}
    >
      <Card.Content style={styles.content}>
        {picture ? (
          <Avatar.Image
            testID="account-picture"
            size={64}
            source={{ uri: picture }}
            onError={() => setPicture(null)}
          />
        ) : (
          <Avatar.Icon size={64} icon="account-outline" />
        )}
        <View style={styles.details}>
          <Text variant="titleLarge" numberOfLines={1}>
            {account ? username?.trim() || account.email || t('settings.profile') : t('settings.cloudSync')}
          </Text>
          {account?.email ? (
            <Text variant="bodyMedium" numberOfLines={1}>{account.email}</Text>
          ) : null}
          <Text variant="bodySmall">{t('settings.cloudSync')}</Text>
        </View>
        <Icon source="chevron-right" size={24} />
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 16, borderRadius: 24 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 20 },
  details: { flex: 1, gap: 4 },
});
