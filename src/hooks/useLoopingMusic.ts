import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { Audio } from "expo-av";
import Logger from "@/src/services/logger";

/**
 * A song looping under a preview (template gallery sample, design review
 * clips). A new `url` loads a fresh copy, so it starts from 0:00; it plays
 * while `playing`, pauses with it and stops when `url` goes null / unmount.
 * Returns true only when the song couldn't be loaded (the caller can fall
 * back to the video's own sound); a failed start is simply tried again on
 * the next change.
 */
export function useLoopingMusic(url: string | null, playing: boolean): boolean {
  const soundRef = useRef<Audio.Sound | null>(null);
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (!url) return;
    let alive = true;
    (async () => {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      }).catch(() => {});
      let sound: Audio.Sound;
      try {
        ({ sound } = await Audio.Sound.createAsync(
          { uri: url },
          { isLooping: true, shouldPlay: false },
        ));
      } catch (error) {
        Logger.warn("Preview music could not be loaded:", error);
        if (alive) setFailed(true);
        return;
      }
      if (!alive) {
        await sound.unloadAsync().catch(() => {});
        return;
      }
      soundRef.current = sound;
      // The preview usually starts while the song is still downloading:
      // catch up with it now that the song is ready
      if (playingRef.current) {
        await sound.playAsync().catch((error) => {
          Logger.warn("Preview music could not start:", error);
        });
      }
    })();
    return () => {
      alive = false;
      const sound = soundRef.current;
      soundRef.current = null;
      void sound?.unloadAsync().catch(() => {});
    };
  }, [url]);

  useEffect(() => {
    const sound = soundRef.current;
    if (!sound) return;
    (playing ? sound.playAsync() : sound.pauseAsync()).catch(() => {});
  }, [playing]);

  // The OS stops audio in the background; carry on once the app is back
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && playingRef.current) {
        soundRef.current?.playAsync().catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);

  return failed;
}
