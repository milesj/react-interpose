/**
 * @copyright   2016, Miles Johnson
 * @license     https://opensource.org/licenses/MIT
 * @flow
 */

import React from 'react';
import PropTypes from 'prop-types';
import List from 'react-virtualized/dist/commonjs/List';
import chunk from 'lodash/chunk';
import { EmojiShape, EmojiPathShape, EmojiSourceShape } from 'interweave-emoji';
import EmojiButton from './Emoji';
import {
  GROUPS,
  GROUP_COMMONLY_USED,
  GROUP_SEARCH_RESULTS,
  GROUP_SMILEYS_PEOPLE,
} from './constants';

import type { Emoji, EmojiPath, EmojiSource } from 'interweave-emoji'; // eslint-disable-line

type EmojiListProps = {
  activeEmoji: ?Emoji,
  activeGroup: string,
  columnCount: number,
  commonEmojis: Emoji[],
  commonMode: string,
  emojiPadding: number,
  emojiPath: EmojiPath,
  emojis: Emoji[],
  emojiSize: number,
  emojiSource: EmojiSource,
  hasCommonlyUsed: boolean,
  onEnterEmoji: (emoji: Emoji, e: *) => void,
  onLeaveEmoji: (emoji: Emoji, e: *) => void,
  onScroll: (e: *) => void,
  onScrollGroup: (group: string, e: *) => void,
  onSelectEmoji: (emoji: Emoji, e: *) => void,
  rowCount: number,
  scrollToGroup: string,
  searchQuery: string,
  skinTonePalette: React$Node,
};

type EmojiListState = {
  groupIndices: { [key: string]: number },
  rows: (string | Emoji[])[],
};

export default class EmojiVirtualList extends React.PureComponent<EmojiListProps, EmojiListState> {
  static contextTypes = {
    classNames: PropTypes.objectOf(PropTypes.string),
    messages: PropTypes.objectOf(PropTypes.node),
  };

  static propTypes = {
    activeEmoji: EmojiShape,
    activeGroup: PropTypes.string.isRequired,
    columnCount: PropTypes.number.isRequired,
    commonEmojis: PropTypes.arrayOf(EmojiShape).isRequired,
    commonMode: PropTypes.string.isRequired,
    emojiPadding: PropTypes.number.isRequired,
    emojiPath: EmojiPathShape.isRequired,
    emojiSize: PropTypes.number.isRequired,
    emojiSource: EmojiSourceShape.isRequired,
    emojis: PropTypes.arrayOf(EmojiShape).isRequired,
    hasCommonlyUsed: PropTypes.bool.isRequired,
    rowCount: PropTypes.number.isRequired,
    scrollToGroup: PropTypes.string.isRequired,
    searchQuery: PropTypes.string.isRequired,
    skinTonePalette: PropTypes.node,
    onEnterEmoji: PropTypes.func.isRequired,
    onLeaveEmoji: PropTypes.func.isRequired,
    onScroll: PropTypes.func.isRequired,
    onScrollGroup: PropTypes.func.isRequired,
    onSelectEmoji: PropTypes.func.isRequired,
  };

  static defaultProps = {
    activeEmoji: null,
    skinTonePalette: null,
  };

  state = {
    groupIndices: {},
    rows: [],
  };

  componentWillMount() {
    this.groupEmojisIntoRows(this.props);
  }

  componentWillReceiveProps(props: EmojiListProps) {
    const {
      activeEmoji,
      commonEmojis,
      emojis,
      searchQuery,
    } = props;

    // We re-use the same array for emojis unless it has been rebuilt,
    // so this check will work correctly. No lengthy checks needed.
    if (
      activeEmoji !== this.props.activeEmoji ||
      commonEmojis !== this.props.commonEmojis ||
      emojis !== this.props.emojis ||
      searchQuery !== this.props.searchQuery
    ) {
      this.groupEmojisIntoRows(props);
    }
  }

  /**
   * Partition the dataset into multiple rows based on the group they belong to.
   */
  groupEmojisIntoRows(props: EmojiListProps) {
    const {
      columnCount,
      commonEmojis,
      emojis,
      hasCommonlyUsed,
      searchQuery,
    } = props;
    const groups = {};
    const rows = [];
    const groupIndices = {
      // Handle empty scroll to's
      '': -1,
    };

    // Add commonly used group if not searching
    if (!searchQuery && hasCommonlyUsed) {
      groups[GROUP_COMMONLY_USED] = commonEmojis;
    }

    // Partition emojis into separate groups
    emojis.forEach((emoji) => {
      const group = searchQuery ? GROUP_SEARCH_RESULTS : GROUPS[emoji.group];

      if (groups[group]) {
        groups[group].push(emoji);
      } else {
        groups[group] = [emoji];
      }
    });

    // Sort each group and chunk into rows
    Object.keys(groups).forEach((group) => {
      if (groups[group].length === 0) {
        return;
      }

      if (group !== GROUP_COMMONLY_USED) {
        groups[group].sort((a, b) => a.order - b.order);
      }

      groupIndices[group] = rows.length;

      rows.push(
        group,
        ...chunk(groups[group], columnCount),
      );
    });

    this.setState({
      groupIndices,
      rows,
    });
  }

