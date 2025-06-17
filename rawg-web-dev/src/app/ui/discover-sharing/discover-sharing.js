import React, { useState } from 'react';
import SVGInline from 'react-svg-inline';
import PropTypes from 'prop-types';

import Dropdown from 'app/ui/dropdown/dropdown';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import Sharing from 'app/components/sharing';

import shareIcon from 'assets/icons/share.svg';

import './discover-sharing.styl';

const propTypes = {
  url: PropTypes.string.isRequired,
};

const DiscoverSharing = ({ url }) => {
  const [opened, updateValue] = useState(false);

  const renderedButton = (
    <button className="discover-sharing__button" onClick={() => updateValue(true)} type="button">
      <SVGInline svg={shareIcon} className="discover-sharing__icon" />
    </button>
  );

  const renderedContent = (
    <div className="discover-sharing__content">
      <div onClick={() => updateValue(false)} role="button" tabIndex={0}>
        <Sharing className="discover-sharing__item" provider="vk" url={url}>
          <SimpleIntlMessage id="socials.vk" />
        </Sharing>
      </div>
      {/* <div onClick={() => updateValue(false)} role="button" tabIndex={0}>
        <Sharing className="discover-sharing__item" provider="twitter" url={url}>
          <SimpleIntlMessage id="socials.twitter" />
        </Sharing>
      </div> */}
    </div>
  );

  return (
    <Dropdown
      className="discover-sharing"
      opened={opened}
      kind="sharing"
      onClose={() => updateValue(false)}
      renderedButton={renderedButton}
      renderedContent={renderedContent}
    />
  );
};

DiscoverSharing.propTypes = propTypes;

export default DiscoverSharing;
