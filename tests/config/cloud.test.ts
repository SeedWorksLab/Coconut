import { resolveCloudConfig, SEEDWORKS_CLOUD } from '../../src/config/cloud';
import { isValidApiKey, normalizeSupabaseUrl } from '../../src/services/sync-service';

describe('SEEDWORKS_CLOUD', () => {
  it('contains a valid public project URL and publishable key', () => {
    expect(normalizeSupabaseUrl(SEEDWORKS_CLOUD.supabaseUrl)).toBe(
      SEEDWORKS_CLOUD.supabaseUrl
    );
    expect(isValidApiKey(SEEDWORKS_CLOUD.apiKey)).toBe(true);
  });
});

describe('resolveCloudConfig', () => {
  it('uses SeedWorks Cloud when no custom project is saved', () => {
    expect(resolveCloudConfig({ supabaseUrl: null, apiKey: null })).toEqual({
      ...SEEDWORKS_CLOUD,
      isCustom: false,
    });
  });

  it('uses a saved custom project', () => {
    expect(
      resolveCloudConfig({
        supabaseUrl: 'https://selfhosted.example.com',
        apiKey: `sb_publishable_${'x'.repeat(48)}`,
      })
    ).toEqual({
      supabaseUrl: 'https://selfhosted.example.com',
      apiKey: `sb_publishable_${'x'.repeat(48)}`,
      isCustom: true,
    });
  });

  it('does not treat the SeedWorks values as a custom project', () => {
    expect(resolveCloudConfig(SEEDWORKS_CLOUD)).toEqual({
      ...SEEDWORKS_CLOUD,
      isCustom: false,
    });
  });

  it('falls back to SeedWorks Cloud when only part of a custom config exists', () => {
    expect(
      resolveCloudConfig({ supabaseUrl: 'https://selfhosted.example.com', apiKey: null })
    ).toEqual({
      ...SEEDWORKS_CLOUD,
      isCustom: false,
    });
  });
});
