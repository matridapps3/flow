/**
 * Ambient sound engine: 3 nature sounds, mix multiple tracks, fade in/out at session boundaries.
 * Uses expo-av. Requires assets/sounds/ambient1.mp3, ambient2.mp3, ambient3.mp3.
 */
import { Audio } from "expo-av";
import { Platform } from "react-native";

const FADE_MS = 1000;
const FADE_STEPS = 20;
const TARGET_VOLUME = 0.35;

const SOUND_SOURCES = [
  require("../assets/sounds/ambient1.mp3"),
  require("../assets/sounds/ambient2.mp3"),
  require("../assets/sounds/ambient3.mp3"),
] as const;

type SoundInstance = Awaited<ReturnType<typeof Audio.Sound.createAsync>>["sound"];
let sounds: SoundInstance[] | null = null;
let initialized = false;

export async function initAmbientSound(): Promise<void> {
  if (initialized || Platform.OS === "web") return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    sounds = [];
    for (const source of SOUND_SOURCES) {
      const { sound } = await Audio.Sound.createAsync(source, {
        isLooping: true,
        volume: 0,
      });
      sounds.push(sound);
    }
    initialized = true;
  } catch {
    sounds = null;
  }
}

export async function releaseAmbientSound(): Promise<void> {
  if (!sounds) return;
  for (const s of sounds) {
    try {
      await s.unloadAsync();
    } catch {
      /* ignore */
    }
  }
  sounds = null;
  initialized = false;
}

async function setVolumes(volumes: number[]): Promise<void> {
  if (!sounds) return;
  for (let i = 0; i < sounds.length; i++) {
    const v = volumes[i] ?? 0;
    try {
      await sounds[i].setVolumeAsync(v);
    } catch {
      /* ignore */
    }
  }
}

export async function fadeInAmbient(activeTracks: boolean[]): Promise<void> {
  if (!sounds || Platform.OS === "web") return;
  const stepDuration = FADE_MS / FADE_STEPS;
  const stepVolume = TARGET_VOLUME / FADE_STEPS;
  for (let step = 1; step <= FADE_STEPS; step++) {
    const volumes = activeTracks.map((on) => (on ? step * stepVolume : 0));
    await setVolumes(volumes);
    await new Promise((r) => setTimeout(r, stepDuration));
  }
  await setVolumes(activeTracks.map((on) => (on ? TARGET_VOLUME : 0)));
}

export async function fadeOutAmbient(): Promise<void> {
  if (!sounds || Platform.OS === "web") return;
  const stepDuration = FADE_MS / FADE_STEPS;
  const count = sounds.length;
  for (let step = FADE_STEPS - 1; step >= 0; step--) {
    const v = (step / FADE_STEPS) * TARGET_VOLUME;
    const volumes = Array(count).fill(v);
    await setVolumes(volumes);
    await new Promise((r) => setTimeout(r, stepDuration));
  }
  await setVolumes(Array(count).fill(0));
}

export async function playAmbientTracks(activeTracks: boolean[]): Promise<void> {
  if (!sounds || Platform.OS === "web") return;
  for (let i = 0; i < sounds.length; i++) {
    try {
      if (activeTracks[i]) {
        await sounds[i].setVolumeAsync(0);
        await sounds[i].playAsync();
      }
    } catch {
      /* ignore */
    }
  }
}

export async function stopAmbientTracks(): Promise<void> {
  if (!sounds || Platform.OS === "web") return;
  for (const s of sounds) {
    try {
      await s.stopAsync();
      await s.setPositionAsync(0);
    } catch {
      /* ignore */
    }
  }
}

export const AMBIENT_TRACK_COUNT = 3;
