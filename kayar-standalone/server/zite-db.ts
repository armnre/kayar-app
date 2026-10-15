/**
 * Server-side implementation of the `zitejs/db` contract (aliased at build time so the app's
 * 26 endpoint modules run unchanged against SQLite).
 */
import { collection, runSql, db, ensureSchema, registerSqlHelpers } from './db';

export type DbRecord = Record<string, any> & { id: string };
export type MembersRecordType = DbRecord;
export type PostsRecordType = DbRecord;
export type TracksRecordType = DbRecord;
export type MediaAssetsRecordType = DbRecord;
export type CmsBlocksRecordType = DbRecord;
export type SessionsRecordType = DbRecord;
export type AnyRecordType = DbRecord;

ensureSchema();
registerSqlHelpers();

export const zite = {
  members: collection('members'),
  sessions: collection('sessions'),
  loginAttempts: collection('loginAttempts'),
  auditLogs: collection('auditLogs'),
  siteSettings: collection('siteSettings'),
  cmsBlocks: collection('cmsBlocks'),
  cmsBlockVersions: collection('cmsBlockVersions'),
  posts: collection('posts'),
  mediaAssets: collection('mediaAssets'),
  collections: collection('collections'),
  collectionItems: collection('collectionItems'),
  tracks: collection('tracks'),
  announcements: collection('announcements'),
  listeningHistory: collection('listeningHistory'),
  favorites: collection('favorites'),
  async sql({ query, params = [] }: { query: string; params?: unknown[] }) {
    return runSql(query, params);
  },
};

export { db };
