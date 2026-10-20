import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import { DEFAULT_DIM, clampDim } from './background-limits';

const VERSION_KEY = 'background_version';
const DIM_KEY = 'background_dim';
const FILE_NAME = 'background.jpg';

/** The photo is shrunk to about a phone screen before it is saved, so it stays light to draw and blur. */
const MAX_WIDTH = 1080;

export type Background = {
  /** The saved photo's address, or null for the default background. */
  uri: string | null;
  /** Changes whenever a new photo is saved, so the picture is redrawn. */
  version: number;
  /** 0 to 1: how strongly the screen color is laid over the photo. */
  dim: number;
};

function photoFile() {
  return new File(Paths.document, FILE_NAME);
}

let current: Background | undefined;
const listeners = new Set<() => void>();

function read(): Background {
  let version = 0;
  let dim = DEFAULT_DIM;
  try {
    version = Number(Storage.getItemSync(VERSION_KEY)) || 0;
    const saved = Storage.getItemSync(DIM_KEY);
    if (saved !== null) dim = clampDim(Number(saved));
  } catch {
    // keep the defaults
  }
  let uri: string | null = null;
  try {
    // A saved version with no file (cleared storage) means no photo.
    if (version > 0 && photoFile().exists) uri = photoFile().uri;
  } catch {
    uri = null;
  }
  return { uri, version: uri ? version : 0, dim };
}

export function getBackground(): Background {
  if (current === undefined) current = read();
  return current;
}

function publish(next: Background) {
  current = next;
  listeners.forEach((listener) => listener());
}

/** Let the person pick a photo, shrink it, and keep it as the background. Returns false if they backed out. */
export async function chooseBackground(): Promise<boolean> {
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    // Cropping to a tall shape means the photo fits a phone screen the way they chose.
    allowsEditing: true,
    aspect: [9, 19],
    quality: 1,
  });
  if (picked.canceled || picked.assets.length === 0) return false;

  const small = await manipulateAsync(picked.assets[0].uri, [{ resize: { width: MAX_WIDTH } }], {
    compress: 0.8,
    format: SaveFormat.JPEG,
  });

  const target = photoFile();
  if (target.exists) target.delete();
  new File(small.uri).copy(target);

  const version = Date.now();
  try {
    Storage.setItemSync(VERSION_KEY, String(version));
  } catch (error) {
    console.warn('Could not save the background', error);
  }
  publish({ ...getBackground(), uri: target.uri, version });
  return true;
}

export function removeBackground() {
  try {
    const target = photoFile();
    if (target.exists) target.delete();
    Storage.removeItemSync(VERSION_KEY);
  } catch (error) {
    console.warn('Could not remove the background', error);
  }
  publish({ ...getBackground(), uri: null, version: 0 });
}

export function setDim(value: number) {
  const dim = clampDim(value);
  try {
    Storage.setItemSync(DIM_KEY, String(dim));
  } catch (error) {
    console.warn('Could not save the dim level', error);
  }
  publish({ ...getBackground(), dim });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useBackground(): Background {
  return useSyncExternalStore(subscribe, getBackground, getBackground);
}
