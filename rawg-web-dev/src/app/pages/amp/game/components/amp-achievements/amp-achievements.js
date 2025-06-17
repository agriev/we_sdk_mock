import React from 'react';
import { pure } from 'recompose';
import { FormattedMessage } from 'react-intl';
import { Link } from 'app/components/link';

import ViewAll from 'app/ui/vew-all';
import paths from 'config/paths';
import { slug as slugType, achievements as achievementsType } from 'app/pages/game/game.types';
import AmpAchievementCard from 'app/pages/amp/shared/amp-achievement-card';

const componentPropertyTypes = {
  slug: slugType,
  achievements: achievementsType.isRequired,
};

const componentDefaultProperties = {
  slug: '',
};

const GameAchievementsBlock = (props) => {
  const { slug, achievements } = props;
  const { results, count } = achievements;

  if (results.length === 0) return null;

  const url = paths.gameAchievements(slug);

  return (
    <div className="game__achievements">
      <div className="game__block-title-and-count">
        <Link className="game__block-title" to={url} href={url}>
          <FormattedMessage id="game.achievements" />
        </Link>
        <Link className="game__block-count" to={url} href={url}>
          <FormattedMessage id="game.achievements_count" values={{ count }} />
        </Link>
      </div>

      <div className="game__achievements-content">
        {results.slice(0, 5).map((achievement) => (
          <AmpAchievementCard className="game__achievements-item" achievement={achievement} key={achievement.id} />
        ))}
        <ViewAll size="xs" path={url} message="view all achievements" count={count} />
      </div>
    </div>
  );
};

GameAchievementsBlock.propTypes = componentPropertyTypes;
GameAchievementsBlock.defaultProps = componentDefaultProperties;

export default pure(GameAchievementsBlock);
