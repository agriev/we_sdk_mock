import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Link } from 'app/components/link';
import { injectIntl } from 'react-intl';
import PropTypes from 'prop-types';

import paths from 'config/paths';
import appHelper from 'app/pages/app/app.helper';
import browseHelper from 'app/pages/browse/browse.helper';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import Heading from 'app/ui/heading';
import CardTemplate from 'app/components/card-template';
import CatalogSlider from 'app/components/catalog-slider';

import './browse.styl';

import showcaseTypes from 'app/pages/browse/browse.types';
import intlShape from 'tools/prop-types/intl-shape';

const propTypes = {
  showcase: showcaseTypes.isRequired,
  intl: intlShape.isRequired,
  size: PropTypes.string.isRequired,
};

@injectIntl
@connect((state) => ({
  size: state.app.size,
  showcase: state.browse.showcase,
}))
export default class ShowcaseBrowse extends Component {
  static propTypes = propTypes;

  getItemData = (item) => {
    const { intl } = this.props;

    return {
      backgroundImage: item.items[0].image_background,
      heading: { text: item.name, path: paths[item.slug] },
      itemsHeading: {
        text: intl.formatMessage({ id: 'catalog.browse_small_card_title' }),
        count: item.count,
      },
      items: item.items.slice(0, 3).map((entity) => ({
        text: entity.name,
        path: browseHelper.itemsPath[item.slug](entity.slug),
        count: entity.games_count,
      })),
      kind: 'small',
    };
  };

  getItemsData() {
    const {
      showcase: { items },
    } = this.props;

    return items.map(this.getItemData);
  }

  renderCard = (item) => {
    const data = this.getItemData(item);

    return (
      <div className="showcase__browse-card" key={item.id}>
        <CardTemplate
          backgroundImage={data.backgroundImage}
          heading={data.heading}
          itemsHeading={data.itemsHeading}
          items={data.items}
          kind={data.kind}
        />
      </div>
    );
  };

  renderCards() {
    const {
      showcase: { items },
    } = this.props;

    return <div className="showcase__browse-cards">{items.map(this.renderCard)}</div>;
  }

  renderSlider() {
    const {
      showcase: { items },
      size,
    } = this.props;

    return (
      <CatalogSlider className="showcase__browse-slider" size={size}>
        {items.map(this.renderCard)}
      </CatalogSlider>
    );
  }

  render() {
    const {
      showcase: { items },
      size,
    } = this.props;
    if (!items) return null;

    return (
      <div className="showcase__browse">
        <Heading rank={2} centred>
          <Link to={paths.gamesBrowse} href={paths.gamesBrowse}>
            <SimpleIntlMessage id="catalog.browse_meta_title" />
          </Link>
        </Heading>
        {appHelper.isDesktopSize({ size }) ? this.renderCards() : this.renderSlider()}
      </div>
    );
  }
}