  /**
   * Loop over each group section within the scrollable container
   * and determine the active group.
   */
  handleRendered = (e: Object) => {
    const { startIndex, stopIndex } = e;
    const { activeGroup, rowCount } = this.props;
    const { groupIndices } = this.state;
    let lastGroup = '';

    Object.keys(groupIndices).some((group) => {
      const index = groupIndices[group];

      // Special case for commonly used and smileys,
      // as they usually both render in the same view
      if (index === 0 && startIndex === 0) {
        lastGroup = group;

        return true;
      }

      // Next group is about to be shown, but highlight the previous group
      // eslint-disable-next-line no-magic-numbers
      if (index + (rowCount / 2) >= stopIndex) {
        return true;
      }

      lastGroup = group;

      return false;
    });

    // Only update if a different group
    if (lastGroup && lastGroup !== activeGroup) {
      this.props.onScrollGroup(lastGroup, e);
    }
  };

  /**
   * Render a no results view.
   */
  renderNoResults = () => {
    const { classNames, messages } = this.context;

    return (
      <div className={classNames.noResults}>
        {messages.noResults}
      </div>
    );
  };

  /**
   * Render the list row. Either a group header or a row of emoji columns.
   */
  renderRow = ({
    key,
    index,
    isVisible,
    style,
    // eslint-disable-next-line
  }: Object) => {
    const {
      activeEmoji,
      commonMode,
      emojiPadding,
      emojiPath,
      emojiSize,
      emojiSource,
      skinTonePalette,
      onEnterEmoji,
      onLeaveEmoji,
      onSelectEmoji,
    } = this.props;
    const { classNames, messages } = this.context;
    const row = this.state.rows[index];

    return (
      <div key={key} style={style} className={classNames.emojisRow}>
        {Array.isArray(row) ? (
          <div className={classNames.emojisBody}>
            {row.map((emoji, i) => (
              <EmojiButton
                key={emoji.hexcode}
                active={activeEmoji ? (activeEmoji.hexcode === emoji.hexcode) : false}
                emoji={emoji}
                emojiPadding={emojiPadding}
                emojiPath={emojiPath}
                emojiSize={emojiSize}
                emojiSource={emojiSource}
                showImage={isVisible}
                onEnter={onEnterEmoji}
                onLeave={onLeaveEmoji}
                onSelect={onSelectEmoji}
              />
            ))}
          </div>
        ) : (
          <header className={classNames.emojisHeader}>
            {(row === GROUP_SMILEYS_PEOPLE || row === GROUP_SEARCH_RESULTS) && (
              skinTonePalette
            )}

            {(row === GROUP_COMMONLY_USED) ? (
              messages[commonMode]
            ) : (
              messages[row]
            )}
          </header>
        )}
      </div>
    );
  };

  render() {
    const {
      activeEmoji,
      columnCount,
      commonEmojis,
      emojiPadding,
      emojis,
      emojiSize,
      rowCount,
      scrollToGroup,
      searchQuery,
      onScroll,
    } = this.props;
    const { classNames } = this.context;
    const { groupIndices, rows } = this.state;
    const padding = emojiPadding + emojiPadding;
    const size = padding + emojiSize;

    // `List` utilizes shallow comparison by extending PureComponent.
    // Because of this, row changes may not be reflected without
    // re-rendering the entire list. To circumvent this,
    // we can pass our own props to trigger the re-render.
    const renderProps = {
      activeEmoji,
      commonEmojis,
      emojis,
      searchQuery,
    };

    return (
      <div className={classNames.emojis}>
        <List
          className={classNames.emojisContainer}
          emojis={emojis}
          estimatedColumnSize={columnCount}
          estimatedRowSize={rowCount}
          height={size * rowCount}
          noRowsRenderer={this.renderNoResults}
          overscanRowCount={rowCount}
          rowCount={rows.length}
          rowHeight={size}
          rowRenderer={this.renderRow}
          scrollToAlignment="start"
          scrollToIndex={groupIndices[scrollToGroup]}
          width={(size * columnCount) + padding + padding}
          onRowsRendered={this.handleRendered}
          onScroll={onScroll}
          {...renderProps}
        />
      </div>
    );
  }
}
