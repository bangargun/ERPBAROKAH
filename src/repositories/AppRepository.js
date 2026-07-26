import { LocalDataSource } from '../datasources/LocalDataSource';
import { RemoteDataSource } from '../datasources/RemoteDataSource';

// Unified Application Repository Layer
export class AppRepository {
  static getMasterData() {
    return LocalDataSource.getMasterData();
  }

  static saveMasterData(data) {
    return LocalDataSource.saveMasterData(data);
  }

  static async syncWithRemote() {
    const remoteData = await RemoteDataSource.fetchMasterData();
    if (remoteData) {
      this.saveMasterData(remoteData);
      return remoteData;
    }
    return this.getMasterData();
  }

  static async addTransaction(tx) {
    const localData = this.getMasterData() || {};
    const updatedTxList = [tx, ...(localData.salesTransactions || [])];
    const updatedData = { ...localData, salesTransactions: updatedTxList };
    this.saveMasterData(updatedData);

    // Try remote push asynchronously
    RemoteDataSource.submitTransaction(tx).catch(() => {});
    return updatedData;
  }
}
