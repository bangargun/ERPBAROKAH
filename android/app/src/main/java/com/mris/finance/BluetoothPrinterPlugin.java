package com.mris.finance;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import java.io.OutputStream;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(
    name = "BluetoothPrinter",
    permissions = {
        @Permission(
            strings = { Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_SCAN },
            alias = "bluetooth"
        )
    }
)
public class BluetoothPrinterPlugin extends Plugin {

    private static final String TAG = "BluetoothPrinterPlugin";
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    @PluginMethod
    public void scanPairedDevices(PluginCall call) {
        try {
            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            if (adapter == null) {
                call.reject("DEVICE_HAS_NO_BLUETOOTH");
                return;
            }

            if (!adapter.isEnabled()) {
                call.reject("BLUETOOTH_DISABLED");
                return;
            }

            Set<BluetoothDevice> pairedDevices = adapter.getBondedDevices();
            JSArray deviceList = new JSArray();

            if (pairedDevices != null) {
                for (BluetoothDevice device : pairedDevices) {
                    JSObject devObj = new JSObject();
                    devObj.put("name", device.getName() != null ? device.getName() : "Perangkat Bluetooth");
                    devObj.put("address", device.getAddress());
                    devObj.put("type", "bluetooth");
                    deviceList.put(devObj);
                }
            }

            JSObject result = new JSObject();
            result.put("devices", deviceList);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error scanning paired devices", e);
            call.reject("FAILED_TO_SCAN: " + e.getMessage());
        }
    }

    @PluginMethod
    public void printText(PluginCall call) {
        String macAddress = call.getString("mac");
        String textToPrint = call.getString("text");

        if (macAddress == null || macAddress.trim().isEmpty()) {
            call.reject("MAC_ADDRESS_REQUIRED");
            return;
        }

        if (textToPrint == null) {
            textToPrint = "";
        }

        final String finalMac = macAddress.trim();
        final String finalPrintText = textToPrint;

        // Print asynchronously in background thread to avoid blocking main UI loop
        new Thread(() -> {
            BluetoothSocket socket = null;
            OutputStream outputStream = null;
            try {
                BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
                if (adapter == null || !adapter.isEnabled()) {
                    call.reject("BLUETOOTH_DISABLED");
                    return;
                }

                // Sanitize MAC address
                String cleanMac = finalMac.toUpperCase().replaceAll("[^0-9A-F:]", "");
                BluetoothDevice device = adapter.getRemoteDevice(cleanMac);

                // Cancel discovery before connecting to maximize connection success rate
                try { adapter.cancelDiscovery(); } catch (Exception ignored) {}

                // 3-Tier Fallback Socket Connection Strategy:
                // 1. Standard Secure SPP RFCOMM
                // 2. Insecure SPP RFCOMM (Required for cheap 58mm/80mm Chinese thermal printers)
                // 3. Direct Reflection Channel 1 Port
                try {
                    Log.d(TAG, "Attempting Method 1 (Secure SPP RFCOMM)...");
                    socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                    socket.connect();
                } catch (Exception e1) {
                    Log.w(TAG, "Method 1 failed (" + e1.getMessage() + "), attempting Method 2 (Insecure SPP RFCOMM)...");
                    try {
                        socket = device.createInsecureRfcommSocketToServiceRecord(SPP_UUID);
                        socket.connect();
                    } catch (Exception e2) {
                        Log.w(TAG, "Method 2 failed (" + e2.getMessage() + "), attempting Method 3 (Direct Channel 1)...");
                        Method m = device.getClass().getMethod("createRfcommSocket", new Class[]{int.class});
                        socket = (BluetoothSocket) m.invoke(device, 1);
                        socket.connect();
                    }
                }

                Log.d(TAG, "🟢 Socket connected successfully!");
                outputStream = socket.getOutputStream();

                // ESC/POS Initialization bytes: ESC @ (Reset Printer)
                byte[] initPrinter = new byte[]{0x1B, 0x40};
                outputStream.write(initPrinter);

                // Process text lines and ESC/POS tags
                String[] lines = finalPrintText.split("\n");
                for (String line : lines) {
                    byte[] alignCmd = new byte[]{0x1B, 0x61, 0x00}; // Left align default
                    byte[] fontBoldCmd = new byte[]{0x1B, 0x45, 0x00}; // Bold off

                    String cleanLine = line;

                    if (cleanLine.contains("[C]")) {
                        alignCmd = new byte[]{0x1B, 0x61, 0x01}; // Center align
                        cleanLine = cleanLine.replace("[C]", "");
                    } else if (cleanLine.contains("[R]")) {
                        alignCmd = new byte[]{0x1B, 0x61, 0x02}; // Right align
                        cleanLine = cleanLine.replace("[R]", "");
                    }

                    if (cleanLine.contains("[B]")) {
                        fontBoldCmd = new byte[]{0x1B, 0x45, 0x01}; // Bold on
                        cleanLine = cleanLine.replace("[B]", "");
                    }

                    if (cleanLine.contains("[DIV]")) {
                        cleanLine = "--------------------------------";
                    } else if (cleanLine.contains("[DIVD]")) {
                        cleanLine = "================================";
                    }

                    outputStream.write(alignCmd);
                    outputStream.write(fontBoldCmd);
                    outputStream.write((cleanLine + "\n").getBytes(StandardCharsets.UTF_8));
                }

                // Feed 3 lines & Paper Cut command (ESC i)
                byte[] feedAndCut = new byte[]{0x1B, 0x64, 0x03, 0x1D, 0x56, 0x42, 0x00};
                outputStream.write(feedAndCut);
                outputStream.flush();

                JSObject res = new JSObject();
                res.put("success", true);
                res.put("message", "Struk berhasil dicetak ke hardware printer.");
                call.resolve(res);

            } catch (Exception e) {
                Log.e(TAG, "Error printing to Bluetooth hardware", e);
                call.reject("PRINT_FAILED: " + e.getMessage());
            } finally {
                try {
                    if (outputStream != null) outputStream.close();
                    if (socket != null) socket.close();
                } catch (Exception ignored) {}
            }
        }).start();
    }
}
