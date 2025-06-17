/* eslint-disable react/no-danger, camelcase, sonarjs/cognitive-complexity */

import React, { Component } from 'react';
import { hot } from 'react-hot-loader';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Link } from 'app/components/link';
import { push } from 'react-router-redux';
import classnames from 'classnames';
import TextTruncate from 'react-text-truncate';
import { injectIntl, FormattedMessage } from 'react-intl';

import pick from 'lodash/pick';

import Heading from 'app/ui/heading';

import denormalizeGame from 'tools/redux/denormalize-game';
import appHelper from 'app/pages/app/app.helper';
import paths from 'config/paths';
import Dropdown from 'app/ui/dropdown/dropdown';
import Confirm from 'app/ui/confirm/confirm';
import MenuButton from 'app/ui/menu-button/menu-button';
import Avatar from 'app/ui/avatar/avatar';
import EmbedPreviews from 'app/ui/embed-previews';
import Time from 'app/ui/time';
import UserContent from 'app/ui/user-content';
import config from 'config/config';

import resize from 'tools/img/resize';

import { appSizeType } from 'app/pages/app/app.types';
import { currentUserIdType } from 'app/components/current-user/current-user.types';
import gameType from 'app/pages/game/game.types';

import PostComments from '../post-comments';
import { removePost } from './post-card.actions';

import './post-card.styl';

@hot(module)
@injectIntl
@connect((state) => ({
  size: state.app.size,
  game: denormalizeGame(state),
  currentUserId: state.currentUser.id,
}))
export default class PostCard extends Component {
  static propTypes = {
    post: PropTypes.shape().isRequired,
    game: gameType,
    your: PropTypes.bool,
    showGameInfo: PropTypes.bool,
    showUserInfo: PropTypes.bool,
    showComments: PropTypes.bool,
    showMenu: PropTypes.bool,
    showGameTitle: PropTypes.bool,
    showEmbeds: PropTypes.bool,
    fullPostLink: PropTypes.bool,
    onRemove: PropTypes.func,
    color: PropTypes.string,
    kind: PropTypes.oneOf(['common', 'slider']),
    textLines: PropTypes.number,
    className: PropTypes.string,
    postLink: PropTypes.bool,
    expanded: PropTypes.bool,
    background: PropTypes.string,
    emojiList: PropTypes.node,
    loadOtherComments: PropTypes.string,
    truncateText: PropTypes.bool,
    hideTitle: PropTypes.bool,

    size: appSizeType.isRequired,
    dispatch: PropTypes.func.isRequired,
    currentUserId: currentUserIdType.isRequired,
  };

  static defaultProps = {
    game: undefined,
    your: false,
    showGameInfo: false,
    showUserInfo: true,
    showComments: true,
    showMenu: true,
    showGameTitle: false,
    showEmbeds: true,
    fullPostLink: false,
    postLink: true,
    onRemove: undefined,
    className: '',
    color: '#212121',
    kind: undefined,
    textLines: undefined,
    expanded: false,
    background: undefined,
    emojiList: undefined,
    loadOtherComments: undefined,
    truncateText: true,
    hideTitle: false,
  };

  constructor(props) {
    super(props);

    const { post, expanded } = props;

    this.state = {
      id: post.id,
      expanded,
    };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.post.id && !state.id) {
      return {
        id: props.post.id,
        expanded: props.expanded,
      };
    }

