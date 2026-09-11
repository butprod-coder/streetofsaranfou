using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class SpriteCutout
{
    private static bool IsBackdrop(byte r, byte g, byte b)
    {
        int max = Math.Max(r, Math.Max(g, b));
        int min = Math.Min(r, Math.Min(g, b));
        return max - min <= 14 && max >= 118;
    }

    public static void Process(string path, bool enclosed = true)
    {
        using var source = new Bitmap(path);
        using var bitmap = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb);
        using (var graphics = Graphics.FromImage(bitmap)) graphics.DrawImageUnscaled(source, 0, 0);
        int width = bitmap.Width, height = bitmap.Height;
        var rect = new Rectangle(0, 0, width, height);
        var data = bitmap.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        int stride = data.Stride;
        int length = Math.Abs(stride) * height;
        var bytes = new byte[length];
        Marshal.Copy(data.Scan0, bytes, 0, length);
        var visited = new bool[width * height];
        var queue = new int[width * height];

        byte R(int index) => bytes[index + 2];
        byte G(int index) => bytes[index + 1];
        byte B(int index) => bytes[index];
        int PixelIndex(int x, int y) => y * stride + x * 4;

        void ClearComponent(int startX, int startY, bool allowEnclosed)
        {
            int start = startY * width + startX;
            if (visited[start]) return;
            int startPixel = PixelIndex(startX, startY);
            if (!IsBackdrop(R(startPixel), G(startPixel), B(startPixel))) return;
            int head = 0, tail = 0;
            queue[tail++] = start;
            visited[start] = true;
            var component = queue;
            int componentCount = 0;
            bool edge = startX == 0 || startY == 0 || startX == width - 1 || startY == height - 1;
            int bright = 0, mid = 0;
            while (head < tail)
            {
                int flat = queue[head++], x = flat % width, y = flat / width;
                component[componentCount++] = flat;
                int pi = PixelIndex(x, y);
                byte rr = R(pi), gg = G(pi), bb = B(pi);
                if (rr >= 235 && gg >= 235 && bb >= 235) bright++;
                if (rr >= 145 && rr <= 225 && Math.Abs(rr - gg) <= 8 && Math.Abs(rr - bb) <= 8) mid++;
                Try(x + 1, y); Try(x - 1, y); Try(x, y + 1); Try(x, y - 1);

                void Try(int nx, int ny)
                {
                    if (nx < 0 || ny < 0 || nx >= width || ny >= height) return;
                    int nf = ny * width + nx;
                    if (visited[nf]) return;
                    int np = PixelIndex(nx, ny);
                    if (!IsBackdrop(R(np), G(np), B(np))) return;
                    visited[nf] = true;
                    if (nx == 0 || ny == 0 || nx == width - 1 || ny == height - 1) edge = true;
                    queue[tail++] = nf;
                }
            }
            bool checkerLike = componentCount >= 18 && bright >= componentCount * 0.08 && mid >= componentCount * 0.12;
            if (!edge && !(allowEnclosed && checkerLike && componentCount <= 2200)) return;
            for (int ci = 0; ci < componentCount; ci++)
            {
                int flat = component[ci];
                int x = flat % width, y = flat / width, pi = PixelIndex(x, y);
                bytes[pi + 3] = 0;
            }
        }

        for (int x = 0; x < width; x++) { ClearComponent(x, 0, false); ClearComponent(x, height - 1, false); }
        for (int y = 0; y < height; y++) { ClearComponent(0, y, false); ClearComponent(width - 1, y, false); }
        if (enclosed) for (int x = 0; x < width; x++) for (int y = 0; y < height; y++) ClearComponent(x, y, true);

        // Discard tiny disconnected neutral flecks left by compressed checkerboards.
        // Colored sparks are kept, as are all components attached to a character.
        Array.Clear(visited, 0, visited.Length);
        for (int start = 0; start < width * height; start++)
        {
            if (visited[start] || bytes[PixelIndex(start % width, start / width) + 3] == 0) continue;
            int head = 0, tail = 0, colored = 0;
            queue[tail++] = start; visited[start] = true;
            while (head < tail)
            {
                int flat = queue[head++], x = flat % width, y = flat / width, pi = PixelIndex(x, y);
                if (Math.Max(R(pi), Math.Max(G(pi), B(pi))) - Math.Min(R(pi), Math.Min(G(pi), B(pi))) > 40) colored++;
                for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++)
                {
                    int nx = x + dx, ny = y + dy;
                    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
                    int nf = ny * width + nx;
                    if (visited[nf] || bytes[PixelIndex(nx, ny) + 3] == 0) continue;
                    visited[nf] = true; queue[tail++] = nf;
                }
            }
            if (tail <= 100 && colored == 0)
                for (int i = 0; i < tail; i++) bytes[PixelIndex(queue[i] % width, queue[i] / width) + 3] = 0;
        }

        Marshal.Copy(bytes, 0, data.Scan0, length);
        bitmap.UnlockBits(data);
        string temp = path + ".cutout.png";
        bitmap.Save(temp, ImageFormat.Png);
        // Release the encoder/file handle before replacing the source PNG.
        bitmap.Dispose();
        // Keep the original generated sheet as a source artifact; the build
        // copies the transparent companion over the runtime sheet afterwards.
    }
}
