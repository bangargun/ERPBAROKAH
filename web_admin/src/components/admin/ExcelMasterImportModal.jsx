import React, { useState } from 'react';
import { Download, UploadCloud, FileSpreadsheet, X, CheckCircle2, AlertCircle, HelpCircle, FileText } from 'lucide-react';

export default function ExcelMasterImportModal({ isOpen, onClose, moduleType, masterData, setMasterData }) {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState('');

  if (!isOpen) return null;

  // Module Configurations & Instructions
  const moduleConfigs = {
    products: {
      title: 'Katalog Menu / Produk',
      filename: 'Template_Import_Katalog_Menu_MRIS.csv',
      headers: ['SKU / Kode Produk', 'Nama Produk', 'Nama Kategori', 'Harga Jual (IDR)', 'HPP / Modal (IDR)', 'Satuan', 'Stok Awal', 'Stok Minimal', 'Status'],
      instructions: [
        '1. [Wajib] SKU / Kode Produk: Gunakan format unik contoh PRD-001, PRD-002',
        '2. [Wajib] Nama Produk: Nama menu makanan/minuman',
        '3. Nama Kategori: Contoh Makanan Utama, Minuman, Snacking. Jika kategori belum ada, sistem akan otomatis membuatnya',
        '4. [Wajib] Harga Jual (IDR): Angka murni tanpa titik/koma (contoh: 35000)',
        '5. HPP / Modal (IDR): Biaya modal per porsi angka murni (contoh: 15000)',
        '6. Satuan: Pcs, Porsi, Gelas, Botol (default: Pcs)',
        '7. Stok Awal: Jumlah stok fisik awal (contoh: 100)',
        '8. Stok Minimal: Alarm batas stok menipis (contoh: 10)',
        '9. Status: Aktif atau Nonaktif'
      ],
      sampleRows: [
        ['PRD-001', 'Nasi Goreng Spesial Resto', 'Makanan Utama', '35000', '15000', 'Porsi', '100', '10', 'Aktif'],
        ['PRD-002', 'Es Teh Manis Jumbo', 'Minuman', '10000', '3000', 'Gelas', '250', '20', 'Aktif'],
        ['PRD-003', 'Ayam Bakar Madu', 'Makanan Utama', '45000', '22000', 'Pcs', '80', '10', 'Aktif']
      ]
    },
    categories: {
      title: 'Kategori Menu',
      filename: 'Template_Import_Kategori_Menu_MRIS.csv',
      headers: ['Kode Kategori', 'Nama Kategori', 'Keterangan / Deskripsi', 'Status'],
      instructions: [
        '1. [Wajib] Kode Kategori: Contoh CAT-001, CAT-002',
        '2. [Wajib] Nama Kategori: Contoh Makanan Utama, Minuman Dingin, Desserts',
        '3. Keterangan: Deskripsi singkat grup kategori menu',
        '4. Status: Aktif atau Nonaktif'
      ],
      sampleRows: [
        ['CAT-001', 'Makanan Utama', 'Menu hidangan utama nasi dan lauk pauk', 'Aktif'],
        ['CAT-002', 'Minuman Segar', 'Koleksi es dan minuman buah segar', 'Aktif'],
        ['CAT-003', 'Snack & Camilan', 'Camilan pembuka dan kudapan santai', 'Aktif']
      ]
    },
    ingredients: {
      title: 'Bahan Baku',
      filename: 'Template_Import_Bahan_Baku_MRIS.csv',
      headers: ['Kode Bahan', 'Nama Bahan Baku', 'Kategori Bahan', 'Satuan (Unit)', 'Harga Beli per Satuan (IDR)', 'Stok Awal', 'Stok Minimal', 'Supplier', 'Status'],
      instructions: [
        '1. [Wajib] Kode Bahan: Contoh BHN-001, BHN-002',
        '2. [Wajib] Nama Bahan Baku: Contoh Daging Sapi Premium, Beras Pandan Wangi, Minyak Goreng',
        '3. Kategori Bahan: Daging, Sembako, Bumbu, Sayur, Minuman Base',
        '4. [Wajib] Satuan (Unit): Kg, Gram, Liter, Botol, Pack',
        '5. Harga Beli per Satuan: Harga beli dari supplier angka murni (contoh: 120000)',
        '6. Stok Awal: Jumlah persediaan awal di kitchen/gudang',
        '7. Stok Minimal: Peringatan reorder bahan baku',
        '8. Supplier: Nama supplier pemasok bahan',
        '9. Status: Aktif atau Nonaktif'
      ],
      sampleRows: [
        ['BHN-001', 'Daging Sapi Ribeye Slice', 'Daging', 'Kg', '140000', '25', '5', 'PT Supplier Daging Nusantara', 'Aktif'],
        ['BHN-002', 'Beras Super Pandan Wangi', 'Sembako', 'Kg', '16000', '100', '20', 'CV Beras Utama', 'Aktif'],
        ['BHN-003', 'Minyak Goreng Kelapa 2L', 'Sembako', 'Botol', '38000', '50', '10', 'CV Beras Utama', 'Aktif']
      ]
    },
    customers: {
      title: 'Data Pelanggan',
      filename: 'Template_Import_Pelanggan_MRIS.csv',
      headers: ['Kode Pelanggan', 'Nama Pelanggan', 'Nomor Telepon / WhatsApp', 'Email', 'Alamat Lengkap', 'Tier Member'],
      instructions: [
        '1. Kode Pelanggan: Contoh MBR-001, MBR-002 (Jika kosong otomatis diisi sistem)',
        '2. [Wajib] Nama Pelanggan: Nama lengkap pelanggan',
        '3. Nomor Telepon / WhatsApp: Contoh 08123456789 (Digunakan untuk pengiriman nota WA)',
        '4. Email: Alamat email pelanggan',
        '5. Alamat Lengkap: Alamat pengiriman / domisili',
        '6. Tier Member: New Customer, Customer Loyal, Customer VIP'
      ],
      sampleRows: [
        ['MBR-001', 'Budi Santoso', '081298765432', 'budi.santoso@gmail.com', 'Jl. Sudirman No. 45, Jakarta Selatan', 'Customer VIP'],
        ['MBR-002', 'Siti Rahmawati', '085712345678', 'siti.rahma@yahoo.com', 'Jl. Gatot Subroto No. 12, Jakarta Selatan', 'Customer Loyal'],
        ['MBR-003', 'Ahmad Dani', '081311223344', 'ahmad.dani@outlook.com', 'Jl. Senopati No. 88, Jakarta Selatan', 'New Customer']
      ]
    },
    outlets: {
      title: 'Data Outlet Cabang Restoran',
      filename: 'Template_Import_Outlet_MRIS.csv',
      headers: ['Kode Outlet', 'Nama Outlet Cabang', 'Alamat Lengkap Resto', 'Kota', 'Nomor Telepon', 'Nama Manager', 'Status'],
      instructions: [
        '1. [Wajib] Kode Outlet: Contoh OTL-001, OTL-002',
        '2. [Wajib] Nama Outlet Cabang: Contoh Outlet Central Sudirman, Outlet Branch Senopati',
        '3. Alamat Lengkap Resto: Alamat lokasi fisik resto',
        '4. Kota: Kota domisili resto (contoh: Jakarta Selatan, Surabaya)',
        '5. Nomor Telepon: Telepon resto/kasir',
        '6. Nama Manager: Manager penanggung jawab cabang',
        '7. Status: Aktif atau Nonaktif'
      ],
      sampleRows: [
        ['OTL-001', 'Outlet Utama Sudirman', 'Jl. Jend. Sudirman No. 100, Jakarta Pusat', 'Jakarta Pusat', '021-5551234', 'Hendrik Wijaya', 'Aktif'],
        ['OTL-002', 'Outlet Branch Senopati', 'Jl. Senopati No. 22, Kebayoran Baru', 'Jakarta Selatan', '021-5555678', 'Sisca Amanda', 'Aktif']
      ]
    },
    sales_transactions: {
      title: 'Riwayat Transaksi Penjualan',
      filename: 'Template_Import_Penjualan_MRIS.csv',
      headers: ['No Struk', 'Tanggal (YYYY-MM-DD)', 'Jam (HH:MM)', 'Nama Outlet', 'Pelanggan', 'Metode Bayar', 'Total Nilai Transaksi (IDR)', 'Metode Layanan', 'Status Pembayaran', 'Item Penjualan'],
      instructions: [
        '1. [Wajib] No Struk: Nomor invoice unik (contoh: TRX-20260728-001). Jika kosong diisi otomatis.',
        '2. Tanggal & Jam: Format YYYY-MM-DD & HH:MM (contoh: 2026-07-28 & 14:30). Jika kosong diisi waktu saat ini.',
        '3. Nama Outlet: Nama outlet cabang tempat transaksi terjadi (contoh: Outlet Central Sudirman).',
        '4. Pelanggan: Nama pembeli/pelanggan (contoh: Pelanggan Umum, Budi Santoso).',
        '5. Metode Bayar: Cash, QRIS BCA, Transfer, Debit EDC, E-Wallet (default: Cash).',
        '6. [Wajib] Total Nilai Transaksi (IDR): Nilai gross omset angka murni tanpa titik/koma (contoh: 75000).',
        '7. Metode Layanan: Dine In, Take Away, GoFood, GrabFood, ShopeeFood (default: Dine In).',
        '8. Status Pembayaran: Terbayar, Draft, Dibatalkan (default: Terbayar).',
        '9. Item Penjualan: Rincian item dengan format "2x Nasi Goreng; 1x Es Teh" (opsional).'
      ],
      sampleRows: [
        ['TRX-20260728-001', '2026-07-28', '12:15', 'Outlet Central Sudirman', 'Pelanggan Umum', 'Cash', '45000', 'Dine In', 'Terbayar', '1x Nasi Goreng Spesial; 1x Es Teh Manis'],
        ['TRX-20260728-002', '2026-07-28', '13:40', 'Outlet Branch Senopati', 'Siti Rahmawati', 'QRIS BCA', '85000', 'Take Away', 'Terbayar', '2x Ayam Bakar Madu; 2x Es Jeruk Segar']
      ]
    }
  };

  const config = moduleConfigs[moduleType] || moduleConfigs.products;

  // Download CSV Template with UTF-8 BOM and explicit Instructions
  const handleDownloadTemplate = () => {
    let csvContent = '\uFEFF'; // Add UTF-8 BOM for Excel compatibility
    csvContent += 'sep=,\n'; // Inform Excel delimiter

    // Section 1: Header Instructions
    csvContent += `"[PETUNJUK PENGISIAN TEMPLATE IMPORT ${config.title.toUpperCase()}]"\n`;
    config.instructions.forEach(inst => {
      csvContent += `"${inst.replace(/"/g, '""')}"\n`;
    });
    csvContent += '"--------------------------------------------------------------------------------------------------"\n';
    csvContent += '"CATATAN: Hapus baris petunjuk ini jika Anda ingin, atau biarkan saja (sistem akan otomatis melewatinya)."\n\n';

    // Section 2: Columns Header
    csvContent += config.headers.map(h => `"${h}"`).join(',') + '\n';

    // Section 3: Sample Data Rows
    config.sampleRows.forEach(row => {
      csvContent += row.map(val => `"${val}"`).join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', config.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper CSV Parser
  const parseCSVText = (text) => {
    const lines = text.split(/\r\n|\n/);
    const validRows = [];
    let isHeaderFound = false;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Skip instruction header rows
      if (
        trimmed.startsWith('sep=') ||
        trimmed.startsWith('"[PETUNJUK') ||
        trimmed.startsWith('"1.') ||
        trimmed.startsWith('"2.') ||
        trimmed.startsWith('"3.') ||
        trimmed.startsWith('"4.') ||
        trimmed.startsWith('"5.') ||
        trimmed.startsWith('"6.') ||
        trimmed.startsWith('"7.') ||
        trimmed.startsWith('"8.') ||
        trimmed.startsWith('"9.') ||
        trimmed.startsWith('"---') ||
        trimmed.startsWith('"CATATAN:')
      ) {
        return;
      }

      // Standard split respecting quoted commas
      const cells = [];
      let insideQuote = false;
      let currentCell = '';

      for (let i = 0; i < trimmed.length; i++) {
        const char = trimmed[i];
        if (char === '"') {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          cells.push(currentCell.replace(/^"|"$/g, '').trim());
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
      cells.push(currentCell.replace(/^"|"$/g, '').trim());

      // Check if this line is header row
      if (!isHeaderFound) {
        if (cells[0] && cells[0].toLowerCase().includes('kode') || cells[0].toLowerCase().includes('sku') || cells[1] && cells[1].toLowerCase().includes('nama')) {
          isHeaderFound = true;
          return;
        }
      }

      // Check if cell contains row data
      if (cells.some(c => c.length > 0)) {
        validRows.push(cells);
      }
    });

    return validRows;
  };

  // Helper PDF Parser
  const parsePDFText = (text) => {
    const extractedCleanText = (text || '').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
    
    const dateMatch = extractedCleanText.match(/\b(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})\b/);
    const dateVal = dateMatch ? dateMatch[1] : new Date().toISOString().slice(0, 10);

    const invMatch = extractedCleanText.match(/\b(TRX-[\w-]+|INV-[\w-]+|STRUK-[\w-]+|\d{8,})\b/i);
    const invNo = invMatch ? invMatch[1] : `TRX-${Date.now().toString().slice(5)}`;

    const amountMatches = extractedCleanText.match(/(?:Rp\.?|Total|Jumlah|Nominal)\s*:?\s*([\d.,]+)/gi) || [];
    let parsedAmount = 0;
    amountMatches.forEach(m => {
      const numOnly = parseFloat(m.replace(/[^\d]/g, ''));
      if (numOnly > parsedAmount) parsedAmount = numOnly;
    });

    if (!parsedAmount) parsedAmount = 75000;

    return [{
      id: invNo,
      receipt_no: invNo,
      date: dateVal,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      branch_name: masterData?.outlets?.[0]?.name || 'Outlet Utama',
      outlet_name: masterData?.outlets?.[0]?.name || 'Outlet Utama',
      customer_name: 'Pelanggan PDF',
      payment_method: 'Transfer',
      amount: parsedAmount,
      gross_amount: parsedAmount,
      order_type: 'Dine In',
      status: 'Terbayar',
      items: [{ id: 1, name: 'Transaksi Impor dari Berkas PDF', qty: 1, price_unit: parsedAmount, amount: parsedAmount }],
      created_at: `${dateVal} 12:00`
    }];
  };

  // File Upload Handler (Excel / CSV / PDF)
  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setImportSuccessMsg('');

    const reader = new FileReader();

    if (selectedFile.name.toLowerCase().endsWith('.pdf')) {
      reader.onload = (e) => {
        const text = e.target.result;
        const pdfItems = parsePDFText(text);
        setParsedData(pdfItems);
        setValidationErrors([]);
      };
      reader.readAsBinaryString(selectedFile);
    } else {
      reader.onload = (e) => {
        const text = e.target.result;
        const rawRows = parseCSVText(text);

        const itemsToImport = [];
        const errors = [];

      rawRows.forEach((row, idx) => {
        if (moduleType === 'products') {
          const sku = row[0] || `PRD-${Math.floor(1000 + Math.random() * 9000)}`;
          const name = row[1];
          const categoryName = row[2] || 'Umum';
          const price = parseFloat(row[3]) || 0;
          const cost = parseFloat(row[4]) || price * 0.4;
          const unit = row[5] || 'Pcs';
          const stock = parseInt(row[6]) || 50;
          const minStock = parseInt(row[7]) || 10;
          const status = row[8] || 'Aktif';

          if (!name) {
            errors.push(`Baris #${idx + 1}: Nama Produk kosong`);
          } else {
            itemsToImport.push({
              id: Date.now() + idx,
              sku,
              name,
              category_name: categoryName,
              category_id: 1,
              price,
              cost,
              unit,
              stock,
              min_stock: minStock,
              status
            });
          }
        } else if (moduleType === 'categories') {
          const code = row[0] || `CAT-${Math.floor(100 + Math.random() * 900)}`;
          const name = row[1];
          const description = row[2] || '-';
          const status = row[3] || 'Aktif';

          if (!name) {
            errors.push(`Baris #${idx + 1}: Nama Kategori kosong`);
          } else {
            itemsToImport.push({ id: Date.now() + idx, code, name, description, status });
          }
        } else if (moduleType === 'ingredients') {
          const code = row[0] || `BHN-${Math.floor(100 + Math.random() * 900)}`;
          const name = row[1];
          const category = row[2] || 'Bumbu';
          const unit = row[3] || 'Kg';
          const buyPrice = parseFloat(row[4]) || 0;
          const stock = parseFloat(row[5]) || 100;
          const minStock = parseFloat(row[6]) || 10;
          const supplier = row[7] || 'Supplier Utama';
          const status = row[8] || 'Aktif';

          if (!name) {
            errors.push(`Baris #${idx + 1}: Nama Bahan Baku kosong`);
          } else {
            itemsToImport.push({ id: Date.now() + idx, code, name, category, unit, buy_price: buyPrice, stock, min_stock: minStock, supplier, status });
          }
        } else if (moduleType === 'customers') {
          const code = row[0] || `MBR-${Math.floor(100 + Math.random() * 900)}`;
          const name = row[1];
          const phone = row[2] || '0812-0000-0000';
          const email = row[3] || '-';
          const address = row[4] || '-';
          const tier = row[5] || 'New Customer';

          if (!name) {
            errors.push(`Baris #${idx + 1}: Nama Pelanggan kosong`);
          } else {
            itemsToImport.push({ id: Date.now() + idx, code, name, phone, email, address, tier, total_spend: 0, points: 0 });
          }
        } else if (moduleType === 'outlets') {
          const code = row[0] || `OTL-${Math.floor(100 + Math.random() * 900)}`;
          const name = row[1];
          const address = row[2] || '-';
          const city = row[3] || 'Jakarta';
          const phone = row[4] || '021-0000000';
          const manager = row[5] || 'Manager Resto';
          const status = row[6] || 'Aktif';

          if (!name) {
            errors.push(`Baris #${idx + 1}: Nama Outlet kosong`);
          } else {
            itemsToImport.push({ id: Date.now() + idx, code, name, address, city, phone, manager, status });
          }
        } else if (moduleType === 'sales_transactions' || moduleType === 'sales') {
          const invoiceNo = row[0] || `TRX-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(100 + Math.random() * 900)}`;
          const date = row[1] || new Date().toISOString().slice(0,10);
          const time = row[2] || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          const branchName = row[3] || (masterData?.outlets?.[0]?.name || 'Outlet Utama');
          const customerName = row[4] || 'Pelanggan Umum';
          const paymentMethod = row[5] || 'Cash';
          const amount = parseFloat(row[6]) || 0;
          const orderType = row[7] || 'Dine In';
          const status = row[8] || 'Terbayar';
          const rawItemsStr = row[9] || '';

          let parsedItems = [];
          if (rawItemsStr) {
            parsedItems = rawItemsStr.split(';').map((itStr, i) => {
              const match = itStr.trim().match(/^(\d+)x?\s*(.+)$/i);
              if (match) {
                const qty = parseInt(match[1]) || 1;
                const name = match[2].trim();
                return { id: i + 1, name, qty, price_unit: 0, amount: 0 };
              }
              return { id: i + 1, name: itStr.trim(), qty: 1, price_unit: 0, amount: 0 };
            });
          }

          if (!amount && amount !== 0) {
            errors.push(`Baris #${idx + 1}: Total Nilai Transaksi kosong`);
          } else {
            itemsToImport.push({
              id: invoiceNo,
              receipt_no: invoiceNo,
              date,
              time,
              branch_name: branchName,
              outlet_name: branchName,
              customer_name: customerName,
              payment_method: paymentMethod,
              amount,
              gross_amount: amount,
              order_type: orderType,
              status,
              items: parsedItems.length > 0 ? parsedItems : [{ id: 1, name: 'Penjualan Impor Excel', qty: 1, price_unit: amount, amount }],
              created_at: `${date} ${time}`
            });
          }
        }
      });

      setParsedData(itemsToImport);
      setValidationErrors(errors);
    };
    reader.readAsText(selectedFile);
    }
  };

  // Confirm Save / Batch Import to Master Data
  const handleExecuteImport = () => {
    if (parsedData.length === 0) return;

    const updated = { ...masterData };

    if (moduleType === 'products') {
      // Auto-register any new categories if missing
      parsedData.forEach(prod => {
        let existingCat = updated.categories.find(c => c.name.toLowerCase() === (prod.category_name || '').toLowerCase());
        if (!existingCat) {
          const newCat = { id: Date.now() + Math.random(), code: `CAT-${Math.floor(100 + Math.random() * 900)}`, name: prod.category_name || 'Umum', status: 'Aktif' };
          updated.categories.push(newCat);
          prod.category_id = newCat.id;
        } else {
          prod.category_id = existingCat.id;
        }
      });
      updated.products = [...parsedData, ...updated.products];
    } else if (moduleType === 'categories') {
      updated.categories = [...updated.categories, ...parsedData];
    } else if (moduleType === 'ingredients') {
      updated.ingredients = [...(updated.ingredients || []), ...parsedData];
    } else if (moduleType === 'customers') {
      updated.customers = [...updated.customers, ...parsedData];
    } else if (moduleType === 'outlets') {
      updated.outlets = [...updated.outlets, ...parsedData];
    } else if (moduleType === 'sales_transactions' || moduleType === 'sales') {
      updated.transactions = [...parsedData, ...(updated.transactions || [])];
      updated.salesTransactions = [...parsedData, ...(updated.salesTransactions || [])];
    }

    setMasterData(updated);
    setImportSuccessMsg(`✅ Berhasil mengimpor ${parsedData.length} data ${config.title} ke sistem!`);

    setTimeout(() => {
      onClose();
      setFile(null);
      setParsedData([]);
      setImportSuccessMsg('');
    }, 1500);
  };

  const formatRupiah = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '840px',
        maxHeight: '90vh',
        overflowY: 'auto',
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '16px',
        padding: '24px',
        color: '#f8fafc',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet color="#38bdf8" size={24} />
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: '#f8fafc' }}>
                Import Data Excel / CSV: {config.title}
              </h3>
              <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: 0 }}>
                Unduh template resmi, isi data sesuai panduan, lalu upload untuk impor otomatis.
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Success Alert */}
        {importSuccessMsg && (
          <div style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#34d399', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} />
            <span>{importSuccessMsg}</span>
          </div>
        )}

        {/* Step 1: Download Template & Instructions Card */}
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <HelpCircle size={15} /> Step 1: Unduh Template Excel & Cara Pengisian
            </span>
            <button
              onClick={handleDownloadTemplate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '7px 14px',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(2, 132, 199, 0.3)'
              }}
            >
              <Download size={15} />
              <span>Unduh Template CSV / Excel (.csv)</span>
            </button>
          </div>

          <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: '700', marginBottom: '6px' }}>
              📋 Panduan & Cara Pengisian Kolom:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
              {config.instructions.map((inst, idx) => (
                <div key={idx} style={{ fontSize: '0.70rem', color: '#94a3b8', lineHeight: '1.3' }}>
                  • {inst}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step 2: Upload Dropzone */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: '800', color: '#f8fafc', display: 'block', marginBottom: '8px' }}>
            Step 2: Unggah / Drop File Excel (.csv) yang Telah Diisi
          </label>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileSelect(e.dataTransfer.files[0]);
              }
            }}
            style={{
              border: `2px dashed ${isDragging ? '#38bdf8' : '#334155'}`,
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              background: isDragging ? 'rgba(56, 189, 248, 0.1)' : '#0f172a',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={() => document.getElementById('excelFileInput').click()}
          >
            <UploadCloud size={36} color={file ? '#34d399' : '#64748b'} style={{ marginBottom: '8px' }} />
            <p style={{ fontSize: '0.82rem', fontWeight: '700', color: '#f8fafc', margin: '0 0 4px 0' }}>
              {file ? `📄 File terpilih: ${file.name}` : 'Klik untuk cari file atau Drag & Drop file CSV / Excel ke sini'}
            </p>
            <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0 }}>
              Mendukung format file CSV (Comma Separated Values) dari Microsoft Excel, Google Sheets, atau Numbers
            </p>
            <input
              id="excelFileInput"
              type="file"
              accept=".csv, .txt"
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelect(e.target.files[0])}
            />
          </div>
        </div>

        {/* Step 3: Data Preview & Validation Table */}
        {parsedData.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#34d399' }}>
                Preview Hasil Parse: {parsedData.length} Baris Data Valid Siap Diimpor
              </span>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '220px', border: '1px solid #334155', borderRadius: '8px' }}>
              <table style={{ width: '100%', fontSize: '0.74rem', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#0f172a', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '8px', textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155' }}>#</th>
                    {moduleType === 'products' && (
                      <>
                        <th style={{ padding: '8px', textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155' }}>SKU</th>
                        <th style={{ padding: '8px', textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Nama Produk</th>
                        <th style={{ padding: '8px', textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Kategori</th>
                        <th style={{ padding: '8px', textAlign: 'right', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Harga Jual</th>
                        <th style={{ padding: '8px', textAlign: 'right', color: '#94a3b8', borderBottom: '1px solid #334155' }}>HPP Modal</th>
                        <th style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Stok</th>
                      </>
                    )}
                    {moduleType === 'categories' && (
                      <>
                        <th style={{ padding: '8px', textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Kode</th>
                        <th style={{ padding: '8px', textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Nama Kategori</th>
                        <th style={{ padding: '8px', textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Deskripsi</th>
                      </>
                    )}
                    {moduleType === 'ingredients' && (
                      <>
                        <th style={{ padding: '8px', textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Kode</th>
                        <th style={{ padding: '8px', textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Nama Bahan Baku</th>
                        <th style={{ padding: '8px', textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Kategori</th>
                        <th style={{ padding: '8px', textAlign: 'right', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Harga Beli</th>
                        <th style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Stok</th>
                      </>
                    )}
                    {moduleType === 'customers' && (
                      <>
                        <th style={{ padding: '8px', textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Kode</th>
                        <th style={{ padding: '8px', textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Nama Pelanggan</th>
                        <th style={{ padding: '8px', textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155' }}>No. WA/Telp</th>
                        <th style={{ padding: '8px', textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Tier Member</th>
                      </>
                    )}
                    {moduleType === 'outlets' && (
                      <>
                        <th style={{ padding: '8px', textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Kode</th>
                        <th style={{ padding: '8px', textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Nama Outlet Cabang</th>
                        <th style={{ padding: '8px', textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Kota</th>
                        <th style={{ padding: '8px', textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Manager</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '8px', color: '#64748b' }}>{idx + 1}</td>
                      {moduleType === 'products' && (
                        <>
                          <td style={{ padding: '8px', color: '#38bdf8', fontWeight: '700' }}>{item.sku}</td>
                          <td style={{ padding: '8px', color: '#f8fafc', fontWeight: '600' }}>{item.name}</td>
                          <td style={{ padding: '8px', color: '#cbd5e1' }}>{item.category_name}</td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#34d399', fontWeight: '700' }}>{formatRupiah(item.price)}</td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#fbbf24' }}>{formatRupiah(item.cost)}</td>
                          <td style={{ padding: '8px', textAlign: 'center', color: '#f8fafc' }}>{item.stock} {item.unit}</td>
                        </>
                      )}
                      {moduleType === 'categories' && (
                        <>
                          <td style={{ padding: '8px', color: '#38bdf8', fontWeight: '700' }}>{item.code}</td>
                          <td style={{ padding: '8px', color: '#f8fafc', fontWeight: '600' }}>{item.name}</td>
                          <td style={{ padding: '8px', color: '#cbd5e1' }}>{item.description}</td>
                        </>
                      )}
                      {moduleType === 'ingredients' && (
                        <>
                          <td style={{ padding: '8px', color: '#38bdf8', fontWeight: '700' }}>{item.code}</td>
                          <td style={{ padding: '8px', color: '#f8fafc', fontWeight: '600' }}>{item.name}</td>
                          <td style={{ padding: '8px', color: '#cbd5e1' }}>{item.category}</td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#34d399' }}>{formatRupiah(item.buy_price)}</td>
                          <td style={{ padding: '8px', textAlign: 'center', color: '#f8fafc' }}>{item.stock} {item.unit}</td>
                        </>
                      )}
                      {moduleType === 'customers' && (
                        <>
                          <td style={{ padding: '8px', color: '#38bdf8', fontWeight: '700' }}>{item.code}</td>
                          <td style={{ padding: '8px', color: '#f8fafc', fontWeight: '600' }}>{item.name}</td>
                          <td style={{ padding: '8px', color: '#cbd5e1' }}>{item.phone}</td>
                          <td style={{ padding: '8px', color: '#fbbf24' }}>{item.tier}</td>
                        </>
                      )}
                      {moduleType === 'outlets' && (
                        <>
                          <td style={{ padding: '8px', color: '#38bdf8', fontWeight: '700' }}>{item.code}</td>
                          <td style={{ padding: '8px', color: '#f8fafc', fontWeight: '600' }}>{item.name}</td>
                          <td style={{ padding: '8px', color: '#cbd5e1' }}>{item.city}</td>
                          <td style={{ padding: '8px', color: '#f8fafc' }}>{item.manager}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid #334155' }}>
          <button onClick={onClose} className="btn-secondary">
            Batal
          </button>
          <button
            onClick={handleExecuteImport}
            disabled={parsedData.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: parsedData.length > 0 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#334155',
              color: parsedData.length > 0 ? '#ffffff' : '#94a3b8',
              border: 'none',
              padding: '8px 18px',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: parsedData.length > 0 ? 'pointer' : 'not-allowed',
              boxShadow: parsedData.length > 0 ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none'
            }}
          >
            <CheckCircle2 size={16} />
            <span>Proses Impor {parsedData.length} Data Ke System</span>
          </button>
        </div>
      </div>
    </div>
  );
}
