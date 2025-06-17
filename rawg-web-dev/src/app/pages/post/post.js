/* eslint-disable camelcase */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import { FormattedMessage } from 'react-intl';
import { hot } from 'react-hot-loader/root';
import cn from 'classnames';

import prepare from 'tools/hocs/prepare';
import whenData from 'tools/logic/when-data';

import denormalizeGame from 'tools/redux/denormalize-game';

import reject from 'ramda/src/reject';
import propEq from 'ramda/src/propEq';

import { showComment } from 'app/pages/app/app.actions';

import SimpleIntlMessage from 'app/components/simple-intl-message';
import Heading from 'app/ui/heading';
import GameSubpage from 'app/components/game-subpage';
import ThemeSwitcher from 'app/components/theme-switcher';
import Content from 'app/ui/content';
import PostCard from 'app/components/post-card';
import { loadPostComments, loadPostCommentsReplies } from 'app/components/post-comments/post-comments.actions';

import { appThemeType } from 'app/pages/app/app.types';
import gameType from 'app/pages/game/game.types';
import paths from 'config/paths';
import { themeClass } from 'app/components/theme-switcher/theme-switcher.helper';
import { loadGame, loadGamePosts } from 'app/pages/game/game.actions';

import { loadPost } from './post.actions';

import './post.styl';

@hot
@prepare(
  async ({ store, location, params = {} }) => {
    const { id } = params;
    const { query, hash } = location;

    const post = await store.dispatch(loadPost(id, { omitComments: true }));
    const gameLoader = store.dispatch(loadGame(post.game.slug));
    const postsLoader = store.dispatch(loadGamePosts(post.game.slug));

    if (query.comment) {
      const { id: commentId, page, children_page } = JSON.parse(decodeURIComponent(query.comment));

      await store.dispatch(loadPostComments({ post: { id }, page }));
      await store.dispatch(
        loadPostCommentsReplies({
          post: { id },
          comment: { id: commentId },
          page: children_page || 1,
        }),
      );
      await Promise.all([store.dispatch(showComment(hash.replace('#', ''))), gameLoader, postsLoader]);
    } else {
      await Promise.all([store.dispatch(loadPostComments({ post: { id }, page: 1 })), gameLoader, postsLoader]);
    }
  },
  {
    updateParam: 'id',
  },
)
@connect((state) => ({
  post: state.post,
  game: denormalizeGame(state),
  appTheme: state.app.settings.theme,
}))
export default class Post extends Component {
  static propTypes = {
    appTheme: appThemeType.isRequired,
    post: PropTypes.shape().isRequired,
    game: gameType.isRequired,
    dispatch: PropTypes.func.isRequired,
  };

  handleRemove = () => {
    const { dispatch, post } = this.props;
    const {
      game: { id },
    } = post;

    return dispatch(push(paths.gamePosts(id)));
  };

  renderPostCard() {
    return (
      <PostCard
        className="post__post-card-body"
        post={this.props.post}
        postLink={false}
        showGameInfo
        showUserInfo
        hideTitle
        onRemove={this.handleRemove}
        expanded
      />
    );
  }

  renderPost() {
    return (
      <div className="post">
        <div className="post__post-card">{this.renderPostCard()}</div>
      </div>
    );
  }

  renderAnotherPosts() {
    const { game } = this.props;
    const { posts } = game;
    const { results, count } = posts;
    const withoutCurrent = reject(propEq('id', this.props.post.id));

    if (count - 1 <= 0) {
      return null;
    }

    return (
      <div className="post__suggestions">
        <Heading rank={2} className="post__suggestions__title">
          <SimpleIntlMessage id="post.suggestions_title" />
          <span className="post__suggestions__title__counter">{count}</span>
        </Heading>
        {withoutCurrent(results).map((post) => (
          <PostCard
            key={post.id}
            className="post__suggestions-post"
            post={post}
            onRemove={this.update}
            loadOtherComments="here"
            truncateText
            expanded
          />
        ))}
      </div>
    );
  }

  render() {
    const { post, appTheme, dispatch } = this.props;
    const { game, user } = post;
    const { background_image = '', dominant_color } = game;

    const belowHeading = whenData(post.id, () => {
      const name = user.full_name || user.username;
      return (
        <div className="post__subheading">
          <FormattedMessage id="post.subhead_title" values={{ name }} />
        </div>
      );
    });

    return (
      <GameSubpage
        section="post"
        showBreadcrumbs={false}
        heading={() => post.seo_h1}
        belowHeading={belowHeading}
        backPath={paths.gamePosts(game.slug)}
        className={cn('post_page', themeClass(appTheme))}
        helmet={{
          title: post.seo_title,
          description: post.seo_description,
          keywords: post.seo_keywords,
          image: post.share_image,
        }}
        color={`#${dominant_color}`}
        art={{
          image: {
            path: background_image,
            color: `#${dominant_color}`,
          },
          height: '800px',
          colored: true,
        }}
        gameHeadMetaProperties={{
          onRight: <ThemeSwitcher dispatch={dispatch} theme={appTheme} />,
        }}
      >
        <Content columns="1">
          {this.renderPost()}
          {this.renderAnotherPosts()}
        </Content>
      </GameSubpage>
    );
  }
}
