import { HOSTED_WEB } from '../config/hosted-web';
import { syncMetaAuthStorage } from '../database/syncMeta';

export const SEEDWORKS_AUTH_STORAGE_KEY = 'seedworks-account-auth';
export const coconutAuthStorage = HOSTED_WEB ? window.localStorage : syncMetaAuthStorage;
export const coconutAuthStorageKey = HOSTED_WEB ? SEEDWORKS_AUTH_STORAGE_KEY : undefined;
