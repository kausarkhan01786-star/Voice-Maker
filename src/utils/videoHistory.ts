export interface GeneratedVideoHistoryItem {
  id: string;
  video: Blob;
  audioName: string;
  filename: string;
  aspectRatio: string;
  createdAt: number;
}

const DATABASE_NAME = 'voicemack-video-history';
const STORE_NAME = 'generated-videos';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getVideoHistory(): Promise<GeneratedVideoHistoryItem[]> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      resolve((request.result as GeneratedVideoHistoryItem[]).sort((a, b) => b.createdAt - a.createdAt));
      database.close();
    };
    request.onerror = () => {
      reject(request.error);
      database.close();
    };
  });
}

export async function saveVideoHistoryItem(item: GeneratedVideoHistoryItem): Promise<void> {
  const database = await openDatabase();
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

export async function clearVideoHistory(): Promise<void> {
  const database = await openDatabase();
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