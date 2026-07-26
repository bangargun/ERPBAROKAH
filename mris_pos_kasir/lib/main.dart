import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

void main() {
  runApp(const MRISPosApp());
}

class MRISPosApp extends StatelessWidget {
  const MRISPosApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MRIS POS Kasir Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        primaryColor: const Color(0xFF6366F1),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF6366F1),
          secondary: Color(0xFF10B981),
          surface: Color(0xFF1E293B),
        ),
        fontFamily: 'Roboto',
      ),
      home: const MainPosContainer(),
    );
  }
}

// -----------------------------------------------------------------------------
// DATA MODELS
// -----------------------------------------------------------------------------
class OutletBranch {
  final int id;
  final String name;
  final String code;
  final String address;

  OutletBranch({required this.id, required this.name, required this.code, required this.address});
}

class ProductItem {
  final String id;
  final String name;
  final String category;
  final double price;
  final int outletId;

  ProductItem({required this.id, required this.name, required this.category, required this.price, required this.outletId});
}

class CartItem {
  final ProductItem product;
  int qty;

  CartItem({required this.product, this.qty = 1});

  double get subtotal => product.price * qty;
}

class PosTransaction {
  final String id;
  final DateTime timestamp;
  final String outletName;
  final String customerName;
  final String orderType;
  final List<CartItem> items;
  final double totalAmount;
  final String paymentMethod;
  final String cashierName;

  PosTransaction({
    required this.id,
    required this.timestamp,
    required this.outletName,
    required this.customerName,
    required this.orderType,
    required this.items,
    required this.totalAmount,
    required this.paymentMethod,
    required this.cashierName,
  });
}

// -----------------------------------------------------------------------------
// MAIN POS STATE CONTAINER
// -----------------------------------------------------------------------------
class MainPosContainer extends StatefulWidget {
  const MainPosContainer({super.key});

  @override
  State<MainPosContainer> createState() => _MainPosContainerState();
}

class _MainPosContainerState extends State<MainPosContainer> {
  // Current View Screen: 'login' | 'shift_open' | 'pos_register' | 'shift_close' | 'history' | 'sop'
  String _currentView = 'login';

  final List<OutletBranch> _outlets = [
    OutletBranch(id: 1, name: 'Restoran Senopati (HQ)', code: 'SNP-01', address: 'Jl. Senopati No. 45, Jakarta Selatan'),
    OutletBranch(id: 2, name: 'Restoran Kemang', code: 'KMG-02', address: 'Jl. Kemang Raya No. 12, Jakarta Selatan'),
    OutletBranch(id: 3, name: 'Restoran PIK Avenue', code: 'PIK-03', address: 'PIK Avenue Mall Lt. 2, Jakarta Utara'),
  ];

  OutletBranch? _selectedOutlet;
  final String _cashierName = 'Kasir';
  double _initialShiftCash = 0;
  DateTime? _shiftStartTime;

  final List<String> _categories = ['Semua', 'Makanan Utama', 'Minuman', 'Snack & Dessert'];

  final List<ProductItem> _allProducts = [];

  final List<CartItem> _cart = [];
  final List<PosTransaction> _completedTransactions = [];
  String _selectedCategory = 'Semua';
  final String _customerName = 'Pelanggan Umum (Guest)';
  String _orderType = 'Dine In';

  final NumberFormat _currencyFormatter = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  double get _cartTotal => _cart.fold(0, (sum, item) => sum + item.subtotal);

  @override
  void initState() {
    super.initState();
    if (_outlets.isNotEmpty) {
      _selectedOutlet = _outlets[0];
    }
  }

