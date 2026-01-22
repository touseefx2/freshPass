import AsyncStorage from '@react-native-async-storage/async-storage';
import Logger from './logger';

// Local storage service using AsyncStorage (works on all platforms including web)
export class LocalStorageService {
  /**
   * Store a value in local storage
   */
  static async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      Logger.error(`❌ Failed to store ${key}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve a value from local storage
   */
  static async getItem(key: string): Promise<string | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value;
    } catch (error) {
      Logger.error(`❌ Failed to retrieve ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete a value from local storage
   */
  static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      Logger.error(`❌ Failed to remove ${key}:`, error);
      throw error;
    }
  }
}