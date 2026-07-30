package com.mris.finance;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
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
 *   - scanPairedDevices()               -> { devices: [{name, address, type}] }
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

    /**
     * Kembalikan daftar perangkat Bluetooth yang sudah dipair.
     * User harus sudah pair printer dari Settings Android -> Bluetooth.
     */
    @PluginMethod
    public void scanPairedDevices(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (getActivity().checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT)
                    != PackageManager.PERMISSION_GRANTED) {
                requestPermissionForAlias("bluetoothConnect", call, "bluetoothConnectCallback");
                return;
            }
        }

        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null || !adapter.isEnabled()) {
            call.reject("BLUETOOTH_DISABLED", "Bluetooth tidak aktif. Aktifkan Bluetooth terlebih dahulu.");
            return;
        }

        Set<BluetoothDevice> pairedDevices = adapter.getBondedDevices();
        JSArray deviceArray = new JSArray();

        for (BluetoothDevice device : pairedDevices) {
            JSObject dev = new JSObject();
            dev.put("name", device.getName() != null ? device.getName() : "Unknown Device");
            dev.put("address", device.getAddress());
            dev.put("type", device.getType() == BluetoothDevice.DEVICE_TYPE_CLASSIC ? "classic" : "le");
            deviceArray.put(dev);
        }

        JSObject result = new JSObject();
        result.put("devices", deviceArray);
        call.resolve(result);
    }

    @PermissionCallback
    private void bluetoothConnectCallback(PluginCall call) {
        if (getActivity().checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT)
                == PackageManager.PERMISSION_GRANTED) {
            scanPairedDevices(call);
        } else {
            call.reject("PERMISSION_DENIED", "Izin Bluetooth tidak diberikan.");
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
                socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                adapter.cancelDiscovery();
                socket.connect();
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
                if (errMsg.contains("Connection refused")) {
                    call.reject("CONNECTION_REFUSED", "Printer menolak koneksi. Pastikan printer menyala dan tidak digunakan aplikasi lain.");
                } else if (errMsg.contains("busy")) {
                    call.reject("DEVICE_BUSY", "Printer sedang sibuk. Coba beberapa saat lagi.");
                } else {
                    call.reject("PRINT_ERROR", "Gagal mencetak: " + errMsg);
                }
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
