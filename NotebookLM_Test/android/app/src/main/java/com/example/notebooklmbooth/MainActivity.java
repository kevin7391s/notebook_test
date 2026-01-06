package com.example.notebooklmbooth;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeLauncherPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
