import { openDatabaseAsync } from 'expo-sqlite';
import { closeDatabase, getDatabase } from '../../src/database/database';
import { acquireDatabaseAccess, normalizeDatabaseOpenError } from '../../src/database/database-access';

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('../../src/database/database-name', () => ({ getDatabaseName: () => 'test-cache.db' }));
jest.mock('../../src/database/database-access', () => ({
  acquireDatabaseAccess: jest.fn(), normalizeDatabaseOpenError: jest.fn(),
}));
jest.mock('../../src/database/migrations', () => ({ MIGRATIONS: [], subscriptionRepairSql: jest.fn() }));
jest.mock('../../src/database/pull-guard-recovery', () => ({ recoverPullGuard: jest.fn() }));

const db = {
  execAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  getAllAsync: jest.fn(),
  closeAsync: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(acquireDatabaseAccess).mockResolvedValue(undefined);
  jest.mocked(normalizeDatabaseOpenError).mockImplementation((error) => error);
  jest.mocked(openDatabaseAsync).mockResolvedValue(db as never);
  db.execAsync.mockResolvedValue(undefined);
  db.getFirstAsync.mockResolvedValue({ user_version: 0 });
  db.getAllAsync.mockResolvedValue([]);
  db.closeAsync.mockResolvedValue(undefined);
});
afterEach(async () => { await closeDatabase(); });

test('concurrent callers share one open and acquire ownership before touching SQLite', async () => {
  const first = getDatabase();
  expect(getDatabase()).toBe(first);
  await first;
  expect(acquireDatabaseAccess).toHaveBeenCalledTimes(1);
  expect(openDatabaseAsync).toHaveBeenCalledTimes(1);
  expect(jest.mocked(acquireDatabaseAccess).mock.invocationCallOrder[0])
    .toBeLessThan(jest.mocked(openDatabaseAsync).mock.invocationCallOrder[0]);
});

test('a busy second tab never initializes SQLite, and can retry later', async () => {
  jest.mocked(acquireDatabaseAccess).mockRejectedValueOnce(new Error('Already open in another tab'));
  await expect(getDatabase()).rejects.toThrow('Already open in another tab');
  expect(openDatabaseAsync).not.toHaveBeenCalled();
  await expect(getDatabase()).resolves.toBe(db);
  expect(openDatabaseAsync).toHaveBeenCalledTimes(1);
});

test('failed native worker initialization is converted to the platform recovery error', async () => {
  const original = new Error('Invalid VFS state');
  const recovery = new Error('Close other tabs and reload');
  jest.mocked(openDatabaseAsync).mockRejectedValueOnce(original);
  jest.mocked(normalizeDatabaseOpenError).mockReturnValueOnce(recovery);
  await expect(getDatabase()).rejects.toBe(recovery);
  expect(normalizeDatabaseOpenError).toHaveBeenCalledWith(original);
});

test('a failed migration closes its connection before reporting the error', async () => {
  const original = new Error('Migration failed');
  db.execAsync.mockRejectedValueOnce(original);
  await expect(getDatabase()).rejects.toBe(original);
  expect(db.closeAsync).toHaveBeenCalledTimes(1);
});
