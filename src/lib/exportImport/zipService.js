// @ts-nocheck
import JSZip from 'jszip'

/**
 * Create ZIP file from multiple files
 * @param {Object} files - Object with filename as key and content as value
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Blob>} - ZIP file as Blob
 */
export async function createZipFromFiles(files, onProgress) {
  const zip = new JSZip()

  // Add files to ZIP
  const fileNames = Object.keys(files)
  fileNames.forEach((filename, index) => {
    zip.file(filename, files[filename])

    if (onProgress) {
      onProgress({
        stage: 'adding_files',
        current: index + 1,
        total: fileNames.length,
        filename,
      })
    }
  })

  // Generate ZIP blob with compression
  const blob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    (metadata) => {
      if (onProgress) {
        onProgress({
          stage: 'compressing',
          percent: metadata.percent.toFixed(2),
        })
      }
    }
  )

  return blob
}

/**
 * Extract files from ZIP
 * @param {Blob|ArrayBuffer} zipData - ZIP file data
 * @returns {Promise<Object>} - Extracted files as object with filename as key and content as value
 */
export async function extractFilesFromZip(zipData) {
  const zip = new JSZip()
  await zip.loadAsync(zipData)

  const files = {}
  const filePromises = []

  zip.forEach((relativePath, zipEntry) => {
    filePromises.push(
      zipEntry.async('string').then((content) => {
        files[relativePath] = content
      })
    )
  })

  await Promise.all(filePromises)

  return files
}

/**
 * Check if file is a ZIP
 * @param {Blob} file - File to check
 * @returns {Promise<boolean>} - True if ZIP file
 */
export async function isZipFile(file) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // Check ZIP signature (PK\x03\x04 or PK\x05\x06)
    return (
      uint8Array.length >= 4 &&
      uint8Array[0] === 0x50 &&
      uint8Array[1] === 0x4b &&
      (uint8Array[2] === 0x03 || uint8Array[2] === 0x05) &&
      (uint8Array[3] === 0x04 || uint8Array[3] === 0x06)
    )
  } catch (error) {
    return false
  }
}
