package com.example.notebooklmbooth;

import android.content.Intent;
import android.content.pm.PackageManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeLauncher")
public class NativeLauncherPlugin extends Plugin {

    @PluginMethod
    public void launchApp(PluginCall call) {
        String packageName = call.getString("packageName");
        
        if (packageName == null) {
            call.reject("Must provide a packageName");
            return;
        }

        PackageManager pm = getContext().getPackageManager();
        Intent intent = pm.getLaunchIntentForPackage(packageName);

        if (intent != null) {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } else {
            call.reject("Package not found: " + packageName);
        }
    }
}
