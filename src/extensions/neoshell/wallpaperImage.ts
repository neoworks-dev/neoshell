import Gdk from 'gi://Gdk?version=4.0'
import GdkPixbuf from 'gi://GdkPixbuf'

// A still wallpaper is decoded at the size that covers its output, not at the
// photo's own size: a 20-megapixel photo behind a 1920x1200 display would
// otherwise hold ~80 MB in memory and again on the GPU, once per monitor.

export interface PixelSize {
  width: number
  height: number
}

// EXIF orientations 5 to 8 turn the image a quarter, so its stored width is
// its displayed height.
const QUARTER_TURNS = new Set(['5', '6', '7', '8'])

// The smallest size, at the image's aspect ratio, that covers the output.
// Never larger than the image itself.
export function coverSize(image: PixelSize, output: PixelSize): PixelSize {
  const scale = Math.min(1, Math.max(output.width / image.width, output.height / image.height))
  return {
    width: Math.max(1, Math.ceil(image.width * scale)),
    height: Math.max(1, Math.ceil(image.height * scale)),
  }
}

export function wallpaperTexture(path: string, output: PixelSize): Gdk.Texture | null {
  try {
    return Gdk.Texture.new_for_pixbuf(decodeCovering(path, output))
  } catch (error) {
    console.error(`wallpaper: cannot load ${path}:`, error)
    return null
  }
}

// The orientation is only known once the file is decoded, so a turned photo
// is decoded a second time with its sides swapped.
function decodeCovering(path: string, output: PixelSize): GdkPixbuf.Pixbuf {
  const [format, width, height] = GdkPixbuf.Pixbuf.get_file_info(path)
  if (format === null) {
    throw new Error('not an image GdkPixbuf can read')
  }
  const first = decodeAt(path, coverSize({ width, height }, output))
  if (!QUARTER_TURNS.has(orientationOf(first))) {
    return uprightOf(first)
  }
  const turned = coverSize({ width: height, height: width }, output)
  return uprightOf(decodeAt(path, { width: turned.height, height: turned.width }))
}

function decodeAt(path: string, size: PixelSize): GdkPixbuf.Pixbuf {
  return GdkPixbuf.Pixbuf.new_from_file_at_scale(path, size.width, size.height, false)
}

function orientationOf(pixbuf: GdkPixbuf.Pixbuf): string {
  const orientation = pixbuf.get_option('orientation')
  if (orientation === null) {
    return ''
  }
  return orientation
}

function uprightOf(pixbuf: GdkPixbuf.Pixbuf): GdkPixbuf.Pixbuf {
  const rotated = pixbuf.apply_embedded_orientation()
  if (rotated === null) {
    return pixbuf
  }
  return rotated
}
