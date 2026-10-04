export interface GeneratedAudioHistoryItem {
  id: string;
  text: string;
  voice: string;
  base64: string;
  mimeType: string;
  createdAt: number;
}

const DATABASE_NAME = 'voicemack-audio-history';
const STORE_NAME = 'generated-audio';

function openHistoryDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAudioHistory(): Promise<GeneratedAudioHistoryItem[]> {
  const database = await openHistoryDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      resolve((request.result as GeneratedAudioHistoryItem[]).sort((a, b) => b.createdAt - a.createdAt));
      database.close();
    };
    request.onerror = () => {
      reject(request.error);
      database.close();
    };
  });
}

export async function saveAudioHistoryItem(item: GeneratedAudioHistoryItem): Promise<void> {
  const database = await openHistoryDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(item);
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

export async function deleteAudioHistoryItem(id: string): Promise<void> {
  const database = await openHistoryDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(id);
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

export async function clearAudioHistory(): Promise<void> {
  const database = await openHistoryDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).clear();
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