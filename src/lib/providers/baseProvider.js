// @ts-nocheck
/**
 * Base interface for AI content generation providers.
 * All providers must implement these methods.
 */
export class BaseProvider {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('API key is required for this provider.')
    }
    this.apiKey = apiKey
  }

  /**
   * Generates content based on the provided model, prompt, and configuration.
   * @param {string} model - The model identifier.
   * @param {Array<Object>} contents - The content parts for the prompt.
   * @param {Object} systemInstruction - System instructions for the model.
   * @param {Object} generationConfig - Configuration for content generation (e.g., temperature, topP).
   * @returns {Promise<Object>} - Raw response from the AI API.
   */
  async generateContent(model, contents, systemInstruction, generationConfig) {
    throw new Error(
      'Method "generateContent" must be implemented by subclasses.'
    )
  }

  /**
   * Parses the raw API response and extracts the summarized text.
   * @param {Object} rawResponse - The raw response object from the AI API.
   * @returns {string} - The extracted summary text.
   */
  parseResponse(rawResponse) {
    throw new Error('Method "parseResponse" must be implemented by subclasses.')
  }

  /**
   * Handles API-specific errors and returns a user-friendly error message.
   * @param {Error} error - The original error object.
   * @param {string} model - The model that was used.
   * @returns {string} - A user-friendly error message.
   */
  handleError(error, model) {
    throw new Error('Method "handleError" must be implemented by subclasses.')
  }
}
