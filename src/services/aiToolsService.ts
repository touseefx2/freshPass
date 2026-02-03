import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { Platform } from "react-native";
import { checkInternetConnection } from "./api";
import {
  hairTryonEndpoints,
  socialMediaEndpoints,
  businessEndpoints,
  clientChatEndpoints,
} from "./endpoints";
import Logger from "./logger";

// Get AI Tool base URL and token from environment
const AI_TOOL_BASE_URL = process.env.EXPO_PUBLIC_AITOOL_API_BASE_URL || "";
const AI_API_BEARER_TOKEN = process.env.EXPO_PUBLIC_AI_API_BEARER_TOKEN || "";

// Create axios instance for AI tools with different baseURL
const aiToolClient: AxiosInstance = axios.create({
  baseURL: AI_TOOL_BASE_URL,
  timeout: 300000, // 5 minutes
  headers: {
    "Content-Type": "multipart/form-data",
    Authorization: `Bearer ${AI_API_BEARER_TOKEN}`,
  },
});

/**
 * Helper function to extract FormData contents for logging
 */
const extractFormDataForLogging = (formData: FormData): any => {
  const result: any = {};
  if (formData) {
    try {
      // Try to access FormData entries if available
      const formDataAny = formData as any;

      // Method 1: Try entries() if available
      if (formDataAny.entries) {
        for (const [key, value] of formDataAny.entries()) {
          if (!result[key]) {
            result[key] = [];
          }
          // Check if it's a file object
          if (value && typeof value === "object" && "uri" in value) {
            result[key].push({
              type: "file",
              uri: value.uri,
              name: value.name || "unknown",
              type_mime: value.type || "unknown",
            });
          } else {
            result[key].push(value);
          }
        }
        // Convert single item arrays to direct values for cleaner logs
        Object.keys(result).forEach((key) => {
          if (result[key].length === 1) {
            result[key] = result[key][0];
          }
        });
      } else if (formDataAny._parts) {
        // Method 2: React Native FormData uses _parts internally
        formDataAny._parts.forEach((part: any[]) => {
          const key = part[0];
          const value = part[1];

          if (!result[key]) {
            result[key] = [];
          }

          // Check if it's a file object
          if (value && typeof value === "object" && "uri" in value) {
            result[key].push({
              type: "file",
              uri: value.uri,
              name: value.name || "unknown",
              type_mime: value.type || "unknown",
            });
          } else {
            result[key].push(value);
          }
        });
        // Convert single item arrays to direct values for cleaner logs
        Object.keys(result).forEach((key) => {
          if (result[key].length === 1) {
            result[key] = result[key][0];
          }
        });
      } else {
        // Fallback: Just indicate FormData exists
        result._note = "FormData exists but cannot extract contents";
      }
    } catch (error) {
      result._error = "Failed to extract FormData contents";
    }
  }
  return result;
};

/**
 * Helper functions for API logging
 */
const logAiToolRequest = (
  method: string,
  endpoint: string,
  formData?: FormData,
) => {
  if (__DEV__) {
    const fullUrl = `${AI_TOOL_BASE_URL}${endpoint}`;
    const logData: any = {
      url: fullUrl,
      endpoint: endpoint,
      baseURL: AI_TOOL_BASE_URL,
    };

    if (formData) {
      logData.body = extractFormDataForLogging(formData);
    }

    Logger.log(
      `🚀 AI Tool ${method} Request:`,
      JSON.stringify(logData, null, 2),
    );
  }
};

const logAiToolResponse = (
  method: string,
  endpoint: string,
  status: number,
  data: any,
) => {
  if (__DEV__) {
    const fullUrl = `${AI_TOOL_BASE_URL}${endpoint}`;
    Logger.log(`✅ AI Tool ${method} Response:`, {
      url: fullUrl,
      status: status,
      data: JSON.stringify(data),
    });
  }
};

