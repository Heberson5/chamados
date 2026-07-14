function hexToHsl(hex: string): [number, number, number] {
  const m = hex.replace("#", "").match(/^([\da-f]{6})$/i);
  if (!m) return [220, 13, 13];
  const num = parseInt(m[1], 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

/** Generates `count` distinct CSS colors derived from a base hex, by rotating hue. */
export function paletteFromColor(baseHex: string, count: number): string[] {
  const [h, s, l] = hexToHsl(baseHex);
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const hue = (h + (360 / Math.max(count, 1)) * i) % 360;
    colors.push(`hsl(${hue.toFixed(0)} ${Math.max(s, 45).toFixed(0)}% ${Math.min(Math.max(l, 40), 60).toFixed(0)}%)`);
  }
  return colors;
}
