/**
 * Client-side image downscaling for meal photos.
 *
 * A modern phone camera produces 3–8 MB JPEGs at around 4000 px on the long edge. None of
 * that resolution survives the trip: the vision model resamples the image into fixed tiles,
 * so a 4000 px photo and a 1024 px one are billed and analysed almost identically. Everything
 * above the target is upload time and mobile data spent for nothing — and on a slow connection
 * it is the single biggest contributor to how long the user waits.
 *
 * Downscaling happens before upload so the saving applies to the request itself, not just
 * to what the model eventually sees.
 */

/** Long-edge target in pixels. Comfortably above what the model's tiling resolves. */
const MAX_DIMENSION = 1024

/** JPEG quality. Above ~0.85 the file grows quickly with no visible gain on food photos. */
const JPEG_QUALITY = 0.82

/** Files at or below this are already small enough that re-encoding is not worth it. */
const SKIP_BELOW_BYTES = 300 * 1024

export interface CompressionResult {
  file: File
  originalBytes: number
  compressedBytes: number
  /** False when the original was returned unchanged. */
  didCompress: boolean
}

/**
 * Downscales an image file, preserving EXIF orientation.
 *
 * Never throws: any failure — an unsupported codec such as HEIC on a browser that cannot
 * decode it, a missing canvas context, a decode error — returns the original file, because
 * a slightly larger upload is always better than a failed meal log.
 */
export async function compressMealImage(file: File): Promise<CompressionResult> {
  const originalBytes = file.size
  const unchanged: CompressionResult = {
    file,
    originalBytes,
    compressedBytes: originalBytes,
    didCompress: false,
  }

  if (!file.type.startsWith('image/') || file.size <= SKIP_BELOW_BYTES) {
    return unchanged
  }

  try {
    // `imageOrientation: 'from-image'` bakes in the EXIF rotation. Without it, photos taken
    // in portrait arrive sideways and the model's portion estimates degrade accordingly.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })

    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    if (scale >= 1) {
      bitmap.close()
      return unchanged
    }

    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return unchanged
    }

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    )
    if (!blob || blob.size >= originalBytes) {
      return unchanged
    }

    const renamed = file.name.replace(/\.[^./\\]+$/, '') + '.jpg'
    return {
      file: new File([blob], renamed, { type: 'image/jpeg', lastModified: Date.now() }),
      originalBytes,
      compressedBytes: blob.size,
      didCompress: true,
    }
  } catch {
    return unchanged
  }
}
