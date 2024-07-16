import * as fs from 'fs';

import {
  DataStoreLevel,
  EventLogLevel,
  MessageStoreLevel,
  ResumableTaskStoreLevel,
} from '@tbd54566975/dwn-sdk-js';
import type { DidResolver } from '@web5/dids';
import type {
  DataStore,
  DwnConfig,
  EventLog,
  EventStream,
  MessageStore,
  ResumableTaskStore,
  TenantGate,
} from '@tbd54566975/dwn-sdk-js';
import type { Dialect } from '@tbd54566975/dwn-sql-store';
import {
  DataStoreSql,
  EventLogSql,
  MessageStoreSql,
  MysqlDialect,
  PostgresDialect,
  ResumableTaskStoreSql,
  SqliteDialect,
} from '@tbd54566975/dwn-sql-store';

/* New */
import { DataStoreGcs } from '@local-npm-registry/dwn-datastore-gcs';

import Database from 'better-sqlite3';
import { createPool as MySQLCreatePool } from 'mysql2';
import pg from 'pg';
import Cursor from 'pg-cursor';

import type { DwnServerConfig } from './config.js';

export enum EStoreType {
  DataStore,
  MessageStore,
  EventLog,
  ResumableTaskStore,
}

export enum BackendTypes {
  LEVEL = 'level',
  SQLITE = 'sqlite',
  MYSQL = 'mysql',
  POSTGRES = 'postgres',
  GCS = 'gcs'
}

export type StoreType = DataStore | EventLog | MessageStore | ResumableTaskStore;

export function getDWNConfig(
  config  : DwnServerConfig,
  options : {
    didResolver? : DidResolver,
    tenantGate?  : TenantGate,
    eventStream? : EventStream,
  }
): DwnConfig {
  const { tenantGate, eventStream, didResolver } = options;
  const dataStore: DataStore = getGcsStore(); //getStore(config.dataStore, EStoreType.DataStore);
  const eventLog: EventLog = getStore(config.eventLog, EStoreType.EventLog);
  console.log("Getting messageStore");
  const messageStore: MessageStore = getStore(config.messageStore, EStoreType.MessageStore);
  const resumableTaskStore: ResumableTaskStore = getStore(config.messageStore, EStoreType.ResumableTaskStore);

  return { didResolver, eventStream, eventLog, dataStore, messageStore, resumableTaskStore, tenantGate };
}

function getLevelStore(
  storeURI: URL,
  storeType: EStoreType,
): DataStore | MessageStore | EventLog | ResumableTaskStore {
  switch (storeType) {
    case EStoreType.DataStore:
      return new DataStoreLevel({
        blockstoreLocation: storeURI.host + storeURI.pathname + '/DATASTORE',
      });
    case EStoreType.MessageStore:
      return new MessageStoreLevel({
        blockstoreLocation: storeURI.host + storeURI.pathname + '/MESSAGESTORE',
        indexLocation: storeURI.host + storeURI.pathname + '/INDEX',
      });
    case EStoreType.EventLog:
      return new EventLogLevel({
        location: storeURI.host + storeURI.pathname + '/EVENTLOG',
      });
    case EStoreType.ResumableTaskStore:
      return new ResumableTaskStoreLevel({
        location: storeURI.host + storeURI.pathname + '/RESUMABLE-TASK-STORE',
      });
    default:
      throw new Error('Unexpected level store type');
  }
}

function getDBStore(
  db: Dialect,
  storeType: EStoreType,
): DataStore | MessageStore | EventLog | ResumableTaskStore {
  switch (storeType) {
    case EStoreType.DataStore:
      return new DataStoreSql(db);
    case EStoreType.MessageStore:
      return new MessageStoreSql(db);
    case EStoreType.EventLog:
      return new EventLogSql(db);
    case EStoreType.ResumableTaskStore:
      return new ResumableTaskStoreSql(db);
    default:
      throw new Error('Unexpected db store type');
  }
}

function getGcsStore(): DataStore {
  return new DataStoreGcs();
}

function getStore(
  storeString: string,
  storeType: EStoreType.DataStore,
): DataStore;
function getStore(
  storeString: string,
  storeType: EStoreType.EventLog,
): EventLog;
function getStore(
  storeString: string,
  storeType: EStoreType.MessageStore,
): MessageStore;
function getStore(
  storeString: string,
  storeType: EStoreType.ResumableTaskStore,
): ResumableTaskStore;
function getStore(storeString: string, storeType: EStoreType): StoreType {
  console.log("storeString:" + storeString);
  const storeURI = new URL(storeString);
  console.log("storeURI:" + storeURI);
  console.log(storeURI.protocol.slice(0, -1));
  switch (storeURI.protocol.slice(0, -1)) {
    case BackendTypes.LEVEL:
      return getLevelStore(storeURI, storeType);

    case BackendTypes.SQLITE:
    case BackendTypes.MYSQL:
    case BackendTypes.POSTGRES:
      console.log("BackendTypes.POSTGRES:" + BackendTypes.POSTGRES);
      return getDBStore(getDialectFromURI(storeURI), storeType);

    case BackendTypes.GCS:
      return getGcsStore();

    default:
      throw invalidStorageSchemeMessage(storeURI.protocol);
  }
}

export function getDialectFromURI(connectionUrl: URL): Dialect {
  console.log("connection protocol: " + connectionUrl.protocol.slice(0, -1));
  switch (connectionUrl.protocol.slice(0, -1)) {
    case BackendTypes.SQLITE:
      const path = connectionUrl.host + connectionUrl.pathname;
      console.log('SQL-lite relative path:', path ? path : undefined); // NOTE, using ? for lose equality comparison

      if (connectionUrl.host && !fs.existsSync(connectionUrl.host)) {
        console.log('SQL-lite directory does not exist, creating:', connectionUrl.host);
        fs.mkdirSync(connectionUrl.host, { recursive: true });
      }

      return new SqliteDialect({
        database: async () => new Database(path),
      });
    case BackendTypes.MYSQL:
      return new MysqlDialect({
        pool: async () => MySQLCreatePool(connectionUrl.toString()),
      });
    case BackendTypes.POSTGRES:
      console.log("Postgres connectionUrl: " + connectionUrl.toString());
      console.log("PGHOST: " + process.env.PGHOST);
      //return new PostgresDialect({
      //  pool: async () => new pg.Pool({ connectionString: connectionUrl.toString() }),
      //  cursor: Cursor,
      //});

      return new PostgresDialect({
          pool: async () => new pg.Pool({
            host     : process.env.PGHOST,
            port     : Number(process.env.PGPORT),
            database : process.env.PGDATABASE,
            user     : process.env.PGUSER,
            password : process.env.PGPASSWORD
          }),
          cursor: Cursor,
        });
  }
}

function invalidStorageSchemeMessage(protocol: string): string {
  const schemes = [];
  for (const [_, value] of Object.entries(BackendTypes)) {
    schemes.push(value);
  }
  return (
    'Unknown storage protocol ' +
    protocol.slice(0, 1) +
    '! Please use one of: ' +
    schemes.join(', ') +
    '. For details, see README'
  );
}
