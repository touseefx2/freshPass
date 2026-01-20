import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { checkInternetConnection } from "./api";
import { hairTryonEndpoints, socialMediaEndpoints, businessEndpoints } from "./endpoints";

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
          if (value && typeof value === 'object' && 'uri' in value) {
            result[key].push({
              type: 'file',
              uri: value.uri,
              name: value.name || 'unknown',
              type_mime: value.type || 'unknown',
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
          if (value && typeof value === 'object' && 'uri' in value) {
            result[key].push({
              type: 'file',
              uri: value.uri,
              name: value.name || 'unknown',
              type_mime: value.type || 'unknown',
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
        result._note = 'FormData exists but cannot extract contents';
      }
    } catch (error) {
      result._error = 'Failed to extract FormData contents';
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
  formData?: FormData
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

    console.log(`🚀 AI Tool ${method} Request:`, JSON.stringify(logData, null, 2));
  }
};

const logAiToolResponse = (
  method: string,
  endpoint: string,
  status: number,
  data: any
) => {
  if (__DEV__) {
    const fullUrl = `${AI_TOOL_BASE_URL}${endpoint}`;
    console.log(`✅ AI Tool ${method} Response:`, {
      url: fullUrl,
      status: status,
      data: JSON.stringify(data),
    });
  }
};

const logAiToolError = (
  method: string,
  endpoint: string,
  error: any
) => {
  if (__DEV__) {
    const fullUrl = `${AI_TOOL_BASE_URL}${endpoint}`;
    console.error(`❌ AI Tool ${method} Error:`, {
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
   * Generate Hair Tryon
   * @param sourceImageUri - URI of the source image
   * @param prompt - Hairstyle description prompt
   * @param generateAllViews - Whether to generate all views (default: true)
   * @returns Promise with response data
   */
  static async generateHairTryon(
    sourceImageUri: string,
    prompt: string,
    generateAllViews: boolean = true
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
        formData
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
    imageUri: string
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
        formData
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
    imageUris: string[]
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
      const fileExtension =
        imageUri.split(".").pop()?.toLowerCase() || "jpg";
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
        formData
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
    backgroundMusicName?: string
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
      const fileExtension =
        media.uri.split(".").pop()?.toLowerCase() || "jpg";
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
        formData
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
  static async generateSubscription(
    businessId: number
  ): Promise<any> {
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
        formData
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
}

