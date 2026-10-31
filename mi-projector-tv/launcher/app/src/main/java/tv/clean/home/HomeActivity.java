package tv.clean.home;

import android.animation.ArgbEvaluator;
import android.animation.ValueAnimator;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Outline;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.media.tv.TvContract;
import android.media.tv.TvInputInfo;
import android.media.tv.TvInputManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.Bundle;
import android.provider.Settings;
import android.text.format.DateFormat;
import android.util.DisplayMetrics;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewOutlineProvider;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.OvershootInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.LinearSmoothScroller;
import androidx.recyclerview.widget.RecyclerView;

import java.io.File;
import java.text.Collator;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Date;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Apple TV style home screen: top bar, dock in a rounded band, app grid below.
 * D-pad focus is handled here, not by the view system, so movement is deterministic:
 * one row per Up/Down, no wrapping, Up from the dock goes to the top bar.
 */
public class HomeActivity extends Activity {
    private static final int ZONE_TOP = 0, ZONE_DOCK = 1, ZONE_GRID = 2;
    private static final int TYPE_HEADER = 0, TYPE_DOCK = 1, TYPE_SPACER = 2, TYPE_GRID = 3;
    private static final float FOCUS_SCALE = 1.08f;
    private static final String[] LIVE_TV_PACKAGES = {"com.google.android.tv", "com.android.tv"};

    private float dp;
    private int columns, tileH, dockRowH, gridTop;
    private RecyclerView list;
    private GridLayoutManager layoutManager;
    private final Adapter adapter = new Adapter();
    private final Highlight highlight = new Highlight();

    private View header;
    private TextView greeting, clock, date, hero;
    private GradientDrawable glowDrawable;
    private int glowColor = AppEntry.DEFAULT_COLOR;
    private ValueAnimator glowAnim;
    private TextView[] pills;
    private LinearLayout dropdown;
    private final List<Runnable> dropdownActions = new ArrayList<>();
    private int dropdownIndex = -1;
    private ImageView wallpaper;
    private long wallpaperStamp;

    private final List<AppEntry> dock = new ArrayList<>();
    private final List<AppEntry> grid = new ArrayList<>();
    private int dockSlots; // dock row cells including spacers (0 when the dock is empty)
    private int zone = ZONE_DOCK, topIndex = 0, dockCol = 0, gridIndex = 0;
    private boolean appsLoaded;
    private SharedPreferences prefs;
    private ConnectivityManager.NetworkCallback networkCallback;

    private final BroadcastReceiver timeReceiver = new BroadcastReceiver() {
        @Override public void onReceive(Context c, Intent i) { updateClock(); }
    };
    private final BroadcastReceiver packageReceiver = new BroadcastReceiver() {
        @Override public void onReceive(Context c, Intent i) { loadApps(); }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_home);
        prefs = getSharedPreferences("home", MODE_PRIVATE);

        DisplayMetrics m = getResources().getDisplayMetrics();
        dp = m.density;
        columns = Math.max(4, Math.min(7, getResources().getInteger(R.integer.columns)));
        int side = px(60);
        int cellW = (m.widthPixels - 2 * side) / columns;
        int tileW = cellW - 2 * px(12);
        tileH = tileW * 9 / 16;
        dockRowH = px(14) + tileH + px(8) + px(22) + px(12);
        gridTop = dockRowH + px(36);

        wallpaper = findViewById(R.id.wallpaper);
        dropdown = findViewById(R.id.dropdown);
        list = findViewById(R.id.list);
        list.setPadding(side, 0, side, px(48));
        list.setClipToPadding(false);
        list.setClipChildren(false);
        list.setItemAnimator(null);
        list.setFocusable(false);
        list.setDescendantFocusability(ViewGroup.FOCUS_BLOCK_DESCENDANTS);
        list.setOverScrollMode(View.OVER_SCROLL_NEVER);
        layoutManager = new GridLayoutManager(this, columns);
        layoutManager.setSpanSizeLookup(new GridLayoutManager.SpanSizeLookup() {
            @Override public int getSpanSize(int position) { return position == 0 ? columns : 1; }
        });
        list.setLayoutManager(layoutManager);
        list.addItemDecoration(new DockBand());
        list.addItemDecoration(highlight);
        list.addOnScrollListener(new RecyclerView.OnScrollListener() {
            @Override public void onScrolled(@NonNull RecyclerView rv, int dx, int dy) { highlight.scrolled(dy); }
        });

