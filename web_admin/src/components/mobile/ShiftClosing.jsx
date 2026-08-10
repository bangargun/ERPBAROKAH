import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  FileEdit, 
  Plus, 
  PlusCircle, 
  Trash2, 
  Eye, 
  X, 
  Edit3, 
  ShoppingBag, 
  Package, 
  Search 
} from 'lucide-react';

export default function ShiftClosing({ selectedBranch, masterData, setMasterData, outlets, onShiftClosed }) {
  const currentOutlet = (outlets || []).find(o => o.id === selectedBranch) || (outlets || [])[0] || { id: 1, name: 'Restoran Senopati (HQ)' };

  const ingredientsList = masterData?.ingredients && masterData.ingredients.length > 0 
    ? masterData.ingredients 
    : [
        { id: 1, name: 'Beras Pandan Wangi', unit: 'kg', cost: 14000 },
        { id: 2, name: 'Minyak Goreng Bimoli', unit: 'liter', cost: 18000 },
        { id: 3, name: 'Telur Ayam Negeri', unit: 'butir', cost: 2000 },
        { id: 4, name: 'Daging Ayam Fillet', unit: 'kg', cost: 48000 },
        { id: 5, name: 'Cabai Rawit Merah', unit: 'kg', cost: 65000 },
        { id: 6, name: 'Bawang Merah', unit: 'kg', cost: 35000 }
      ];

  const expenseMasterList = masterData?.expenseMaster && masterData.expenseMaster.length > 0
    ? masterData.expenseMaster
    : [
        { id: 1, code: 'BIA-001', name: 'Biaya Listrik & Air', category: 'Biaya Utilitas (Gas LPG, Air & Listrik)' },
        { id: 2, code: 'BIA-002', name: 'Biaya Gas LPG Dapur', category: 'Biaya Utilitas (Gas LPG, Air & Listrik)' },
        { id: 3, code: 'BIA-003', name: 'Biaya Alat Kebersihan & Sabun', category: 'Biaya Operasional (OPEX)' },
        { id: 4, code: 'BIA-004', name: 'Biaya Promo & Brosur Lokal', category: 'Biaya Pemasaran (Marketing & Promo)' },
        { id: 5, code: 'BIA-005', name: 'Biaya Transport & Kurir Dapur', category: 'Biaya Operasional (OPEX)' }
      ];

  const adminList = (masterData?.userRights || []).length > 0
    ? masterData.userRights
    : [
        { id: 1, name: 'Rina Kasir', role: 'Kasir POS Shift Pagi' },
        { id: 2, name: 'Budi Santoso', role: 'Manajer Cabang' },
        { id: 3, name: 'Argun Admin', role: 'Super Admin Restoran' }
      ];

  const formatRupiah = (val) => {
    return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
  };

  // FORM FIELDS STATES
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [cashierName, setCashierName] = useState(adminList[0]?.name || 'Rina Kasir');

  // INCOME STATES (AUTO-FETCHED FROM POS SALES)
  const [netSales, setNetSales] = useState(0);
  const [nonCashSales, setNonCashSales] = useState(0);

  // MULTI-ROW HPP & EXPENSES (MINIMAL 5 OPEN FIELDS DEFAULT)
  const [cogsRows, setCogsRows] = useState([]);
  const [expenseRows, setExpenseRows] = useState([]);

  // CAPITAL RETURN (SIMPANAN) & PREVIEW MODAL
  const [capitalReturn, setCapitalReturn] = useState(0);
  const [previewingRecord, setPreviewingRecord] = useState(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // 1 TANGGAL 1 LAPORAN PER OUTLET LOCK & EDIT LOGIC
  const [existingReport, setExistingReport] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isPendingEdit, setIsPendingEdit] = useState(false);

  useEffect(() => {
    const deletedReportIdsSet = new Set([
      ...(masterData?.deletedReportIds || []).map(x => String(x)),
      ...(masterData?.deletedLogisticsIds || []).map(x => String(x))
    ]);

    const allReports = [
      ...(masterData?.approvedFinanceDaily || []),
      ...(masterData?.shiftClosings || []),
      ...(masterData?.shift_closings || []),
      ...(masterData?.dailyReports || []),
      ...(masterData?.manualEntryRecords || [])
    ];

    const curOutletId = String(currentOutlet?.id || 1);
    const matched = allReports.find(r => {
      if (!r) return false;
      const rId = String(r.id !== undefined && r.id !== null ? r.id : '');
      const rNo = String(r.report_no || r.receiptNo || r.receipt_no || '');
      if ((rId && deletedReportIdsSet.has(rId)) || (rNo && deletedReportIdsSet.has(rNo))) {
        return false;
      }

      const rDate = String(r.entry_date || r.date || r.created_at || '').substring(0, 10);
      const rOutlet = String(r.outlet_id || r.branch_id || 1);

      return rDate === entryDate && (rOutlet === curOutletId || !r.outlet_id);
    });

    if (matched) {
      setExistingReport(matched);
      const st = String(matched.status || matched.approval_status || '').toLowerCase();
      if (st === 'done' || st === 'approved' || st === 'disetujui' || st === 'read') {
        setIsLocked(true);
        setIsPendingEdit(false);
      } else {
        setIsLocked(false);
        setIsPendingEdit(true);
      }
    } else {
      setExistingReport(null);
      setIsLocked(false);
      setIsPendingEdit(false);
    }
  }, [entryDate, currentOutlet?.id, masterData?.approvedFinanceDaily, masterData?.shiftClosings, masterData?.shift_closings, masterData?.dailyReports, masterData?.manualEntryRecords, masterData?.deletedReportIds, masterData?.deletedLogisticsIds]);

  useEffect(() => {
    if (ingredientsList && ingredientsList.length > 0) {
      const default5Cogs = ingredientsList.slice(0, 5).map((ing, idx) => ({
        id: Date.now() + idx + Math.random(),
        ingredient_id: ing.id,
        name: ing.name,
        qty: 1,
        unit: ing.unit || 'kg',
        price_unit: ing.cost || 0,
        amount: ing.cost || 0
      }));
      setCogsRows(default5Cogs);
    } else {
      setCogsRows([]);
    }

    if (expenseMasterList && expenseMasterList.length > 0) {
      const default5Expenses = expenseMasterList.slice(0, 5).map((exp, idx) => ({
        id: Date.now() + 100 + idx + Math.random(),
        expense_id: exp.id,
        name: exp.name,
        category: exp.category || 'Biaya Operasional (OPEX)',
        amount: 0
      }));
      setExpenseRows(default5Expenses);
    } else {
      setExpenseRows([]);
    }
  }, [ingredientsList, expenseMasterList]);

  // AUTO FETCH INCOME FROM POS TRANSACTIONS
  useEffect(() => {
    const txList = masterData?.salesTransactions || [];
    const matched = txList.filter(t => {
      const isDateMatch = !t.date || t.date === entryDate;
      const isOutletMatch = Number(t.outlet_id) === Number(currentOutlet.id);
      return isDateMatch && isOutletMatch;
    });

    const totalIncome = matched.reduce((acc, t) => acc + (t.amount || 0), 0);
    const totalNonCash = matched.filter(t => t.payment_method && t.payment_method.toLowerCase() !== 'cash')
                                .reduce((acc, t) => acc + (t.amount || 0), 0);

    setNetSales(totalIncome);
    setNonCashSales(totalNonCash);
  }, [entryDate, currentOutlet.id, masterData?.salesTransactions]);

  // ADD EXTRA BLANK HPP ROW
  const handleAddBlankCogsRow = () => {
    const nextIdx = cogsRows.length;
    const ing = ingredientsList[nextIdx % ingredientsList.length] || { id: Date.now(), name: 'Bahan Mentah Baru', unit: 'kg', cost: 10000 };
    const newRow = {
      id: Date.now() + Math.random(),
      ingredient_id: ing.id,
      name: ing.name,
      qty: 1,
      unit: ing.unit || 'kg',
      price_unit: ing.cost || 10000,
      amount: ing.cost || 10000
    };
    setCogsRows([...cogsRows, newRow]);
  };

  // ADD EXTRA BLANK EXPENSE ROW
  const handleAddBlankExpenseRow = () => {
    const nextIdx = expenseRows.length;
    const exp = expenseMasterList[nextIdx % expenseMasterList.length] || { id: Date.now(), name: 'Biaya Operasional Baru', category: 'Biaya Operasional (OPEX)' };
    const newRow = {
      id: Date.now() + Math.random(),
      expense_id: exp.id,
      name: exp.name,
      category: exp.category || 'Biaya Operasional (OPEX)',
      amount: 50000
    };
    setExpenseRows([...expenseRows, newRow]);
  };

  const handleUpdateCogsRow = (id, field, val) => {
    setCogsRows(cogsRows.map(r => {
      if (r.id === id) {
        const updated = { ...r, [field]: val };
        if (field === 'name') {
          const matchedIng = ingredientsList.find(i => i.name === val);
          if (matchedIng) {
            updated.unit = matchedIng.unit || 'kg';
            updated.price_unit = matchedIng.cost || updated.price_unit;
          }
        }
        if (field === 'qty' || field === 'price_unit') {
          updated.amount = Number(updated.qty || 0) * Number(updated.price_unit || 0);
        }
        return updated;
      }
      return r;
    }));
  };

  const handleRemoveCogsRow = (id) => {
    setCogsRows(cogsRows.filter(r => r.id !== id));
  };

  const handleUpdateExpenseRow = (id, field, val) => {
    setExpenseRows(expenseRows.map(r => {
      if (r.id === id) {
        const updated = { ...r, [field]: val };
        if (field === 'name') {
          const matchedExp = expenseMasterList.find(e => e.name === val);
          if (matchedExp) {
            updated.category = matchedExp.category || updated.category;
          }
        }
        return updated;
      }
      return r;
    }));
  };

  const handleRemoveExpenseRow = (id) => {
    setExpenseRows(expenseRows.filter(r => r.id !== id));
  };

  // CALCULATIONS
  const totalCogs = cogsRows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalExpenseOther = expenseRows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const grandTotalExpense = totalCogs + totalExpenseOther;

  const grossProfit = Number(netSales || 0) - grandTotalExpense;
  const cashInDrawer = grossProfit - Number(capitalReturn || 0) - Number(nonCashSales || 0);

  // OPEN PREVIEW DRAFT BEFORE SAVE
  const handleOpenPreviewDraft = () => {
    const activeCogs = cogsRows.filter(c => Number(c.amount || 0) > 0 || c.name.trim());
    const activeExp = expenseRows.filter(e => Number(e.amount || 0) > 0 || e.name.trim());

    const combinedExpenses = [
      ...activeCogs.map(c => ({
        id: c.id,
        category: `[HPP Dapur] ${c.name}`,
        cost_group: 'COGS / HPP Bahan Baku',
        amount: Number(c.amount || 0),
        notes: `${c.qty} ${c.unit} @ ${formatRupiah(c.price_unit)}`
      })),
      ...activeExp.map(e => ({
        id: e.id,
        category: e.name,
        cost_group: e.category,
        amount: Number(e.amount || 0),
        notes: `Input biaya operasional mobile`
      }))
    ];

    const draft = {
      id: `FIN-${Date.now()}`,
      date: entryDate,
      branch_name: currentOutlet.name,
      outlet_id: Number(currentOutlet.id),
      author_name: cashierName,
      net_sales: Number(netSales || 0),
      non_cash_sales: Number(nonCashSales || 0),
      total_expense: grandTotalExpense,
      cash_physical: cashInDrawer,
      debt_payment: Number(capitalReturn || 0),
      expenses_breakdown: combinedExpenses,
      status: 'ditunda'
    };

    setPreviewingRecord(draft);
  };

  // FINAL CONFIRM & SAVE FROM PREVIEW MODAL TO PERSATUAN KEUANGAN KASIR
  const handleFinalSubmit = () => {
    if (!previewingRecord || isLocked) return;

    if (setMasterData) {
      setMasterData(prev => {
        const ts = Date.now();
        const existingId = existingReport ? (existingReport.id || existingReport.report_no) : null;

        const filterOutDuplicate = (r) => {
          if (!r) return false;
          if (existingId) {
            const rId = String(r.id !== undefined && r.id !== null ? r.id : '');
            const rNo = String(r.report_no || r.receiptNo || r.receipt_no || '');
            if (rId === String(existingId) || rNo === String(existingId)) return false;
          }
          const rDate = String(r.entry_date || r.date || r.created_at || '').substring(0, 10);
          const rOutlet = String(r.outlet_id || r.branch_id || 1);
          const curOutletId = String(currentOutlet?.id || 1);
          if (rDate === entryDate && rOutlet === curOutletId) return false;
          return true;
        };

        const targetRecord = {
          ...previewingRecord,
          id: existingId || previewingRecord.id,
          report_no: existingReport?.report_no || previewingRecord.id,
          status: 'pending',
          approval_status: 'pending',
          updated_at: new Date().toISOString()
        };

        return {
          ...prev,
          _lastUpdated: ts,
          approvedFinanceDaily: [targetRecord, ...(prev.approvedFinanceDaily || []).filter(filterOutDuplicate)],
          shiftClosings: [targetRecord, ...(prev.shiftClosings || []).filter(filterOutDuplicate)],
          shift_closings: [targetRecord, ...(prev.shift_closings || []).filter(filterOutDuplicate)],
          closedShifts: [targetRecord, ...(prev.closedShifts || []).filter(filterOutDuplicate)]
        };
      });
    }

    setPreviewingRecord(null);
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
      if (onShiftClosed) onShiftClosed();
    }, 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
      
      {/* TOAST NOTIFICATION */}
      {showSuccessToast && (
        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white', padding: '12px 16px', borderRadius: '10px',
          display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', fontWeight: '800'
        }}>
          <CheckCircle2 size={20} />
          <div>Laporan Shift Berhasil Disimpan &amp; Dikirim ke Persetujuan Kasir!</div>
        </div>
      )}

      {/* HEADER & STATUS LOCK BANNERS */}
      <div style={{ background: '#1e293b', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={18} color="#6366f1" />
          <span>Input Laporan Keuangan Kasir (Shift Closing)</span>
        </h3>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
          Cabang: <strong style={{ color: '#6366f1' }}>{currentOutlet.name}</strong>
        </p>

        {isLocked && (
          <div style={{ marginTop: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', padding: '10px 14px', borderRadius: '10px', color: '#fca5a5', fontSize: '0.78rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="#ef4444" />
            <span>🔒 LAPORAN TERKUNCI -- Laporan tanggal {entryDate} untuk outlet ini telah DISETUJUI (DONE) oleh Web Admin dan tidak dapat diubah lagi!</span>
          </div>
        )}

        {isPendingEdit && (
          <div style={{ marginTop: '10px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid #f59e0b', padding: '10px 14px', borderRadius: '10px', color: '#fcd34d', fontSize: '0.78rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileEdit size={18} color="#f59e0b" />
            <span>📝 MENGEDIT LAPORAN PENDING -- Sudah ada laporan berstatus Pending untuk tanggal {entryDate}. Mengirim ulang akan MEMPERBARUI laporan tersebut.</span>
          </div>
        )}
      </div>

      {/* FORM INPUT LAPORAN KEUANGAN KASIR */}
      <div style={{ background: '#1e293b', padding: '16px', borderRadius: '14px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* 1. Tanggal & Kasir */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '4px' }}>📅 Tanggal Shift *</label>
            <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="form-input" style={{ fontSize: '0.8rem', height: '36px' }} />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '4px' }}>👤 Nama Kasir *</label>
            <select value={cashierName} onChange={e => setCashierName(e.target.value)} className="form-select" style={{ fontSize: '0.8rem', height: '36px' }}>
              {adminList.map(a => (
                <option key={a.id} value={a.name}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 2. Pendapatan POS */}
        <div style={{ background: '#0f172a', padding: '12px', borderRadius: '10px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: '800', display: 'block', marginBottom: '2px' }}>Total Pendapatan Penjualan (Net Sales POS)</label>
            <input type="number" value={netSales} onChange={e => setNetSales(Number(e.target.value))} className="form-input" style={{ fontSize: '1rem', fontWeight: '900', color: '#34d399', height: '38px' }} />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: '800', display: 'block', marginBottom: '2px' }}>Penjualan Non-Cash (QRIS/Debit/Transfer)</label>
            <input type="number" value={nonCashSales} onChange={e => setNonCashSales(Number(e.target.value))} className="form-input" style={{ fontSize: '0.95rem', fontWeight: '800', color: '#38bdf8', height: '36px' }} />
          </div>
        </div>

        {/* 3. Pengeluaran HPP Bahan Mentah (TERBUKA MINIMAL 5 FIELD) */}
        <div style={{ background: '#0f172a', padding: '12px', borderRadius: '10px', border: '1px solid #fb7185', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#fb7185' }}>📦 HPP Bahan Mentah (Min. 5 Field)</span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Subtotal: {formatRupiah(totalCogs)}</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ color: '#94a3b8', borderBottom: '1px solid #334155', textAlign: 'left' }}>
                  <th style={{ padding: '4px' }}>Bahan Mentah</th>
                  <th style={{ padding: '4px', width: '55px' }}>Qty</th>
                  <th style={{ padding: '4px', textAlign: 'right', width: '90px' }}>Harga Satuan</th>
                  <th style={{ padding: '4px', textAlign: 'right', width: '95px' }}>Total HPP</th>
                  <th style={{ padding: '4px', textAlign: 'center', width: '30px' }}>✕</th>
                </tr>
              </thead>
              <tbody>
                {cogsRows.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '4px' }}>
                      <select value={r.name} onChange={e => handleUpdateCogsRow(r.id, 'name', e.target.value)} className="form-select" style={{ height: '30px', fontSize: '0.75rem', fontWeight: '700', color: '#fb7185' }}>
                        {ingredientsList.map(ing => (
                          <option key={ing.id} value={ing.name}>{ing.name}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '4px' }}>
                      <input type="number" value={r.qty} onChange={e => handleUpdateCogsRow(r.id, 'qty', e.target.value)} className="form-input" style={{ height: '30px', fontSize: '0.75rem', padding: '2px 4px' }} />
                    </td>
                    <td style={{ padding: '4px' }}>
                      <input type="number" value={r.price_unit} onChange={e => handleUpdateCogsRow(r.id, 'price_unit', e.target.value)} className="form-input" style={{ height: '30px', fontSize: '0.75rem', textAlign: 'right', padding: '2px 4px' }} />
                    </td>
                    <td style={{ padding: '4px', textAlign: 'right', fontWeight: '800', color: '#fb7185' }}>
                      {formatRupiah(r.amount)}
                    </td>
                    <td style={{ padding: '4px', textAlign: 'center' }}>
                      <button onClick={() => handleRemoveCogsRow(r.id)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer' }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button 
            type="button" 
            onClick={handleAddBlankCogsRow} 
            style={{
              alignSelf: 'flex-start', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#fb7185', padding: '5px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
            }}
          >
            <PlusCircle size={13} />
            <span>+ Tambah Field HPP Bahan Mentah</span>
          </button>
        </div>

        {/* 4. Biaya Operasional (TERBUKA MINIMAL 5 FIELD) */}
        <div style={{ background: '#0f172a', padding: '12px', borderRadius: '10px', border: '1px solid #38bdf8', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#38bdf8' }}>💵 Biaya Operasional (Min. 5 Field)</span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Subtotal: {formatRupiah(totalExpenseOther)}</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ color: '#94a3b8', borderBottom: '1px solid #334155', textAlign: 'left' }}>
                  <th style={{ padding: '4px' }}>Nama Akun Biaya</th>
                  <th style={{ padding: '4px', textAlign: 'right', width: '120px' }}>Nominal (IDR)</th>
                  <th style={{ padding: '4px', textAlign: 'center', width: '30px' }}>✕</th>
                </tr>
              </thead>
              <tbody>
                {expenseRows.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '4px' }}>
                      <select value={r.name} onChange={e => handleUpdateExpenseRow(r.id, 'name', e.target.value)} className="form-select" style={{ height: '30px', fontSize: '0.75rem', fontWeight: '700', color: '#38bdf8' }}>
                        {expenseMasterList.map(exp => (
                          <option key={exp.id} value={exp.name}>{exp.name}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '4px' }}>
                      <input type="number" value={r.amount} onChange={e => handleUpdateExpenseRow(r.id, 'amount', e.target.value)} className="form-input" style={{ height: '30px', fontSize: '0.75rem', textAlign: 'right', fontWeight: '700', color: '#fb7185', padding: '2px 4px' }} />
                    </td>
                    <td style={{ padding: '4px', textAlign: 'center' }}>
                      <button onClick={() => handleRemoveExpenseRow(r.id)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer' }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button 
            type="button" 
            onClick={handleAddBlankExpenseRow} 
            style={{
              alignSelf: 'flex-start', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8', padding: '5px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
            }}
          >
            <PlusCircle size={13} />
            <span>+ Tambah Field Biaya Operasional</span>
          </button>
        </div>

        {/* 5. Kalkulasi & Uang Di Laci */}
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '14px', borderRadius: '10px', border: '1px solid #6366f1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
            <span style={{ color: '#fb7185' }}>Total Pengeluaran (HPP + OPEX)</span>
            <span style={{ fontWeight: '800', color: '#fb7185' }}>-{formatRupiah(grandTotalExpense)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '800', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px' }}>
            <span style={{ color: '#818cf8' }}>Laba Kotor</span>
            <span style={{ color: grossProfit >= 0 ? '#34d399' : '#fb7185' }}>{formatRupiah(grossProfit)}</span>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: '700', display: 'block', marginBottom: '2px' }}>Pengembalian Uang Modal (Simpanan)</label>
            <input type="number" value={capitalReturn} onChange={e => setCapitalReturn(Number(e.target.value))} className="form-input" style={{ height: '34px', fontSize: '0.85rem', fontWeight: '800', color: '#fbbf24' }} />
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '10px', borderRadius: '8px', border: '1px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '800', display: 'block' }}>💵 UANG DI LACI (FISIK KAS)</span>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Fisik kas shift ditutup</span>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#34d399' }}>
              {formatRupiah(cashInDrawer)}
            </div>
          </div>
        </div>

        {/* BUTTON OPEN PREVIEW */}
        <button 
          type="button" 
          onClick={handleOpenPreviewDraft} 
          disabled={isLocked}
          className="btn-primary" 
          style={{
            padding: '12px',
            fontSize: '0.85rem',
            justifyContent: 'center',
            background: isLocked ? '#475569' : '#6366f1',
            color: isLocked ? '#94a3b8' : 'white',
            marginTop: '4px',
            cursor: isLocked ? 'not-allowed' : 'pointer',
            opacity: isLocked ? 0.6 : 1
          }}
        >
          {isLocked ? <AlertTriangle size={16} /> : <Eye size={16} />}
          <span>{isLocked ? '🔒 Laporan Terkunci (Approved/Done)' : (isPendingEdit ? '✏️ Perbarui Laporan Pending' : 'Lihat Pratinjau (Preview) & Simpan')}</span>
        </button>

      </div>

      {/* ========================================================= */}
      {/* MODAL PAPAN PREVIEW MOBILE                                */}
      {/* ========================================================= */}
      {previewingRecord && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 140, padding: '16px'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '380px', maxHeight: '90vh', overflowY: 'auto',
            padding: '20px', background: '#1e293b', border: '1px solid #6366f1', borderRadius: '16px'
          }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '10px', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '900', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Eye size={18} color="#6366f1" />
                <span>Pratinjau Shift Closing Kasir</span>
              </h3>
              <button onClick={() => setPreviewingRecord(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.78rem' }}>
              
              <div style={{ background: '#0f172a', padding: '10px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><span style={{ color: '#94a3b8' }}>Outlet:</span> <strong style={{ color: '#f8fafc' }}>🏢 {previewingRecord.branch_name}</strong></div>
                <div><span style={{ color: '#94a3b8' }}>Tanggal:</span> <strong style={{ color: '#f8fafc' }}>📅 {previewingRecord.date}</strong></div>
                <div><span style={{ color: '#94a3b8' }}>Kasir:</span> <strong style={{ color: '#818cf8' }}>👤 {previewingRecord.author_name}</strong></div>
              </div>

              <div style={{ background: '#0f172a', padding: '10px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34d399' }}>
                  <span>Net Sales POS</span>
                  <span style={{ fontWeight: '800' }}>+{formatRupiah(previewingRecord.net_sales)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8', paddingLeft: '8px', fontSize: '0.72rem' }}>
                  <span>• Non-Cash (QRIS/Debit)</span>
                  <span>{formatRupiah(previewingRecord.non_cash_sales)}</span>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', color: '#fb7185' }}>
                  <span>Total Pengeluaran</span>
                  <span style={{ fontWeight: '800' }}>-{formatRupiah(previewingRecord.total_expense)}</span>
                </div>

                <div style={{ borderTop: '1px solid #334155', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: '800' }}>
                  <span style={{ color: '#818cf8' }}>Laba Kotor</span>
                  <span style={{ color: ((previewingRecord.net_sales || 0) - (previewingRecord.total_expense || 0)) >= 0 ? '#34d399' : '#fb7185' }}>
                    {formatRupiah((previewingRecord.net_sales || 0) - (previewingRecord.total_expense || 0))}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fbbf24', fontSize: '0.75rem' }}>
                  <span>(-) Pengembalian Uang Modal</span>
                  <span>-{formatRupiah(previewingRecord.debt_payment)}</span>
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '8px', borderRadius: '6px', border: '1px solid #10b981', display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                  <span style={{ fontWeight: '800', color: '#34d399' }}>💵 UANG DI LACI</span>
                  <span style={{ fontWeight: '900', color: '#34d399' }}>{formatRupiah(previewingRecord.cash_physical)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button 
                  type="button" 
                  onClick={() => setPreviewingRecord(null)} 
                  className="btn-secondary" 
                  style={{ flex: 1, justifyContent: 'center', padding: '8px', fontSize: '0.78rem' }}
                >
                  <Edit3 size={14} />
                  <span>Edit</span>
                </button>

                <button 
                  type="button" 
                  onClick={handleFinalSubmit} 
                  className="btn-primary" 
                  style={{ flex: 1, justifyContent: 'center', padding: '8px', fontSize: '0.78rem', background: '#10b981', color: 'white' }}
                >
                  <CheckCircle2 size={14} />
                  <span>Simpan Laporan</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
