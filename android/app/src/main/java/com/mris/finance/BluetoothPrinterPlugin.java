package com.mris.finance;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.IOException;
import java.io.OutputStream;
import java.util.Set;
import java.util.UUID;

/**
 * MRIS BluetoothPrinterPlugin
 * Custom Capacitor Plugin untuk komunikasi dengan printer thermal Bluetooth
 * via RFCOMM/SPP (Serial Port Profile) - standar ESC/POS.
 *
 * Exposed JS Methods:
 *   - scanPairedDevices()                  -> { devices: [{name, address, type}] }
 *   - checkLiveStatus({ mac })             -> { address, isLive, reason }
 *   - testConnection({ mac })              -> { success, message }
 *   - printText({ mac, text, paperWidth }) -> { success: true }
 */
@CapacitorPlugin(
    name = "BluetoothPrinter",
    permissions = {
        @Permission(strings = { Manifest.permission.BLUETOOTH_CONNECT }, alias = "bluetoothConnect"),
        @Permission(strings = { Manifest.permission.BLUETOOTH_SCAN }, alias = "bluetoothScan")
    }
)
public class BluetoothPrinterPlugin extends Plugin {

    private static final String TAG = "MRISBluetoothPrinter";
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    // ESC/POS Command constants
    private static final byte ESC = 0x1B;
    private static final byte GS  = 0x1D;
    private static final byte LF  = 0x0A;

    private BroadcastReceiver bluetoothStateReceiver;

    @Override
    public void load() {
        super.load();
        registerBluetoothReceiver();
    }

    private void registerBluetoothReceiver() {
        try {
            bluetoothStateReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    String action = intent.getAction();
                    if (BluetoothDevice.ACTION_ACL_CONNECTED.equals(action)) {
                        BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                        if (device != null) {
                            JSObject data = new JSObject();
                            data.put("address", device.getAddress());
                            data.put("name", device.getName());
                            data.put("isConnected", true);
                            data.put("status", "CONNECTED");
                            notifyListeners("bluetoothStatusChange", data);
                        }
                    } else if (BluetoothDevice.ACTION_ACL_DISCONNECTED.equals(action)) {
                        BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                        if (device != null) {
                            JSObject data = new JSObject();
                            data.put("address", device.getAddress());
                            data.put("name", device.getName());
                            data.put("isConnected", false);
                            data.put("status", "DISCONNECTED");
                            notifyListeners("bluetoothStatusChange", data);
                        }
                    }
                }
            };

