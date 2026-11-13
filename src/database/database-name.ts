import { DATABASE_NAME } from '../utils/date';

export function getDatabaseName(): string {
  return DATABASE_NAME;
}

export function setHostedDatabaseUser(_userId: string): void {
  throw new Error('Hosted database selection is only available on the web.');
}
