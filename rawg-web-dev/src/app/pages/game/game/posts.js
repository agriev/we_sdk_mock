import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';
import { FormattedMessage } from 'react-intl';

import ListLoader from 'app/ui/list-loader';
import Select from 'app/ui/select';
import AddGameCard from 'app/ui/add-game-card';
import PostCard from 'app/components/post-card';
import paths from 'config/paths';
import { loadGamePosts, updateGamePosts, PAGE_SIZE } from 'app/pages/game/game.actions';

import passDownProps from 'tools/pass-down-props';
import getPagesCount from 'tools/get-pages-count';

import {
  id as gameIdType,
  name as gameNameType,
  slug as gameSlugType,
  posts as gamePostsType,
} from 'app/pages/game/game.types';
import intlShape from 'tools/prop-types/intl-shape';

import './posts.styl';

export default class GamePostsBlock extends React.PureComponent {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    intl: intlShape.isRequired,
    id: gameIdType,
    name: gameNameType,
    slug: gameSlugType,
    posts: gamePostsType,
    postCardProps: PropTypes.shape(),
  };

  static defaultProps = {
    id: '',
    name: '',
    slug: '',
    posts: {
      count: 0,
      results: [],
    },
    postCardProps: undefined,
  };

  constructor(props, context) {
    super(props, context);

    this.state = {
      ordering: '-created',
    };
  }

  get orderingContent() {
    const { intl } = this.props;
    const { ordering } = this.state;

    return {
      title: intl.formatMessage({ id: 'game.ordering_title' }),
      items: [
        {
          id: '-created',
          value: intl.formatMessage({ id: 'game.ordering_-created' }),
          active: ordering === '-created',
        },
        {
          id: 'created',
          value: intl.formatMessage({ id: 'game.ordering_created' }),
          active: ordering === 'created',
        },
      ],
    };
  }

  load = () => {
    const { dispatch, id, posts } = this.props;
    const { next } = posts;
    const { ordering } = this.state;

    return dispatch(loadGamePosts(id, next, { ordering }));
  };

  update = (removedPost) => {
    const { dispatch, id } = this.props;

    dispatch(updateGamePosts(id, { removedPost }));
  };

  handleOrderingChange = (ordering) => {
    const { dispatch, id } = this.props;

    dispatch(loadGamePosts(id, 1, { ordering: ordering[0].id }));

    this.setState({ ordering: ordering[0].id });
  };

  renderOrdering() {
    const { intl } = this.props;
    const { ordering } = this.state;

    return (
      <Select
        button={{
          className: 'game-posts__ordering-button',
          kind: 'inline',
        }}
        buttonValue={intl.formatMessage({ id: `game.ordering_${ordering}` })}
        content={{
          className: 'game-posts__ordering-content',
          ...this.orderingContent,
        }}
        multiple={false}
        className="game-posts__ordering"
        containerClassName="game-posts__ordering-container"
        onChange={this.handleOrderingChange}
        kind="menu"
        onlyArrow
      />
    );
  }

  render() {
    const { id, name, slug, posts, postCardProps } = this.props;
    const { results, your, next, loading, count } = posts;

    return (
      <div className="game-posts">
        {this.renderOrdering()}

        <Link
          to={paths.postCreate({ id, name, slug })}
          href={paths.postCreate({ id, name, slug })}
          className="game-posts__add-link"
          rel="nofollow"
        >
          <AddGameCard className="game-posts__add-card" wide title={<FormattedMessage id="game.post_with_users" />} />
        </Link>

        {your && <PostCard className="game-posts__item" post={your} onRemove={this.update} your truncateText={false} />}
        {results.length > 0 && (
          <ListLoader
            load={this.load}
            count={count}
            next={next}
            loading={loading}
            pages={getPagesCount(count, PAGE_SIZE)}
          >
            {results.map((post) => (
              <PostCard
                className="game-posts__item"
                post={post}
                onRemove={this.update}
                key={post.id}
                truncateText={false}
                {...passDownProps(postCardProps)}
              />
            ))}
          </ListLoader>
        )}
      </div>
    );
  }
}
