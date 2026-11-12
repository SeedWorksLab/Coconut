import { reportSeedWorksUsage } from '../../src/sync/usage-report';
import { getSyncState } from '../../src/database/syncState';
import { SEEDWORKS_CLOUD } from '../../src/config/cloud';

jest.mock('../../src/database/syncState', () => ({
  getSyncState: jest.fn(),
}));

const mockedGetSyncState = jest.mocked(getSyncState);

describe('reportSeedWorksUsage', () => {
  const db = {
    getAllAsync: jest.fn().mockResolvedValue([]),
  } as never;
  const rpc = jest.fn().mockResolvedValue({ error: null });
  const client = {
    schema: jest.fn().mockReturnValue({ rpc }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetSyncState.mockResolvedValue({
      supabaseUrl: null,
      apiKey: null,
      enabled: true,
      lastSyncAt: null,
      lastSyncStatus: 'success',
      lastSyncError: null,
    });
  });

  it('reports an empty synced dataset to the public SeedWorks RPC', async () => {
    await reportSeedWorksUsage(db, client as unknown as Parameters<typeof reportSeedWorksUsage>[1]);

    expect(client.schema).toHaveBeenCalledWith('public');
    expect(rpc).toHaveBeenCalledWith('seed_report_app_usage', {
      p_app_slug: 'coconut',
      p_record_count: 0,
      p_byte_count: 0,
      p_device_name: expect.stringMatching(/^Coconut \(.+\)$/),
    });
  });

  it('does not report data to a custom Supabase project', async () => {
    mockedGetSyncState.mockResolvedValue({
      supabaseUrl: 'https://custom.supabase.co',
      apiKey: 'custom-key',
      enabled: true,
      lastSyncAt: null,
      lastSyncStatus: 'success',
      lastSyncError: null,
    });

    await reportSeedWorksUsage(db, client as unknown as Parameters<typeof reportSeedWorksUsage>[1]);

    expect(rpc).not.toHaveBeenCalled();
    expect(SEEDWORKS_CLOUD.supabaseUrl).not.toBe('https://custom.supabase.co');
  });
});
