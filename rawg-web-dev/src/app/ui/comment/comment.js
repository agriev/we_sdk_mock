/* eslint-disable camelcase, react/no-danger, react/jsx-closing-tag-location */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Link, withRouter } from 'react-router';
import { FormattedMessage } from 'react-intl';
import classnames from 'classnames';
import SVGInline from 'react-svg-inline';
import TextTruncate from 'react-text-truncate';

import heartIcon from 'assets/icons/heart.svg';
import repliesIcon from 'assets/icons/replies.svg';

import checkLogin from 'tools/check-login';
import { showComment as appShowCommentType } from 'app/pages/app/app.types';
import { commentShown } from 'app/pages/app/app.actions';
import { currentUserIdType } from 'app/components/current-user/current-user.types';
import locationShape from 'tools/prop-types/location-shape';

import paths from 'config/paths';
import Dropdown from 'app/ui/dropdown';
import Confirm from 'app/ui/confirm';
import MenuButton from 'app/ui/menu-button';
import Avatar from 'app/ui/avatar';
import InputComment from 'app/ui/input-comment';
import Time from 'app/ui/time';
import appHelper from 'app/pages/app/app.helper';

import './comment.styl';

@connect((state) => ({
  routing: state.routing,
  showComment: state.app.showComment,
  currentUserId: state.currentUser.id,
}))
@withRouter
export default class Comment extends Component {
  static propTypes = {
    comment: PropTypes.shape().isRequired,
    onRemove: PropTypes.func,
    onCreate: PropTypes.func,
    onEdit: PropTypes.func,
    onLoadReplies: PropTypes.func,
    onLike: PropTypes.func,
    onReplyLink: PropTypes.func,
    child: PropTypes.bool,
    reply: PropTypes.bool,
    showRepliesCount: PropTypes.bool,
    textExpanded: PropTypes.bool,
    showReply: PropTypes.bool,
    showAvatar: PropTypes.bool,
    showMenu: PropTypes.bool,
    showHeader: PropTypes.bool,
    showArrow: PropTypes.bool,
    arrowContent: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
    showLikes: PropTypes.bool,
    className: PropTypes.string,
    currentUserId: currentUserIdType.isRequired,
    background: PropTypes.string,
    user: PropTypes.shape(),

    // Пропсы, получаемые из hoc'ов
    dispatch: PropTypes.func.isRequired,
    location: locationShape.isRequired,
    showComment: appShowCommentType,
  };

  static defaultProps = {
    className: '',
    onRemove: undefined,
    onCreate: undefined,
    onEdit: undefined,
    onLoadReplies: undefined,
    onLike: undefined,
    onReplyLink: undefined,
    child: false,
    reply: false,
    showReply: true,
    showAvatar: true,
    showMenu: true,
    showHeader: true,
    showArrow: false,
    arrowContent: <SVGInline svg={repliesIcon} className="comment__arrow-icon" />,
    showLikes: true,
    textExpanded: false,
    showRepliesCount: true,
    background: undefined,
    showComment: undefined,
    user: undefined,
  };

  constructor(props) {
    super(props);

    const { comment = {}, reply, showRepliesCount, textExpanded } = this.props;
    const { id, likes_count = 0, user_like = false } = comment;

    this.state = {
      id,
      likesCount: likes_count,
      userLike: user_like,
      reply,
      edit: false,
      showRepliesCount,
      textExpanded,
    };
  }

  componentDidMount() {
    window.document.body.addEventListener('click', this.closeReplyInput, true);

    const { location, comment } = this.props;
    const { query } = location;

    if (!query || !comment.id) return;

    let replyComment = query.comment;

    if (replyComment) {
      replyComment = JSON.parse(decodeURIComponent(replyComment));

      if (replyComment.id === comment.id) {
        // eslint-disable-next-line react/no-did-mount-set-state
        this.setState({
          showRepliesCount: false,
        });
      }

      this.showComment();
    }
  }

  static getDerivedStateFromProps(props, state) {
    if (props.comment.id && !state.id) {
      const { id, likes_count = 0, user_like = false } = props.comment;

      return {
        id,
        likesCount: likes_count,
        userLike: user_like,
      };
    }

    return null;
  }

