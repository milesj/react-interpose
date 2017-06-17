/**
 * @copyright   2016, Miles Johnson
 * @license     https://opensource.org/licenses/MIT
 * @flow
 */

import React from 'react';
import Matcher from '../Matcher';
import Emoji from '../components/Emoji';
import {
  EMOJI_REGEX,
  EMOJI_SHORTNAME_REGEX,
  SHORTNAME_TO_UNICODE,
  UNICODE_TO_SHORTNAME,
} from '../data/emoji';

import type {
  MatchResponse,
  MatcherFactory,
  EmojiProps,
  EmojiOptions,
  ParsedNodes,
} from '../types';

export default class EmojiMatcher extends Matcher<EmojiOptions> {
  options: EmojiOptions;

  constructor(name: string, options: Object = {}, factory: ?MatcherFactory = null) {
    super(name, {
      convertShortname: false,
      convertUnicode: false,
      renderUnicode: false,
      ...options,
    }, factory);
  }

  replaceWith(match: string, props: Object = {}): React.Element<EmojiProps> {
    if (this.options.renderUnicode) {
      return props.unicode;
    }

    return (
      <Emoji {...props} />
    );
  }

  asTag(): string {
    return 'img';
  }

  match(string: string): ?MatchResponse {
    let response = null;

    // Should we convert shortnames to unicode?
    if (this.options.convertShortname && string.indexOf(':') >= 0) {
      response = this.doMatch(string, EMOJI_SHORTNAME_REGEX, matches => ({
        shortname: matches[0].toLowerCase(),
      }));

      if (response && response.shortname) {
        const unicode = SHORTNAME_TO_UNICODE[response.shortname];

        // We want to render using the unicode value
        if (unicode) {
          response.unicode = unicode;

        // Invalid shortname
        } else {
          response = null;
        }
      }
    }

    // Should we convert unicode to SVG/PNG?
    if (this.options.convertUnicode && !response) {
      response = this.doMatch(string, EMOJI_REGEX, matches => ({
        unicode: matches[0],
      }));

      if (
        response && response.unicode &&
        !UNICODE_TO_SHORTNAME[response.unicode]
      ) {
        /* istanbul ignore next Hard to test */
        return null;
      }
    }

    return response;
  }

  /**
   * When a single `Emoji` is the only content, enlarge it!
   */
  onAfterParse(content: ParsedNodes): ParsedNodes {
    if (content.length === 1) {
      let [item] = content;

      if (typeof item !== 'string' && React.isValidElement(item) && item.type === Emoji) {
        item = (item: React.Element<*>);

        return [
          React.cloneElement(item, {
            ...item.props,
            enlargeEmoji: true,
          }),
        ];
      }
    }

    return content;
  }
}
