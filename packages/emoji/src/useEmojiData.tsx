import { useEffect, useMemo, useState } from 'react';
import { fetchEmojis, fetchMetadata, Locale, ShortcodePreset } from 'emojibase';
import { LATEST_DATASET_VERSION } from './constants';
import EmojiDataManager from './EmojiDataManager';
import { CanonicalEmoji, Source, UseEmojiDataOptions } from './types';

function determinePresets(locale: string, shortcodes: string[]): string[] {
  const presets: string[] = [];

  if (shortcodes.length === 0) {
    presets.push('emojibase');
  } else {
    presets.push(...shortcodes);
  }

  if (
    !locale.startsWith('en') &&
    presets.includes('emojibase') &&
    !presets.includes('en/emojibase')
  ) {
    presets.push('en/emojibase');
  }

  return presets;
}

const promises = new Map<string, Promise<CanonicalEmoji[]>>();

export function resetLoaded() {
  if (__DEV__) {
    promises.clear();
  }
}

function loadEmojis(
  locale: Locale,
  version: string,
  shortcodes: (string | ShortcodePreset)[],
  compact: boolean,
): Promise<CanonicalEmoji[]> {
  const key = `${locale}:${version}:${compact ? 'compact' : 'data'}`;
  const instance = EmojiDataManager.getInstance(locale);

  // Data has been loaded elsewhere
  if (instance.data.length > 0) {
    return Promise.resolve(instance.getData());
  }

  // Return as we're currently loading data
  if (promises.has(key)) {
    return promises.get(key)!;
  }

  // Otherwise, start loading emoji data from the CDN
  const request = Promise.all([
    // @ts-expect-error
    fetchEmojis(locale, { compact, flat: false, shortcodes, version }) as Emoji[],
    fetchMetadata(locale, { version }),
  ]);

  promises.set(
    key,
    request.then(([emojis, messages]) => {
      instance.parseEmojiData(emojis);
      instance.parseMessageData(messages);

      return instance.getData();
    }),
  );

  return promises.get(key)!;
}

export default function useEmojiData({
  avoidFetch = false,
  compact = false,
  locale = 'en',
  shortcodes = ['emojibase'],
  throwErrors = false,
  version = LATEST_DATASET_VERSION,
}: UseEmojiDataOptions = {}): [CanonicalEmoji[], Source, EmojiDataManager] {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shortcodePresets = useMemo(() => determinePresets(locale, shortcodes), shortcodes);
  const [emojis, setEmojis] = useState<CanonicalEmoji[]>([]);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    let mounted = true;

    if (!avoidFetch) {
      loadEmojis(locale, version, shortcodePresets, compact)
        .then((loadedEmojis) => {
          if (mounted) {
            setEmojis(loadedEmojis);
          }

          return loadedEmojis;
        })
        .catch(setError);
    }

    return () => {
      mounted = false;
    };
  }, [avoidFetch, compact, locale, shortcodePresets, version]);

  if (error && throwErrors) {
    throw error;
  }

  return [
    emojis,
    {
      compact,
      error,
      locale,
      version,
    },
    EmojiDataManager.getInstance(locale),
  ];
}
