import { DATABASE_NAME } from '../utils/date';
import { HOSTED_WEB } from '../config/hosted-web';

let hostedUserId: string | null = null;

export function setHostedDatabaseUser(userId: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(userId)) {
    throw new Error('Invalid account identity.');
  }
  if (hostedUserId && hostedUserId !== userId) {
    throw new Error('Account changed. Reload Coconut to open the correct cache.');
  }
  hostedUserId = userId;
}

export function getDatabaseName(): string {
  if (!HOSTED_WEB) {
    return DATABASE_NAME;
  }
  if (!hostedUserId) {
    throw new Error('Sign in before opening the Coconut database.');
  }
  return `coconut-${hostedUserId}.db`;
}
