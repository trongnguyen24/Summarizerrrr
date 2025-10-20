// @ts-nocheck
/**
 * Enhanced Validation Layer for Import/Export Operations
 * Provides comprehensive file validation, format checking, and error handling
 */

// Maximum file size in bytes (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024

// Supported file formats
const SUPPORTED_FORMATS = {
  JSON: 'application/json',
  ZIP: 'application/zip',
  OCTET_STREAM: 'application/octet-stream', // Some systems use this for ZIP files
}

// Current app version for compatibility checking
const CURRENT_VERSION = '1.0.0'

// Minimum compatible version
const MIN_COMPATIBLE_VERSION = '0.9.0'

/**
 * Custom error types for different validation failures
 */
export class ValidationError extends Error {
  constructor(message, code, details = null) {
    super(message)
    this.name = 'ValidationError'
    this.code = code
    this.details = details
  }
}

export class FileFormatError extends ValidationError {
  constructor(message, expectedFormat, actualFormat) {
    super(message, 'INVALID_FORMAT', { expectedFormat, actualFormat })
    this.name = 'FileFormatError'
  }
}

export class FileSizeError extends ValidationError {
  constructor(message, maxSize, actualSize) {
    super(message, 'FILE_TOO_LARGE', { maxSize, actualSize })
    this.name = 'FileSizeError'
  }
}

export class ContentValidationError extends ValidationError {
  constructor(message, validationErrors) {
    super(message, 'INVALID_CONTENT', { validationErrors })
    this.name = 'ContentValidationError'
  }
}

export class VersionCompatibilityError extends ValidationError {
  constructor(message, fileVersion, currentVersion) {
    super(message, 'VERSION_INCOMPATIBLE', { fileVersion, currentVersion })
    this.name = 'VersionCompatibilityError'
  }
}

export class CorruptedFileError extends ValidationError {
  constructor(message) {
    super(message, 'CORRUPTED_FILE')
    this.name = 'CorruptedFileError'
  }
}

/**
 * Main validation class that orchestrates all validation checks
 */
export class ImportValidator {
  constructor(options = {}) {
    this.maxFileSize = options.maxFileSize || MAX_FILE_SIZE
    this.supportedFormats = {
      ...SUPPORTED_FORMATS,
      ...options.supportedFormats,
    }
    this.currentVersion = options.currentVersion || CURRENT_VERSION
    this.minCompatibleVersion =
      options.minCompatibleVersion || MIN_COMPATIBLE_VERSION
  }

