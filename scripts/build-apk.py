#!/usr/bin/env python3
import os
import sys
import subprocess
import shutil
from pathlib import Path
from PIL import Image, ImageDraw

SDK_ROOT = Path("/Users/puskarkumar/Library/Android/sdk")
BUILD_TOOLS = SDK_ROOT / "build-tools" / "34.0.0"
PLATFORM_JAR = SDK_ROOT / "platforms" / "android-34" / "android.jar"
AAPT2 = BUILD_TOOLS / "aapt2"
D8 = BUILD_TOOLS / "d8"
ZIPALIGN = BUILD_TOOLS / "zipalign"
APKSIGNER = BUILD_TOOLS / "apksigner"

JBR_HOME = Path("/Applications/Android Studio.app/Contents/jbr/Contents/Home")
JAVAC = JBR_HOME / "bin" / "javac"
KEYTOOL = JBR_HOME / "bin" / "keytool"

# Configure environment so d8 and apksigner use JBR java
os.environ["JAVA_HOME"] = str(JBR_HOME)
os.environ["PATH"] = f"{JBR_HOME}/bin:{os.environ.get('PATH', '')}"

WORKSPACE = Path("/Users/puskarkumar/Desktop/smartlearn")
BUILD_DIR = WORKSPACE / ".android-temp"
OUTPUT_APK_PUBLIC = WORKSPACE / "public" / "CurioSphere.apk"
OUTPUT_APK_DOWNLOADS = WORKSPACE / "public" / "downloads" / "CurioSphere.apk"

def log(msg):
    print(f"[APK-BUILD] {msg}")

def ensure_tools():
    for tool in [AAPT2, D8, ZIPALIGN, APKSIGNER, PLATFORM_JAR, JAVAC, KEYTOOL]:
        if not tool.exists():
            raise FileNotFoundError(f"Missing required tool/file: {tool}")
    log("All Android SDK tools & JBR verified.")

def create_icons(res_dir):
    # Generates launcher icons of various densities
    densities = {
        "mipmap-mdpi": (48, 48),
        "mipmap-hdpi": (72, 72),
        "mipmap-xhdpi": (96, 96),
        "mipmap-xxhdpi": (144, 144),
        "mipmap-xxxhdpi": (192, 192),
    }

    # Generate nice modern CurioSphere app icon (purple gradient with globe & graduation cap)
    for folder, (w, h) in densities.items():
        folder_path = res_dir / folder
        folder_path.mkdir(parents=True, exist_ok=True)
        img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        # Rounded squircle
        padding = max(2, int(w * 0.05))
        draw.rounded_rectangle(
            [(padding, padding), (w - padding, h - padding)],
            radius=int(w * 0.22),
            fill=(74, 17, 223, 255),
            outline=(143, 62, 255, 255),
            width=max(1, int(w * 0.03))
        )
        
        # Inner sphere circle
        cx, cy = w // 2, h // 2
        r = int(w * 0.28)
        draw.ellipse(
            [(cx - r, cy - r), (cx + r, cy + r)],
            fill=(149, 68, 251, 230),
            outline=(255, 255, 255, 240),
            width=max(1, int(w * 0.04))
        )
        
        # Center "C" letter
        draw.arc(
            [(cx - int(r*0.65), cy - int(r*0.65)), (cx + int(r*0.65), cy + int(r*0.65))],
            start=45, end=315,
            fill=(255, 255, 255, 255),
            width=max(2, int(w * 0.08))
        )

        img.save(folder_path / "ic_launcher.png", "PNG")
        img.save(folder_path / "ic_launcher_round.png", "PNG")

    log("Generated Android launcher icons.")

