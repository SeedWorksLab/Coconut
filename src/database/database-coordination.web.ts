import type { SQLiteDatabase } from 'expo-sqlite';

interface DatabaseQueue {
  raw: SQLiteDatabase;
  coordinated: SQLiteDatabase;
  tail: Promise<unknown>;
}

const queues = new WeakMap<SQLiteDatabase, DatabaseQueue>();

function enqueue<T>(queue: DatabaseQueue, task: () => Promise<T>): Promise<T> {
  const pending = queue.tail.then(task);
  queue.tail = pending.catch(() => undefined);
  return pending;
}

export function coordinateDatabase(db: SQLiteDatabase): SQLiteDatabase {
  const existing = queues.get(db);
  if (existing) return existing.coordinated;
  const queue: DatabaseQueue = { raw: db, coordinated: db, tail: Promise.resolve() };
  queue.coordinated = new Proxy(db, {
    get(target, property, receiver) {
      const value: unknown = Reflect.get(target, property, receiver);
      if (typeof value !== 'function') return value;
      // Transaction callbacks use the public connection again; queue their
      // individual queries, not the callback itself (which would deadlock).
      if (property === 'withTransactionAsync') return value.bind(receiver);
      if (typeof property === 'string' && property.endsWith('Async')) {
        return (...args: unknown[]) => enqueue(queue, () => Reflect.apply(value, target, args));
      }
      return value.bind(target);
    },
  });
  queues.set(db, queue);
  queues.set(queue.coordinated, queue);
  return queue.coordinated;
}

export function withSerializedDatabase<T>(
  db: SQLiteDatabase,
  apply: (raw: SQLiteDatabase) => Promise<T>,
): Promise<T> {
  coordinateDatabase(db);
  const queue = queues.get(db)!;
  return enqueue(queue, () => apply(queue.raw));
}
