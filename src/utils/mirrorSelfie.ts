import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import Logger from "@/src/services/logger";

/**
 * iOS front camera shows a mirrored preview but saves the un-mirrored photo,
 * so selfies look "flipped" after capture (Android saves as previewed).
 * Use only for selfie features (try-on, profile photo) — never for work /
 * portfolio / product photos, where mirroring puts work on the wrong side
 * and reverses text.
 */

/** Spread into launchCameraAsync options: iOS needs exif to know the lens. */
export const selfieCameraOptions: Partial<ImagePicker.ImagePickerOptions> =
  Platform.OS === "ios" ? { exif: true } : {};

export async function mirrorFrontCameraSelfie(
  asset: ImagePicker.ImagePickerAsset,
): Promise<ImagePicker.ImagePickerAsset> {
  if (Platform.OS !== "ios") return asset;
  const lens = String(asset.exif?.LensModel ?? "").toLowerCase();
  if (!lens.includes("front")) return asset;
  try {
    const flipped = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ flip: ImageManipulator.FlipType.Horizontal }],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
    );
    return {
      ...asset,
      uri: flipped.uri,
      width: flipped.width,
      height: flipped.height,
    };
  } catch (e) {
    Logger.error("Selfie mirror failed, using original:", e);
    return asset;
  }
}
