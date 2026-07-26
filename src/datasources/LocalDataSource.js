// Local Data Source - Handles persistent IndexedDB / localStorage data access
export class LocalDataSource {
  static STORAGE_KEY = 'mris_master_data';
  static SESSION_KEY = 'mris_user_session';

  static getMasterData() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('LocalDataSource getMasterData error:', e);
      return null;
    }
  }

  static saveMasterData(data) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('LocalDataSource saveMasterData error:', e);
      return false;
    }
  }

  static getUserSession() {
    try {
      const saved = localStorage.getItem(this.SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }

  static saveUserSession(session) {
    try {
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      return true;
    } catch (e) {
      return false;
    }
  }
}
