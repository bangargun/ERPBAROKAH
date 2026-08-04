import { AppRepository } from '../repositories/AppRepository';

// Business Logic Service Layer for Sync Management
export class SyncService {
  static async performBackgroundSync() {
    try {
      const synced = await AppRepository.syncWithRemote();
      return { success: true, data: synced };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}
