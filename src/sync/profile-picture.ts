import { getClient } from './supabase';

export async function getSeedProfilePicture(): Promise<string | null> {
  const client = await getClient();
  const { data, error } = await client.schema('public').rpc('seed_get_profile_picture');
  if (error) throw error;
  return typeof data === 'string' &&
    data.length <= 349550 &&
    /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(data)
    ? data
    : null;
}
