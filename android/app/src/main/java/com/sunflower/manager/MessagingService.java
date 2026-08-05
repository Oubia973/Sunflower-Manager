package com.sunflower.manager;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.AssetManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.text.format.DateFormat;
import android.view.View;
import android.widget.RemoteViews;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Date;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

public class MessagingService extends FirebaseMessagingService {
    private static final String CHANNEL_ID = "sunflower_push";
    private static final String PREFS_NAME = "sunflower_push_history";
    private static final String PREFS_KEY_PREFIX = "history_";
    private static final int MAX_COMPACT_OTHER_ICONS = 7;
    private static final int MAX_EXPANDED_ITEMS = 5;
    private static final int NOTIF_ICON_MAX_SIZE_PX = 96;

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        PushNotificationsPlugin.sendRemoteMessage(remoteMessage);
        showNotification(remoteMessage);
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        PushNotificationsPlugin.onNewToken(token);
    }

    private void showNotification(RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();
        if (data == null || data.isEmpty()) return;

        String title = firstNonEmpty(
            data.get("title"),
            remoteMessage.getNotification() != null ? remoteMessage.getNotification().getTitle() : null,
            "Notification"
        );
        String body = firstNonEmpty(
            data.get("body"),
            remoteMessage.getNotification() != null ? remoteMessage.getNotification().getBody() : null,
            ""
        );
        String itemIconPath = firstNonEmpty(data.get("itemIconPath"), "");
        String farmId = firstNonEmpty(data.get("farmId"), "");
        String summaryKey = buildSummaryKey(farmId);
        Bitmap largeIcon = loadBitmap(itemIconPath);
        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) return;
        ensureChannel(notificationManager);

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent, pendingFlags);
        PendingIntent deleteIntent = buildDeleteIntent(summaryKey);

        NotificationEntry entry = new NotificationEntry(title, body, itemIconPath, System.currentTimeMillis());
        List<NotificationEntry> history = storeNotificationHistory(summaryKey, entry);
        try {
            postSummary(notificationManager, summaryKey, history, pendingIntent, deleteIntent);
        } catch (Exception error) {
            showFallbackNotification(notificationManager, pendingIntent, deleteIntent, title, body, largeIcon);
        }
    }

    private void ensureChannel(NotificationManager notificationManager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = notificationManager.getNotificationChannel(CHANNEL_ID);
        if (channel != null) return;
        NotificationChannel created = new NotificationChannel(
            CHANNEL_ID,
            "Sunflower notifications",
            NotificationManager.IMPORTANCE_HIGH
        );
        created.setDescription("Push notifications from Sunflower Manager");
        notificationManager.createNotificationChannel(created);
    }

    private Bitmap loadBitmap(String iconPath) {
        String path = normalizeAssetPath(iconPath);
        if (path.isEmpty()) return null;

        try {
            if (path.startsWith("http://") || path.startsWith("https://")) {
                HttpURLConnection connection = (HttpURLConnection) new URL(path).openConnection();
                connection.setConnectTimeout(5000);
                connection.setReadTimeout(5000);
                connection.setDoInput(true);
                connection.connect();
                try (InputStream input = connection.getInputStream()) {
                    return scaleBitmapForNotification(BitmapFactory.decodeStream(input));
                } finally {
                    connection.disconnect();
                }
            }

            AssetManager assets = getAssets();
            String assetPath = path.startsWith("public/") ? path : "public/" + path;
            try (InputStream input = assets.open(assetPath)) {
                return scaleBitmapForNotification(BitmapFactory.decodeStream(input));
            }
        } catch (Exception error) {
            return null;
        }
    }

    private Bitmap scaleBitmapForNotification(Bitmap source) {
        if (source == null) return null;
        int width = source.getWidth();
        int height = source.getHeight();
        if (width <= 0 || height <= 0) return source;
        int maxDim = Math.max(width, height);
        if (maxDim <= NOTIF_ICON_MAX_SIZE_PX) return source;
        float scale = NOTIF_ICON_MAX_SIZE_PX / (float) maxDim;
        int scaledWidth = Math.max(1, Math.round(width * scale));
        int scaledHeight = Math.max(1, Math.round(height * scale));
        return Bitmap.createScaledBitmap(source, scaledWidth, scaledHeight, true);
    }

    private String normalizeAssetPath(String rawPath) {
        String value = String.valueOf(rawPath == null ? "" : rawPath).trim();
        if (value.isEmpty()) return "";
        value = value.replace('\\', '/');
        while (value.startsWith("./")) {
            value = value.substring(2);
        }
        while (value.startsWith("/")) {
            value = value.substring(1);
        }
        return value;
    }

    private String firstNonEmpty(String... values) {
        for (String value : values) {
            if (value == null) continue;
            String text = String.valueOf(value).trim();
            if (!text.isEmpty()) return text;
        }
        return values.length > 0 ? values[values.length - 1] : null;
    }

    private String buildSummaryKey(String farmId) {
        String cleanFarmId = String.valueOf(farmId == null ? "" : farmId).trim();
        return cleanFarmId.isEmpty() ? "sunflower_push_default" : "sunflower_push_" + cleanFarmId;
    }

    private List<NotificationEntry> storeNotificationHistory(String groupKey, NotificationEntry entry) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String storageKey = PREFS_KEY_PREFIX + groupKey;
        JSONArray current = new JSONArray();
        try {
            String raw = prefs.getString(storageKey, "");
            if (raw != null && !raw.trim().isEmpty()) {
                current = new JSONArray(raw);
            }
        } catch (Exception ignored) {
            current = new JSONArray();
        }

        JSONArray next = new JSONArray();
        next.put(entry.toJson());
        for (int index = 0; index < current.length(); index++) {
            try {
                next.put(current.getJSONObject(index));
            } catch (Exception ignored) {
                // Skip malformed entries.
            }
        }

        prefs.edit().putString(storageKey, next.toString()).apply();
        return readNotificationHistory(next);
    }

    private List<NotificationEntry> readNotificationHistory(JSONArray history) {
        if (history == null || history.length() < 1) return Collections.emptyList();
        List<NotificationEntry> out = new ArrayList<>();
        for (int index = 0; index < history.length(); index++) {
            try {
                out.add(NotificationEntry.fromJson(history.getJSONObject(index)));
            } catch (Exception ignored) {
                // Skip malformed entries.
            }
        }
        return out;
    }

    private void postSummary(NotificationManager notificationManager, String summaryKey, List<NotificationEntry> history, PendingIntent pendingIntent, PendingIntent deleteIntent) {
        if (history == null || history.isEmpty()) return;
        RemoteViews contentView = buildCompactSummaryView(history);
        RemoteViews bigContentView = buildDetailedSummaryView(history);

        NotificationCompat.Builder summaryBuilder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_notify)
            .setContentTitle(history.get(0).titleText())
            .setContentText(history.get(0).bodyText())
            .setStyle(new NotificationCompat.DecoratedCustomViewStyle())
            .setCustomContentView(contentView)
            .setCustomHeadsUpContentView(contentView)
            .setCustomBigContentView(bigContentView)
            .setColor(ContextCompat.getColor(this, R.color.notification_accent))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setDeleteIntent(deleteIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

        int summaryId = (Math.abs(summaryKey.hashCode()) & 0x7fffffff);
        notificationManager.notify(summaryId, summaryBuilder.build());
    }

    private void showFallbackNotification(NotificationManager notificationManager, PendingIntent pendingIntent, PendingIntent deleteIntent, String title, String body, Bitmap largeIcon) {
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_notify)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setColor(ContextCompat.getColor(this, R.color.notification_accent))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setDeleteIntent(deleteIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

        if (largeIcon != null) {
            builder.setLargeIcon(largeIcon);
        }

        int fallbackId = String.valueOf(title + "|" + body).hashCode() & 0x7fffffff;
        notificationManager.notify(fallbackId, builder.build());
    }

    private RemoteViews buildCompactSummaryView(List<NotificationEntry> history) {
        RemoteViews view = new RemoteViews(getPackageName(), R.layout.notification_summary_compact);

        NotificationEntry latest = history.get(0);
        Bitmap latestIcon = loadBitmap(latest.iconPath);
        if (latestIcon != null) {
            view.setImageViewBitmap(R.id.compact_main_icon, latestIcon);
        } else {
            view.setImageViewResource(R.id.compact_main_icon, R.drawable.ic_stat_notify);
        }
        view.setTextViewText(R.id.compact_main_title, latest.titleText());
        view.setTextViewText(R.id.compact_main_body, formatLocalTime(latest.timestamp));

        int otherCount = Math.max(0, history.size() - 1);
        int visibleOtherIcons = Math.min(MAX_COMPACT_OTHER_ICONS, otherCount);
        view.setViewVisibility(R.id.compact_other_row, otherCount > 0 ? View.VISIBLE : View.GONE);

        for (int slot = 0; slot < MAX_COMPACT_OTHER_ICONS; slot++) {
            int iconId = getCompactOtherIconId(slot);
            if (slot < visibleOtherIcons) {
                Bitmap icon = loadBitmap(history.get(slot + 1).iconPath);
                view.setViewVisibility(iconId, View.VISIBLE);
                if (icon != null) {
                    view.setImageViewBitmap(iconId, icon);
                } else {
                    view.setImageViewResource(iconId, R.drawable.ic_stat_notify);
                }
            } else {
                view.setViewVisibility(iconId, View.GONE);
            }
        }

        int compactRemaining = Math.max(0, otherCount - MAX_COMPACT_OTHER_ICONS);
        if (compactRemaining > 0) {
            view.setViewVisibility(R.id.compact_more, View.VISIBLE);
            view.setTextViewText(R.id.compact_more, "+" + compactRemaining);
        } else {
            view.setViewVisibility(R.id.compact_more, View.GONE);
        }
        return view;
    }

    private RemoteViews buildDetailedSummaryView(List<NotificationEntry> history) {
        RemoteViews view = new RemoteViews(getPackageName(), R.layout.notification_group_summary);

        int visibleCount = Math.min(MAX_EXPANDED_ITEMS, history.size());
        for (int index = 0; index < visibleCount; index++) {
            NotificationEntry entry = history.get(index);
            RemoteViews row = new RemoteViews(getPackageName(), R.layout.notification_summary_line);
            Bitmap icon = loadBitmap(entry.iconPath);
            if (icon != null) {
                row.setImageViewBitmap(R.id.item_icon, icon);
            } else {
                row.setImageViewResource(R.id.item_icon, R.drawable.ic_stat_notify);
            }
            row.setTextViewText(R.id.item_title, entry.titleText());
            row.setTextViewText(R.id.item_body, formatLocalTime(entry.timestamp));
            view.addView(R.id.detail_container, row);
        }
        int remaining = Math.max(0, history.size() - visibleCount);
        if (remaining > 0) {
            RemoteViews row = new RemoteViews(getPackageName(), R.layout.notification_summary_line);
            row.setImageViewResource(R.id.item_icon, R.drawable.ic_stat_notify);
            row.setTextViewText(R.id.item_title, "+" + remaining);
            row.setTextViewText(R.id.item_body, "");
            view.addView(R.id.detail_container, row);
        }
        return view;
    }

    private String formatLocalTime(long timestamp) {
        if (timestamp <= 0L) {
            return "";
        }
        return DateFormat.getTimeFormat(this).format(new Date(timestamp));
    }

    private PendingIntent buildDeleteIntent(String summaryKey) {
        Intent intent = new Intent(this, NotificationDismissReceiver.class);
        intent.setAction("com.sunflower.manager.NOTIFICATION_DISMISSED");
        intent.putExtra(NotificationDismissReceiver.EXTRA_SUMMARY_KEY, summaryKey);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        int requestCode = String.valueOf(summaryKey == null ? "" : summaryKey).hashCode() & 0x7fffffff;
        return PendingIntent.getBroadcast(this, requestCode, intent, flags);
    }

    private int getCompactOtherIconId(int slot) {
        switch (slot) {
            case 0: return R.id.compact_other_icon_1;
            case 1: return R.id.compact_other_icon_2;
            case 2: return R.id.compact_other_icon_3;
            case 3: return R.id.compact_other_icon_4;
            case 4: return R.id.compact_other_icon_5;
            case 5: return R.id.compact_other_icon_6;
            default: return R.id.compact_other_icon_7;
        }
    }

    private static final class NotificationEntry {
        private final String title;
        private final String body;
        private final String iconPath;
        private final long timestamp;

        private NotificationEntry(String title, String body, String iconPath, long timestamp) {
            this.title = String.valueOf(title == null ? "" : title).trim();
            this.body = String.valueOf(body == null ? "" : body).trim();
            this.iconPath = String.valueOf(iconPath == null ? "" : iconPath).trim();
            this.timestamp = timestamp;
        }

        private String titleText() {
            return title.isEmpty() ? body : title;
        }

        private String bodyText() {
            return body.isEmpty() ? title : body;
        }

        private JSONObject toJson() {
            JSONObject object = new JSONObject();
            try {
                object.put("title", title);
                object.put("body", body);
                object.put("iconPath", iconPath);
                object.put("timestamp", timestamp);
            } catch (Exception ignored) {
                // Ignore JSON write failures here.
            }
            return object;
        }

        private static NotificationEntry fromJson(JSONObject object) {
            if (object == null) {
                return new NotificationEntry("", "", "", 0L);
            }
            return new NotificationEntry(
                object.optString("title", ""),
                object.optString("body", ""),
                object.optString("iconPath", ""),
                object.optLong("timestamp", 0L)
            );
        }
    }
}
