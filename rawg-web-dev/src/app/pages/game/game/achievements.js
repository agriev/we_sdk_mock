import React from 'react';
import { pure } from 'recompose';
import PropTypes from 'prop-types';
import { Element } from 'react-scroll';

import SectionHeading from 'app/ui/section-heading';
import SimpleIntlMessage from 'app/components/simple-intl-message';

import paths from 'config/paths';

import ViewAll from 'app/ui/vew-all';
import AchievementCard from 'app/ui/achievement-card';
import { slug as slugType, achievements as achievementsType } from 'app/pages/game/game.types';

const componentPropertyTypes = {
  slug: slugType,
  achievements: achievementsType,
  name: PropTypes.string.isRequired,
};

const componentDefaultProperties = {
  slug: '',
  achievements: undefined,
};

const GameAchievementsBlock = ({ slug, achievements = {}, name }) => {
  const { results = [], count } = achievements;

  if (results.length === 0) return null;

  const url = paths.gameAchievements(slug);

  return (
    <div className="game__achievements">
      <Element name="achievements" />
      <SectionHeading
        url={url}
        heading={<SimpleIntlMessage id="game.achievements_title" values={{ name }} />}
        count={<SimpleIntlMessage id="game.achievements_count" values={{ count }} />}
      />
      <div className="game__achievements-content">
        {results.slice(0, 5).map((achievement) => (
          <AchievementCard className="game__achievements-item" achievement={achievement} key={achievement.id} />
        ))}
        <ViewAll size="xs" path={url} message="view all achievements" count={count} />
      </div>
    </div>
  );
};

GameAchievementsBlock.propTypes = componentPropertyTypes;
GameAchievementsBlock.defaultProps = componentDefaultProperties;

export default pure(GameAchievementsBlock);
