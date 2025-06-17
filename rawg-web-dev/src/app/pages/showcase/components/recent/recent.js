import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import cn from 'classnames';
import { Element } from 'react-scroll';

import throttle from 'lodash/throttle';
import slice from 'lodash/slice';

import denormalizeGamesArr from 'tools/redux/denormalize-games-arr';
import SimpleIntlMessage from 'app/components/simple-intl-message';

import GameCardFeaturedList from 'app/components/game-card-featured-list';
import GameCardCompactList from 'app/components/game-card-compact-list';
import Heading from 'app/ui/heading';

import { loadRecentCurrent, loadRecentPast, loadRecentFuture } from 'app/pages/showcase/showcase.actions';
import currentUserType from 'app/components/current-user/current-user.types';

import './recent.styl';

const recentTabClass = 'showcase-recent__tab';

const loaders = {
  past: loadRecentPast,
  current: loadRecentCurrent,
  future: loadRecentFuture,
};

const times = [
  {
    code: 'past',
    name: 'Last 30 days',
  },
  {
    code: 'current',
    name: 'This week',
  },
  {
    code: 'future',
    name: 'Next week',
  },
];

export const defaultTime = 'past';

const componentPropertyTypes = {
  current: PropTypes.arrayOf(PropTypes.shape()).isRequired,
  past: PropTypes.arrayOf(PropTypes.shape()).isRequired,
  future: PropTypes.arrayOf(PropTypes.shape()).isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
  dispatch: PropTypes.func.isRequired,
  currentUser: currentUserType.isRequired,
};

@connect((state) => ({
  current: denormalizeGamesArr(state, 'showcase.recent.current.items'),
  past: denormalizeGamesArr(state, 'showcase.recent.past.items'),
  future: denormalizeGamesArr(state, 'showcase.recent.future.items'),
  allRatings: state.app.ratings,
  size: state.app.size,
  currentUser: state.currentUser,
}))
class ShowcaseRecent extends React.Component {
  static propTypes = componentPropertyTypes;

  constructor(props) {
    super(props);

    this.state = {
      time: defaultTime,
    };
  }

  onClickOnTab = (event) => {
    const { dispatch } = this.props;
    const oldTime = this.state.time;
    const time = event.currentTarget.getAttribute('data-time');

    if (oldTime === time) {
      return;
    }

    dispatch(loaders[time]());

    this.setState({ time });
  };

  onMouseMove = throttle(
    (event) => {
      const { dispatch } = this.props;
      const time = event.currentTarget.getAttribute('data-time');

      dispatch(loaders[time]());
    },
    500,
    { trailing: false },
  );

  renderGamesList() {
    const { time } = this.state;
    const { current, past, future, currentUser, dispatch, allRatings } = this.props;
    const items = { current, past, future };

    return times.map(({ code }) => {
      const featuredGames = slice(items[code], 0, 3);
      const listGames = slice(items[code], 3).map((game, index) => ({
        ...game,
        chartIndex: index + 3,
      }));

      return (
        <Fragment key={code}>
          <GameCardFeaturedList
            className={cn('showcase-recent__games-list', {
              'showcase-recent__games-list_visible': code === time,
            })}
            games={featuredGames}
            currentUser={currentUser}
            dispatch={dispatch}
            allRatings={allRatings}
            withStartedPlaying
          />
          <GameCardCompactList
            className={cn('showcase-recent__games-list', {
              'showcase-recent__games-list_visible': code === time,
            })}
            games={listGames}
            kind="3-columns"
            currentUser={currentUser}
            dispatch={dispatch}
            allRatings={allRatings}
            withStartedPlaying
            withChart
          />
        </Fragment>
      );
    });
  }

  render() {
    const { time } = this.state;

    return (
      <div className="showcase-recent">
        <Element name="showcase.recent-games" />
        <Heading rank={2} centred>
          <SimpleIntlMessage id="showcase.recent_title" />
        </Heading>
        <div className="showcase-recent__tabs">
          {times.map(({ code, name }) => (
            <div
              key={code}
              data-time={code}
              className={cn(recentTabClass, { active: time === code })}
              onClick={this.onClickOnTab}
              onMouseMove={this.onMouseMove}
              role="button"
              tabIndex={-1}
            >
              {name}
            </div>
          ))}
        </div>
        {this.renderGamesList()}
      </div>
    );
  }
}

export default ShowcaseRecent;