  void _processPayment(String paymentMethod) {
    if (_cart.isEmpty) return;

    final tx = PosTransaction(
      id: 'POS-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
      timestamp: DateTime.now(),
      outletName: _selectedOutlet?.name ?? 'Outlet',
      customerName: _customerName,
      orderType: _orderType,
      items: List.from(_cart),
      totalAmount: _cartTotal,
      paymentMethod: paymentMethod,
      cashierName: _cashierName,
    );

    setState(() {
      _completedTransactions.insert(0, tx);
      _cart.clear();
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('✅ Pembayaran Berhasil! Struk #${tx.id} Dicetak.'),
        backgroundColor: const Color(0xFF10B981),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // WORKFLOW 1: PAIRING & LOGIN KASIR
  // ---------------------------------------------------------------------------
  Widget _buildLoginView() {
    final pinController = TextEditingController(text: '');
    return Scaffold(
      body: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 420),
          padding: const EdgeInsets.all(28.0),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white10),
            boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 20)],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: const BoxDecoration(color: Color(0xFF6366F1), shape: BoxShape.circle),
                child: const Icon(Icons.point_of_sale, size: 40, color: Colors.white),
              ),
              const SizedBox(height: 16),
              const Text('MRIS POS KASIR', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
              const Text('Terminal Android POS Mobile v2.4', style: TextStyle(fontSize: 12, color: Colors.grey)),
              const SizedBox(height: 24),
              DropdownButtonFormField<OutletBranch>(
                initialValue: _selectedOutlet,
                decoration: const InputDecoration(
                  labelText: 'Pilih Outlet Cabang',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.store),
                ),
                items: _outlets.map((o) => DropdownMenuItem(value: o, child: Text(o.name))).toList(),
                onChanged: (val) => setState(() => _selectedOutlet = val),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: pinController,
                obscureText: true,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Masukkan PIN Kasir',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.lock),
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6366F1),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () {
                    setState(() {
                      _currentView = 'shift_open';
                    });
                  },
                  icon: const Icon(Icons.login, color: Colors.white),
                  label: const Text('LOGIN KASIR', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // WORKFLOW 2: BUKA SHIFT KASIR (MODAL AWAL)
  // ---------------------------------------------------------------------------
  Widget _buildShiftOpenView() {
    final cashController = TextEditingController(text: '');
    return Scaffold(
      body: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 420),
          padding: const EdgeInsets.all(28.0),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white10),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.storefront, size: 48, color: Color(0xFF10B981)),
              const SizedBox(height: 16),
              const Text('PEMBUKAAN SHIFT KASIR', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
              Text('Outlet: ${_selectedOutlet?.name}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
              const SizedBox(height: 20),
              TextField(
                controller: cashController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Nominal Modal Kas Kecil (Rp)',
                  hintText: 'Contoh: 500000',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.payments),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
                  onPressed: () {
                    setState(() {
                      _initialShiftCash = double.tryParse(cashController.text) ?? 0;
                      _shiftStartTime = DateTime.now();
                      _currentView = 'pos_register';
                    });
                  },
                  icon: const Icon(Icons.play_arrow, color: Colors.white),
                  label: const Text('MULAI PENJUALAN SHIFT', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // WORKFLOW 3: REGISTER MAIN POS INTERFACE
  // ---------------------------------------------------------------------------
  Widget _buildPosRegisterView() {
    final filteredProducts = _selectedCategory == 'Semua'
        ? _allProducts
        : _allProducts.where((p) => p.category == _selectedCategory).toList();

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: Text('POS MOBILE - ${_selectedOutlet?.name}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.history),
            onPressed: () => setState(() => _currentView = 'history'),
            tooltip: 'Riwayat Transaksi',
          ),
          IconButton(
            icon: const Icon(Icons.exit_to_app, color: Colors.redAccent),
            onPressed: () => setState(() => _currentView = 'shift_close'),
            tooltip: 'Shift Closing',
          ),
        ],
      ),
      body: Row(
        children: [
          // LEFT PANEL: CATEGORIES & PRODUCT GRID
          Expanded(
            flex: 3,
            child: Column(
              children: [
                // Category Pills
                Container(
                  height: 50,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _categories.length,
                    itemBuilder: (context, idx) {
                      final cat = _categories[idx];
                      final isSelected = _selectedCategory == cat;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8.0),
                        child: ChoiceChip(
                          label: Text(cat),
                          selected: isSelected,
                          onSelected: (selected) {
                            if (selected) setState(() => _selectedCategory = cat);
                          },
                          selectedColor: const Color(0xFF6366F1),
                          labelStyle: TextStyle(color: isSelected ? Colors.white : Colors.grey),
                        ),
                      );
                    },
                  ),
                ),
                // Product Grid
                Expanded(
                  child: filteredProducts.isEmpty
                      ? const Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.inventory_2_outlined, size: 48, color: Colors.white24),
                              SizedBox(height: 12),
                              Text('Belum ada menu produk terdaftar.', style: TextStyle(color: Colors.grey, fontSize: 14, fontWeight: FontWeight.w500)),
                              SizedBox(height: 4),
                              Text('Silakan sinkronkan atau tambahkan produk dari Admin Web POS', style: TextStyle(color: Colors.white38, fontSize: 11)),
                            ],
                          ),
                        )
                      : GridView.builder(
                          padding: const EdgeInsets.all(12),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 3,
                            childAspectRatio: 1.2,
                            crossAxisSpacing: 10,
                            mainAxisSpacing: 10,
                          ),
                          itemCount: filteredProducts.length,
                    itemBuilder: (context, idx) {
                      final p = filteredProducts[idx];
                      return InkWell(
                        onTap: () {
                          setState(() {
                            final existingIdx = _cart.indexWhere((item) => item.product.id == p.id);
                            if (existingIdx >= 0) {
                              _cart[existingIdx].qty += 1;
                            } else {
                              _cart.add(CartItem(product: p));
                            }
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1E293B),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.white10),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(p.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                              Text(_currencyFormatter.format(p.price), style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 13)),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          // RIGHT PANEL: CART REGISTER & CHECKOUT
          Expanded(
            flex: 2,
            child: Container(
              color: const Color(0xFF1E293B),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('STRUK TRANSAKSI POS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.cyan)),
                  const Divider(color: Colors.white24),
                  // Order Type & Customer Select
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButton<String>(
                          value: _orderType,
                          isExpanded: true,
                          items: ['Dine In', 'Take Away'].map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                          onChanged: (val) => setState(() => _orderType = val!),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  // Cart List
                  Expanded(
                    child: _cart.isEmpty
                        ? const Center(child: Text('Keranjang belanja kosong', style: TextStyle(color: Colors.grey)))
                        : ListView.builder(
                            itemCount: _cart.length,
                            itemBuilder: (context, idx) {
                              final item = _cart[idx];
                              return Container(
                                margin: const EdgeInsets.only(bottom: 8),
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(color: const Color(0xFF0F172A), borderRadius: BorderRadius.circular(8)),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(item.product.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                          Text(_currencyFormatter.format(item.product.price), style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                        ],
                                      ),
                                    ),
                                    Row(
                                      children: [
                                        IconButton(
                                          icon: const Icon(Icons.remove_circle_outline, size: 18, color: Colors.redAccent),
                                          onPressed: () {
                                            setState(() {
                                              if (item.qty > 1) {
                                                item.qty -= 1;
                                              } else {
                                                _cart.removeAt(idx);
                                              }
                                            });
                                          },
                                        ),
                                        Text('${item.qty}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                        IconButton(
                                          icon: const Icon(Icons.add_circle_outline, size: 18, color: Colors.greenAccent),
                                          onPressed: () {
                                            setState(() {
                                              item.qty += 1;
                                            });
                                          },
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                  ),
                  const Divider(color: Colors.white24),
                  // Subtotal & Total
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('TOTAL BAYAR:', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                      Text(_currencyFormatter.format(_cartTotal), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF10B981))),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
                      onPressed: _cart.isEmpty
                          ? null
                          : () {
                              _processPayment('Tunai (Cash)');
                            },
                      icon: const Icon(Icons.payment, color: Colors.white),
                      label: const Text('PROSES BAYAR & CETAK STRUK', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // WORKFLOW 4: RIWAYAT TRANSAKSI KASIR
  // ---------------------------------------------------------------------------
  Widget _buildHistoryView() {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('RIWAYAT TRANSAKSI SHIFT'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => setState(() => _currentView = 'pos_register'),
        ),
      ),
      body: _completedTransactions.isEmpty
          ? const Center(child: Text('Belum ada transaksi di shift ini', style: TextStyle(color: Colors.grey)))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _completedTransactions.length,
              itemBuilder: (context, idx) {
                final tx = _completedTransactions[idx];
                return Card(
                  color: const Color(0xFF1E293B),
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    leading: const Icon(Icons.receipt_long, color: Colors.cyan),
                    title: Text('#${tx.id} - ${tx.customerName}', style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text('${DateFormat('HH:mm').format(tx.timestamp)} WIB • ${tx.paymentMethod} • ${tx.items.length} Item'),
                    trailing: Text(_currencyFormatter.format(tx.totalAmount), style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.greenAccent, fontSize: 16)),
                  ),
                );
              },
            ),
    );
  }

  // ---------------------------------------------------------------------------
  // WORKFLOW 5: SHIFT CLOSING & REKONSILIASI
  // ---------------------------------------------------------------------------
  Widget _buildShiftCloseView() {
    final double totalSales = _completedTransactions.fold(0, (sum, tx) => sum + tx.totalAmount);
    final double expectedCash = _initialShiftCash + totalSales;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('REKONSILIASI PENUTUPAN SHIFT KASIR'),
      ),
      body: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 480),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(16)),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.assignment_turned_in, size: 48, color: Colors.amber),
              const SizedBox(height: 12),
              Text('Laporan Shift: $_cashierName', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              Text('Outlet: ${_selectedOutlet?.name}', style: const TextStyle(fontSize: 13, color: Colors.grey)),
              if (_shiftStartTime != null)
                Text('Jam Buka Shift: ${DateFormat('HH:mm - dd/MM/yyyy').format(_shiftStartTime!)}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
              const Divider(color: Colors.white24, height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Modal Awal Shift:'),
                  Text(_currencyFormatter.format(_initialShiftCash), style: const TextStyle(fontWeight: FontWeight.bold)),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total Penjualan Shift:'),
                  Text(_currencyFormatter.format(totalSales), style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.greenAccent)),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Estimasi Uang di Laci:'),
                  Text(_currencyFormatter.format(expectedCash), style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.cyan)),
                ],
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6366F1)),
                  onPressed: () {
                    setState(() {
                      _completedTransactions.clear();
                      _currentView = 'login';
                    });
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('✅ Shift Berhasil Ditutup. Terima kasih!')),
                    );
                  },
                  icon: const Icon(Icons.check_circle, color: Colors.white),
                  label: const Text('TUTUP SHIFT & CETAK REKAP', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    switch (_currentView) {
      case 'shift_open':
        return _buildShiftOpenView();
      case 'pos_register':
        return _buildPosRegisterView();
      case 'history':
        return _buildHistoryView();
      case 'shift_close':
        return _buildShiftCloseView();
      case 'login':
      default:
        return _buildLoginView();
    }
  }
}
