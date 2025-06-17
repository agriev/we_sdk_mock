import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { hot } from 'react-hot-loader';
import { connect } from 'react-redux';
import { Element } from 'react-scroll';
import get from 'lodash/get';

import styleVars from 'styles/vars.json';
import resize from 'tools/img/resize';

import { currentUserIdType } from 'app/components/current-user/current-user.types';
import LoadMore from 'app/ui/load-more';
import Scroller from 'app/ui/scroller';
import { appSizeType } from 'app/pages/app/app.types';
import { loadRecommendedGames } from 'app/pages/tokens/tokens.data.actions';
import { recommendedGamesType } from 'app/pages/tokens/tokens.data.types';
import { status as statusType, STATUS_ACTIVE } from 'app/pages/tokens/tokens.types';

import RecommendedGame from './components/game';

import './recommended-games.styl';

@hot(module)
@connect((state) => ({
  currentUserId: state.currentUser.id,
  recommendedGames: state.tokensDashboardData.recommendedGames,
  size: state.app.size,
  status: state.tokensDashboard.status,
}))
class TokensRecommendedGames extends React.Component {
  static propTypes = {
    currentUserId: currentUserIdType.isRequired,
    recommendedGames: recommendedGamesType.isRequired,
    dispatch: PropTypes.func.isRequired,
    size: appSizeType.isRequired,
    status: statusType.isRequired,
    setActiveSection: PropTypes.func.isRequired,
  };

  componentDidMount() {
    const { dispatch, currentUserId } = this.props;
    if (currentUserId) {
      dispatch(loadRecommendedGames());
    }
  }

  load = () => {
    const { recommendedGames, dispatch } = this.props;
    return dispatch(loadRecommendedGames(recommendedGames.next));
  };

  activateSection = () => {
    const { setActiveSection } = this.props;
    setActiveSection('recommended');
  };

  render() {
    const { recommendedGames, size, status } = this.props;

    const background = get(recommendedGames, 'results[1]', {}).background_image;

    if (status !== STATUS_ACTIVE) {
      return null;
    }

    if (recommendedGames.count === 0) {
      return null;
    }

    return (
      <div className="tokens__recommended">
        <Element name="tokens.recommended" />
        <Scroller
          onReach={{
            top: this.activateSection,
            bottom: this.activateSection,
            offset: 100,
          }}
        />
        <div className="tokens__recommended__title">
          <FormattedMessage id="tokens.recommended_title" />
        </div>
        <div className="tokens__recommended__games">
          <div
            className="tokens__recommended__games-background"
            style={{
              backgroundImage: background
                ? `
                radial-gradient(ellipse closest-side at center, transparent, ${styleVars.mainBGColor}),
                url('${resize(1280, background)}')
              `
                : '',
            }}
          />
          <LoadMore
            appSize={size}
            load={this.load}
            count={recommendedGames.count}
            next={recommendedGames.next}
            loading={recommendedGames.loading}
          >
            {recommendedGames.results.map((game) => (
              <RecommendedGame key={game.id} game={game} size={size} />
            ))}
          </LoadMore>
        </div>
        <Scroller
          onReach={{
            top: this.activateSection,
            bottom: this.activateSection,
            offset: 100,
          }}
        />
      </div>
    );
  }
}

export default TokensRecommendedGames;