  componentDidUpdate(props) {
    if (this.props.showComment && !props.showComment) {
      setTimeout(() => {
        this.showComment();
      }, 100);
    }
  }

  componentWillUnmount() {
    window.document.body.removeEventListener('click', this.closeReplyInput, true);
  }

  getClassName() {
    const { className, child } = this.props;

    return classnames('comment', {
      comment_child: child,
      [className]: className,
    });
  }

  closeReplyInput = (e) => {
    const target = e.type === 'touchend' && e.touches.length > 0 ? e.touches[0] : e.target;
    if (!this.rootEl.contains(target)) {
      this.setState({ reply: false });
    }
  };

  handleCreate = (value) => {
    if (!value) return;

    const { comment, onCreate } = this.props;

    if (typeof onCreate === 'function') {
      onCreate(comment, value);
    }

    this.setState({ reply: false });
  };

  handleEdit = (value) => {
    if (!value) return;

    const { comment, onEdit } = this.props;

    if (typeof onEdit === 'function') {
      onEdit(comment, value).then(() => {
        this.setState({ edit: false });
      });
    }
  };

  handleRemove = () => {
    const { comment, onRemove } = this.props;

    if (typeof onRemove === 'function') {
      onRemove(comment);
    }
  };

  handleLoadReplies = () => {
    const { comment, onLoadReplies } = this.props;

    if (typeof onLoadReplies === 'function') {
      onLoadReplies(comment);
    }

    this.setState({ showRepliesCount: false });
  };

  handleToggleLike = () => {
    const { dispatch, comment, onLike } = this.props;
    const { userLike, likesCount } = this.state;

    checkLogin(dispatch, async () => {
      if (typeof onLike === 'function') {
        onLike(comment, !userLike);
      }

      this.setState({
        userLike: !userLike,
        likesCount: userLike ? likesCount - 1 : likesCount + 1,
      });
    });
  };

  edit = () => {
    this.setState({ edit: true });
  };

  reply = () => {
    const { dispatch, comment, showReply, onReplyLink } = this.props;

    checkLogin(dispatch, async () => {
      if (showReply && typeof onReplyLink === 'function') {
        onReplyLink(comment);
      } else {
        this.setState({ reply: true });
      }
    });
  };

  expandText = () => {
    this.setState({ textExpanded: true });
  };

  showComment() {
    const { dispatch, location, comment, showComment } = this.props;
    const { hash } = location;

    if (!showComment) return;

    const id = hash.replace('#', '');

    if (id && +id === comment.id) {
      setTimeout(() => {
        this.setState(
          {
            reply: true,
          },
          () => {
            dispatch(commentShown());
          },
        );
      }, 500);
    }
  }

  renderMenu() {
    const {
      currentUserId,
      comment: { user, can_delete },
    } = this.props;

    if (!(currentUserId === user.id || can_delete)) return null;

    return (
      <div className="comment__menu">
        <Dropdown
          renderButton={this.renderMenuButton}
          renderContent={this.renderMenuContent}
          containerClassName="comment__menu-dropdown-container"
          kind="menu"
        />
      </div>
    );
  }

  renderMenuButton = () => <MenuButton className="comment__menu-button" kind="inline" />;

  renderMenuContent = () => {
    const {
      currentUserId,
      comment: { user },
    } = this.props;

    return (
      <div className="comment__menu-content">
        {currentUserId === user.id && (
          <div className="comment__menu-content-item" onClick={this.edit} role="button" tabIndex={0}>
            <FormattedMessage id="shared.comment_edit" />
          </div>
        )}
        <Confirm className="comment__menu-content-item" onConfirm={this.handleRemove}>
          <FormattedMessage id="shared.comment_delete" />
        </Confirm>
      </div>
    );
  };