        header = LayoutInflater.from(this).inflate(R.layout.header, list, false);
        // Dock row sits at the bottom of the screen; the grid starts just below it, out of view.
        header.getLayoutParams().height = m.heightPixels - dockRowH - px(14);
        greeting = header.findViewById(R.id.greeting);
        clock = header.findViewById(R.id.clock);
        date = header.findViewById(R.id.date);
        hero = header.findViewById(R.id.hero);
        pills = new TextView[] {
                header.findViewById(R.id.pill_inputs),
                header.findViewById(R.id.pill_network),
                header.findViewById(R.id.pill_settings)};
        glowDrawable = new GradientDrawable();
        glowDrawable.setGradientType(GradientDrawable.RADIAL_GRADIENT);
        glowDrawable.setGradientRadius(px(330)); // under half the glow view's height, or the gradient shows an edge
        setGlow(glowColor);
        header.findViewById(R.id.glow).setBackground(glowDrawable);
        list.setAdapter(adapter);

        IntentFilter time = new IntentFilter(Intent.ACTION_TIME_TICK);
        time.addAction(Intent.ACTION_TIME_CHANGED);
        time.addAction(Intent.ACTION_TIMEZONE_CHANGED);
        registerReceiver(timeReceiver, time);
        IntentFilter pkgs = new IntentFilter(Intent.ACTION_PACKAGE_ADDED);
        pkgs.addAction(Intent.ACTION_PACKAGE_REMOVED);
        pkgs.addAction(Intent.ACTION_PACKAGE_CHANGED);
        pkgs.addDataScheme("package");
        registerReceiver(packageReceiver, pkgs);
        watchNetwork();

