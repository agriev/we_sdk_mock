import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';

import './game-poster.styl';

import gameType from 'app/pages/game/game.types';

import GameCardCompact from 'app/components/game-card-compact';
import currentUserType from 'app/components/current-user/current-user.types';
import { appRatingsType } from 'app/pages/app/app.types';
import GameCardVideo from 'app/ui/game-card-video';
import RenderMounted from 'app/render-props/render-mounted';

const propTypes = {
  game: gameType.isRequired,
  currentUser: currentUserType.isRequired,
  dispatch: PropTypes.func.isRequired,
  allRatings: appRatingsType.isRequired,
  isPhoneSize: PropTypes.bool.isRequired,
  playVideoOnHitScreen: PropTypes.bool,
};

const defaultProps = {
  playVideoOnHitScreen: false,
};

const DiscoverMainGamePoster = ({ game, dispatch, currentUser, allRatings, playVideoOnHitScreen, isPhoneSize }) => {
  const [playing, setPlaying] = useState();

  // eslint-disable-next-line react/prop-types
  const renderVideo = ({ onChildReference } = {}) => (
    <div
      className="discover-main__game-poster__video"
      ref={onChildReference ? (element) => onChildReference(element) : undefined}
    >
      <GameCardVideo
        playing={playing}
        url={game.clip.clip}
        videoId={game.clip.video}
        preview={game.background_image || game.clip.preview}
        doNotStopOnStartAnother
        gameUrl={`/games/${game.slug}`}
        isOnline={game.can_play || !!game.iframe_url}
      />
    </div>
  );

  const onShow = useCallback(() => setPlaying(true), []);
  const onHide = useCallback(() => setPlaying(false), []);

  return (
    <div className="discover-main__game-poster">
      {/* <div className="discover-main__game-poster__background-1" /> */}
      {/* <div className="discover-main__game-poster__background-2" /> */}
      <div className="discover-main__game-poster__background-3" />
      {/* <div className="discover-main__game-poster__background-4" /> */}

      {playVideoOnHitScreen && (
        <RenderMounted rootMargin="-100px 0px -200px 0px" onShow={onShow} onHide={onHide}>
          {renderVideo}
        </RenderMounted>
      )}
      {!playVideoOnHitScreen && renderVideo()}

      <GameCardCompact
        game={game}
        dispatch={dispatch}
        currentUser={currentUser}
        size={isPhoneSize ? 'medium' : 'large'}
        allRatings={allRatings}
      />
    </div>
  );
};

DiscoverMainGamePoster.propTypes = propTypes;
DiscoverMainGamePoster.defaultProps = defaultProps;

export default DiscoverMainGamePoster;