    return null;
  }

  getClassName() {
    const { className, kind } = this.props;

    return classnames('post-card', {
      [`post-card_${kind}`]: kind,
      [className]: className,
    });
  }

  getStyle() {
    const {
      size: appSize,
      post: { game: postGame },
      showGameInfo,
      color,
      game: propsGame,
    } = this.props;

    const game = typeof postGame === 'object' ? postGame : propsGame;

    if (!(showGameInfo && game)) return {};

    const { background_image = '' } = game;
    const imageSize = appHelper.isDesktopSize({ size: appSize }) ? 1280 : 640;

    if (!color) {
      return {
        backgroundImage: `url('${resize(imageSize, background_image)}')`,
      };
    }

    return {
      backgroundImage: background_image
        ? `
        linear-gradient(to bottom, transparent, ${color}),
        url('${resize(imageSize, background_image)}')
      `
        : `
        linear-gradient(to bottom, transparent, ${color})
      `,
    };
  }

  remove = () => {
    const { dispatch, post, onRemove } = this.props;

    dispatch(removePost(post)).then(() => {
      if (typeof onRemove === 'function') {
        onRemove(post);
      }
    });
  };

  expand = () => {
    this.setState({ expanded: true });
  };

  goToPost = () => {
    const { dispatch, post } = this.props;

    dispatch(push(paths.post(post.id)));
  };

  renderYourBadge() {
    const { your } = this.props;

    if (!your) return null;

    return (
      <div className="post-card__your-badge">
        <FormattedMessage id="shared.post_your" />
      </div>
    );
  }

  renderMenu() {
    const {
      currentUserId,
      post: { user, can_delete },
      showMenu,
    } = this.props;

    if (!(currentUserId === user.id || can_delete) || !showMenu) return null;

    return (
      <div className="post-card__menu">
        <Dropdown
          renderButton={this.renderMenuButton}
          renderContent={this.renderMenuContent}
          containerClassName="post-card__menu-dropdown-container"
          kind="menu"
        />
      </div>
    );
  }

  renderMenuButton = () => <MenuButton className="post-card__menu-button" kind="inline" />;

  renderMenuContent = () => {
    const {
      currentUserId,
      post: { id, user },
    } = this.props;

    return (
      <div className="post-card__menu-content">
        {currentUserId === user.id && (
          <Link
            to={paths.postEdit(id)}
            href={paths.postEdit(id)}
            className="post-card__menu-content-item"
            rel="nofollow"
          >
            <FormattedMessage id="shared.post_edit" />
          </Link>
        )}
        <Confirm className="post-card__menu-content-item" onConfirm={this.remove}>
          <FormattedMessage id="shared.post_delete" />
        </Confirm>
      </div>
    );
  };

  renderComments() {
    const { post = {}, loadOtherComments } = this.props;

    return <PostComments post={post} loadOtherComments={loadOtherComments} />;
  }

  render() {
    let { textLines } = this.props;
    const {
      size,
      post,
      game: propsGame,
      showGameInfo,
      showUserInfo,
      showComments,
      showGameTitle,
      showEmbeds,
      fullPostLink,
      kind,
      postLink,
      background,
      emojiList,
      truncateText,
      hideTitle,
    } = this.props;
    const { id, user, created = Date.now(), game: postGame } = post;
    const { expanded } = this.state;

    const createdDate = new Date(created);
    const createdDateISO = `${createdDate.getFullYear()}-${createdDate.getMonth() + 1}-${createdDate.getDate()}`;
    const game = typeof postGame === 'object' ? postGame : propsGame;

    const e3 = post.title && config.promos.e3 && game && game.promo === 'e3';
    const gc = post.title && config.promos.gamescom && game && game.promo === 'gamescom';

    if (!textLines) {
      textLines = appHelper.isDesktopSize({ size }) ? 6 : 4;

      if (post.text_preview) {
        textLines -= 2;
      }

      textLines = Math.max(1, textLines);
    }

    const textTruncateChild = (
      <span
        className="post-card__text-more"
        onClick={fullPostLink ? this.goToPost : this.expand}
        role="button"
        tabIndex={0}
      >
        <FormattedMessage id={fullPostLink ? 'shared.post_full_post' : 'shared.post_more'} />
      </span>
    );

    return (
      <div className={this.getClassName()} itemType="http://schema.org/Comment" itemProp="comment" itemScope>
        <div itemType="http://schema.org/Person" itemProp="author" itemScope>
          <meta itemProp="name" content={user.full_name || user.username} />
          <meta itemProp="url" content={paths.profile(user.slug)} />
          <meta itemProp="image" content={user.avatar} />
        </div>

        {background && (
          <div
            className="post-card__background"
            style={{
              backgroundImage: `url(${background})`,
            }}
          />
        )}
        {background && <div className="post-card__obscurer" />}

        <div className="post-card__top-block">
          <div>
            {showGameInfo && game && <div className="post-card__game-background" style={this.getStyle()} />}
            <div className="post-card__header">
              <div>
                {!hideTitle && (
                  <Link
                    className="post-card__title"
                    to={postLink ? paths.post(post.id) : ''}
                    href={postLink ? paths.post(post.id) : ''}
                  >
                    <Heading rank={expanded ? 1 : 2} looksLike={4}>
                      {post.title}
                    </Heading>
                  </Link>
                )}
                {e3 && <div className="post-card__e3-2018-promo" />}
                {gc && <div className="post-card__gamescom-promo" />}
                {showGameTitle && game && <div className="post-card__subtitle">{game.name}</div>}
              </div>

              <div className="post-card__controls">
                {appHelper.isDesktopSize({ size }) && this.renderYourBadge()}
                {this.renderMenu()}
              </div>
            </div>
            {post.text && (truncateText === false || expanded) && (
              <UserContent className="post-card__text" content={post.text} />
            )}
            {post.text && !expanded && truncateText /* eslint-disable no-nested-ternary */ && (
              <div className="post-card__text-wrapper">
                <TextTruncate
                  itemProp="text"
                  containerClassName="post-card__text"
                  line={
                    textLines || post.text_preview
                      ? textLines
                      : kind === 'slider'
                      ? appHelper.isDesktopSize({ size })
                        ? 6
                        : 4
                      : 4
                  }
                  truncateText="…"
                  text={post.text.replace(/<\/?[^>]+(>|$)/g, ' ')}
                  textTruncateChild={textTruncateChild}
                />
                {showEmbeds && (
                  <EmbedPreviews
                    appSize={size}
                    path={paths.post(id)}
                    embedData={pick(post, ['text_attachments', 'text_previews'])}
                  />
                )}
              </div>
            )}
          </div>
          {emojiList}
          <div className="post-card__footer">
            {showUserInfo ? (
              <div className="post-card__user">
                <Link
                  className="post-card__avatar-link"
                  to={{ pathname: paths.profile(user.slug), state: user }}
                  href={paths.profile(user.slug)}
                >
                  <Avatar size={40} src={user.avatar} profile={user} />
                </Link>
                <div className="post-card__user-info">
                  <Link
                    className="post-card__user-link"
                    to={{ pathname: paths.profile(user.slug), state: user }}
                    href={paths.profile(user.slug)}
                  >
                    {appHelper.getName(user)}
                  </Link>
                  <Link
                    itemProp="datePublished"
                    dateTime={createdDateISO}
                    className="post-card__date"
                    to={paths.post(id)}
                    href={paths.post(id)}
                  >
                    <Time date={createdDate} relative={7} />
                  </Link>
                </div>
                {appHelper.isPhoneSize({ size }) && this.renderYourBadge()}
              </div>
            ) : (
              <div />
            )}
          </div>
        </div>
        {showComments && <div className="post-card__bottom-block">{this.renderComments()}</div>}
      </div>
    );
  }
}
