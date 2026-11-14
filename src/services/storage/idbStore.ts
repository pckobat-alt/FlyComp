import { openDB, IDBPDatabase } from 'idb';
import { AppDatabaseState, TrackPoint } from '../../types/domain';
import { initialSeedDatabase } from '../../data/seedData';

const DB_NAME = 'aerobalon-ops-db';
const DB_VERSION = 1;
const STATE_STORE = 'app_state';
const DRAFT_STORE = 'flight_draft';
const STATE_KEY = 'main';
const DRAFT_KEY = 'active_flight';

export interface ActiveFlightDraft {
  id: string;
  companyId: string;
  balloonId: string;
  pilotId: string;
  copilotId?: string;
  startedAt: number;
  points: TrackPoint[];
  mode: 'gps' | 'simulator';
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STATE_STORE)) {
          db.createObjectStore(STATE_STORE);
        }
        if (!db.objectStoreNames.contains(DRAFT_STORE)) {
          db.createObjectStore(DRAFT_STORE);
        }
      },
    });
  }
  return dbPromise;
}

export async function loadDatabaseState(): Promise<AppDatabaseState> {
  try {
    const db = await getDb();
    const existing = await db.get(STATE_STORE, STATE_KEY);
    if (existing) {
      return existing as AppDatabaseState;
    }
    await db.put(STATE_STORE, initialSeedDatabase, STATE_KEY);
    return initialSeedDatabase;
  } catch (err) {
    console.warn('IndexedDB fallback to in-memory seed:', err);
    return initialSeedDatabase;
  }
}

export async function saveDatabaseState(state: AppDatabaseState): Promise<void> {
  try {
    const db = await getDb();
    await db.put(STATE_STORE, state, STATE_KEY);
  } catch (err) {
    console.error('Failed to persist state to IndexedDB:', err);
  }
}

export async function resetDatabaseToSeed(): Promise<AppDatabaseState> {
  await saveDatabaseState(initialSeedDatabase);
  return initialSeedDatabase;
}

export async function saveActiveFlightDraft(draft: ActiveFlightDraft | null): Promise<void> {
  try {
    const db = await getDb();
    if (!draft) {
      await db.delete(DRAFT_STORE, DRAFT_KEY);
    } else {
      await db.put(DRAFT_STORE, draft, DRAFT_KEY);
    }
  } catch (err) {
    console.error('Failed to persist active flight draft:', err);
  }
}

export async function loadActiveFlightDraft(): Promise<ActiveFlightDraft | null> {
  try {
    const db = await getDb();
    const draft = await db.get(DRAFT_STORE, DRAFT_KEY);
    return (draft as ActiveFlightDraft) || null;
  } catch {
    return null;
  }
}
