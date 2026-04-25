import type { State } from "./state";

// IndexedDB-backed persistence for the current draft.
// Schema: one record `current` in store `drafts`.

const DB_NAME = "lumen";
const DB_VERSION = 1;
const STORE = "drafts";
const KEY = "current";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDraft(state: State): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(state, KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadDraft(): Promise<State | null> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(KEY);
    req.onsuccess = () => {
      db.close();
      resolve((req.result as State) ?? null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function clearDraft(): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

// Debounced auto-save helper
export function makeAutoSave(getState: () => State, ms = 1500) {
  let timer: number | undefined;
  return () => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      saveDraft(getState()).catch((err) => console.warn("[lumen] save failed", err));
    }, ms);
  };
}
