const DATABASE_NAME = "vocapet-reader";
const STORE_NAME = "pdf-documents";

export type StoredPdfDocument = {
  userId: number;
  title: string;
  text: string;
  file: File;
  savedAt: number;
  basket?: unknown[];
  highlights?: Record<string, unknown>;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "userId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLatestPdf(document: StoredPdfDocument) {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(document);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  db.close();
}

export async function getLatestPdf(userId: number): Promise<StoredPdfDocument | undefined> {
  const db = await openDatabase();
  const document = await new Promise<StoredPdfDocument | undefined>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(userId);
    request.onsuccess = () => resolve(request.result as StoredPdfDocument | undefined);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return document;
}
