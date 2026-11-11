import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text } from 'react-native-paper';
import { useI18n } from '../i18n';
import { monthLabel } from '../utils/date';
import { useAppTheme } from '../theme';

interface MonthClosingBannerProps {
  monthKey: string;
  onPress: () => void;
}

/**
 * Shown while a month is in its closing window. Closing is final, so the prompt
 * stays until the month is closed or the window passes.
 */
export function MonthClosingBanner({ monthKey, onPress }: MonthClosingBannerProps) {
  const theme = useAppTheme();
  const { t } = useI18n();
  const onAccent = theme.text.onAccent;

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('banner.accessibility', { month: monthLabel(monthKey) })}
        testID="month-closing-banner"
        style={({ pressed }) => [
          styles.banner,
          {
            backgroundColor: theme.brand.primary.base,
            borderRadius: theme.radii.large,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={styles.text}>
          <Text variant="titleSmall" style={[styles.title, { color: onAccent }]}>
            {t('banner.monthEnding', { month: monthLabel(monthKey) })}
          </Text>
          <Text variant="bodySmall" style={[styles.sub, { color: onAccent }]}>
            {t('banner.reviewClose')}
          </Text>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={onAccent}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  text: {
    flex: 1,
  },
  title: {
    fontWeight: '600',
  },
  sub: {
    opacity: 0.85,
  },
});
