// Native IndexedDB Wrapper for Lakshya

export interface DBStoreTypes {
  notes: { id: string; title: string; content: string; tags: string[]; updatedAt: number; folder?: string };
  timetable: { id: string; day: string; subject: string; timeStart: string; timeEnd: string; room?: string; teacher?: string; color?: string };
  events: { id: string; title: string; date: string; timeStart?: string; timeEnd?: string; description?: string; color?: string };
  assignments: { id: string; title: string; subject: string; dueDate: string; status: 'todo' | 'progress' | 'submitted' | 'graded'; priority: 'low' | 'medium' | 'high'; notes?: string };
  goals: { id: string; title: string; category: string; dueDate: string; progress: number; keyResults: { id: string; text: string; done: boolean }[] };
  habits: { id: string; name: string; frequency: 'daily' | 'weekly'; datesCompleted: string[]; streak: number; createdAt: number };
  pomodoro: { id: string; taskName: string; duration: number; timestamp: number };
  flashcards: { id: string; deckId: string; front: string; back: string; box: number; nextReview: number };
  flashcard_decks: { id: string; name: string; description?: string };
  projects: { id: string; name: string; tasks: { id: string; title: string; status: 'todo' | 'progress' | 'review' | 'done'; priority: 'low' | 'medium' | 'high'; startDay: number; duration: number }[] };
  diagrams: { id: string; name: string; nodes: any[]; edges: any[]; updatedAt: number };
  career_jobs: { id: string; company: string; role: string; status: 'applied' | 'interviewing' | 'offered' | 'rejected'; date: string; notes?: string };
  career_resume: { id: string; profileName: string; name: string; email: string; phone: string; summary: string; education: any[]; experience: any[]; projects: any[]; skills: string[] };
  resources: { id: string; title: string; url?: string; type: 'link' | 'file'; fileBlob?: Blob; fileName?: string; fileType?: string; dateAdded: number };
  attendance: { id: string; subject: string; attended: number; total: number; target: number };
}

class StudentOSDatabase {
  private dbName = 'LakshyaDB';
  private version = 1;
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported on this environment.'));
        return;
      }

      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        const stores = [
          'notes', 'timetable', 'events', 'assignments', 'goals', 'habits',
          'pomodoro', 'flashcards', 'flashcard_decks', 'projects', 'diagrams',
          'career_jobs', 'career_resume', 'resources', 'attendance'
        ];
        stores.forEach(store => {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'id' });
          }
        });
      };
    });
  }

  private async getStore(storeName: keyof DBStoreTypes, mode: IDBTransactionMode = 'readonly') {
    const db = await this.dbPromise;
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  async getAll<K extends keyof DBStoreTypes>(storeName: K): Promise<DBStoreTypes[K][]> {
    const store = await this.getStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get<K extends keyof DBStoreTypes>(storeName: K, id: string): Promise<DBStoreTypes[K] | undefined> {
    const store = await this.getStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put<K extends keyof DBStoreTypes>(storeName: K, item: DBStoreTypes[K]): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: keyof DBStoreTypes, id: string): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  async clear(storeName: keyof DBStoreTypes): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const db = new StudentOSDatabase();