def main():
    ensure_tools()
    
    if BUILD_DIR.exists():
        shutil.rmtree(BUILD_DIR)
    BUILD_DIR.mkdir(parents=True)
    
    res_dir = BUILD_DIR / "res"
    values_dir = res_dir / "values"
    values_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Strings
    (values_dir / "strings.xml").write_text("""<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">CurioSphere</string>
</resources>
""")

    # 2. Styles
    (values_dir / "styles.xml").write_text("""<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="@android:style/Theme.Light.NoTitleBar">
        <item name="android:windowBackground">@android:color/white</item>
    </style>
</resources>
""")

    # 3. Icons
    create_icons(res_dir)

    # 4. AndroidManifest.xml
    manifest_file = BUILD_DIR / "AndroidManifest.xml"
    manifest_file.write_text("""<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.curiosphere.app"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-sdk
        android:minSdkVersion="24"
        android:targetSdkVersion="34" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true"
        android:hardwareAccelerated="true">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden|screenLayout|smallestScreenSize"
            android:windowSoftInputMode="adjustResize"
            android:launchMode="singleTask">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
""")

    # 5. Java source code
    java_src_dir = BUILD_DIR / "src" / "com" / "curiosphere" / "app"
    java_src_dir.mkdir(parents=True, exist_ok=True)
    
    (java_src_dir / "MainActivity.java").write_text("""package com.curiosphere.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

public class MainActivity extends Activity {
    private WebView webView;
    private ProgressBar progressBar;
    private ValueCallback<Uri[]> uploadMessage;
    private static final int FILE_CHOOSER_REQUEST = 101;
    private long backPressedTime = 0;

    private static final String APP_URL = "https://curiosphere-xi.vercel.app";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        FrameLayout root = new FrameLayout(this);
        root.setLayoutParams(new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        webView = new WebView(this);
        webView.setLayoutParams(new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        FrameLayout.LayoutParams pbParams = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            12
        );
        progressBar.setLayoutParams(pbParams);
        progressBar.setMax(100);

        root.addView(webView);
        root.addView(progressBar);
        setContentView(root);

        initWebView();
        webView.loadUrl(APP_URL);
    }

    private void initWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setDisplayZoomControls(false);

        String defaultUa = settings.getUserAgentString();
        settings.setUserAgentString(defaultUa + " CurioSphereMobileApp/1.0.0");

        webView.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);
        webView.setOverScrollMode(View.OVER_SCROLL_IF_CONTENT_SCROLLS);

        webView.setWebChromeClient(new AppChromeClient(this));
        webView.setWebViewClient(new AppWebClient(this));
    }

    void updateProgress(int newProgress) {
        if (newProgress < 100) {
            progressBar.setVisibility(View.VISIBLE);
            progressBar.setProgress(newProgress);
        } else {
            progressBar.setVisibility(View.GONE);
        }
    }

    void grantAppPermission(PermissionRequest request) {
        request.grant(request.getResources());
    }

    void handleFileRequest(ValueCallback<Uri[]> callback, Intent intent) {
        if (uploadMessage != null) {
            uploadMessage.onReceiveValue(null);
        }
        uploadMessage = callback;
        try {
            startActivityForResult(intent, FILE_CHOOSER_REQUEST);
        } catch (Exception e) {
            uploadMessage = null;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST) {
            if (uploadMessage == null) return;
            uploadMessage.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            uploadMessage = null;
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        } else if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (System.currentTimeMillis() - backPressedTime < 2000) {
                finish();
            } else {
                backPressedTime = System.currentTimeMillis();
                Toast.makeText(this, "Press back again to exit", Toast.LENGTH_SHORT).show();
            }
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    private static class AppChromeClient extends WebChromeClient {
        private final MainActivity activity;

        AppChromeClient(MainActivity activity) {
            this.activity = activity;
        }

        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            activity.updateProgress(newProgress);
        }

        @Override
        public void onPermissionRequest(final PermissionRequest request) {
            activity.grantAppPermission(request);
        }

        @Override
        public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
            Intent intent = fileChooserParams.createIntent();
            activity.handleFileRequest(filePathCallback, intent);
            return true;
        }
    }

    private static class AppWebClient extends WebViewClient {
        private final MainActivity activity;

        AppWebClient(MainActivity activity) {
            this.activity = activity;
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            String url = request.getUrl().toString();
            if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("whatsapp:")) {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    activity.startActivity(intent);
                    return true;
                } catch (Exception ignored) {}
            }
            return false;
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            activity.updateProgress(10);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            activity.updateProgress(100);
        }
    }
}
""")

    log("Created Android project structure.")

    # 6. Step 1: AAPT2 Compile resources
    compiled_res_zip = BUILD_DIR / "compiled_res.zip"
    cmd_compile = [
        str(AAPT2), "compile",
        "--dir", str(res_dir),
        "-o", str(compiled_res_zip)
    ]
    subprocess.check_call(cmd_compile)
    log("aapt2 compile completed.")

    # 7. Step 2: AAPT2 Link to generate intermediate APK + R.java
    gen_dir = BUILD_DIR / "gen"
    gen_dir.mkdir(parents=True, exist_ok=True)
    unaligned_apk = BUILD_DIR / "app-unaligned.apk"

    cmd_link = [
        str(AAPT2), "link",
        "-I", str(PLATFORM_JAR),
        "--manifest", str(manifest_file),
        "-o", str(unaligned_apk),
        "--java", str(gen_dir),
        "--auto-add-overlay",
        str(compiled_res_zip)
    ]
    subprocess.check_call(cmd_link)
    log("aapt2 link completed.")

    # 8. Step 3: Compile Java with javac
    bin_dir = BUILD_DIR / "bin"
    bin_dir.mkdir(parents=True, exist_ok=True)
    
    java_files = list(BUILD_DIR.glob("**/*.java"))
    cmd_javac = [
        str(JAVAC),
        "-cp", str(PLATFORM_JAR),
        "-d", str(bin_dir),
        "--release", "8"
    ] + [str(f) for f in java_files]
    subprocess.check_call(cmd_javac)
    log("javac compiled classes.")

    # 9. Step 4: D8 to generate classes.dex
    dex_dir = BUILD_DIR / "dex"
    dex_dir.mkdir(parents=True, exist_ok=True)
    
    classes_jar = BUILD_DIR / "app-classes.jar"
    JAR = JBR_HOME / "bin" / "jar"
    cmd_jar = [
        str(JAR), "cf", str(classes_jar),
        "-C", str(bin_dir), "."
    ]
    subprocess.check_call(cmd_jar)
    log("Packaged app-classes.jar.")

    cmd_d8 = [
        str(D8),
        "--lib", str(PLATFORM_JAR),
        "--output", str(dex_dir),
        "--min-api", "24",
        str(classes_jar)
    ]
    subprocess.check_call(cmd_d8)
    log("d8 generated classes.dex.")

    # 10. Step 5: Add classes.dex into unaligned_apk
    dex_file = dex_dir / "classes.dex"
    cmd_zip = ["zip", "-uj", str(unaligned_apk), str(dex_file)]
    subprocess.check_call(cmd_zip)
    log("Injected classes.dex into APK.")

    # 11. Step 6: Zipalign
    aligned_apk = BUILD_DIR / "app-aligned.apk"
    cmd_align = [
        str(ZIPALIGN), "-f", "4",
        str(unaligned_apk),
        str(aligned_apk)
    ]
    subprocess.check_call(cmd_align)
    log("zipalign completed.")

    # 12. Step 7: Create keystore & sign with apksigner
    keystore = BUILD_DIR / "release.keystore"
    if not keystore.exists():
        cmd_key = [
            str(KEYTOOL), "-genkeypair",
            "-v",
            "-keystore", str(keystore),
            "-alias", "curiosphere",
            "-keyalg", "RSA",
            "-keysize", "2048",
            "-validity", "10000",
            "-storepass", "curiosphere123",
            "-keypass", "curiosphere123",
            "-dname", "CN=CurioSphere, OU=Education, O=CurioSphere, L=Delhi, ST=Delhi, C=IN"
        ]
        subprocess.check_call(cmd_key)
        log("Generated release keystore.")

    final_signed_apk = BUILD_DIR / "CurioSphere-signed.apk"
    cmd_sign = [
        str(APKSIGNER), "sign",
        "--v1-signing-enabled", "true",
        "--v2-signing-enabled", "true",
        "--ks", str(keystore),
        "--ks-pass", "pass:curiosphere123",
        "--key-pass", "pass:curiosphere123",
        "--ks-key-alias", "curiosphere",
        "--out", str(final_signed_apk),
        str(aligned_apk)
    ]
    subprocess.check_call(cmd_sign)
    log("apksigner signed APK.")

    # Verify APK signature
    cmd_verify = [str(APKSIGNER), "verify", "--verbose", str(final_signed_apk)]
    subprocess.check_call(cmd_verify)
    log("APK signature verified successfully!")

    # Copy to public folder
    OUTPUT_APK_PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_APK_DOWNLOADS.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(final_signed_apk, OUTPUT_APK_PUBLIC)
    shutil.copy2(final_signed_apk, OUTPUT_APK_DOWNLOADS)

    apk_size_mb = os.path.getsize(OUTPUT_APK_PUBLIC) / (1024 * 1024)
    log(f"SUCCESS! Built CurioSphere.apk ({apk_size_mb:.2f} MB)")
    log(f"Published to: {OUTPUT_APK_PUBLIC}")
    log(f"Published to: {OUTPUT_APK_DOWNLOADS}")

if __name__ == "__main__":
    main()
