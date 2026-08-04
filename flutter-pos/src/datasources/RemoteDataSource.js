// Remote Data Source - Encapsulates HTTP REST API calls to VPS Backend
export class RemoteDataSource {
  static getBaseUrl() {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1') {
        return `${window.location.protocol}//${host}:${window.location.port || 3000}`;
      }
    }
    return 'https://mris-admin.barokahgroupindonesia.tech';
  }

  static async fetchMasterData() {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/master-data`);
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  static async pushMasterData(payload) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/master-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return res.ok ? await res.json() : null;
    } catch (e) {
      return null;
    }
  }

  static async submitTransaction(txPayload) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txPayload)
      });
      return res.ok ? await res.json() : null;
    } catch (e) {
      return null;
    }
  }
}
