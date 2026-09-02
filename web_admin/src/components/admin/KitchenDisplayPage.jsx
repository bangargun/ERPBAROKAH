import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ChefHat, Clock, CheckCircle2, AlertCircle, RefreshCw, 
  Filter, Utensils, Coffee, Flame, Check, Bell, Volume2, VolumeX, Store,
  RotateCcw, Eye, ArrowRight, Sparkles, CheckCheck
} from 'lucide-react';
import { getApiUrl } from '../../utils/apiConfig';
import { getThemePalette } from '../../utils/themeUtils';

export default function KitchenDisplayPage({ 
  masterData, 
  selectedBranch, 
  forceOutletId = null, 
  forceKitchenOnly = false, 
  isPosMobile = false, 
  themeMode = 'dark' 
}) {
  const isDark = themeMode === 'dark';
  const isCalmSage = !isDark;
  const T = getThemePalette(themeMode);

  // Active Outlet Selection (Strictly locked if forceOutletId or isPosMobile is provided)
  const [activeOutletId, setActiveOutletId] = useState(() => {
    if (forceOutletId) return forceOutletId;
    if (selectedBranch && selectedBranch !== 'all' && selectedBranch !== 'central') {
      const match = (masterData?.outlets || []).find(o => String(o.id) === String(selectedBranch) || o.name === selectedBranch);
      if (match) return match.id;
    }
    return masterData?.outlets?.[0]?.id || 1785369561430;
  });

  useEffect(() => {
    if (forceOutletId) {
      setActiveOutletId(forceOutletId);
      return;
    }
    if (selectedBranch && selectedBranch !== 'all' && selectedBranch !== 'central') {
      const match = (masterData?.outlets || []).find(o => String(o.id) === String(selectedBranch) || o.name === selectedBranch);
      if (match) setActiveOutletId(match.id);
    }
  }, [forceOutletId, selectedBranch, masterData?.outlets]);

  // View Status Tab: 'cooking' (Sedang Dimasak) | 'ready' (Siap Saji) | 'completed' (Riwayat Selesai)
  const [statusTab, setStatusTab] = useState('cooking');

  // Station Filter: 'all' | 'kitchen' (Makanan) | 'bar' (Minuman) - Default to 'kitchen' if forceKitchenOnly
  const [stationFilter, setStationFilter] = useState(() => forceKitchenOnly ? 'kitchen' : 'all');

  useEffect(() => {
    if (forceKitchenOnly) {
      setStationFilter('kitchen');
    }
  }, [forceKitchenOnly]);

  // Sound enabled state
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Orders Live State
  const [tableOrders, setTableOrders] = useState([]);
  const [itemStatusMap, setItemStatusMap] = useState({}); // `${orderId}_${idx}` -> 'cooking' | 'ready'
  const [orderStageMap, setOrderStageMap] = useState({}); // orderId -> 'cooking' | 'ready' | 'served'
  const [servedHistory, setServedHistory] = useState([]);
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const prevOrderCountRef = useRef(0);

  // Fetch active table orders
  const fetchTableOrders = () => {
    if (!activeOutletId) return;
    setIsRefreshing(true);
    fetch(getApiUrl(`/api/pos/table-orders?outlet_id=${activeOutletId}`), { cache: 'no-store' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setIsRefreshing(false);
        if (data && Array.isArray(data.tableOrders)) {
          setTableOrders(data.tableOrders);

          // Audio chime if new order arrived
          if (data.tableOrders.length > prevOrderCountRef.current && prevOrderCountRef.current > 0 && soundEnabled) {
            playChimeSound();
          }
          prevOrderCountRef.current = data.tableOrders.length;
          setLastOrderCount(data.tableOrders.length);
        }
      })
      .catch(() => {
        setIsRefreshing(false);
      });
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
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.55);
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
            if (ev.type === 'TABLE_ORDER_UPDATE' || ev.type === 'TX_CHECKOUT' || ev.type === 'KDS_ORDER_UPDATE') {
              if (ev.action === 'DELETE' && ev.table_id) {
                setTableOrders(prev => prev.filter(o => String(o.table_id) !== String(ev.table_id) && String(o.id) !== String(ev.table_id) && String(o.table_number) !== String(ev.table_id)));
              }
              fetchTableOrders();
            }
          } catch (err) {}
        };
      }
    } catch (e) {}

    const interval = setInterval(fetchTableOrders, 8000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [activeOutletId, soundEnabled]);

  const activeOutletObj = useMemo(() => {
    return (masterData?.outlets || []).find(o => String(o.id) === String(activeOutletId)) || masterData?.outlets?.[0] || { name: 'Outlet Barokah' };
  }, [masterData?.outlets, activeOutletId]);

  // Filter orders by station: strictly detect Drink / Bar vs Food / Kitchen
  const isItemMatchStation = (itemName, itemCategory) => {
    const name = String(itemName || '').toLowerCase();
    const cat = String(itemCategory || '').toLowerCase();

    const isDrink = cat.includes('minuman') || cat.includes('drink') || cat.includes('beverage') || cat.includes('bar') || cat.includes('rokok') ||
      name.includes('teh') || name.includes('jus') || name.includes('kopi') || name.includes('milo') || name.includes('air') || name.includes('es ') || 
      name.includes('mineral') || name.includes('sirup') || name.includes('soda') || name.includes('fanta') || name.includes('sprite') || 
      name.includes('coca') || name.includes('le mineral') || name.includes('aqua') || name.includes('badak') || name.includes('rokok');

    if (stationFilter === 'kitchen' || forceKitchenOnly) return !isDrink;
    if (stationFilter === 'bar') return isDrink;
    return true;
  };

  // Filtered orders list by station
  const stationMatchedOrders = useMemo(() => {
    return tableOrders.map(order => {
      const matchedItems = (order.items || []).filter(it => isItemMatchStation(it.name || it.item_name, it.category || it.category_name));
      const stage = orderStageMap[order.id] || (order.kitchen_status || 'cooking');
      return {
        ...order,
        displayItems: matchedItems,
        stage: stage
      };
    }).filter(order => order.displayItems.length > 0);
  }, [tableOrders, stationFilter, forceKitchenOnly, orderStageMap]);

  // Tab filtered orders
  const cookingOrders = useMemo(() => {
    return stationMatchedOrders.filter(o => o.stage === 'cooking');
  }, [stationMatchedOrders]);

  const readyOrders = useMemo(() => {
    return stationMatchedOrders.filter(o => o.stage === 'ready');
  }, [stationMatchedOrders]);

  const displayedOrders = useMemo(() => {
    if (statusTab === 'cooking') return cookingOrders;
    if (statusTab === 'ready') return readyOrders;
    if (statusTab === 'completed') return servedHistory;
    return cookingOrders;
  }, [statusTab, cookingOrders, readyOrders, servedHistory]);

  // Toggle item ready status
  const toggleItemReady = (orderId, idx) => {
    const key = `${orderId}_${idx}`;
    setItemStatusMap(prev => ({
      ...prev,
      [key]: prev[key] === 'ready' ? 'cooking' : 'ready'
    }));
  };

  // Move order from 'cooking' -> 'ready' (Siap Saji)
  const markOrderReady = (order) => {
    const orderId = order.id;
    setOrderStageMap(prev => ({ ...prev, [orderId]: 'ready' }));
    // Mark all items in this order as ready
    setItemStatusMap(prev => {
      const next = { ...prev };
      (order.displayItems || []).forEach((_, idx) => {
        next[`${orderId}_${idx}`] = 'ready';
      });
      return next;
    });
    playChimeSound();
  };

  // Move order from 'ready' -> 'served' (Selesai Diantar / Selesai Saji)
  const markOrderServed = (order) => {
    const orderId = order.id;
    const completedRecord = {
      ...order,
      servedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      stage: 'served'
    };
    setServedHistory(prev => [completedRecord, ...prev.slice(0, 30)]);
    setOrderStageMap(prev => ({ ...prev, [orderId]: 'served' }));
  };

  // Recall completed order back to 'cooking' or 'ready'
  const recallOrder = (order) => {
    const orderId = order.id;
    setServedHistory(prev => prev.filter(o => o.id !== orderId));
    setOrderStageMap(prev => ({ ...prev, [orderId]: 'cooking' }));
    setStatusTab('cooking');
  };

  // Helper time elapsed in minutes
  const getElapsedMinutes = (updatedAt) => {
    if (!updatedAt) return 0;
    const diffMs = Date.now() - new Date(updatedAt).getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  // High contrast color scheme
  const themeCardBg = isCalmSage ? '#ffffff' : '#131b2e';
  const themeAppBg = isCalmSage ? '#f3f7f4' : '#0b0f19';
  const themeTextPrimary = isCalmSage ? '#152e22' : '#f8fafc';
  const themeTextSecondary = isCalmSage ? '#28533f' : '#cbd5e1';
  const themeBorder = isCalmSage ? '#c8ded1' : 'rgba(255, 255, 255, 0.15)';

  return (
    <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: themeAppBg, minHeight: '100%', color: themeTextPrimary }}>
      
      {/* ── HEADER BAR ── */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '14px', 
        marginBottom: '20px', 
        background: themeCardBg, 
        padding: '16px 20px', 
        borderRadius: '16px', 
        border: `1px solid ${themeBorder}`,
        boxShadow: isCalmSage ? '0 2px 10px rgba(21,46,34,0.06)' : '0 4px 20px rgba(0,0,0,0.35)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ 
            width: '46px', 
            height: '46px', 
            borderRadius: '14px', 
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#fff', 
            boxShadow: '0 4px 14px rgba(245,158,11,0.4)' 
          }}>
            <ChefHat size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '900', color: themeTextPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{forceKitchenOnly || isPosMobile ? 'Kitchen Display System (KDS Dapur Makanan)' : 'Kitchen Display System (KDS Dapur & Bar)'}</span>
              <span style={{ fontSize: '0.70rem', background: '#10b981', color: '#fff', padding: '3px 8px', borderRadius: '6px', fontWeight: '900', letterSpacing: '0.5px' }}>
                ⚡ REAL-TIME LIVE
              </span>
            </h1>
            <p style={{ fontSize: '0.80rem', color: themeTextSecondary, margin: '3px 0 0 0', fontWeight: '600' }}>
              <strong style={{ color: '#38bdf8' }}>{activeOutletObj.name}</strong> • Antrean tiket pesanan dapur real-time dari Kasir & Waiters
            </p>
          </div>
        </div>

        {/* CONTROLS: Outlet Selector, Station Filter, Sound, Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Outlet Selector (when not force-locked) */}
          {!forceOutletId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isCalmSage ? '#eef5f0' : '#1e293b', padding: '6px 12px', borderRadius: '10px', border: `1px solid ${themeBorder}` }}>
              <Store size={15} color={themeTextSecondary} />
              <select
                value={activeOutletId}
                onChange={(e) => setActiveOutletId(Number(e.target.value))}
                style={{ background: 'transparent', border: 'none', color: themeTextPrimary, fontWeight: '800', fontSize: '0.82rem', outline: 'none', cursor: 'pointer' }}
              >
                {(masterData?.outlets || []).map(o => (
                  <option key={o.id} value={o.id} style={{ background: isCalmSage ? '#ffffff' : '#1e293b', color: isCalmSage ? '#152e22' : '#ffffff' }}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Station Filters */}
          <div style={{ display: 'flex', background: isCalmSage ? '#eef5f0' : '#1e293b', padding: '4px', borderRadius: '10px', border: `1px solid ${themeBorder}` }}>
            <button
              type="button"
              onClick={() => setStationFilter('all')}
              style={{ 
                padding: '6px 12px', 
                borderRadius: '8px', 
                border: 'none', 
                background: stationFilter === 'all' ? '#2563eb' : 'transparent', 
                color: stationFilter === 'all' ? '#ffffff' : themeTextSecondary, 
                fontWeight: '900', 
                fontSize: '0.78rem', 
                cursor: 'pointer' 
              }}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setStationFilter('kitchen')}
              style={{ 
                padding: '6px 12px', 
                borderRadius: '8px', 
                border: 'none', 
                background: stationFilter === 'kitchen' ? '#d97706' : 'transparent', 
                color: stationFilter === 'kitchen' ? '#ffffff' : themeTextSecondary, 
                fontWeight: '900', 
                fontSize: '0.78rem', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px' 
              }}
            >
              <Flame size={13} />
              <span>Dapur Makanan</span>
            </button>
            <button
              type="button"
              onClick={() => setStationFilter('bar')}
              style={{ 
                padding: '6px 12px', 
                borderRadius: '8px', 
                border: 'none', 
                background: stationFilter === 'bar' ? '#06b6d4' : 'transparent', 
                color: stationFilter === 'bar' ? '#ffffff' : themeTextSecondary, 
                fontWeight: '900', 
                fontSize: '0.78rem', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px' 
              }}
            >
              <Coffee size={13} />
              <span>Bar Minuman</span>
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{ 
              padding: '8px 12px', 
              borderRadius: '10px', 
              border: `1px solid ${soundEnabled ? '#10b981' : themeBorder}`, 
              background: soundEnabled ? 'rgba(16,185,129,0.15)' : (isCalmSage ? '#eef5f0' : '#1e293b'), 
              color: soundEnabled ? '#10b981' : themeTextSecondary, 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '800',
              fontSize: '0.78rem'
            }}
            title={soundEnabled ? 'Suara Bel Notifikasi Dapur Aktif' : 'Suara Bel Notifikasi Mati'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{soundEnabled ? 'Bel ON' : 'Bel OFF'}</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchTableOrders}
            disabled={isRefreshing}
            style={{ 
              padding: '8px 14px', 
              borderRadius: '10px', 
              border: 'none', 
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', 
              color: '#ffffff', 
              fontWeight: '900', 
              fontSize: '0.80rem', 
              cursor: isRefreshing ? 'not-allowed' : 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              boxShadow: '0 4px 12px rgba(37,99,235,0.3)'
            }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Memuat...' : 'Segarkan'}</span>
          </button>
        </div>
      </div>

      {/* ── ORDER LIFECYCLE STAGE TABS (Sedang Dimasak | Siap Saji | Riwayat Selesai) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setStatusTab('cooking')}
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            fontWeight: '900',
            fontSize: '0.85rem',
            cursor: 'pointer',
            border: statusTab === 'cooking' ? '2px solid #f59e0b' : `1px solid ${themeBorder}`,
            background: statusTab === 'cooking' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : themeCardBg,
            color: statusTab === 'cooking' ? '#ffffff' : themeTextSecondary,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: statusTab === 'cooking' ? '0 4px 16px rgba(245,158,11,0.35)' : 'none'
          }}
        >
          <Flame size={16} />
          <span>Sedang Dimasak</span>
          <span style={{ 
            background: statusTab === 'cooking' ? 'rgba(0,0,0,0.25)' : (isCalmSage ? '#eef5f0' : '#1e293b'), 
            color: statusTab === 'cooking' ? '#ffffff' : '#f59e0b', 
            padding: '2px 8px', 
            borderRadius: '6px', 
            fontSize: '0.74rem' 
          }}>
            {cookingOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusTab('ready')}
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            fontWeight: '900',
            fontSize: '0.85rem',
            cursor: 'pointer',
            border: statusTab === 'ready' ? '2px solid #10b981' : `1px solid ${themeBorder}`,
            background: statusTab === 'ready' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : themeCardBg,
            color: statusTab === 'ready' ? '#ffffff' : themeTextSecondary,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: statusTab === 'ready' ? '0 4px 16px rgba(16,185,129,0.35)' : 'none'
          }}
        >
          <CheckCircle2 size={16} />
          <span>Siap Saji / Selesai Masak</span>
          <span style={{ 
            background: statusTab === 'ready' ? 'rgba(0,0,0,0.25)' : (isCalmSage ? '#eef5f0' : '#1e293b'), 
            color: statusTab === 'ready' ? '#ffffff' : '#10b981', 
            padding: '2px 8px', 
            borderRadius: '6px', 
            fontSize: '0.74rem' 
          }}>
            {readyOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusTab('completed')}
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            fontWeight: '900',
            fontSize: '0.85rem',
            cursor: 'pointer',
            border: statusTab === 'completed' ? '2px solid #6366f1' : `1px solid ${themeBorder}`,
            background: statusTab === 'completed' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : themeCardBg,
            color: statusTab === 'completed' ? '#ffffff' : themeTextSecondary,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: statusTab === 'completed' ? '0 4px 16px rgba(99,102,241,0.35)' : 'none'
          }}
        >
          <Clock size={16} />
          <span>Riwayat Selesai Hari Ini</span>
          <span style={{ 
            background: statusTab === 'completed' ? 'rgba(0,0,0,0.25)' : (isCalmSage ? '#eef5f0' : '#1e293b'), 
            color: statusTab === 'completed' ? '#ffffff' : '#818cf8', 
            padding: '2px 8px', 
            borderRadius: '6px', 
            fontSize: '0.74rem' 
          }}>
            {servedHistory.length}
          </span>
        </button>
      </div>

      {/* ── TICKETS GRID ── */}
      {displayedOrders.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '80px 20px', 
          background: themeCardBg, 
          borderRadius: '20px', 
          border: `1px solid ${themeBorder}`,
          boxShadow: isCalmSage ? '0 2px 10px rgba(21,46,34,0.06)' : 'none'
        }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '50%', 
            background: 'rgba(16,185,129,0.12)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 16px auto', 
            color: '#10b981' 
          }}>
            <CheckCheck size={34} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: themeTextPrimary, margin: '0 0 6px 0' }}>
            {statusTab === 'cooking' 
              ? 'Dapur & Bar Sedang Bersih / Tidak Ada Antrean Masak' 
              : (statusTab === 'ready' 
                ? 'Tidak Ada Pesanan Menunggu Diantar ke Meja' 
                : 'Belum Ada Riwayat Pesanan Selesai')}
          </h2>
          <p style={{ fontSize: '0.84rem', color: themeTextSecondary, maxWidth: '440px', margin: '0 auto', lineHeight: 1.5, fontWeight: '600' }}>
            {statusTab === 'cooking'
              ? 'Pesanan baru yang dicatat oleh Kasir atau Waiters akan langsung muncul di layar KDS ini secara otomatis & real-time.'
              : 'Semua pesanan yang siap saji atau telah diantar ke pelanggan akan tercatat rapi di sini.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '20px' }}>
          {displayedOrders.map((order, orderIdx) => {
            const elapsed = getElapsedMinutes(order.updated_at);
            const isUrgent = elapsed >= 15 && order.stage === 'cooking';
            const isWarning = elapsed >= 8 && elapsed < 15 && order.stage === 'cooking';
            const isReadyStage = order.stage === 'ready';
            const isServedStage = order.stage === 'served';

            const headerColor = isServedStage 
              ? '#6366f1' 
              : (isReadyStage 
                ? '#10b981' 
                : (isUrgent ? '#ef4444' : (isWarning ? '#f59e0b' : '#3b82f6')));

            return (
              <div 
                key={order.id || orderIdx}
                style={{
                  background: themeCardBg,
                  borderRadius: '16px',
                  border: `2px solid ${headerColor}`,
                  overflow: 'hidden',
                  boxShadow: isUrgent 
                    ? '0 8px 24px rgba(239,68,68,0.3)' 
                    : (isCalmSage ? '0 2px 10px rgba(21,46,34,0.06)' : '0 4px 16px rgba(0,0,0,0.3)'),
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* TICKET HEADER */}
                <div style={{ background: headerColor, padding: '12px 16px', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '1.15rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{order.table_number || order.table_id || 'Meja Pesanan'}</span>
                      <span style={{ fontSize: '0.68rem', background: 'rgba(0,0,0,0.25)', padding: '2px 8px', borderRadius: '6px', fontWeight: '800' }}>
                        {order.order_type || 'Dine In'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', opacity: 0.95, marginTop: '2px', fontWeight: '600' }}>
                      {order.customer_name || 'Pelanggan'} • Pelayan: {order.waiter_name || 'Kasir'}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.90rem', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                      <Clock size={14} />
                      <span>{elapsed} mnt lalu</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.9, marginTop: '2px' }}>
                      {order.updated_at ? String(order.updated_at).substring(11, 16) : ''}
                    </div>
                  </div>
                </div>

                {/* TICKET ITEMS LIST */}
                <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {order.displayItems.map((item, itemIdx) => {
                    const itemKey = `${order.id}_${itemIdx}`;
                    const isItemReady = itemStatusMap[itemKey] === 'ready' || isReadyStage || isServedStage;

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
                          background: isItemReady 
                            ? 'rgba(16,185,129,0.12)' 
                            : (isCalmSage ? '#eef5f0' : '#1e293b'),
                          border: `1px solid ${isItemReady ? '#10b981' : themeBorder}`,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ 
                            width: '30px', 
                            height: '30px', 
                            borderRadius: '8px', 
                            background: isItemReady ? '#10b981' : (isCalmSage ? '#2d7a5b' : '#334155'), 
                            color: '#ffffff', 
                            fontWeight: '900', 
                            fontSize: '0.88rem', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                          }}>
                            {item.qty || 1}x
                          </span>
                          <div>
                            <div style={{ 
                              fontSize: '0.90rem', 
                              fontWeight: '800', 
                              color: isItemReady ? '#10b981' : themeTextPrimary, 
                              textDecoration: isItemReady ? 'line-through' : 'none' 
                            }}>
                              {item.name || item.item_name}
                            </div>
                            {item.notes && (
                              <div style={{ fontSize: '0.74rem', color: '#f59e0b', fontWeight: '800', marginTop: '2px' }}>
                                Catatan: {item.notes}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ 
                          width: '24px', 
                          height: '24px', 
                          borderRadius: '50%', 
                          border: `2px solid ${isItemReady ? '#10b981' : themeBorder}`, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          background: isItemReady ? '#10b981' : 'transparent', 
                          color: '#ffffff' 
                        }}>
                          {isItemReady && <Check size={14} strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* TICKET FOOTER ACTIONS */}
                <div style={{ padding: '12px 16px', background: isCalmSage ? '#eef5f0' : '#0c1322', borderTop: `1px solid ${themeBorder}` }}>
                  {order.stage === 'cooking' && (
                    <button
                      type="button"
                      onClick={() => markOrderReady(order)}
                      style={{
                        width: '100%',
                        padding: '11px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        fontWeight: '900',
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
                      }}
                    >
                      <CheckCircle2 size={18} />
                      <span>Selesai Dimasak (Siap Saji)</span>
                    </button>
                  )}

                  {order.stage === 'ready' && (
                    <button
                      type="button"
                      onClick={() => markOrderServed(order)}
                      style={{
                        width: '100%',
                        padding: '11px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        color: '#ffffff',
                        fontWeight: '900',
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
                      }}
                    >
                      <CheckCheck size={18} />
                      <span>Diantar ke Meja (Selesai)</span>
                    </button>
                  )}

                  {order.stage === 'served' && (
                    <button
                      type="button"
                      onClick={() => recallOrder(order)}
                      style={{
                        width: '100%',
                        padding: '9px',
                        borderRadius: '10px',
                        border: `1px solid ${themeBorder}`,
                        background: themeCardBg,
                        color: '#38bdf8',
                        fontWeight: '800',
                        fontSize: '0.80rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <RotateCcw size={15} />
                      <span>Panggil Ulang ke Antrean Masak</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