const logAiToolError = (method: string, endpoint: string, error: any) => {
  if (__DEV__) {
    const fullUrl = `${AI_TOOL_BASE_URL}${endpoint}`;
    Logger.error(`❌ AI Tool ${method} Error:`, {
      url: fullUrl,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
  }
};

/**
 * Get readable error message from API response
 */
const getErrorMessage = (error: any): string => {
  // Handle network errors
  if (!error.response) {
    if (error.code === "ECONNABORTED") {
      return "Request timeout. Please check your connection and try again.";
    }
    if (error.message === "Network Error") {
      return "Network error. Please check your internet connection.";
    }
    return "Unable to connect to server. Please try again later.";
  }

  const { status, data } = error.response;

  // Handle specific status codes
  switch (status) {
    case 400:
      return (
        data?.detail ||
        data?.message ||
        data?.error ||
        "Invalid request. Please check your input."
      );
    case 401:
      return "Unauthorized. Please check your API token.";
    case 403:
      return "You don't have permission to perform this action.";
    case 404:
      return "Resource not found.";
    case 422:
      return (
        data?.detail ||
        data?.message ||
        data?.error ||
        "Validation error. Please check your input."
      );
    case 429:
      return "Too many requests. Please try again later.";
    case 500:
      return "Server error. Please try again later.";
    case 502:
      return "Bad gateway. Please try again later.";
    case 503:
      return "Service unavailable. Please try again later.";
    default:
      return (
        data?.detail ||
        data?.message ||
        data?.error ||
        `An error occurred (${status}). Please try again.`
      );
  }
};

/**
 * AI Tools Service
 * Handles API calls for AI tools (Hair Tryon, Generate Post, Collage, Reel)
 */
export class AiToolsService {
  /**
   * Start Hair Pipeline (background job for haircut recommendations)
   * @param sourceImageUri - URI of the source image
   * @returns Promise with { status, job_id, message, estimated_time_minutes }
   */
  static async startHairPipeline(sourceImageUri: string): Promise<{
    status: string;
    job_id: string;
    message: string;
    estimated_time_minutes: number;
  }> {
    const hasInternet = await checkInternetConnection();
    if (!hasInternet) {
      const error = new Error("No internet connection");
      (error as any).isNoInternet = true;
      logAiToolError("POST", hairTryonEndpoints.hairPipeline, error);
      throw error;
    }

    const endpoint = hairTryonEndpoints.hairPipeline;
    const formData = new FormData();

    const fileExtension =
      sourceImageUri.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `source_image.${fileExtension}`;
    const mimeType =
      fileExtension === "jpg" || fileExtension === "jpeg"
        ? "image/jpeg"
        : fileExtension === "png"
        ? "image/png"
        : "image/jpeg";

    formData.append("source_image", {
      uri: sourceImageUri,
      type: mimeType,
      name: fileName,
    } as any);

    logAiToolRequest("POST", endpoint, formData);

    try {
      const response: AxiosResponse = await aiToolClient.post(
        endpoint,
        formData,
      );
      logAiToolResponse("POST", endpoint, response.status, response.data);
      return response.data;
    } catch (error: any) {
      logAiToolError("POST", endpoint, error);
      const errorMessage = getErrorMessage(error);
      const customError = new Error(errorMessage);
      (customError as any).status = error.response?.status;
      (customError as any).data = error.response?.data;
      (customError as any).isNoInternet = error.isNoInternet;
      throw customError;
    }
  }

  /**
   * Get hair pipeline job status and result
   * @param jobId - Job ID from submitHairPipeline response
   * @returns Promise with status, attributes, recommendations, images
   */
  static async getHairPipelineStatus(jobId: string): Promise<any> {
    const hasInternet = await checkInternetConnection();
    if (!hasInternet) {
      const error = new Error("No internet connection");
      (error as any).isNoInternet = true;
      logAiToolError(
        "GET",
        hairTryonEndpoints.hairPipelineStatus(jobId),
        error,
      );
      throw error;
    }

    const endpoint = hairTryonEndpoints.hairPipelineStatus(jobId);

    try {
      const response: AxiosResponse = await aiToolClient.get(endpoint);
      logAiToolResponse("GET", endpoint, response.status, response.data);
      return response.data;
    } catch (error: any) {
      logAiToolError("GET", endpoint, error);
      const errorMessage = getErrorMessage(error);
      const customError = new Error(errorMessage);
      (customError as any).status = error.response?.status;
      (customError as any).data = error.response?.data;
      (customError as any).isNoInternet = error.isNoInternet;
      throw customError;
    }
  }

  /**
   * Generate Hair Tryon
   * @param sourceImageUri - URI of the source image
   * @param prompt - Hairstyle description prompt
   * @param generateAllViews - Whether to generate all views (default: true)
   * @returns Promise with response data
   */
  static async generateHairTryon(
    sourceImageUri: string,
    prompt: string,
    generateAllViews: boolean = true,
  ): Promise<any> {
    // Check internet connection
    const hasInternet = await checkInternetConnection();
    if (!hasInternet) {
      const error = new Error("No internet connection");
      (error as any).isNoInternet = true;
      logAiToolError("POST", hairTryonEndpoints.generateWithReplicate, error);
      throw error;
    }

    const endpoint = hairTryonEndpoints.generateWithReplicate;
    const formData = new FormData();

    // Add source_image
    const fileExtension =
      sourceImageUri.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `source_image.${fileExtension}`;
    const mimeType =
      fileExtension === "jpg" || fileExtension === "jpeg"
        ? "image/jpeg"
        : fileExtension === "png"
        ? "image/png"
        : "image/jpeg";

    formData.append("source_image", {
      uri: sourceImageUri,
      type: mimeType,
      name: fileName,
    } as any);

    // Add prompt
    formData.append("prompt", prompt.trim());

    // Add generate_all_views
    formData.append("generate_all_views", generateAllViews.toString());

    logAiToolRequest("POST", endpoint, formData);

    try {
      const response: AxiosResponse = await aiToolClient.post(
        endpoint,
        formData,
      );
      logAiToolResponse("POST", endpoint, response.status, response.data);
      return response.data;
    } catch (error: any) {
      logAiToolError("POST", endpoint, error);
      const errorMessage = getErrorMessage(error);
      const customError = new Error(errorMessage);
      (customError as any).status = error.response?.status;
      (customError as any).data = error.response?.data;
      (customError as any).isNoInternet = error.isNoInternet;
      throw customError;
    }
  }

  /**
   * Generate Post
   * @param businessId - Business ID
   * @param imageUri - URI of the image
   * @returns Promise with response data
   */
  static async generatePost(
    businessId: string,
    imageUri: string,
  ): Promise<any> {
    // Check internet connection
    const hasInternet = await checkInternetConnection();
    if (!hasInternet) {
      const error = new Error("No internet connection");
      (error as any).isNoInternet = true;
      logAiToolError("POST", socialMediaEndpoints.generatePost, error);
      throw error;
    }

    const endpoint = socialMediaEndpoints.generatePost;
    const formData = new FormData();

    // Add business_id
    formData.append("business_id", businessId.toString());

    // Add image
    const fileExtension = imageUri.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `post_image.${fileExtension}`;
    const mimeType =
      fileExtension === "jpg" || fileExtension === "jpeg"
        ? "image/jpeg"
        : fileExtension === "png"
        ? "image/png"
        : "image/jpeg";

    formData.append("image", {
      uri: imageUri,
      type: mimeType,
      name: fileName,
    } as any);

    logAiToolRequest("POST", endpoint, formData);

    try {
      const response: AxiosResponse = await aiToolClient.post(
        endpoint,
        formData,
      );
      logAiToolResponse("POST", endpoint, response.status, response.data);
      return response.data;
    } catch (error: any) {
      logAiToolError("POST", endpoint, error);
      const errorMessage = getErrorMessage(error);
      const customError = new Error(errorMessage);
      (customError as any).status = error.response?.status;
      (customError as any).data = error.response?.data;
      (customError as any).isNoInternet = error.isNoInternet;
      throw customError;
    }
  }

  /**
   * Generate Collage
   * @param businessId - Business ID
   * @param imageUris - Array of image URIs
   * @returns Promise with response data
   */
  static async generateCollage(
    businessId: string,
    imageUris: string[],
  ): Promise<any> {
    // Check internet connection
    const hasInternet = await checkInternetConnection();
    if (!hasInternet) {
      const error = new Error("No internet connection");
      (error as any).isNoInternet = true;
      logAiToolError("POST", socialMediaEndpoints.generateCollage, error);
      throw error;
    }

    const endpoint = socialMediaEndpoints.generateCollage;
    const formData = new FormData();

    // Add business_id
    formData.append("business_id", businessId.toString());

    // Add images
    imageUris.forEach((imageUri, index) => {
      const fileExtension = imageUri.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `collage_image_${index}.${fileExtension}`;
      const mimeType =
        fileExtension === "jpg" || fileExtension === "jpeg"
          ? "image/jpeg"
          : fileExtension === "png"
          ? "image/png"
          : "image/jpeg";

      formData.append("images", {
        uri: imageUri,
        type: mimeType,
        name: fileName,
      } as any);
    });

    logAiToolRequest("POST", endpoint, formData);

    try {
      const response: AxiosResponse = await aiToolClient.post(
        endpoint,
        formData,
      );
      logAiToolResponse("POST", endpoint, response.status, response.data);
      return response.data;
    } catch (error: any) {
      logAiToolError("POST", endpoint, error);
      const errorMessage = getErrorMessage(error);
      const customError = new Error(errorMessage);
      (customError as any).status = error.response?.status;
      (customError as any).data = error.response?.data;
      (customError as any).isNoInternet = error.isNoInternet;
      throw customError;
    }
  }

  /**
   * Generate Reel
   * @param businessId - Business ID
   * @param mediaFiles - Array of media file objects with uri and type
   * @param backgroundMusicUri - Optional background music URI
   * @param backgroundMusicName - Optional background music name
   * @returns Promise with response data
   */
  static async generateReel(
    businessId: string,
    mediaFiles: Array<{ uri: string; type: "image" | "video" }>,
    backgroundMusicUri?: string,
    backgroundMusicName?: string,
  ): Promise<any> {
    // Check internet connection
    const hasInternet = await checkInternetConnection();
    if (!hasInternet) {
      const error = new Error("No internet connection");
      (error as any).isNoInternet = true;
      logAiToolError("POST", socialMediaEndpoints.generateReel, error);
      throw error;
    }

    const endpoint = socialMediaEndpoints.generateReel;
    const formData = new FormData();

    // Add business_id
    formData.append("business_id", businessId.toString());

    // Add media_files
    mediaFiles.forEach((media, index) => {
      const fileExtension = media.uri.split(".").pop()?.toLowerCase() || "jpg";
      let fileName = "";
      let mimeType = "";

      if (media.type === "video") {
        fileName = `reel_video_${index}.${fileExtension}`;
        mimeType =
          fileExtension === "mp4"
            ? "video/mp4"
            : fileExtension === "mov"
            ? "video/quicktime"
            : "video/mp4";
      } else {
        fileName = `reel_image_${index}.${fileExtension}`;
        mimeType =
          fileExtension === "jpg" || fileExtension === "jpeg"
            ? "image/jpeg"
            : fileExtension === "png"
            ? "image/png"
            : "image/jpeg";
      }

      formData.append("media_files", {
        uri: media.uri,
        type: mimeType,
        name: fileName,
      } as any);
    });

    // Add background_music if provided
    if (backgroundMusicUri) {
      const fileExtension =
        backgroundMusicUri.split(".").pop()?.toLowerCase() || "mp3";
      const fileName =
        backgroundMusicName || `background_music.${fileExtension}`;
      const mimeType =
        fileExtension === "mp3"
          ? "audio/mpeg"
          : fileExtension === "wav"
          ? "audio/wav"
          : fileExtension === "m4a"
          ? "audio/mp4"
          : "audio/mpeg";

      formData.append("background_music", {
        uri: backgroundMusicUri,
        type: mimeType,
        name: fileName,
      } as any);
    }

    logAiToolRequest("POST", endpoint, formData);

    try {
      const response: AxiosResponse = await aiToolClient.post(
        endpoint,
        formData,
      );
      logAiToolResponse("POST", endpoint, response.status, response.data);
      return response.data;
    } catch (error: any) {
      logAiToolError("POST", endpoint, error);
      const errorMessage = getErrorMessage(error);
      const customError = new Error(errorMessage);
      (customError as any).status = error.response?.status;
      (customError as any).data = error.response?.data;
      (customError as any).isNoInternet = error.isNoInternet;
      throw customError;
    }
  }

  /**
   * Generate Subscription Plans
   * @param businessId - Business ID
   * @returns Promise with response data
   */
  static async generateSubscription(businessId: number): Promise<any> {
    // Check internet connection
    const hasInternet = await checkInternetConnection();
    if (!hasInternet) {
      const error = new Error("No internet connection");
      (error as any).isNoInternet = true;
      logAiToolError("POST", businessEndpoints.generateSubscription, error);
      throw error;
    }

    const endpoint = businessEndpoints.generateSubscription;
    const formData = new FormData();

    // Add business_id
    formData.append("business_id", businessId.toString());

    logAiToolRequest("POST", endpoint, formData);

    try {
      const response: AxiosResponse = await aiToolClient.post(
        endpoint,
        formData,
      );
      logAiToolResponse("POST", endpoint, response.status, response.data);
      return response.data;
    } catch (error: any) {
      logAiToolError("POST", endpoint, error);
      const errorMessage = getErrorMessage(error);
      const customError = new Error(errorMessage);
      (customError as any).status = error.response?.status;
      (customError as any).data = error.response?.data;
      (customError as any).isNoInternet = error.isNoInternet;
      throw customError;
    }
  }

  /**
   * Stream Chat with AI Assistant
   * @param sessionId - Session ID for the chat
   * @param message - User message
   * @param businessId - Optional Business ID
   * @param onToken - Callback function called for each token received
   * @param onComplete - Callback function called when stream is complete
   * @param onError - Callback function called on error
   * @returns Promise that resolves when stream is complete
   */
  static async streamChat(
    sessionId: string,
    message: string,
    businessId: string | null,
    onToken: (token: string) => void,
    onComplete: (fullResponse: string, newSessionId: string) => void,
    onError: (error: Error) => void,
  ): Promise<void> {
    // Check internet connection
    const hasInternet = await checkInternetConnection();
    if (!hasInternet) {
      const error = new Error("No internet connection");
      (error as any).isNoInternet = true;
      onError(error);
      return;
    }

    const endpoint = clientChatEndpoints.chatStream;
    // Fix double slash in URL
    const baseUrl = AI_TOOL_BASE_URL.endsWith("/")
      ? AI_TOOL_BASE_URL.slice(0, -1)
      : AI_TOOL_BASE_URL;
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const fullUrl = `${baseUrl}${cleanEndpoint}`;

    // Prepare request body as URL-encoded form data
    const formData = new URLSearchParams();
    formData.append("session_id", sessionId);
    formData.append("message", message);

    // Add business_id only if provided and not null
    if (businessId && businessId.trim() !== "") {
      formData.append("business_id", businessId);
    }

    if (__DEV__) {
      const bodyObj: any = {
        session_id: sessionId,
        message: message,
      };
      if (businessId && businessId.trim() !== "") {
        bodyObj.business_id = businessId;
      }
      Logger.log(
        `🚀 AI Stream Chat Request:`,
        JSON.stringify({ url: fullUrl, body: bodyObj }, null, 2),
      );
    }

    try {
      // Use XMLHttpRequest for React Native (React Native doesn't support ReadableStream)
      // This mimics the web fetch + ReadableStream pattern but uses XMLHttpRequest
      return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let fullResponse = "";
        let newSessionId = sessionId;
        let processedLength = 0;
        let buffer = "";
        let hasReceivedData = false;
        const startTime = Date.now();
        const TIMEOUT_MS = 30000; // 30 seconds timeout

        xhr.open("POST", fullUrl, true);
        xhr.setRequestHeader(
          "Content-Type",
          "application/x-www-form-urlencoded",
        );
        xhr.setRequestHeader("Accept", "text/event-stream");
        xhr.setRequestHeader("Authorization", `Bearer ${AI_API_BEARER_TOKEN}`);
        xhr.responseType = "text";

        // Polling interval to check for new data (React Native doesn't support streaming events)
        let pollingInterval: ReturnType<typeof setInterval> | null = null;
        let isComplete = false;

        const processSSEEvents = (text: string) => {
          buffer += text;
          // Normalize newlines
          buffer = buffer.replace(/\r\n/g, "\n");

          // Process events separated by \n\n (SSE format)
          let eventEnd: number;
          while ((eventEnd = buffer.indexOf("\n\n")) !== -1) {
            const rawEvent = buffer.slice(0, eventEnd);
            buffer = buffer.slice(eventEnd + 2);

            if (!rawEvent.trim()) continue;

            const lines = rawEvent.split("\n");
            for (const line of lines) {
              if (!line.trim()) continue;

              if (__DEV__) {
                Logger.log("SSE line:", line);
              }

              // Handle both "data: " and "data: data: " prefixes
              let dataStr = "";
              if (line.startsWith("data: data: ")) {
                dataStr = line.slice(12).trim();
              } else if (line.startsWith("data: ")) {
                dataStr = line.slice(6).trim();
              } else {
                continue;
              }

              if (!dataStr) continue;

              try {
                const parsed = JSON.parse(dataStr);

                if (__DEV__) {
                  Logger.log("Parsed SSE data:", parsed);
                }

                // 1) Token chunks during streaming
                if (parsed.token) {
                  fullResponse += parsed.token;
                  onToken(parsed.token);
                  hasReceivedData = true;
                }

                // 2) Completion event: done === true
                if (parsed.done) {
                  // Update session id from completion event
                  if (parsed.session_id) {
                    newSessionId = parsed.session_id;
                  }

                  // Ensure full response is reflected if provided
                  if (parsed.full_response) {
                    fullResponse =
                      typeof parsed.full_response === "string"
                        ? parsed.full_response
                        : fullResponse;
                  }

                  isComplete = true;
                  if (pollingInterval) {
                    clearInterval(pollingInterval);
                    pollingInterval = null;
                  }

                  if (__DEV__) {
                    Logger.log(`✅ AI Stream Chat Complete:`, {
                      fullResponse,
                      newSessionId,
                    });
                  }

                  onComplete(fullResponse, newSessionId);
                  resolve();
                  return;
                }

                // 3) Session ID may also arrive independently
                if (parsed.session_id && !parsed.done) {
                  newSessionId = parsed.session_id;
                }

                // 4) Error event inside stream
                if (parsed.error || parsed.detail) {
                  const errorMessage =
                    parsed.detail ||
                    parsed.message ||
                    parsed.error ||
                    "An error occurred";
                  if (__DEV__) {
                    Logger.error("AI API error:", parsed);
                  }
                  isComplete = true;
                  if (pollingInterval) {
                    clearInterval(pollingInterval);
                    pollingInterval = null;
                  }
                  const error = new Error(errorMessage);
                  (error as any).status = xhr.status || 500;
                  reject(error);
                  return;
                }
              } catch (e) {
                // If not JSON, treat as plain text token (fallback)
                if (dataStr.trim()) {
                  if (__DEV__) {
                    Logger.log("Non-JSON data:", dataStr);
                  }
                  fullResponse += dataStr;
                  onToken(dataStr);
                  hasReceivedData = true;
                }
              }
            }
          }
        };

        const checkForNewData = () => {
          if (isComplete) return;

          // Check for timeout
          if (Date.now() - startTime > TIMEOUT_MS && !hasReceivedData) {
            if (__DEV__) {
              Logger.error("Stream timeout - no data received");
            }
            isComplete = true;
            if (pollingInterval) {
              clearInterval(pollingInterval);
              pollingInterval = null;
            }
            const error = new Error(
              "Request timeout: No response received from the server",
            );
            (error as any).status = 408;
            reject(error);
            return;
          }

          try {
            if (xhr.responseText && typeof xhr.responseText === "string") {
              const currentLength = xhr.responseText.length;
              if (currentLength > processedLength) {
                const newData = xhr.responseText.substring(processedLength);
                processedLength = currentLength;
                processSSEEvents(newData);
              }
            }
          } catch (e) {
            if (__DEV__) {
              Logger.log("Error checking for new data:", e);
            }
          }
        };

        // Start polling for new data
        pollingInterval = setInterval(checkForNewData, 50); // Check every 50ms

        xhr.onreadystatechange = () => {
          checkForNewData();

          if (xhr.readyState === XMLHttpRequest.DONE || xhr.readyState === 4) {
            // Stop polling
            if (pollingInterval) {
              clearInterval(pollingInterval);
              pollingInterval = null;
            }
            isComplete = true;

            // Process any remaining data
            checkForNewData();

            if (xhr.status >= 200 && xhr.status < 300) {
              if (!hasReceivedData) {
                if (__DEV__) {
                  Logger.warn("Stream ended without receiving any data");
                }
                // Still complete with empty response
                onComplete(
                  fullResponse || "No response received. Please try again.",
                  newSessionId,
                );
                resolve();
              } else if (!isComplete) {
                // If not already completed, complete now
                onComplete(fullResponse, newSessionId);
                resolve();
              }
            } else {
              // Handle HTTP error
              let errorMessage = `Chat service error (HTTP ${xhr.status})`;
              try {
                const errorData = xhr.responseText;
                if (errorData) {
                  const json = JSON.parse(errorData);
                  errorMessage =
                    json.detail || json.message || json.error || errorMessage;
                }
              } catch (e) {
                // If parsing fails, use default message
              }

              if (__DEV__) {
                Logger.error(
                  "Stream response error:",
                  xhr.status,
                  xhr.responseText,
                );
              }

              const error = new Error(errorMessage);
              (error as any).status = xhr.status;
              reject(error);
            }
          }
        };

        xhr.onerror = () => {
          // Stop polling on error
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
          isComplete = true;
          const error = new Error("Network error occurred");
          (error as any).status = 0;
          reject(error);
        };

        xhr.send(formData.toString());
      }).catch((error: any) => {
        // Handle Promise rejection (async errors from XMLHttpRequest)
        if (__DEV__) {
          Logger.error(`❌ AI Stream Chat Error:`, error);
        }
        const errorMessage = error.message || getErrorMessage(error);
        const customError = new Error(errorMessage);
        (customError as any).status = error.status || error.response?.status;
        onError(customError);
      });
    } catch (error: any) {
      // Handle synchronous errors
      if (__DEV__) {
        Logger.error(`❌ AI Stream Chat Error:`, error);
      }
      const errorMessage = error.message || getErrorMessage(error);
      const customError = new Error(errorMessage);
      (customError as any).status = error.status || error.response?.status;
      onError(customError);
    }
  }
}