  /**
   * Validates a file before parsing
   * @param {File} file - The file to validate
   * @returns {Promise<{valid: boolean, errors: Array}>}
   */
  async validateFile(file) {
    const errors = []

    try {
      // Check file format
      const formatValidation = this.validateFileFormat(file)
      if (!formatValidation.valid) {
        errors.push(formatValidation.error)
      }

      // Check file size
      const sizeValidation = this.validateFileSize(file)
      if (!sizeValidation.valid) {
        errors.push(sizeValidation.error)
      }

      // If basic validations pass, check content
      if (errors.length === 0) {
        const contentValidation = await this.validateFileContent(file)
        if (!contentValidation.valid) {
          errors.push(...contentValidation.errors)
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        fileType: formatValidation.fileType,
      }
    } catch (error) {
      return {
        valid: false,
        errors: [
          new CorruptedFileError(`File validation failed: ${error.message}`),
        ],
      }
    }
  }

  /**
   * Validates file format
   * @param {File} file - The file to validate
   * @returns {Object} - Validation result
   */
  validateFileFormat(file) {
    const fileName = file.name.toLowerCase()
    const mimeType = file.type

    // Check by file extension first
    let detectedFormat = null

    if (fileName.endsWith('.json')) {
      detectedFormat = 'JSON'
    } else if (fileName.endsWith('.zip')) {
      detectedFormat = 'ZIP'
    }

    // If extension doesn't match MIME type, prioritize MIME type for security
    if (detectedFormat && this.supportedFormats[detectedFormat] !== mimeType) {
      // Check if it's a common MIME type mismatch
      if (
        detectedFormat === 'ZIP' &&
        mimeType === SUPPORTED_FORMATS.OCTET_STREAM
      ) {
        // This is acceptable for ZIP files
        return { valid: true, fileType: 'ZIP' }
      }

      return {
        valid: false,
        error: new FileFormatError(
          `File format mismatch. Expected MIME type: ${this.supportedFormats[detectedFormat]}, got: ${mimeType}`,
          this.supportedFormats[detectedFormat],
          mimeType
        ),
        fileType: detectedFormat,
      }
    }

    // If no extension, try to detect by MIME type
    if (!detectedFormat) {
      for (const [format, type] of Object.entries(this.supportedFormats)) {
        if (mimeType === type) {
          detectedFormat = format
          break
        }
      }
    }

    if (!detectedFormat) {
      return {
        valid: false,
        error: new FileFormatError(
          `Unsupported file format. Supported formats: ${Object.keys(
            this.supportedFormats
          ).join(', ')}`,
          Object.keys(this.supportedFormats),
          mimeType
        ),
        fileType: null,
      }
    }

    return { valid: true, fileType: detectedFormat }
  }

  /**
   * Validates file size
   * @param {File} file - The file to validate
   * @returns {Object} - Validation result
   */
  validateFileSize(file) {
    if (file.size > this.maxFileSize) {
      return {
        valid: false,
        error: new FileSizeError(
          `File size exceeds maximum limit. Maximum: ${this.formatFileSize(
            this.maxFileSize
          )}, Actual: ${this.formatFileSize(file.size)}`,
          this.maxFileSize,
          file.size
        ),
      }
    }

    if (file.size === 0) {
      return {
        valid: false,
        error: new FileSizeError('File is empty', this.maxFileSize, file.size),
      }
    }

    return { valid: true }
  }

  /**
   * Validates file content
   * @param {File} file - The file to validate
   * @returns {Promise<Object>} - Validation result
   */
  async validateFileContent(file) {
    const errors = []

    try {
      const fileType = this.detectFileType(file)

      if (fileType === 'JSON') {
        const jsonValidation = await this.validateJsonContent(file)
        if (!jsonValidation.valid) {
          errors.push(...jsonValidation.errors)
        }
      } else if (fileType === 'ZIP') {
        const zipValidation = await this.validateZipContent(file)
        if (!zipValidation.valid) {
          errors.push(...zipValidation.errors)
        }
      }
    } catch (error) {
      errors.push(
        new CorruptedFileError(`Failed to read file content: ${error.message}`)
      )
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validates JSON file content
   * @param {File} file - The JSON file to validate
   * @returns {Promise<Object>} - Validation result
   */
  async validateJsonContent(file) {
    const errors = []

    try {
      const text = await this.readFileAsText(file)
      const data = JSON.parse(text)

      // Validate JSON structure
      const structureValidation = this.validateJsonStructure(data)
      if (!structureValidation.valid) {
        errors.push(...structureValidation.errors)
      }

      // Check version compatibility
      const versionValidation = this.validateVersionCompatibility(data)
      if (!versionValidation.valid) {
        errors.push(versionValidation.error)
      }

      // Validate schema
      const schemaValidation = this.validateSchema(data)
      if (!schemaValidation.valid) {
        errors.push(...schemaValidation.errors)
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        errors.push(
          new ContentValidationError(`Invalid JSON format: ${error.message}`, [
            { line: error.line, column: error.column, message: error.message },
          ])
        )
      } else {
        errors.push(
          new CorruptedFileError(`Failed to parse JSON: ${error.message}`)
        )
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validates ZIP file content
   * @param {File} file - The ZIP file to validate
   * @returns {Promise<Object>} - Validation result
   */
  async validateZipContent(file) {
    const errors = []

    try {
      // Basic ZIP file validation
      const arrayBuffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)

      // Check for ZIP file signature (first 4 bytes should be PK\x03\x04 or PK\x05\x06)
      if (uint8Array.length < 4) {
        errors.push(
          new CorruptedFileError('File is too small to be a valid ZIP')
        )
        return { valid: false, errors }
      }

      const isValidZip =
        uint8Array[0] === 0x50 &&
        uint8Array[1] === 0x4b &&
        (uint8Array[2] === 0x03 || uint8Array[2] === 0x05) &&
        uint8Array[3] === 0x04

      if (!isValidZip) {
        errors.push(new CorruptedFileError('Invalid ZIP file signature'))
        return { valid: false, errors }
      }

      // Note: Full ZIP content validation would require a ZIP library
      // This is a basic validation that checks the file signature
    } catch (error) {
      errors.push(
        new CorruptedFileError(
          `Failed to validate ZIP content: ${error.message}`
        )
      )
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validates JSON structure
   * @param {Object} data - Parsed JSON data
   * @returns {Object} - Validation result
   */
  validateJsonStructure(data) {
    const errors = []

    if (typeof data !== 'object' || data === null) {
      errors.push(
        new ContentValidationError(
          'Invalid JSON structure: Expected object at root level',
          [{ path: 'root', message: 'Root must be an object' }]
        )
      )
      return { valid: false, errors }
    }

    // Check for metadata but don't require it
    if (data.metadata && typeof data.metadata !== 'object') {
      errors.push(
        new ContentValidationError('Invalid metadata section', [
          {
            path: 'metadata',
            message: 'Metadata must be an object if present',
          },
        ])
      )
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validates version compatibility
   * @param {Object} data - Parsed JSON data
   * @returns {Object} - Validation result
   */
  validateVersionCompatibility(data) {
    // Skip version validation if metadata is missing or incomplete
    if (!data.metadata) {
      console.warn('Missing metadata section, skipping version validation')
      return { valid: true }
    }

    if (!data.metadata.version) {
      console.warn(
        'Missing version information in metadata, skipping version validation'
      )
      return { valid: true }
    }

    const fileVersion = data.metadata.version

    // Simple version comparison (assumes semantic versioning)
    if (!this.isVersionCompatible(fileVersion, this.minCompatibleVersion)) {
      return {
        valid: false,
        error: new VersionCompatibilityError(
          `File version ${fileVersion} is not compatible with current version ${this.currentVersion}. Minimum compatible version: ${this.minCompatibleVersion}`,
          fileVersion,
          this.currentVersion
        ),
      }
    }

    return { valid: true }
  }

  /**
   * Validates data schema
   * @param {Object} data - Parsed JSON data
   * @returns {Object} - Validation result
   */
  validateSchema(data) {
    const errors = []

    // Define expected schema structure
    const expectedDataTypes = [
      'summaries',
      'history',
      'settings',
      'themes',
      'archive',
      'tags',
    ]

    // Check if data has at least one of the expected data types
    const hasValidData = expectedDataTypes.some(
      (type) => data[type] !== undefined
    )

    if (!hasValidData) {
      errors.push(
        new ContentValidationError('No valid data sections found', [
          {
            path: 'root',
            message: `At least one of these data types is required: ${expectedDataTypes.join(
              ', '
            )}`,
          },
        ])
      )
    }

    // Validate each data type if present
    for (const dataType of expectedDataTypes) {
      if (data[dataType] !== undefined) {
        const typeValidation = this.validateDataType(data[dataType], dataType)
        if (!typeValidation.valid) {
          errors.push(...typeValidation.errors)
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validates specific data type
   * @param {*} data - Data to validate
   * @param {string} type - Expected data type
   * @returns {Object} - Validation result
   */
  validateDataType(data, type) {
    const errors = []

    switch (type) {
      case 'summaries':
      case 'history':
      case 'archives':
      case 'archive':
      case 'tags':
        if (!Array.isArray(data)) {
          errors.push(
            new ContentValidationError(
              `Invalid data type for ${type}: Expected array`,
              [{ path: type, message: 'Must be an array' }]
            )
          )
        }
        break

      case 'settings':
      case 'themes':
      case 'theme':
        if (typeof data !== 'object' || data === null) {
          errors.push(
            new ContentValidationError(
              `Invalid data type for ${type}: Expected object`,
              [{ path: type, message: 'Must be an object' }]
            )
          )
        }
        break
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Detects file type based on file properties
   * @param {File} file - The file to analyze
   * @returns {string} - Detected file type
   */
  detectFileType(file) {
    const fileName = file.name.toLowerCase()

    if (fileName.endsWith('.json')) {
      return 'JSON'
    } else if (fileName.endsWith('.zip')) {
      return 'ZIP'
    }

    // Fallback to MIME type detection
    if (file.type === SUPPORTED_FORMATS.JSON) {
      return 'JSON'
    } else if (
      file.type === SUPPORTED_FORMATS.ZIP ||
      file.type === SUPPORTED_FORMATS.OCTET_STREAM
    ) {
      return 'ZIP'
    }

    throw new Error('Unable to detect file type')
  }

  /**
   * Reads file as text
   * @param {File} file - The file to read
   * @returns {Promise<string>} - File content as text
   */
  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  /**
   * Checks if versions are compatible
   * @param {string} version1 - First version
   * @param {string} version2 - Second version
   * @returns {boolean} - Whether versions are compatible
   */
  isVersionCompatible(fileVersion, minCompatibleVersion) {
    const fileParts = fileVersion.split('.').map(Number)
    const minParts = minCompatibleVersion.split('.').map(Number)

    // Compare major version
    if (fileParts[0] < minParts[0]) {
      return false
    }

    // If major versions are equal, compare minor version
    if (fileParts[0] === minParts[0] && fileParts[1] < minParts[1]) {
      return false
    }

    // If major and minor versions are equal, compare patch version
    if (
      fileParts[0] === minParts[0] &&
      fileParts[1] === minParts[1] &&
      fileParts[2] < minParts[2]
    ) {
      return false
    }

    return true
  }

  /**
   * Formats file size for display
   * @param {number} bytes - Size in bytes
   * @returns {string} - Formatted size string
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

/**
 * Factory function to create a validator instance
 * @param {Object} options - Configuration options
 * @returns {ImportValidator} - Validator instance
 */
export function createValidator(options = {}) {
  return new ImportValidator(options)
}

/**
 * Convenience function for quick validation
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 * @returns {Promise<Object>} - Validation result
 */
export async function validateImportFile(file, options = {}) {
  const validator = createValidator(options)
  return await validator.validateFile(file)
}

/**
 * Export validation result formatter
 * @param {Object} validationResult - Result from validateFile
 * @returns {Object} - Formatted result with user-friendly messages
 */
export function formatValidationResult(validationResult) {
  const { valid, errors, fileType } = validationResult

  if (valid) {
    return {
      success: true,
      message: `File validation successful. Detected type: ${fileType}`,
      fileType,
    }
  }

  const formattedErrors = errors.map((error) => ({
    type: error.name,
    code: error.code,
    message: error.message,
    details: error.details,
  }))

  return {
    success: false,
    message: `Validation failed with ${errors.length} error(s)`,
    errors: formattedErrors,
    fileType,
  }
}
