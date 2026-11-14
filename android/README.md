# INDUSTRIUM for Android

The Android build uses a native Activity and a WebView with a private HTTPS origin. It bundles the same Phaser game as GitHub Pages and requires no internet permission at runtime.

Build with a JDK, Android SDK Platform 35, and Build Tools 35.0.0. Set ANDROID_HOME, INDUSTRIUM_KEYSTORE, and INDUSTRIUM_KEYSTORE_PASSWORD, then run `bash android/build.sh /absolute/path/INDUSTRIUM.apk`. Use the original private signing key and application ID for updates, and increment versionCode. Never commit the signing key or its password.

To transfer a factory, open Menu → Settings → World management → Show save code in the source game and copy it. Open Paste save code at the same location in the destination game, paste, and confirm Import factory. The destination's current factory is replaced.
