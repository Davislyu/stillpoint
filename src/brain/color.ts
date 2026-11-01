/** Contrast helpers so the graph stays readable on every theme, whatever its background. */

type Rgb = [number, number, number]
let probe: CanvasRenderingContext2D | null = null

/** Any CSS colour the browser understands → [r, g, b]. Null if it can't be parsed. */
export function toRgb(css: string): Rgb | null {
  try {
    probe ??= Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true })
    if (!probe) return null
    probe.clearRect(0, 0, 1, 1)
    probe.fillStyle = '#000'
    probe.fillStyle = css
    probe.fillRect(0, 0, 1, 1)
    const d = probe.getImageData(0, 0, 1, 1).data
    return [d[0], d[1], d[2]]
  } catch {
    return null
  }
}

const lin = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
export const luminance = ([r, g, b]: Rgb) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
export function contrast(a: Rgb, b: Rgb) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as Rgb
export const css = ([r, g, b]: Rgb) => `rgb(${r}, ${g}, ${b})`

/** The colour itself if it reads well on `bg`, otherwise nudged toward black or white until it does. */
export function ensureContrast(fg: Rgb, bg: Rgb, min: number): Rgb {
  if (contrast(fg, bg) >= min) return fg
  const target: Rgb = contrast([0, 0, 0], bg) >= contrast([255, 255, 255], bg) ? [0, 0, 0] : [255, 255, 255]
  for (let t = 0.1; t <= 1.001; t += 0.1) {
    const c = mix(fg, target, t)
    if (contrast(c, bg) >= min) return c
  }
  return target
}
