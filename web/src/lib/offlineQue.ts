const DB_NAME = 'pharmpro-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-sales';

interface PendingSale {
  idempotencyKey: string;     // client-generated UUID, sent as a header on sync
  branchId: string;
  cashierId: string;
  patientId: string | null;
  items: { drugId: string; quantity: number; unitPrice: number }[];
  payments: { method: 'CASH' | 'MPESA' | 'CARD' | 'INSURANCE'; amount: number }[];
  createdAtLocal: string;     // ISO timestamp when created offline — preserved through sync
  syncStatus: 'PENDING' | 'SYNCING' | 'FAILED';
  syncAttempts: number;
  lastError?: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'idempotencyKey' });
        store.createIndex('syncStatus', 'syncStatus');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueOfflineSale(sale: Omit<PendingSale, 'syncStatus' | 'syncAttempts'>): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put({ ...sale, syncStatus: 'PENDING', syncAttempts: 0 });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingSales(): Promise<PendingSale[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as PendingSale[]);
    req.onerror = () => reject(req.error);
  });
}

async function updateSaleStatus(key: string, patch: Partial<PendingSale>): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const existing = await new Promise<PendingSale>((res, rej) => {
    const r = store.get(key);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  store.put({ ...existing, ...patch });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function removeSale(key: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(key);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Drains the queue against the real API. Called on 'online' event and on
 * a periodic interval as a fallback (Background Sync API isn't supported
 * in Safari, so this can't be the only trigger).
 */
export async function syncPendingSales(apiPost: (url: string, body: unknown, headers: Record<string, string>) => Promise<Response>): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingSales();
  let synced = 0;
  let failed = 0;

  for (const sale of pending) {
    if (sale.syncStatus === 'SYNCING') continue; // avoid double-processing if two tabs race

    await updateSaleStatus(sale.idempotencyKey, { syncStatus: 'SYNCING' });

    try {
      const res = await apiPost('/api/sales', {
        branchId: sale.branchId,
        patientId: sale.patientId,
        items: sale.items,
        payments: sale.payments,
        offlineCreatedAt: sale.createdAtLocal,
      }, {
        'Idempotency-Key': sale.idempotencyKey, // server must dedupe on this — see note below
      });

      if (res.ok) {
        await removeSale(sale.idempotencyKey);
        synced++;
      } else if (res.status === 409) {
        // Already synced by a previous attempt — safe to drop, not a failure.
        await removeSale(sale.idempotencyKey);
        synced++;
      } else {
        const errorText = await res.text();
        await updateSaleStatus(sale.idempotencyKey, {
          syncStatus: 'FAILED', syncAttempts: sale.syncAttempts + 1, lastError: errorText,
        });
        failed++;
      }
    } catch (err) {
      // Network error mid-sync — leave as PENDING so the next online event retries it.
      await updateSaleStatus(sale.idempotencyKey, {
        syncStatus: 'PENDING', syncAttempts: sale.syncAttempts + 1, lastError: String(err),
      });
      failed++;
    }
  }

  return { synced, failed };
}

export async function getPendingSaleCount(): Promise<number> {
  return (await getPendingSales()).length;
}