            IntentFilter filter = new IntentFilter();
            filter.addAction(BluetoothDevice.ACTION_ACL_CONNECTED);
            filter.addAction(BluetoothDevice.ACTION_ACL_DISCONNECTED);
            getContext().registerReceiver(bluetoothStateReceiver, filter);
            Log.d(TAG, "BluetoothStateReceiver registered successfully.");
        } catch (Exception e) {
            Log.e(TAG, "Error registering bluetoothStateReceiver", e);
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (bluetoothStateReceiver != null) {
            try {
                getContext().unregisterReceiver(bluetoothStateReceiver);
            } catch (Exception ignored) {}
        }
        super.handleOnDestroy();
    }

    /**
     * Memeriksa ketersediaan saklar daya & respon hardware printer secara realtime.
     * Params: { mac: string }
     */
    @PluginMethod
    public void checkLiveStatus(PluginCall call) {
        String mac = call.getString("mac");
        if (mac == null || mac.isEmpty()) {
            call.reject("INVALID_MAC", "MAC address printer tidak boleh kosong.");
            return;
        }

        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null || !adapter.isEnabled()) {
            JSObject res = new JSObject();
            res.put("address", mac);
            res.put("isLive", false);
            res.put("reason", "Bluetooth HP/Tablet Mati");
            call.resolve(res);
            return;
        }

        new Thread(() -> {
            BluetoothSocket socket = null;
            try {
                BluetoothDevice device = adapter.getRemoteDevice(mac);
                adapter.cancelDiscovery();
                socket = connectToDeviceSocket(device);
                
                JSObject res = new JSObject();
                res.put("address", mac);
                res.put("name", device.getName());
                res.put("isLive", true);
                res.put("reason", "Printer Hidup & Merespon");
                call.resolve(res);
            } catch (Exception e) {
                JSObject res = new JSObject();
                res.put("address", mac);
                res.put("isLive", false);
                res.put("reason", "Saklar Printer Mati / Tidak Merespon: " + e.getMessage());
                call.resolve(res);
            } finally {
                if (socket != null) {
                    try { socket.close(); } catch (IOException ignored) {}
                }
            }
        }).start();
    }

    /**
     * Kembalikan daftar perangkat Bluetooth yang sudah dipair.
     * User harus sudah pair printer dari Settings Android -> Bluetooth.
     */
    @PluginMethod
    public void scanPairedDevices(PluginCall call) {
        try {
            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            if (adapter == null) {
                call.reject("BLUETOOTH_NOT_SUPPORTED", "Perangkat tidak memiliki hardware Bluetooth.");
                return;
            }
            if (!adapter.isEnabled()) {
                call.reject("BLUETOOTH_DISABLED", "Bluetooth tidak aktif. Aktifkan Bluetooth terlebih dahulu di Pengaturan Android.");
                return;
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (getActivity().checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                    requestPermissionForAlias("bluetoothConnect", call, "bluetoothConnectCallback");
                    return;
                }
            }

            fetchAndReturnBondedDevices(adapter, call);

        } catch (SecurityException se) {
            Log.e(TAG, "SecurityException scanning Bluetooth devices", se);
            requestPermissionForAlias("bluetoothConnect", call, "bluetoothConnectCallback");
        } catch (Exception e) {
            Log.e(TAG, "Error scanning paired devices", e);
            call.reject("SCAN_ERROR", "Gagal membaca printer paired: " + e.getMessage());
        }
    }

    private void fetchAndReturnBondedDevices(BluetoothAdapter adapter, PluginCall call) {
        try {
            Set<BluetoothDevice> pairedDevices = adapter.getBondedDevices();
            JSArray deviceArray = new JSArray();

            if (pairedDevices != null) {
                for (BluetoothDevice device : pairedDevices) {
                    JSObject dev = new JSObject();
                    String devName = device.getName();
                    if (devName == null || devName.trim().isEmpty()) {
                        devName = "Printer Bluetooth (" + device.getAddress() + ")";
                    }

                    dev.put("name", devName);
                    dev.put("address", device.getAddress());
                    dev.put("isPaired", true);
                    dev.put("isOnline", true);
                    // PENTING: BluetoothDevice.getType() returns:
                    //   1 = DEVICE_TYPE_CLASSIC  → Classic Bluetooth (SPP/RFCOMM) ✅ bisa cetak
                    //   2 = DEVICE_TYPE_LE       → Bluetooth Low Energy saja     ❌ tidak bisa cetak via SPP
                    //   3 = DEVICE_TYPE_DUAL     → Classic + BLE (contoh: RPP02N) ✅ bisa cetak via SPP
                    // Sebelumnya hanya cek == CLASSIC, sehingga DUAL (RPP02N, dll) salah dikategorikan "le"
                    int devType = device.getType();
                    String typeStr;
                    if (devType == BluetoothDevice.DEVICE_TYPE_CLASSIC || devType == BluetoothDevice.DEVICE_TYPE_DUAL) {
                        typeStr = "classic"; // SPP/RFCOMM tersedia - printer thermal bisa digunakan
                    } else if (devType == BluetoothDevice.DEVICE_TYPE_LE) {
                        typeStr = "le";      // BLE only - printer thermal umumnya tidak bisa cetak via SPP
                    } else {
                        typeStr = "classic"; // DEVICE_TYPE_UNKNOWN (0) - anggap classic, biarkan user coba
                    }
                    dev.put("type", typeStr);

                    deviceArray.put(dev);
                }
            }

            JSObject result = new JSObject();
            result.put("devices", deviceArray);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error reading bonded devices", e);
            call.reject("READ_BONDED_ERROR", "Gagal membaca daftar paired printer: " + e.getMessage());
        }
    }

    /**
     * Tes koneksi ke printer tertentu secara aktif via Triple-Fallback Socket.
     * Params: { mac: string }
     */
    @PluginMethod
    public void testConnection(PluginCall call) {
        String mac = call.getString("mac");
        if (mac == null || mac.isEmpty()) {
            call.reject("INVALID_MAC", "MAC address printer tidak boleh kosong.");
            return;
        }

        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null || !adapter.isEnabled()) {
            call.reject("BLUETOOTH_DISABLED", "Bluetooth tidak aktif.");
            return;
        }

        new Thread(() -> {
            BluetoothSocket socket = null;
            try {
                BluetoothDevice device = adapter.getRemoteDevice(mac);
                adapter.cancelDiscovery();
                socket = connectToDeviceSocket(device);
                
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("message", "Koneksi ke printer " + device.getName() + " BERHASIL!");
                call.resolve(result);
            } catch (Exception e) {
                Log.e(TAG, "Test connection failed: " + e.getMessage(), e);
                call.reject("TEST_FAILED", "Printer tidak merespon: " + e.getMessage());
            } finally {
                if (socket != null) {
                    try { socket.close(); } catch (IOException ignored) {}
                }
            }
        }).start();
    }

    @PermissionCallback
    private void bluetoothConnectCallback(PluginCall call) {
        try {
            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            if (adapter != null && adapter.isEnabled()) {
                fetchAndReturnBondedDevices(adapter, call);
            } else {
                call.reject("BLUETOOTH_DISABLED", "Bluetooth tidak aktif.");
            }
        } catch (Exception e) {
            call.reject("PERMISSION_CALLBACK_ERROR", "Gagal setelah meminta izin: " + e.getMessage());
        }
    }

    /**
     * Kirim teks ke printer thermal via Bluetooth RFCOMM.
     * Params: { mac: string, text: string, paperWidth: "58"|"80" }
     */
    @PluginMethod
    public void printText(PluginCall call) {
        String mac = call.getString("mac");
        String text = call.getString("text", "");
        String paperWidth = call.getString("paperWidth", "58");

        if (mac == null || mac.isEmpty()) {
            call.reject("INVALID_MAC", "MAC address printer tidak boleh kosong.");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (getActivity().checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT)
                    != PackageManager.PERMISSION_GRANTED) {
                call.reject("PERMISSION_DENIED", "Izin BLUETOOTH_CONNECT dibutuhkan. Berikan izin di Settings.");
                return;
            }
        }

        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null || !adapter.isEnabled()) {
            call.reject("BLUETOOTH_DISABLED", "Bluetooth tidak aktif.");
            return;
        }

        final String finalMac = mac;
        final String finalText = text;
        final String finalPaperWidth = paperWidth;

        new Thread(() -> {
            BluetoothSocket socket = null;
            OutputStream outputStream = null;

            try {
                BluetoothDevice device = adapter.getRemoteDevice(finalMac);
                adapter.cancelDiscovery();

                // Multi-method socket connection (Secure -> Insecure -> Reflection Channel 1)
                socket = connectToDeviceSocket(device);
                outputStream = socket.getOutputStream();

                byte[] printData = buildEscPosData(finalText, finalPaperWidth);
                outputStream.write(printData);
                outputStream.flush();

                // Beri waktu printer memproses sebelum close socket
                Thread.sleep(600);

                JSObject result = new JSObject();
                result.put("success", true);
                result.put("message", "Cetak berhasil.");
                call.resolve(result);

            } catch (IOException e) {
                Log.e(TAG, "Print error: " + e.getMessage(), e);
                String errMsg = e.getMessage() != null ? e.getMessage() : "IO Error";
                call.reject("PRINT_ERROR", "Gagal mencetak ke printer hardware: " + errMsg);
            } catch (Exception e) {
                Log.e(TAG, "Unexpected error: " + e.getMessage(), e);
                call.reject("UNKNOWN_ERROR", "Error tidak dikenal: " + e.getMessage());
            } finally {
                if (outputStream != null) {
                    try { outputStream.close(); } catch (IOException ignored) {}
                }
                if (socket != null) {
                    try { socket.close(); } catch (IOException ignored) {}
                }
            }
        }).start();
    }

    /**
     * Hubungkan socket dengan 3 metode fallback (Standard SPP -> Insecure SPP -> Reflection Channel 1)
     */
    private BluetoothSocket connectToDeviceSocket(BluetoothDevice device) throws IOException {
        BluetoothSocket socket = null;
        
        // Method 1: Standard Secure RFCOMM SPP Socket
        try {
            socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
            socket.connect();
            return socket;
        } catch (IOException e1) {
            Log.w(TAG, "Method 1 (Secure SPP) failed: " + e1.getMessage() + ". Trying Method 2 (Insecure SPP)...");
        }

        // Method 2: Insecure RFCOMM SPP Socket (Sangat Efektif untuk Printer RPP02N & T-104BT)
        try {
            socket = device.createInsecureRfcommSocketToServiceRecord(SPP_UUID);
            socket.connect();
            return socket;
        } catch (IOException e2) {
            Log.w(TAG, "Method 2 (Insecure SPP) failed: " + e2.getMessage() + ". Trying Method 3 (Reflection Channel 1)...");
        }

        // Method 3: Reflection Channel 1 Socket (Universal Hardware Fallback)
        try {
            java.lang.reflect.Method m = device.getClass().getMethod("createRfcommSocket", new Class[] { int.class });
            socket = (BluetoothSocket) m.invoke(device, 1);
            socket.connect();
            return socket;
        } catch (Exception e3) {
            Log.e(TAG, "All 3 socket connection methods failed!", e3);
            throw new IOException("Koneksi ke printer " + device.getName() + " (" + device.getAddress() + ") gagal. Pastikan printer menyala, saklar ON, dan lampu indikator Bluetooth menyala.");
        }
    }

    /**
     * Konversi teks terformat ke byte array ESC/POS commands.
     * Format tag per baris:
     *   [C]text    = center alignment
     *   [L]text    = left alignment (default)
     *   [B]text    = bold
     *   [2]text    = double height+width
     *   [DIV]      = garis putus-putus (----)
     *   [DIVD]     = garis ganda (====)
     *   [CUT]      = paper cut (partial)
     */
    private byte[] buildEscPosData(String text, String paperWidth) throws Exception {
        java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();

        // ESC @ - Initialize / reset printer settings
        bos.write(new byte[]{ESC, '@'});

        int charsPerLine = paperWidth.equals("80") ? 48 : 32;

        String[] lines = text.split("\n");
        for (String rawLine : lines) {
            String line = rawLine;
            boolean isBold = false;
            boolean isCenter = false;
            boolean isDoubleSize = false;

            // Parse alignment
            if (line.startsWith("[C]")) {
                isCenter = true;
                line = line.substring(3);
            } else if (line.startsWith("[L]")) {
                line = line.substring(3);
            }

            // Parse style
            if (line.startsWith("[B]")) {
                isBold = true;
                line = line.substring(3);
            } else if (line.startsWith("[2]")) {
                isDoubleSize = true;
                line = line.substring(3);
            }

            // Special lines
            if (line.equals("[DIV]")) {
                line = new String(new char[charsPerLine]).replace("\0", "-");
                isCenter = false;
            } else if (line.equals("[DIVD]")) {
                line = new String(new char[charsPerLine]).replace("\0", "=");
                isCenter = false;
            } else if (line.equals("[CUT]")) {
                bos.write(new byte[]{GS, 'V', 66, 0});
                continue;
            }

            // Bold ON: ESC E 1
            if (isBold) bos.write(new byte[]{ESC, 'E', 0x01});

            // Double size ON: GS ! 0x11
            if (isDoubleSize) bos.write(new byte[]{GS, '!', 0x11});

            // Alignment: ESC a n (0=left, 1=center, 2=right)
            bos.write(new byte[]{ESC, 'a', isCenter ? (byte) 0x01 : (byte) 0x00});

            // Write line bytes
            bos.write(line.getBytes("UTF-8"));
            bos.write(LF);

            // Reset Bold OFF: ESC E 0
            if (isBold) bos.write(new byte[]{ESC, 'E', 0x00});

            // Reset Double size OFF: GS ! 0x00
            if (isDoubleSize) bos.write(new byte[]{GS, '!', 0x00});
        }

        // Feed 4 baris agar struk keluar dari roller printer
        bos.write(new byte[]{LF, LF, LF, LF});

        return bos.toByteArray();
    }
}
