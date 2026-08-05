package com.sunflower.manager;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

public class NotificationDismissReceiver extends BroadcastReceiver {
    public static final String EXTRA_SUMMARY_KEY = "summaryKey";
    private static final String PREFS_NAME = "sunflower_push_history";
    private static final String PREFS_KEY_PREFIX = "history_";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;
        String summaryKey = String.valueOf(intent.getStringExtra(EXTRA_SUMMARY_KEY) == null ? "" : intent.getStringExtra(EXTRA_SUMMARY_KEY)).trim();
        if (summaryKey.isEmpty()) return;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().remove(PREFS_KEY_PREFIX + summaryKey).apply();
    }
}
