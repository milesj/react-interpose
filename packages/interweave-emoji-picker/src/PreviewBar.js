/**
 * @copyright   2016, Miles Johnson
 * @license     https://opensource.org/licenses/MIT
 * @flow
 */

import React from 'react';
import PropTypes from 'prop-types';
import EmojiCharacter, { EmojiShape, EmojiPathShape, EmojiSourceShape } from 'interweave-emoji';

import type { Emoji, EmojiPath, EmojiSize, EmojiSource } from 'interweave-emoji'; // eslint-disable-line

type PreviewBarProps = {
  emoji: ?Emoji,
  emojiLargeSize: EmojiSize,
  emojiPath: EmojiPath,
  emojiSource: EmojiSource,
  hideEmoticon: boolean,
  hideShortcodes: boolean,
};

const TITLE_REGEX: RegExp = /(^|:|\.)\s?[a-z]/g;

export default class PreviewBar extends React.PureComponent<PreviewBarProps> {
  static contextTypes = {
    classNames: PropTypes.objectOf(PropTypes.string),
    messages: PropTypes.objectOf(PropTypes.node),
  };

  static propTypes = {
    emoji: EmojiShape,
    emojiLargeSize: PropTypes.number.isRequired,
    emojiPath: EmojiPathShape.isRequired,
    emojiSource: EmojiSourceShape.isRequired,
    hideEmoticon: PropTypes.bool.isRequired,
    hideShortcodes: PropTypes.bool.isRequired,
  };

  static defaultProps = {
    emoji: null,
  };

  /**
   * Format the title using sentence case.
   */
  formatTitle(): string {
    const { emoji } = this.props;

    if (!emoji) {
      return '';
    }

    const { annotation, primary_shortcode: shortcode } = emoji;

    // Flags and country names are cased correctly
    if (shortcode && shortcode.indexOf('flag_') >= 0) {
      return annotation;
    }

    return annotation.replace(TITLE_REGEX, token => token.toUpperCase());
  }

  render(): React$Node {
    const {
      emoji,
      emojiLargeSize,
      emojiPath,
      emojiSource,
      hideEmoticon,
      hideShortcodes,
    } = this.props;
    const { classNames, messages } = this.context;

    if (!emoji) {
      return (
        <div className={classNames.preview}>
          {messages.noPreview && (
            <div className={classNames.noPreview}>
              {messages.noPreview}
            </div>
          )}
        </div>
      );
    }

    const title = emoji.annotation || emoji.name;
    const subtitle = [];

    if (!hideEmoticon && emoji.emoticon) {
      subtitle.push(emoji.emoticon);
    }

    if (!hideShortcodes && emoji.canonical_shortcodes) {
      subtitle.push(...emoji.canonical_shortcodes);
    }

    return (
      <div className={classNames.preview}>
        <div className={classNames.previewEmoji}>
          <EmojiCharacter
            emojiLargeSize={emojiLargeSize}
            emojiPath={emojiPath}
            emojiSource={emojiSource}
            enlargeEmoji
            hexcode={emoji.hexcode}
          />
        </div>

        <div className={classNames.previewContent}>
          {title && (
            <div className={classNames.previewTitle}>
              {this.formatTitle()}
            </div>
          )}

          {(subtitle.length > 0) && (
            <div className={classNames.previewSubtitle}>
              {subtitle.join(' ')}
            </div>
          )}
        </div>
      </div>
    );
  }
}
