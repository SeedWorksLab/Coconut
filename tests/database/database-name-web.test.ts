jest.mock('../../src/config/hosted-web', () => ({ HOSTED_WEB: true }));

import { getDatabaseName, setHostedDatabaseUser } from '../../src/database/database-name.web';

describe('hosted web cache isolation', () => {
  it('refuses to open a cache before an account is known', () => {
    expect(() => getDatabaseName()).toThrow('Sign in before opening');
  });

  it('rejects untrusted account IDs as database paths', () => {
    expect(() => setHostedDatabaseUser('../other-user')).toThrow('Invalid account identity');
  });

  it('uses separate names and refuses to switch accounts without a reload', () => {
    setHostedDatabaseUser('11111111-1111-4111-8111-111111111111');
    expect(getDatabaseName()).toBe('coconut-11111111-1111-4111-8111-111111111111.db');
    expect(() => setHostedDatabaseUser('22222222-2222-4222-8222-222222222222')).toThrow(
      'Account changed'
    );
    expect(getDatabaseName()).toBe('coconut-11111111-1111-4111-8111-111111111111.db');
  });
});
