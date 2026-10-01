export interface ReplicatedVoiceProfile {
  key: string;
  name: string;
  createdAt: number;
  expiresAt: number;
}

const DATABASE_NAME = 'voicemack-replicated-voices';
const STORE_NAME = 'voice-profiles';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getReplicatedVoiceProfiles(): Promise<ReplicatedVoiceProfile[]> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const store = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const profiles = request.result as ReplicatedVoiceProfile[];
      const activeProfiles = profiles.filter((profile) => profile.expiresAt > Date.now());
      profiles.filter((profile) => profile.expiresAt <= Date.now()).forEach((profile) => store.delete(profile.key));
      resolve(activeProfiles.sort((a, b) => b.createdAt - a.createdAt));
      database.close();
    };
    request.onerror = () => {
      reject(request.error);
      database.close();
    };
  });
}

export async function saveReplicatedVoiceProfile(profile: ReplicatedVoiceProfile): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(profile);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

export async function deleteReplicatedVoiceProfile(key: string): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(key);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}