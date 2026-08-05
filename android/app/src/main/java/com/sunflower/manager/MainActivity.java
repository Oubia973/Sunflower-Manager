package com.sunflower.manager;

import com.getcapacitor.BridgeActivity;
import android.os.Build;
import android.os.Bundle;
import androidx.core.graphics.Insets;
import androidx.core.view.WindowCompat;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        final android.view.View content = findViewById(android.R.id.content);
        // Android 15+ can enforce edge-to-edge, so use runtime system bar insets there.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
            ViewCompat.setOnApplyWindowInsetsListener(content, (view, insets) -> {
                Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
                view.setPadding(0, systemBars.top, 0, systemBars.bottom);
                return insets;
            });
            ViewCompat.requestApplyInsets(content);
        } else {
            WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
            content.setPadding(0, 0, 0, 0);
        }
    }
}
