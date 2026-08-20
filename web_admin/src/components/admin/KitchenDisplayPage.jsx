import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChefHat, Clock, CheckCircle2, AlertCircle, RefreshCw, 
  Filter, Utensils, Coffee, Flame, Check, Bell, Volume2, VolumeX, Store
} from 'lucide-react';
import { getApiUrl } from '../../utils/apiConfig';
import { getThemePalette } from '../../utils/themeUtils';

export default function KitchenDisplayPage({ masterData, selectedBranch, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);

  // Active Outlet Selection
  const [activeOutletId, setActiveOutletId] = useState(() => {
    if (selectedBranch && selectedBranch !== 'all' && selectedBranch !== 'central') {
      const match = (masterData?.outlets || []).find(o => String(o.id) === String(selectedBranch) || o.name === selectedBranch);
      if (match) return match.id;
    }
    return masterData?.outlets?.[0]?.id || 1785369561430;
  });

  useEffect(() => {
    if (selectedBranch && selectedBranch !== 'all' && selectedBranch !== 'central') {
      const match = (masterData?.outlets || []).find(o => String(o.id) === String(selectedBranch) || o.name === selectedBranch);
      if (match) setActiveOutletId(match.id);
    }
  }, [selectedBranch, masterData?.outlets]);

  // Station Filter: 'all' | 'kitchen' (Makanan) | 'bar' (Minuman)
  const [stationFilter, setStationFilter] = useState('all');

  // Sound enabled state
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Table Orders Live List
  const [tableOrders, setTableOrders] = useState([]);
  const [completedOrderIds, setCompletedOrderIds] = useState(new Set());
  const [itemStatusMap, setItemStatusMap] = useState({}); // orderId_idx -> 'cooking' | 'ready' | 'served'
  const [lastOrderCount, setLastOrderCount] = useState(0);

  // Fetch active table orders
  const fetchTableOrders = () => {
    if (!activeOutletId) return;
    fetch(getApiUrl(`/api/pos/table-orders?outlet_id=${activeOutletId}`), { cache: 'no-store' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && Array.isArray(data.tableOrders)) {
          setTableOrders(data.tableOrders);

          // Audio chime if new order arrived
          if (data.tableOrders.length > lastOrderCount && lastOrderCount > 0 && soundEnabled) {
            playChimeSound();
          }
          setLastOrderCount(data.tableOrders.length);
        }
      })
      .catch(() => {});
  };

  // Play web audio chime
  const playChimeSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  };

  // Real-Time SSE Listener
  useEffect(() => {
    if (!activeOutletId) return;

    fetchTableOrders();

    let eventSource = null;
    try {
      if (typeof window !== 'undefined' && window.EventSource) {
        eventSource = new EventSource(getApiUrl(`/api/pos/events?outlet_id=${activeOutletId}`));
        eventSource.onmessage = (e) => {
          try {
            const ev = JSON.parse(e.data);
            if (ev.type === 'TABLE_ORDER_UPDATE' || ev.type === 'TX_CHECKOUT') {
              fetchTableOrders();
            }
          } catch (err) {}
        };
      }
    } catch (e) {}

    const interval = setInterval(fetchTableOrders, 10000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [activeOutletId, soundEnabled, lastOrderCount]);

  const activeOutletObj = useMemo(() => {
    return (masterData?.outlets || []).find(o => String(o.id) === String(activeOutletId)) || masterData?.outlets?.[0] || { name: 'Outlet' };
  }, [masterData?.outlets, activeOutletId]);

  // Filter orders by station
  const isItemMatchStation = (itemName) => {
    const name = String(itemName || '').toLowerCase();
    const isDrink = name.includes('teh') || name.includes('jus') || name.includes('kopi') || name.includes('milo') || name.includes('air') || name.includes('es ') || name.includes('mineral') || name.includes('sirup');
    if (stationFilter === 'kitchen') return !isDrink;
    if (stationFilter === 'bar') return isDrink;
    return true;
  };

  const filteredOrders = useMemo(() => {
    return tableOrders.filter(o => !completedOrderIds.has(o.id)).map(order => {
      const matchedItems = (order.items || []).filter(it => isItemMatchStation(it.name));
      return {
        ...order,
        displayItems: matchedItems
      };
    }).filter(order => order.displayItems.length > 0);
  }, [tableOrders, completedOrderIds, stationFilter]);

  const toggleItemReady = (orderId, idx) => {
    const key = `${orderId}_${idx}`;
    setItemStatusMap(prev => ({
      ...prev,
      [key]: prev[key] === 'ready' ? 'cooking' : 'ready'
    }));
  };

  const markOrderDone = (orderId) => {
    setCompletedOrderIds(prev => new Set([...prev, orderId]));
  };

  // Helper time elapsed
  const getElapsedMinutes = (updatedAt) => {
    if (!updatedAt) return 0;
    const diffMs = Date.now() - new Date(updatedAt).getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  return (
    <div style={{ flex: 1, padding: '24px', overflowY: 'auto', background: 'var(--pos-bg-app, #090d16)', minHeight: '100vh' }}>
      
      {/* HEADER BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', background: T.cardBg, padding: '16px 20px', borderRadius: '16px', border: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(245,158,11,0.4)' }}>
            <ChefHat size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Kitchen Display System (KDS Dapur & Bar)</span>
              <span style={{ fontSize: '0.72rem', background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontWeight: '800' }}>
                ⚡ LIVE SSE PUSH
              </span>
            </h1>
            <p style={{ fontSize: '0.80rem', color: T.txtMuted, margin: '2px 0 0 0' }}>
              {activeOutletObj.name} • Menampilkan tiket pesanan real-time dari Waiters & Kasir
            </p>
          </div>
        </div>

        {/* CONTROLS: Outlet Selector, Station Filter, Sound, Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Outlet Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: T.bgApp, padding: '6px 12px', borderRadius: '10px', border: `1px solid ${T.border}` }}>
            <Store size={15} color={T.txtMuted} />
            <select
              value={activeOutletId}
              onChange={(e) => setActiveOutletId(Number(e.target.value))}
              style={{ background: 'transparent', border: 'none', color: T.txtPrimary, fontWeight: '800', fontSize: '0.82rem', outline: 'none', cursor: 'pointer' }}
            >
              {(masterData?.outlets || []).map(o => (
                <option key={o.id} value={o.id} style={{ background: '#1e293b', color: '#fff' }}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          {/* Station Filters */}
          <div style={{ display: 'flex', background: T.bgApp, padding: '4px', borderRadius: '10px', border: `1px solid ${T.border}` }}>
            <button
              onClick={() => setStationFilter('all')}
              style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: stationFilter === 'all' ? '#2563eb' : 'transparent', color: stationFilter === 'all' ? '#fff' : T.txtMuted, fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer' }}
            >
              Semua Station ({filteredOrders.length})
            </button>
            <button
              onClick={() => setStationFilter('kitchen')}
              style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: stationFilter === 'kitchen' ? '#d97706' : 'transparent', color: stationFilter === 'kitchen' ? '#fff' : T.txtMuted, fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Flame size={13} />
              <span>Dapur Makanan</span>
            </button>
            <button
              onClick={() => setStationFilter('bar')}
              style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: stationFilter === 'bar' ? '#06b6d4' : 'transparent', color: stationFilter === 'bar' ? '#fff' : T.txtMuted, fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Coffee size={13} />
              <span>Bar Minuman</span>
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{ padding: '8px', borderRadius: '10px', border: `1px solid ${T.border}`, background: soundEnabled ? 'rgba(16,185,129,0.15)' : T.bgApp, color: soundEnabled ? '#10b981' : T.txtMuted, cursor: 'pointer' }}
            title={soundEnabled ? 'Suara Bel Aktif' : 'Suara Bel Mati'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchTableOrders}
            style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: '800', fontSize: '0.80rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* TICKETS GRID */}
      {filteredOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: T.cardBg, borderRadius: '20px', border: `1px solid ${T.border}` }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: '#10b981' }}>
            <CheckCircle2 size={32} />
          </div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '900', color: T.txtPrimary, margin: '0 0 6px 0' }}>
            Dapur & Bar Sedang Bersih / Tidak Ada Antrean
          </h2>
          <p style={{ fontSize: '0.84rem', color: T.txtMuted, maxWidth: '400px', margin: '0 auto' }}>
            Pesanan baru yang dicatat oleh Waiters di HP atau Kasir akan langsung muncul di layar ini secara otomatis.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredOrders.map((order, orderIdx) => {
            const elapsed = getElapsedMinutes(order.updated_at);
            const isUrgent = elapsed >= 15;
            const isWarning = elapsed >= 8 && elapsed < 15;
            const headerColor = isUrgent ? '#ef4444' : (isWarning ? '#f59e0b' : '#3b82f6');

            return (
              <div 
                key={order.id || orderIdx}
                style={{
                  background: T.cardBg,
                  borderRadius: '16px',
                  border: `2px solid ${headerColor}`,
                  overflow: 'hidden',
                  boxShadow: isUrgent ? '0 8px 24px rgba(239,68,68,0.25)' : '0 4px 16px rgba(0,0,0,0.2)',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* TICKET HEADER */}
                <div style={{ background: headerColor, padding: '12px 16px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{order.table_number || order.table_id || 'Meja Pesanan'}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                      {order.customer_name || 'Pelanggan'} • Pelayan: {order.waiter_name || 'Waiters'}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.90rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} />
                      <span>{elapsed} mnt lalu</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>
                      {order.updated_at ? String(order.updated_at).substring(11, 16) : ''}
                    </div>
                  </div>
                </div>

                {/* TICKET ITEMS LIST */}
                <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {order.displayItems.map((item, itemIdx) => {
                    const itemKey = `${order.id}_${itemIdx}`;
                    const isReady = itemStatusMap[itemKey] === 'ready';

                    return (
                      <div 
                        key={itemIdx}
                        onClick={() => toggleItemReady(order.id, itemIdx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          background: isReady ? 'rgba(16,185,129,0.12)' : T.bgApp,
                          border: `1px solid ${isReady ? '#10b981' : T.border}`,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ 
                            width: '28px', 
                            height: '28px', 
                            borderRadius: '8px', 
                            background: isReady ? '#10b981' : '#334155', 
                            color: '#fff', 
                            fontWeight: '900', 
                            fontSize: '0.85rem', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                          }}>
                            {item.qty || 1}x
                          </span>
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: '800', color: isReady ? '#34d399' : T.txtPrimary, textDecoration: isReady ? 'line-through' : 'none' }}>
                              {item.name}
                            </div>
                            {item.notes && (
                              <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: '700' }}>
                                Catatan: {item.notes}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: `2px solid ${isReady ? '#10b981' : T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isReady ? '#10b981' : 'transparent', color: '#fff' }}>
                          {isReady && <Check size={14} />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* TICKET FOOTER: Selesai Saji Button */}
                <div style={{ padding: '12px 16px', background: T.bgApp, borderTop: `1px solid ${T.border}` }}>
                  <button
                    onClick={() => markOrderDone(order.id)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      fontWeight: '900',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Selesai Dimasak / Siap Saji</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
