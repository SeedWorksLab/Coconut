export const SEEDWORKS_CLOUD = {
  supabaseUrl: 'https://qslmlcvskctvyngofipe.supabase.co',
  apiKey: 'sb_publishable_lnbWUY3g4K8rRbekIKR97g_Q0IKxA8L',
} as const;

export const SEEDWORKS_ACCOUNT_URL = 'https://seedworkslab.github.io/account.html';

export interface CloudConfigInput {
  supabaseUrl: string | null;
  apiKey: string | null;
}

export interface ResolvedCloudConfig {
  supabaseUrl: string;
  apiKey: string;
  isCustom: boolean;
}

export function resolveCloudConfig(state: CloudConfigInput): ResolvedCloudConfig {
  if (state.supabaseUrl && state.apiKey) {
    return {
      supabaseUrl: state.supabaseUrl,
      apiKey: state.apiKey,
      isCustom:
        state.supabaseUrl !== SEEDWORKS_CLOUD.supabaseUrl ||
        state.apiKey !== SEEDWORKS_CLOUD.apiKey,
    };
  }
  return { ...SEEDWORKS_CLOUD, isCustom: false };
}
