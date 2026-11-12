import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text } from 'react-native-paper';
import { translate, useI18n, type Language, type TranslationKey } from '../i18n';
import { TRANSACTION_RATINGS, type TransactionRating } from '../models';
import { useAppTheme } from '../theme';

const OPTIONS: { rating: TransactionRating; icon: string; labelKey: TranslationKey }[] = [
  { rating: 'regret', icon: 'emoticon-sad', labelKey: 'rating.regret' },
  { rating: 'neutral', icon: 'emoticon-neutral', labelKey: 'rating.neutral' },
  { rating: 'good', icon: 'emoticon-happy', labelKey: 'rating.worthIt' },
  { rating: 'ignore', icon: 'eye-off-outline', labelKey: 'rating.ignore' },
];

interface RatingSelectorProps {
  value: TransactionRating | null;
  onChange: (rating: TransactionRating) => void;
  disabled?: boolean;
  size?: number;
}

/**
 * Compact rating: regret, neutral, good, or ignore. An unrated transaction
 * rests on the neutral stop; ignore removes it from quality charts.
 */
export function RatingSelector({
  value,
  onChange,
  disabled = false,
  size = 22,
}: RatingSelectorProps) {
  const theme = useAppTheme();
  const { t } = useI18n();
  const active: TransactionRating = value ?? 'neutral';
  const colorFor = (rating: TransactionRating): string => {
    if (rating === 'regret') {
      return theme.semantic.overBudget;
    }
    if (rating === 'good') {
      return theme.semantic.goodBudget;
    }
    if (rating === 'ignore') {
      return theme.colors.secondary;
    }
    return theme.colors.onSurfaceVariant;
  };

  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {OPTIONS.map((option, index) => {
        const selected = option.rating === active;
        const color = colorFor(option.rating);
        return (
          <React.Fragment key={option.rating}>
            {index > 0 ? (
              <View
                style={[
                  styles.track,
                  { backgroundColor: theme.colors.outlineVariant },
                ]}
              />
            ) : null}
            <Pressable
              onPress={() => onChange(option.rating)}
              disabled={disabled}
              hitSlop={6}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={t(option.labelKey)}
              testID={`rating-${option.rating}`}
              style={({ pressed }) => [
                styles.stop,
                { borderRadius: theme.radii.pill },
                selected
                  ? { backgroundColor: color, opacity: disabled ? 0.4 : 1 }
                  : {
                      backgroundColor: theme.colors.surfaceVariant,
                      opacity: disabled ? 0.3 : pressed ? 0.6 : 1,
                    },
              ]}
            >
              <MaterialCommunityIcons
                name={option.icon as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
                size={size}
                color={selected ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
              />
            </Pressable>
          </React.Fragment>
        );
      })}
    </View>
  );
}

export function ratingLabel(
  rating: TransactionRating | null,
  language: Language = 'en'
): string {
  const match = TRANSACTION_RATINGS.indexOf(rating ?? 'neutral');
  const option = OPTIONS[match] ?? OPTIONS[1];
  return translate(language, option.labelKey);
}

export function RatingLegend() {
  const theme = useAppTheme();
  const { t } = useI18n();
  return (
    <View style={styles.legend}>
      {OPTIONS.map((option) => (
        <View key={option.rating} style={styles.legendItem}>
          <MaterialCommunityIcons
            name={option.icon as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
            size={14}
            color={
              option.rating === 'regret'
                ? theme.semantic.overBudget
                : option.rating === 'good'
                  ? theme.semantic.goodBudget
                  : option.rating === 'ignore'
                    ? theme.colors.secondary
                  : theme.colors.onSurfaceVariant
            }
          />
          <Text variant="labelSmall" style={{ color: theme.text.secondary }}>
            {t(option.labelKey)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  track: {
    width: 6,
    height: 2,
  },
  stop: {
    padding: 5,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
