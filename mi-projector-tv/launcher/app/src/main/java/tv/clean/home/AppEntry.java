package tv.clean.home;

import android.content.ComponentName;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.drawable.Drawable;

/** One launchable TV app: its banner (or icon), label and a colour sampled from the artwork. */
final class AppEntry {
    static final int DEFAULT_COLOR = 0xFF8E8E93;

    final String pkg;
    final String label;
    final ComponentName component;
    final Drawable banner; // null when the app ships no TV banner
    final Drawable icon;
    final int color;

    AppEntry(String pkg, String label, ComponentName component, Drawable banner, Drawable icon) {
        this.pkg = pkg;
        this.label = label;
        this.component = component;
        this.banner = banner;
        this.icon = icon;
        this.color = sampleColor(banner != null ? banner : icon);
    }

    /** Most saturated, reasonably bright pixel of a tiny render of the artwork, pushed to full brightness. */
    static int sampleColor(Drawable source) {
        if (source == null || source.getConstantState() == null) return DEFAULT_COLOR;
        Drawable d = source.getConstantState().newDrawable().mutate();
        Bitmap b = Bitmap.createBitmap(32, 18, Bitmap.Config.ARGB_8888);
        d.setBounds(0, 0, 32, 18);
        d.draw(new Canvas(b));
        float[] hsv = new float[3];
        float bestScore = 0;
        int best = 0;
        for (int y = 0; y < 18; y++) {
            for (int x = 0; x < 32; x++) {
                int p = b.getPixel(x, y);
                if (Color.alpha(p) < 200) continue;
                Color.colorToHSV(p, hsv);
                if (hsv[1] < 0.25f || hsv[2] < 0.3f) continue;
                float score = hsv[1] * hsv[2];
                if (score > bestScore) { bestScore = score; best = p; }
            }
        }
        b.recycle();
        if (bestScore == 0) return DEFAULT_COLOR;
        Color.colorToHSV(best, hsv);
        hsv[1] = Math.min(hsv[1], 0.9f);
        hsv[2] = 1f;
        return Color.HSVToColor(hsv);
    }
}
