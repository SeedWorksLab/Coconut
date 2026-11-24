import { getSeedProfilePicture } from '../../src/sync/profile-picture';
import { getClient } from '../../src/sync/supabase';

jest.mock('../../src/sync/supabase', () => ({ getClient: jest.fn() }));

const rpc = jest.fn();
const schema = jest.fn(() => ({ rpc }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getClient).mockResolvedValue({ schema } as never);
});

it('loads the signed-in user’s picture from the public Seed API', async () => {
  rpc.mockResolvedValue({ data: 'data:image/png;base64,AAAA', error: null });
  expect(await getSeedProfilePicture()).toBe('data:image/png;base64,AAAA');
  expect(schema).toHaveBeenCalledWith('public');
  expect(rpc).toHaveBeenCalledWith('seed_get_profile_picture');
});

it.each([null, '', 'https://example.com/tracking.png', 'data:image/svg+xml;base64,AAAA',
  `data:image/png;base64,${'A'.repeat(349550)}`, { picture: 'invalid' }])(
  'rejects unsupported picture data (%p)',
  async (data) => {
    rpc.mockResolvedValue({ data, error: null });
    expect(await getSeedProfilePicture()).toBeNull();
  },
);

it('reports API failures to the caller for graceful fallback', async () => {
  const error = new Error('Offline');
  rpc.mockResolvedValue({ data: null, error });
  await expect(getSeedProfilePicture()).rejects.toThrow('Offline');
});