        getExternalFilesDir(null); // creates the folder the wallpaper is pushed to
        updateClock();
        loadApps();
    }

    @Override
    protected void onResume() {
        super.onResume();
        updateClock();
        loadWallpaper();
    }

    @Override
    protected void onPause() {
        super.onPause();
        saveFocus();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // Home pressed while already home: close the dropdown, or come back up from the grid.
        if (dropdownIndex >= 0) closeDropdown();
        else if (zone == ZONE_GRID && !dock.isEmpty()) setFocus(ZONE_DOCK, Math.min(gridIndex % columns, dock.size() - 1));
    }

    @Override
    protected void onDestroy() {
        unregisterReceiver(timeReceiver);
        unregisterReceiver(packageReceiver);
        if (networkCallback != null) getSystemService(ConnectivityManager.class).unregisterNetworkCallback(networkCallback);
        super.onDestroy();
    }

    private int px(float v) { return Math.round(v * dp); }

    // ---------------------------------------------------------------- apps

    private void loadApps() {
        new Thread(() -> {
            List<AppEntry> apps = queryApps();
            runOnUiThread(() -> applyApps(apps));
        }, "load-apps").start();
    }

    private List<AppEntry> queryApps() {
        PackageManager pm = getPackageManager();
        Set<String> hidden = new HashSet<>(Arrays.asList(getResources().getStringArray(R.array.hidden_apps)));
        hidden.add(getPackageName());
        Intent query = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER);
        Map<String, AppEntry> byPkg = new LinkedHashMap<>();
        for (ResolveInfo ri : pm.queryIntentActivities(query, 0)) {
            ActivityInfo ai = ri.activityInfo;
            if (hidden.contains(ai.packageName) || byPkg.containsKey(ai.packageName)) continue;
            Drawable banner = ai.loadBanner(pm);
            if (banner == null) banner = ai.applicationInfo.loadBanner(pm);
            byPkg.put(ai.packageName, new AppEntry(ai.packageName, ri.loadLabel(pm).toString(),
                    new ComponentName(ai.packageName, ai.name), banner, ri.loadIcon(pm)));
        }
        return new ArrayList<>(byPkg.values());
    }

    private void applyApps(List<AppEntry> apps) {
        String focusedPkg = appsLoaded ? focusedPackage() : prefs.getString("pkg", null);
        if (!appsLoaded && "top".equals(prefs.getString("zone", ""))) {
            zone = ZONE_TOP;
            topIndex = prefs.getInt("top", 0);
            focusedPkg = null;
        }
        Map<String, AppEntry> byPkg = new LinkedHashMap<>();
        for (AppEntry a : apps) byPkg.put(a.pkg, a);
        dock.clear();
        for (String pkg : getResources().getStringArray(R.array.dock_apps)) {
            AppEntry a = byPkg.remove(pkg);
            if (a != null && dock.size() < columns) dock.add(a);
        }
        grid.clear();
        grid.addAll(byPkg.values());
        Collator collator = Collator.getInstance();
        grid.sort((a, b) -> collator.compare(a.label, b.label));
        dockSlots = dock.isEmpty() ? 0 : columns;
        appsLoaded = true;

        // Keep focus on the same app across reloads; otherwise clamp to what exists.
        int z = zone, idx;
        int inDock = indexOf(dock, focusedPkg), inGrid = indexOf(grid, focusedPkg);
        if (zone != ZONE_TOP && inDock >= 0) { z = ZONE_DOCK; idx = inDock; }
        else if (zone != ZONE_TOP && inGrid >= 0) { z = ZONE_GRID; idx = inGrid; }
        else if (zone == ZONE_TOP) idx = topIndex;
        else if (zone == ZONE_GRID && !grid.isEmpty()) idx = Math.min(gridIndex, grid.size() - 1);
        else { z = dock.isEmpty() ? (grid.isEmpty() ? ZONE_TOP : ZONE_GRID) : ZONE_DOCK; idx = 0; }
        if (z == ZONE_DOCK && dock.isEmpty()) { z = ZONE_TOP; idx = 0; }
        adapter.notifyDataSetChanged();
        int fz = z, fi = idx;
        list.post(() -> setFocus(fz, fi));
        if (!dock.isEmpty()) showHero(dock.get(Math.min(dockCol, dock.size() - 1)));
    }

    private static int indexOf(List<AppEntry> apps, String pkg) {
        if (pkg == null) return -1;
        for (int i = 0; i < apps.size(); i++) if (apps.get(i).pkg.equals(pkg)) return i;
        return -1;
    }

    private void launch(AppEntry a) {
        saveFocus();
        Intent i = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER)
                .setComponent(a.component)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
        try {
            startActivity(i);
        } catch (ActivityNotFoundException | SecurityException e) {
            Intent fallback = getPackageManager().getLaunchIntentForPackage(a.pkg);
            if (fallback != null) startActivity(fallback);
        }
    }

    // ---------------------------------------------------------------- focus

    private int gridStart() { return 1 + dockSlots; }

    private int focusedPosition() {
        if (zone == ZONE_DOCK) return 1 + dockCol;
        if (zone == ZONE_GRID) return gridStart() + gridIndex;
        return -1;
    }

    private String focusedPackage() {
        if (zone == ZONE_DOCK && dockCol < dock.size()) return dock.get(dockCol).pkg;
        if (zone == ZONE_GRID && gridIndex < grid.size()) return grid.get(gridIndex).pkg;
        return null;
    }

    private void saveFocus() {
        prefs.edit().putString("zone", zone == ZONE_TOP ? "top" : "app")
                .putString("pkg", focusedPackage()).putInt("top", topIndex).apply();
    }

    private void setFocus(int newZone, int index) {
        int oldPos = focusedPosition();
        zone = newZone;
        if (newZone == ZONE_TOP) topIndex = index;
        else if (newZone == ZONE_DOCK) dockCol = index;
        else gridIndex = index;
        int newPos = focusedPosition();
        if (oldPos != newPos) {
            styleTile(list.findViewHolderForAdapterPosition(oldPos), false, true);
            styleTile(list.findViewHolderForAdapterPosition(newPos), true, true);
        }
        for (int i = 0; i < pills.length; i++) pills[i].setAlpha(zone == ZONE_TOP && i == topIndex ? 1f : 0.85f);
        if (zone == ZONE_DOCK) showHero(dock.get(dockCol));

        if (zone == ZONE_GRID) scrollTo(gridStart() + (gridIndex / columns) * columns, gridTop);
        else scrollTo(0, 0);
        highlight.moveTo();
    }

    private void styleTile(RecyclerView.ViewHolder vh, boolean focused, boolean animate) {
        if (!(vh instanceof TileHolder)) return;
        TileHolder h = (TileHolder) vh;
        float s = focused ? FOCUS_SCALE : 1f, a = focused ? 1f : 0f;
        h.tile.animate().cancel();
        h.label.animate().cancel();
        if (animate) {
            h.tile.animate().scaleX(s).scaleY(s).setDuration(240).setInterpolator(new DecelerateInterpolator()).start();
            h.label.animate().alpha(a).setDuration(200).start();
        } else {
            h.tile.setScaleX(s);
            h.tile.setScaleY(s);
            h.label.setAlpha(a);
        }
    }

    private void scrollTo(int position, int offset) {
        if (position == 0 && !list.canScrollVertically(-1)) return;
        LinearSmoothScroller s = new LinearSmoothScroller(this) {
            @Override protected int getVerticalSnapPreference() { return SNAP_TO_START; }
            @Override public int calculateDtToFit(int viewStart, int viewEnd, int boxStart, int boxEnd, int pref) {
                return boxStart + offset - viewStart;
            }
            @Override protected float calculateSpeedPerPixel(DisplayMetrics dm) { return 45f / dm.densityDpi; }
        };
        s.setTargetPosition(position);
        layoutManager.startSmoothScroll(s);
    }

    private void showHero(AppEntry a) {
        if (!a.label.contentEquals(hero.getText())) {
            hero.animate().cancel();
            hero.setAlpha(0f);
            hero.setText(a.label);
            hero.animate().alpha(1f).setDuration(260).start();
        }
        if (a.color != glowColor) {
            if (glowAnim != null) glowAnim.cancel();
            glowAnim = ValueAnimator.ofObject(new ArgbEvaluator(), glowColor, a.color);
            glowAnim.setDuration(450);
            glowAnim.addUpdateListener(v -> setGlow((Integer) v.getAnimatedValue()));
            glowAnim.start();
        }
    }

    private void setGlow(int color) {
        glowColor = color;
        int rgb = color & 0x00FFFFFF;
        glowDrawable.setColors(new int[] {0x55000000 | rgb, 0x1F000000 | rgb, rgb});
    }

    // ---------------------------------------------------------------- keys

    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        int k = e.getKeyCode();
        boolean select = k == KeyEvent.KEYCODE_DPAD_CENTER || k == KeyEvent.KEYCODE_ENTER
                || k == KeyEvent.KEYCODE_NUMPAD_ENTER || k == KeyEvent.KEYCODE_BUTTON_A;
        boolean ours = select || k == KeyEvent.KEYCODE_BACK || k == KeyEvent.KEYCODE_DPAD_UP
                || k == KeyEvent.KEYCODE_DPAD_DOWN || k == KeyEvent.KEYCODE_DPAD_LEFT || k == KeyEvent.KEYCODE_DPAD_RIGHT;
        if (!ours || !appsLoaded) return super.dispatchKeyEvent(e);
        if (e.getAction() != KeyEvent.ACTION_DOWN) return true;
        if ((select || k == KeyEvent.KEYCODE_BACK) && e.getRepeatCount() > 0) return true;

        if (dropdownIndex >= 0) {
            if (k == KeyEvent.KEYCODE_DPAD_UP && dropdownIndex > 0) selectDropdown(dropdownIndex - 1);
            else if (k == KeyEvent.KEYCODE_DPAD_DOWN && dropdownIndex < dropdownActions.size() - 1) selectDropdown(dropdownIndex + 1);
            else if (select) { Runnable r = dropdownActions.get(dropdownIndex); closeDropdown(); r.run(); }
            else if (k == KeyEvent.KEYCODE_BACK) closeDropdown();
            return true;
        }
        if (select) { activate(); return true; }
        if (k == KeyEvent.KEYCODE_BACK) {
            if (zone == ZONE_GRID && !dock.isEmpty()) setFocus(ZONE_DOCK, Math.min(gridIndex % columns, dock.size() - 1));
            return true;
        }
        switch (zone) {
            case ZONE_TOP:
                if (k == KeyEvent.KEYCODE_DPAD_LEFT && topIndex > 0) setFocus(ZONE_TOP, topIndex - 1);
                else if (k == KeyEvent.KEYCODE_DPAD_RIGHT && topIndex < pills.length - 1) setFocus(ZONE_TOP, topIndex + 1);
                else if (k == KeyEvent.KEYCODE_DPAD_DOWN) {
                    if (!dock.isEmpty()) setFocus(ZONE_DOCK, Math.min(dockCol, dock.size() - 1));
                    else if (!grid.isEmpty()) setFocus(ZONE_GRID, 0);
                }
                break;
            case ZONE_DOCK:
                if (k == KeyEvent.KEYCODE_DPAD_LEFT && dockCol > 0) setFocus(ZONE_DOCK, dockCol - 1);
                else if (k == KeyEvent.KEYCODE_DPAD_RIGHT && dockCol < dock.size() - 1) setFocus(ZONE_DOCK, dockCol + 1);
                else if (k == KeyEvent.KEYCODE_DPAD_UP) setFocus(ZONE_TOP, topIndex);
                else if (k == KeyEvent.KEYCODE_DPAD_DOWN && !grid.isEmpty()) setFocus(ZONE_GRID, Math.min(dockCol, grid.size() - 1));
                break;
            case ZONE_GRID: {
                int col = gridIndex % columns;
                if (k == KeyEvent.KEYCODE_DPAD_LEFT && col > 0) setFocus(ZONE_GRID, gridIndex - 1);
                else if (k == KeyEvent.KEYCODE_DPAD_RIGHT && col < columns - 1 && gridIndex + 1 < grid.size()) setFocus(ZONE_GRID, gridIndex + 1);
                else if (k == KeyEvent.KEYCODE_DPAD_UP) {
                    if (gridIndex >= columns) setFocus(ZONE_GRID, gridIndex - columns);
                    else if (!dock.isEmpty()) setFocus(ZONE_DOCK, Math.min(col, dock.size() - 1));
                    else setFocus(ZONE_TOP, topIndex);
                } else if (k == KeyEvent.KEYCODE_DPAD_DOWN) {
                    int nextRowStart = (gridIndex / columns + 1) * columns;
                    if (nextRowStart < grid.size()) setFocus(ZONE_GRID, Math.min(gridIndex + columns, grid.size() - 1));
                }
                break;
            }
        }
        return true;
    }

    private void activate() {
        if (zone == ZONE_DOCK) launch(dock.get(dockCol));
        else if (zone == ZONE_GRID) launch(grid.get(gridIndex));
        else if (topIndex == 0) openDropdown();
        else if (topIndex == 1) startSettings(Settings.ACTION_WIFI_SETTINGS);
        else startSettings(Settings.ACTION_SETTINGS);
    }

    private void startSettings(String action) {
        try {
            startActivity(new Intent(action).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        } catch (ActivityNotFoundException e) {
            startActivity(new Intent(Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        }
    }

    // ---------------------------------------------------------------- inputs dropdown

    private void openDropdown() {
        dropdown.removeAllViews();
        dropdownActions.clear();
        TvInputManager tim = getSystemService(TvInputManager.class);
        String liveTv = liveTvPackage();
        List<TvInputInfo> inputs = new ArrayList<>();
        if (tim != null) {
            for (TvInputInfo info : tim.getTvInputList()) {
                if (info.isPassthroughInput() && !info.isHidden(this)) inputs.add(info);
            }
        }
        inputs.sort((a, b) -> Integer.compare(rank(a), rank(b)) != 0 ? Integer.compare(rank(a), rank(b))
                : inputLabel(a).compareTo(inputLabel(b)));
        for (TvInputInfo info : inputs) {
            addDropdownItem(inputLabel(info), () -> {
                Intent i = new Intent(Intent.ACTION_VIEW, TvContract.buildChannelUriForPassthroughInput(info.getId()))
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                if (liveTv != null) i.setPackage(liveTv);
                try { startActivity(i); } catch (ActivityNotFoundException ignored) { }
            });
        }
        if (liveTv != null) {
            addDropdownItem(getString(R.string.live_tv), () -> {
                Intent i = getPackageManager().getLeanbackLaunchIntentForPackage(liveTv);
                if (i == null) i = getPackageManager().getLaunchIntentForPackage(liveTv);
                if (i != null) startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            });
        }
        if (dropdownActions.isEmpty()) return;

        View pill = pills[0];
        int[] p = new int[2], r = new int[2];
        pill.getLocationInWindow(p);
        findViewById(R.id.root).getLocationInWindow(r);
        FrameLayout.LayoutParams lp = (FrameLayout.LayoutParams) dropdown.getLayoutParams();
        lp.gravity = Gravity.TOP | Gravity.START;
        lp.leftMargin = p[0] - r[0];
        lp.topMargin = p[1] - r[1] + pill.getHeight() + px(10);
        dropdown.setLayoutParams(lp);
        dropdown.setVisibility(View.VISIBLE);
        dropdown.setAlpha(0f);
        dropdown.setTranslationY(-px(8));
        dropdown.animate().alpha(1f).translationY(0).setDuration(180).start();
        selectDropdown(0);
    }

    private static int rank(TvInputInfo i) {
        return i.getType() == TvInputInfo.TYPE_HDMI ? 0 : 1;
    }

    private String inputLabel(TvInputInfo info) {
        CharSequence custom = info.loadCustomLabel(this);
        String label = (custom != null && custom.length() > 0 ? custom : info.loadLabel(this)).toString();
        return label.replaceAll("^HDMI(\\d)$", "HDMI $1");
    }

    private String liveTvPackage() {
        PackageManager pm = getPackageManager();
        for (String pkg : LIVE_TV_PACKAGES) {
            if (pm.getLeanbackLaunchIntentForPackage(pkg) != null || pm.getLaunchIntentForPackage(pkg) != null) return pkg;
        }
        return null;
    }

    private void addDropdownItem(String text, Runnable action) {
        TextView t = new TextView(this);
        t.setText(text);
        t.setTextColor(0xFFF2F2F7);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, 17);
        t.setTypeface(getResources().getFont(R.font.outfit_regular));
        t.setGravity(Gravity.CENTER_VERTICAL);
        t.setPadding(px(16), 0, px(16), 0);
        dropdown.addView(t, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, px(46)));
        dropdownActions.add(action);
    }

    private void selectDropdown(int index) {
        dropdownIndex = index;
        for (int i = 0; i < dropdown.getChildCount(); i++) {
            dropdown.getChildAt(i).setBackgroundResource(i == index ? R.drawable.dropdown_item_focused : 0);
        }
    }

    private void closeDropdown() {
        dropdownIndex = -1;
        dropdown.animate().alpha(0f).setDuration(120).withEndAction(() -> dropdown.setVisibility(View.GONE)).start();
    }

    // ---------------------------------------------------------------- clock, network, wallpaper

    private void updateClock() {
        Calendar now = Calendar.getInstance();
        int h = now.get(Calendar.HOUR_OF_DAY);
        greeting.setText(h >= 5 && h < 12 ? R.string.morning : h >= 12 && h < 18 ? R.string.afternoon : R.string.evening);
        clock.setText(DateFormat.format(DateFormat.is24HourFormat(this) ? "HH:mm" : "h:mm", now));
        String d = new SimpleDateFormat(getString(R.string.date_format), Locale.getDefault()).format(new Date());
        date.setText(d.isEmpty() ? d : d.substring(0, 1).toUpperCase(Locale.getDefault()) + d.substring(1));
    }

    /** Event driven (no polling): the pill follows the default network. */
    private void watchNetwork() {
        ConnectivityManager cm = getSystemService(ConnectivityManager.class);
        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override public void onCapabilitiesChanged(@NonNull Network n, @NonNull NetworkCapabilities caps) {
                runOnUiThread(() -> showNetwork(caps));
            }
            @Override public void onLost(@NonNull Network n) { runOnUiThread(() -> showNetwork(null)); }
        };
        cm.registerDefaultNetworkCallback(networkCallback);
        showNetwork(cm.getNetworkCapabilities(cm.getActiveNetwork()));
    }

    private void showNetwork(NetworkCapabilities caps) {
        TextView pill = pills[1];
        int icon = R.drawable.ic_wifi;
        String text;
        if (caps == null) text = getString(R.string.offline);
        else if (caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) { icon = R.drawable.ic_ethernet; text = getString(R.string.ethernet); }
        else if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) text = wifiName();
        else text = getString(R.string.wifi);
        pill.setCompoundDrawablesRelativeWithIntrinsicBounds(icon, 0, 0, 0);
        pill.setText(text);
        list.post(list::invalidate); // pill width changed: let the highlight follow
    }

    private String wifiName() {
        WifiManager wm = getApplicationContext().getSystemService(WifiManager.class);
        WifiInfo info = wm == null ? null : wm.getConnectionInfo();
        String ssid = info == null ? null : info.getSSID();
        if (ssid == null || ssid.isEmpty() || ssid.contains("unknown ssid")) return getString(R.string.wifi);
        return ssid.startsWith("\"") && ssid.endsWith("\"") ? ssid.substring(1, ssid.length() - 1) : ssid;
    }

    /** Optional wallpaper pushed to /sdcard/Android/data/tv.clean.home/files/wallpaper.jpg (or .png). */
    private void loadWallpaper() {
        File dir = getExternalFilesDir(null);
        File f = null;
        if (dir != null) {
            for (String name : new String[] {"wallpaper.jpg", "wallpaper.png"}) {
                File c = new File(dir, name);
                if (c.isFile()) { f = c; break; }
            }
        }
        long stamp = f == null ? 0 : f.lastModified();
        if (stamp == wallpaperStamp) return;
        wallpaperStamp = stamp;
        if (f == null) { wallpaper.setImageDrawable(null); wallpaper.setVisibility(View.GONE); return; }
        BitmapFactory.Options o = new BitmapFactory.Options();
        o.inJustDecodeBounds = true;
        BitmapFactory.decodeFile(f.getPath(), o);
        int target = getResources().getDisplayMetrics().widthPixels;
        o.inSampleSize = 1;
        while (o.outWidth / (o.inSampleSize * 2) >= target) o.inSampleSize *= 2;
        o.inJustDecodeBounds = false;
        o.inPreferredConfig = Bitmap.Config.RGB_565;
        Bitmap b = BitmapFactory.decodeFile(f.getPath(), o);
        wallpaper.setImageBitmap(b);
        wallpaper.setVisibility(b == null ? View.GONE : View.VISIBLE);
    }

    // ---------------------------------------------------------------- adapter

    static final class TileHolder extends RecyclerView.ViewHolder {
        final View tile;
        final ImageView banner;
        final TextView innerName, label;
        TileHolder(View v) {
            super(v);
            tile = v.findViewById(R.id.tile);
            banner = v.findViewById(R.id.banner);
            innerName = v.findViewById(R.id.inner_name);
            label = v.findViewById(R.id.label);
        }
    }

    private final class Adapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {
        private final ViewOutlineProvider rounded = new ViewOutlineProvider() {
            @Override public void getOutline(View v, Outline o) { o.setRoundRect(0, 0, v.getWidth(), v.getHeight(), px(12)); }
        };

        @Override public int getItemCount() { return appsLoaded ? 1 + dockSlots + grid.size() : 1; }

        @Override public int getItemViewType(int pos) {
            if (pos == 0) return TYPE_HEADER;
            if (pos <= dockSlots) return pos - 1 < dock.size() ? TYPE_DOCK : TYPE_SPACER;
            return TYPE_GRID;
        }

        @NonNull @Override
        public RecyclerView.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int type) {
            if (type == TYPE_HEADER) {
                if (header.getParent() instanceof ViewGroup) ((ViewGroup) header.getParent()).removeView(header);
                return new RecyclerView.ViewHolder(header) { };
            }
            if (type == TYPE_SPACER) {
                View v = new View(parent.getContext());
                v.setLayoutParams(new RecyclerView.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dockRowH));
                return new RecyclerView.ViewHolder(v) { };
            }
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.tile, parent, false);
            TileHolder h = new TileHolder(v);
            h.tile.getLayoutParams().height = tileH;
            h.tile.setOutlineProvider(rounded);
            h.tile.setClipToOutline(true);
            h.tile.setBackgroundColor(0xFF1C1C1E);
            return h;
        }

        @Override
        public void onBindViewHolder(@NonNull RecyclerView.ViewHolder vh, int pos) {
            if (!(vh instanceof TileHolder)) return;
            TileHolder h = (TileHolder) vh;
            AppEntry a = pos <= dockSlots ? dock.get(pos - 1) : grid.get(pos - gridStart());
            if (a.banner != null) {
                h.banner.setScaleType(ImageView.ScaleType.CENTER_CROP);
                h.banner.setPadding(0, 0, 0, 0);
                h.banner.setImageDrawable(a.banner);
                h.innerName.setVisibility(View.GONE);
            } else {
                h.banner.setScaleType(ImageView.ScaleType.FIT_CENTER);
                h.banner.setPadding(0, tileH / 6, 0, tileH / 3);
                h.banner.setImageDrawable(a.icon);
                h.innerName.setText(a.label);
                h.innerName.setVisibility(View.VISIBLE);
            }
            h.label.setText(a.label);
            styleTile(h, pos == focusedPosition(), false);
        }
    }

    // ---------------------------------------------------------------- decorations

    /** The slightly lighter rounded band behind the dock row. */
    private final class DockBand extends RecyclerView.ItemDecoration {
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final RectF band = new RectF();
        DockBand() { paint.setColor(0xFF161618); }

        @Override public void onDraw(@NonNull Canvas c, @NonNull RecyclerView rv, @NonNull RecyclerView.State s) {
            if (dockSlots == 0) return;
            float top = Float.MAX_VALUE, bottom = -Float.MAX_VALUE;
            for (int i = 0; i < rv.getChildCount(); i++) {
                View v = rv.getChildAt(i);
                int pos = rv.getChildAdapterPosition(v);
                if (pos < 1 || pos > dockSlots) continue;
                top = Math.min(top, v.getTop() + v.getTranslationY());
                bottom = Math.max(bottom, v.getBottom() + v.getTranslationY());
            }
            if (top == Float.MAX_VALUE) return;
            band.set(rv.getPaddingLeft() - px(16), top - px(4), rv.getWidth() - rv.getPaddingRight() + px(16), bottom - px(2));
            c.drawRoundRect(band, px(30), px(30), paint);
        }
    }

    /** One glass highlight that springs from target to target (tiles and top-bar pills). */
    private final class Highlight extends RecyclerView.ItemDecoration {
        private final Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint stroke = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint pillGlow = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final RectF cur = new RectF(), from = new RectF(), target = new RectF();
        private final Rect tmp = new Rect();
        private float curRadius, fromRadius, targetRadius, t = 1f, shaderTop = Float.NaN, shaderBottom;
        private boolean has;
        private ValueAnimator anim;

        Highlight() {
            stroke.setStyle(Paint.Style.STROKE);
            stroke.setStrokeWidth(1.5f * dp);
            stroke.setColor(0x80FFFFFF);
            pillGlow.setColor(0x33FFFFFF);
        }

        void moveTo() {
            if (anim != null) anim.cancel();
            if (!has) { list.invalidate(); return; }
            from.set(cur);
            fromRadius = curRadius;
            t = 0f;
            anim = ValueAnimator.ofFloat(0f, 1f);
            anim.setDuration(380);
            anim.setInterpolator(new OvershootInterpolator(1.3f));
            anim.addUpdateListener(v -> { t = (float) v.getAnimatedValue(); list.invalidate(); });
            anim.start();
        }

        void scrolled(int dy) { from.offset(0, -dy); }

        private View targetView() {
            if (zone == ZONE_TOP) return header.isAttachedToWindow() ? pills[topIndex] : null;
            RecyclerView.ViewHolder vh = list.findViewHolderForAdapterPosition(focusedPosition());
            return vh instanceof TileHolder ? ((TileHolder) vh).tile : null;
        }

        private boolean findTarget() {
            View v = targetView();
            if (v == null || v.getWidth() == 0) return false;
            tmp.set(0, 0, v.getWidth(), v.getHeight());
            try {
                list.offsetDescendantRectToMyCoords(v, tmp);
            } catch (IllegalArgumentException e) {
                return false;
            }
            target.set(tmp);
            if (zone == ZONE_TOP) {
                target.inset(-px(2), -px(2));
                targetRadius = target.height() / 2f;
            } else {
                float gx = target.width() * (FOCUS_SCALE - 1f) / 2f + px(5);
                float gy = target.height() * (FOCUS_SCALE - 1f) / 2f + px(5);
                target.inset(-gx, -gy);
                targetRadius = px(17);
            }
            return true;
        }

        @Override public void onDrawOver(@NonNull Canvas c, @NonNull RecyclerView rv, @NonNull RecyclerView.State s) {
            if (!findTarget()) return;
            if (!has || t >= 1f && (anim == null || !anim.isRunning())) {
                cur.set(target);
                curRadius = targetRadius;
                has = true;
            } else {
                cur.set(lerp(from.left, target.left), lerp(from.top, target.top),
                        lerp(from.right, target.right), lerp(from.bottom, target.bottom));
                curRadius = lerp(fromRadius, targetRadius);
            }
            if (cur.top != shaderTop || cur.bottom != shaderBottom) {
                shaderTop = cur.top;
                shaderBottom = cur.bottom;
                fill.setShader(new LinearGradient(0, cur.top, 0, cur.bottom, 0x2EFFFFFF, 0x08FFFFFF, Shader.TileMode.CLAMP));
            }
            // Pills have no artwork to wash out, so the glass can be brighter there.
            boolean onPill = zone == ZONE_TOP;
            stroke.setColor(onPill ? 0xCCFFFFFF : 0x80FFFFFF);
            if (onPill) c.drawRoundRect(cur, curRadius, curRadius, pillGlow);
            c.drawRoundRect(cur, curRadius, curRadius, fill);
            c.drawRoundRect(cur, curRadius, curRadius, stroke);
        }

        private float lerp(float a, float b) { return a + (b - a) * t; }
    }
}
