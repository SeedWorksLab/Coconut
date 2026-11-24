import { reportSeedWorksUsage, scheduleSeedWorksUsage } from '../../src/sync/usage-report';
import { getSyncState } from '../../src/database/syncState';
import { SEEDWORKS_CLOUD } from '../../src/config/cloud';
import { getMeta, setMeta } from '../../src/database/syncMeta';

jest.mock('../../src/database/syncState', () => ({
  getSyncState: jest.fn(),
}));
jest.mock('../../src/database/syncMeta', () => ({
  getMeta: jest.fn().mockResolvedValue(null),
  setMeta: jest.fn().mockResolvedValue(undefined),
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
    jest.mocked(getMeta).mockResolvedValue(null);
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

  it('skips both scanning and reporting until the daily report is due', async () => {
    jest.mocked(getMeta).mockResolvedValue(String(Date.now()));
    await reportSeedWorksUsage(db, client as never);
    expect(rpc).not.toHaveBeenCalled();
    expect(setMeta).not.toHaveBeenCalled();
  });

  it('coalesces reports outside the sync critical path', async () => {
    jest.useFakeTimers();
    try {
      scheduleSeedWorksUsage(db, client as never);
      scheduleSeedWorksUsage(db, client as never);
      expect(rpc).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(1000);
      expect(rpc).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not scan or report with cloud sync disabled', async () => {
    mockedGetSyncState.mockResolvedValue({
      supabaseUrl: null, apiKey: null, enabled: false,
      lastSyncAt: null, lastSyncStatus: null, lastSyncError: null,
    });
    await reportSeedWorksUsage(db, client as never);
    expect(getMeta).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});
