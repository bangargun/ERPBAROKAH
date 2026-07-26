import { useState, useEffect } from 'react';
import { AppRepository } from '../repositories/AppRepository';
import { SyncService } from '../services/SyncService';

// React Controller Custom Hook Layer
export function usePosController() {
  const [masterData, setMasterData] = useState(() => AppRepository.getMasterData());

  useEffect(() => {
    SyncService.performBackgroundSync().then(res => {
      if (res.success && res.data) {
        setMasterData(res.data);
      }
    });
  }, []);

  const saveTransaction = async (txData) => {
    const updated = await AppRepository.addTransaction(txData);
    setMasterData(updated);
  };

  return {
    masterData,
    saveTransaction
  };
}
