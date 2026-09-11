using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;

// Technical cutout/packing only: no character pixels are redrawn or generated here.
public static class ClassicAtlas
{
    public static void Pack(string input, string output, int[][] rects, int[][] holes, int[][] exclusions)
    {
        using var source = new Bitmap(input);
        foreach (var seed in holes)
        {
            var queue = new int[source.Width * source.Height];
            var visited = new bool[queue.Length];
            int head = 0, tail = 0;
            void Enqueue(int x, int y)
            {
                if (x < 0 || y < 0 || x >= source.Width || y >= source.Height) return;
                int flat = y * source.Width + x;
                if (visited[flat]) return;
                visited[flat] = true; queue[tail++] = flat;
            }
            Enqueue(seed[0], seed[1]);
            while (head < tail)
            {
                int flat = queue[head++]; var p = new Point(flat % source.Width, flat / source.Width);
                if (p.X < 0 || p.Y < 0 || p.X >= source.Width || p.Y >= source.Height) continue;
                var c = source.GetPixel(p.X, p.Y);
                int hi = Math.Max(c.R, Math.Max(c.G, c.B)), lo = Math.Min(c.R, Math.Min(c.G, c.B));
                if (c.A == 0 || hi < 118 || hi - lo > 25) continue;
                source.SetPixel(p.X, p.Y, Color.Transparent);
                Enqueue(p.X + 1, p.Y); Enqueue(p.X - 1, p.Y);
                Enqueue(p.X, p.Y + 1); Enqueue(p.X, p.Y - 1);
            }
        }
        using var atlas = new Bitmap(2048, ((rects.Length + 3) / 4) * 512, PixelFormat.Format32bppArgb);
        using var g = Graphics.FromImage(atlas);
        g.CompositingMode = CompositingMode.SourceCopy;
        for (int i = 0; i < rects.Length; i++)
        {
            var r = rects[i];
            using var frame = source.Clone(new Rectangle(r[0], r[1], r[2], r[3]), PixelFormat.Format32bppArgb);
            using (var f = Graphics.FromImage(frame))
            {
                f.CompositingMode = CompositingMode.SourceCopy;
                foreach (var mask in exclusions) if (mask[0] == i)
                    f.FillRectangle(Brushes.Transparent, mask[1] - r[0], mask[2] - r[1], mask[3], mask[4]);
            }
            g.DrawImageUnscaled(frame, i % 4 * 512 + (512 - frame.Width) / 2, i / 4 * 512 + 492 - frame.Height);
        }
        atlas.Save(output, ImageFormat.Png);
    }
}
