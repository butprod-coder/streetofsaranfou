# Xiaomi Mi Laser Projector: debloat + Clean Home launcher

Device: **Xiaomi Mi Laser Projector** (`MiProjA1`, codename `anglee`), Android TV 9 (SDK 28),
Amlogic `txlx`, firmware `PQ3B.190705.003/2977`, `ro.adb.secure=1`. Network over the built-in
Ethernet port (`eth0`, not USB). Done on 2026-10-25.

Notes for this firmware:
- Sideloading works (`pm install` succeeds), including HOME apps without a Xiaomi signature.
- `cmd package set-home-activity` prints `Success` but changes nothing while the stock launcher
  (`com.google.android.tvlauncher`, HOME priority 2) is enabled. Disabling it is what hands Home over.
- Only the stock launcher and `com.android.tv.settings/.system.FallbackHome` claim HOME;
  setupwraith does not.
- The firmware does not re-enable anything at boot (checked after two reboots).
- At power-on it opens Home, not Live TV.

## What was disabled

All with `pm disable-user --user 0`, nothing uninstalled. The list is in
[`backup/disabled-by-us.txt`](backup/disabled-by-us.txt):

| Group | Packages |
|---|---|
| Telemetry | `com.google.android.feedback`, `com.google.android.tv.bugreportsender`, `android.autoinstalls.config.xiaomi` (pushed CBS/ESPN/TED/Red Bull TV) |
| Recommendations / content | `com.google.android.tvrecommendations`, `com.google.android.leanbacklauncher.recommendations`, `com.google.android.partnersetup`, `com.formovie.launchboard`, `cn.formovie.fengos.iot` (Mi Home control) |
| Background | `com.google.android.apps.nbu.smartconnect.tv`, `com.google.android.sss.authbridge`, `com.android.printspooler`, `com.google.android.backdrop` (Ambient screensaver) |
| Preloaded apps | CBS News, ESPN, TED, Red Bull TV, Play Movies, YouTube Music, Play Games, Play Music, Formovie User Manual |
| Launcher | `com.google.android.tvlauncher` (replaced by Clean Home) |

Kept on purpose: Chromecast built-in, Google Assistant, all `com.fengmi.*` (keystone, focus,
projector settings), all `com.droidlogic.*` (HDMI/AV input, BLE remote), Live Channels, File Manager,
Netflix, YouTube, Play Store/Services, keyboard, and every app you installed yourself.

The packages that were already disabled before we started (TED, CBS News, ESPN, Red Bull TV) are in
`backup/packages-disabled-before.txt`.

## Re-enable one app

```bash
bash tools/tv.sh shell pm enable com.google.android.videos
```

Or put everything back (stock launcher first, then every package in the list):

```bash
bash restore.sh
```

These scripts need network ADB on (see "ADB" below). Without a computer: Settings > Apps >
See all apps > Show system apps > pick the app > Enable.

## The launcher (Clean Home)

Source in `launcher/` (Java, AndroidX RecyclerView, minSdk 26, debug build). Build, install and make
it the default Home:

```bash
bash build-install.sh
```

It uses Android Studio's JDK and the Gradle 8.13 cached in `~/.gradle`. `--no-build` reinstalls the last APK.

### Change the dock (apps and order)

Edit `launcher/app/src/main/res/values/config.xml`:

- `columns`: number of dock slots, and of grid columns (4 to 7). Currently 5.
- `dock_apps`: package names left to right. Currently Netflix, YouTube, Disney+, Prime Video, Smarters Pro.
- `hidden_apps`: packages to hide from the grid.

Then run `bash build-install.sh`. List package names with `bash tools/tv.sh shell pm list packages`.

### Change the wallpaper

The default is plain black (`background` in `config.xml`). For an image, push a 1920×1080 JPG or PNG
(no rebuild needed, it shows up the next time Home comes back):

```bash
bash tools/tv.sh shell mkdir -p /sdcard/Android/data/tv.clean.home/files
"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" -s 192.168.1.43:5555 push my-wallpaper.jpg /sdcard/Android/data/tv.clean.home/files/wallpaper.jpg
```

Delete that file to go back to black. Dark images work best behind white text.

### Using it

- Top bar: Inputs (dropdown with HDMI 1–3, AV, Live TV), network (shows Ethernet, or the Wi-Fi name), Settings.
- Up/Down move exactly one row. Up from the dock goes to the top bar. The ends of each row don't wrap.
- Back or Home from the grid jumps back to the dock. The last focused tile is remembered.
- Light by design: no blur, no video, no polling (clock and network are broadcast/callback driven).

## Optional: ad-blocking DNS (not enabled)

You chose not to. To turn it on later (doesn't block YouTube ads, and bypasses any DNS filtering
on your router):

```bash
bash tools/tv.sh shell settings put global private_dns_specifier dns.adguard-dns.com
bash tools/tv.sh shell settings put global private_dns_mode hostname
```

Undo: `settings put global private_dns_mode opportunistic`.

## ADB

Everything above needs Settings > Device preferences > About > press Build 7 times, then
Developer options > USB debugging (and network debugging) **on**. When done, switch it off again:
port 5555 is plaintext. Check it is closed with `bash tools/adb-closed.sh` (only "refused" is proof).

## Files

- `backup/`: package lists, getprop, all settings, Home and display state from before any change
- `restore.sh`: re-enables everything we disabled and gives Home back to the stock launcher
- `build-install.sh`: builds and installs the launcher and sets it as Home
- `tools/tv.sh`: ADB helper (`tools/tv.sh --screenshot shots/x.png DPAD_DOWN`, `tools/tv.sh shell '...'`)
- `tools/disable.sh`: disables packages one at a time, logs them, refuses core packages
- `tools/adb-closed.sh`: checks that network ADB refuses connections
- `shots/`: screenshots taken from the projector at each step
- `launcher/FONT-LICENSE-OFL.txt`: Outfit typeface licence (SIL OFL 1.1)