  render() {
    const {
      comment,
      child,
      showReply,
      showAvatar,
      showMenu,
      showHeader,
      showArrow,
      arrowContent,
      showLikes,
      background,
      user: propsUser,
    } = this.props;

    const { user: commentUser, text = '', text_raw = '', created = Date.now(), comments_count } = comment;

    const user = commentUser || propsUser;

    const { likesCount, userLike, edit, reply, showRepliesCount, textExpanded } = this.state;

    const createdDate = new Date(created);
    const createdDateISO = `${createdDate.getFullYear()}-${createdDate.getMonth() + 1}-${createdDate.getDate()}`;

    const getTextTruncateChild = () => (
      <span className="comment__text-more" onClick={this.expandText} role="button" tabIndex={0}>
        more
      </span>
    );

    return (
      <div
        id={comment.id}
        className={this.getClassName()}
        itemType="http://schema.org/Comment"
        itemProp="comment"
        itemScope
        ref={(reference) => {
          this.rootEl = reference;
        }}
      >
        {background && (
          <div
            className="comment__background"
            style={{
              backgroundImage: `url(${background})`,
            }}
          />
        )}
        {background && <div className="comment__obscurer" />}
        {edit ? (
          <InputComment value={text_raw} onSubmit={this.handleEdit} />
        ) : (
          <div className="comment__block">
            {user && (
              <div itemType="http://schema.org/Person" itemProp="author" itemScope>
                <meta itemProp="name" content={user.full_name || user.username} />
                <meta itemProp="url" content={paths.profile(user.slug)} />
                <meta itemProp="image" content={user.avatar} />
              </div>
            )}

            {showAvatar && (
              <Link
                className="comment__avatar-link"
                to={{ pathname: paths.profile(user.slug), state: user }}
                href={paths.profile(user.slug)}
              >
                <Avatar className="comment__avatar" size={40} src={user.avatar} profile={user} />
              </Link>
            )}

            <div className="comment__body">
              {showHeader && (
                <div className="comment__body-header">
                  <div className="comment__meta">
                    <Link
                      className="comment__user-link"
                      to={{ pathname: paths.profile(user.slug), state: user }}
                      href={paths.profile(user.slug)}
                    >
                      {appHelper.getName(user, 20)}
                    </Link>
                    <div itemProp="datePublished" dateTime={createdDateISO} className="comment__date">
                      <Time date={createdDate} relative={7} />
                    </div>
                  </div>
                  {showMenu && <div>{this.renderMenu()}</div>}
                </div>
              )}

              {showArrow && arrowContent}

              {text && textExpanded && (
                <div
                  className="comment__text"
                  itemProp="text"
                  dangerouslySetInnerHTML={{
                    __html: text,
                  }}
                />
              )}
              {text && !textExpanded && (
                <TextTruncate
                  containerClassName="comment__text"
                  line={3}
                  truncateText="…"
                  text={text_raw.replace(/<\/?[^>]+(>|$)/g, ' ')}
                  itemProp="text"
                  textTruncateChild={getTextTruncateChild()}
                />
              )}

              <div className="comment__controls">
                <div className="comment__reply">
                  {showReply && !reply && (
                    <div className="comment__reply-button" onClick={this.reply} role="button" tabIndex={0}>
                      <FormattedMessage id="shared.comment_reply" />
                    </div>
                  )}
                  {comments_count > 0 && showRepliesCount && (
                    <div className="comment__reply-count" onClick={this.handleLoadReplies} role="button" tabIndex={0}>
                      <SVGInline svg={repliesIcon} className="comment__reply-count-icon" />
                      <FormattedMessage id="shared.comment_reply_count" values={{ count: comments_count }} />
                    </div>
                  )}
                </div>
                <div className="comment__likes">
                  {showLikes && likesCount > 0 && <div className="comment__likes-count">{likesCount}</div>}
                  {showLikes && (
                    <div className="comment__like" onClick={this.handleToggleLike} role="button" tabIndex={0}>
                      <SVGInline
                        svg={heartIcon}
                        className={`comment__like-icon ${userLike ? 'comment__like-icon_active' : ''}`}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {reply && (
          <InputComment kind={child ? 'reply-child' : 'reply'} value="" onSubmit={this.handleCreate} autoFocus />
        )}
      </div>
    );
  }
}
