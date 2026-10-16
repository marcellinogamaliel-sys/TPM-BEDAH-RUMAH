/**
 * IndexedDB and Offline Outbox Service
 * Handles offline caching, outbox queue for operations, and form draft auto-saving.
 */
import { OutboxItem } from '../types';

const DB_NAME = 'BedahRumah2026_Offline';
const DB_VERSION = 1;

interface OfflineDB {
  db: IDBDatabase | null;
}

const state: OfflineDB = {
  db: null,
};

export async function initOfflineDB(): Promise<IDBDatabase> {
  if (state.db) return state.db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Cache store for beneficiaries, villages, etc.
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'key' });
      }

      // Outbox queue for pending visits, issues, resolutions, payments
      if (!db.objectStoreNames.contains('outbox')) {
        const outboxStore = db.createObjectStore('outbox', { keyPath: 'id' });
        outboxStore.createIndex('status', 'status', { unique: false });
        outboxStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // Drafts store for auto-saving forms
      if (!db.objectStoreNames.contains('drafts')) {
        db.createObjectStore('drafts', { keyPath: 'form_id' });
      }

      // Photos blobs storage
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      state.db = (event.target as IDBOpenDBRequest).result;
      
      // Request persistent storage if supported
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(() => {});
      }
      
      resolve(state.db);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

// Cache operations
export async function setOfflineCache<T>(key: string, data: T): Promise<void> {
  const db = await initOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cache', 'readwrite');
    const store = tx.objectStore('cache');
    store.put({ key, data, cached_at: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getOfflineCache<T>(key: string): Promise<T | null> {
  const db = await initOfflineDB();
  return new Promise((resolve) => {
    const tx = db.transaction('cache', 'readonly');
    const store = tx.objectStore('cache');
    const req = store.get(key);
    req.onsuccess = () => {
      if (req.result) {
        resolve(req.result.data as T);
      } else {
        resolve(null);
      }
    };
    req.onerror = () => resolve(null);
  });
}

// Outbox operations
export async function addToOutbox(
  type: OutboxItem['type'],
  op_id: string,
  payload: unknown
): Promise<OutboxItem> {
  const db = await initOfflineDB();
  const item: OutboxItem = {
    id: op_id,
    op_id,
    type,
    payload,
    status: 'pending',
    attempts: 0,
    created_at: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('outbox', 'readwrite');
    const store = tx.objectStore('outbox');
    store.put(item);
    tx.oncomplete = () => resolve(item);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingOutbox(): Promise<OutboxItem[]> {
  const db = await initOfflineDB();
  return new Promise((resolve) => {
    const tx = db.transaction('outbox', 'readonly');
    const store = tx.objectStore('outbox');
    const req = store.getAll();
    req.onsuccess = () => {
      const items = (req.result as OutboxItem[]) || [];
      resolve(items.filter((i) => i.status === 'pending' || i.status === 'failed'));
    };
    req.onerror = () => resolve([]);
  });
}

export async function updateOutboxStatus(
  id: string,
  status: OutboxItem['status'],
  errorMessage?: string
): Promise<void> {
  const db = await initOfflineDB();
  return new Promise((resolve) => {
    const tx = db.transaction('outbox', 'readwrite');
    const store = tx.objectStore('outbox');
    const req = store.get(id);
    req.onsuccess = () => {
      if (req.result) {
        const updated = {
          ...req.result,
          status,
          attempts: (req.result.attempts || 0) + 1,
          error_message: errorMessage,
        };
        store.put(updated);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function removeOutboxItem(id: string): Promise<void> {
  const db = await initOfflineDB();
  return new Promise((resolve) => {
    const tx = db.transaction('outbox', 'readwrite');
    const store = tx.objectStore('outbox');
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

// Form draft auto-save
export async function saveFormDraft(formId: string, data: unknown): Promise<void> {
  const db = await initOfflineDB();
  return new Promise((resolve) => {
    const tx = db.transaction('drafts', 'readwrite');
    const store = tx.objectStore('drafts');
    store.put({ form_id: formId, data, updated_at: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function getFormDraft<T>(formId: string): Promise<T | null> {
  const db = await initOfflineDB();
  return new Promise((resolve) => {
    const tx = db.transaction('drafts', 'readonly');
    const store = tx.objectStore('drafts');
    const req = store.get(formId);
    req.onsuccess = () => {
      if (req.result) {
        resolve(req.result.data as T);
      } else {
        resolve(null);
      }
    };
    req.onerror = () => resolve(null);
  });
}

export async function clearFormDraft(formId: string): Promise<void> {
  const db = await initOfflineDB();
  return new Promise((resolve) => {
    const tx = db.transaction('drafts', 'readwrite');
    const store = tx.objectStore('drafts');
    store.delete(formId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}
