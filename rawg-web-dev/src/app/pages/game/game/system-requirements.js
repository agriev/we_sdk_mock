/* eslint-disable react/no-danger */

import React from 'react';
import { pure } from 'recompose';
import { FormattedMessage } from 'react-intl';
import sanitizeHtml from 'sanitize-html';
import TruncateBlockByHeight from 'app/ui/truncate-block-by-height';
import { platforms as platformsType } from 'app/pages/game/game.types';

import Heading from 'app/ui/heading';

const componentPropertyTypes = {
  platforms: platformsType,
};

const componentDefaultProperties = {
  platforms: [],
};

const GameSystemRequirementsBlock = ({ platforms }) => {
  if (platforms.length === 0) {
    return null;
  }

  const currentPlatforms = platforms.filter((p) => Object.keys(p.requirements || {}).length > 0);

  return (
    <div className="game__system-requirements">
      <TruncateBlockByHeight phone desktop maxHeight={140}>
        <div>
          {currentPlatforms.map((platform) => {
            const {
              platform: { name },
              requirements,
            } = platform;

            if (!requirements) return null;

            const { minimum = '', recommended = '' } = requirements;

            return (
              <div className="game__system-requirement" key={name}>
                <Heading rank={2} className="game__block-title game__block-title_inner">
                  <FormattedMessage
                    id="game.system_requirements"
                    values={{
                      name: <span className="game__system-requirement-title">{name}</span>,
                    }}
                  />
                </Heading>
                {minimum && (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(minimum),
                    }}
                  />
                )}
                {recommended && (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(recommended.replace(/\r\n|\r|\n/g, '<br>')),
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </TruncateBlockByHeight>
    </div>
  );
};

GameSystemRequirementsBlock.propTypes = componentPropertyTypes;
GameSystemRequirementsBlock.defaultProps = componentDefaultProperties;

export default pure(GameSystemRequirementsBlock);
