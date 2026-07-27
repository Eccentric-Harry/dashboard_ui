/**
 * Client-side meal-photo downscaling.
 *
 * A phone camera produces ~12MP JPEGs. Vision models bill images by tile count, so
 * sending the native resolution costs several times more than a 1MP render — with no
 * accuracy gain for identifying what is on a plate. Shrinking here also cuts the upload
 * itself, which is the slowest part of a meal scan on mobile data.
 *
 * The backend re-checks and downscales independently (MealImagePreprocessor), so this is
 * an optimisation, not a trust boundary. Every failure path returns the original file:
 * a photo the browser cannot decode (HEIC outside Safari, say) is still worth uploading,
 * because the server or the model may handle it.
 */

/** Longest-edge ceiling, in pixels. Kept in sync with the backend preprocessor. */
const MAX_EDGE_PX = 1024

/** JPEG quality for the re-encoded image. */
const JPEG_QUALITY = 0.8

/**
 * Returns a downscaled JPEG version of `file`, or `file` itself when the image is
 * already small enough, cannot be decoded, or would not get smaller.
 */
export async function downscaleImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  try {
    const bitmap = await createImageBitmap(file)
    const longestEdge = Math.max(bitmap.width, bitmap.height)

    if (longestEdge <= MAX_EDGE_PX) {
      bitmap.close()
      return file
    }

    const scale = MAX_EDGE_PX / longestEdge
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }

    // JPEG has no alpha channel — fill white so transparent PNG regions
    // don't encode as black.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    })

    if (!blob || blob.size >= file.size) return file

    const renamed = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], renamed, { type: 'image/jpeg', lastModified: file.lastModified })
  } catch {
    // Undecodable format, canvas tainted, OOM on a huge image — upload the original.
    return file
  }
}

/** Downscales each file, preserving order. Failures fall through to the original file. */
export function downscaleImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map(downscaleImage))
}
