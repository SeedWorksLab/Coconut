import { Tabs } from 'expo-router';
import { CustomTabBar } from '../../components/custom-tab-bar';
import { useI18n } from '../../i18n';
import { useAppTheme } from '../../theme';

export default function TabsLayout() {
  const theme = useAppTheme();
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        sceneStyle: { backgroundColor: theme.colors.background },
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: t('nav.overview') }} />
      <Tabs.Screen name="transactions" options={{ title: t('nav.transactions') }} />
      <Tabs.Screen name="statistics" options={{ title: t('nav.statistics') }} />
      <Tabs.Screen name="shared" options={{ title: t('nav.shared') }} />
      <Tabs.Screen name="settings" options={{ title: t('nav.settings') }} />
    </Tabs>
  );
}