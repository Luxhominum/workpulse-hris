package com.hris.workpulse;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.location.Location;
import android.location.LocationManager;
import android.os.Build;
import android.provider.Settings;
import androidx.core.app.NotificationCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SecurityPlugin")
public class SecurityPlugin extends Plugin {

    private static final String CHANNEL_ID = "workpulse_hris_alerts";

    @PluginMethod
    public void checkDeviceIntegrity(PluginCall call) {
        JSObject ret = new JSObject();
        boolean isMock = false;
        boolean isDevMode = false;
        Context ctx = getContext();

        // 1. Detect Developer Options
        try {
            isDevMode = Settings.Secure.getInt(
                ctx.getContentResolver(),
                Settings.Global.DEVELOPMENT_SETTINGS_ENABLED,
                0
            ) != 0;
        } catch (Exception ignored) {}

        // 2. Detect Mock Location Provider
        try {
            LocationManager lm = (LocationManager) ctx.getSystemService(Context.LOCATION_SERVICE);
            if (lm != null) {
                Location loc = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER);
                if (loc == null) {
                    loc = lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
                }
                if (loc != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        isMock = loc.isMock();
                    } else {
                        isMock = loc.isFromMockProvider();
                    }
                }
            }
        } catch (SecurityException ignored) {}

        ret.put("isMockLocation", isMock);
        ret.put("isDevMode", isDevMode);
        ret.put("platform", "android");
        call.resolve(ret);
    }

    @PluginMethod
    public void showSystemNotification(PluginCall call) {
        String title = call.getString("title", "WorkPulse HRIS");
        String message = call.getString("message", "Pemberitahuan aktivitas presensi");

        Context ctx = getContext();
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.LOCATION_SERVICE);
        NotificationManager notifManager = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notifManager == null) {
            call.resolve();
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "WorkPulse HRIS Notifications",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Pengingat presensi dan pembaruan perizinan");
            notifManager.createNotificationChannel(channel);
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true);

        notifManager.notify((int) (System.currentTimeMillis() % 100000), builder.build());
        call.resolve();
    }
}
