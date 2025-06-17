import React from 'react';

import Stories from 'app/components/stories';
import { loadGroups, loadGroup } from 'app/components/stories/stories.actions';
import prepare from 'tools/hocs/prepare';

import locationShape from 'tools/prop-types/location-shape';

import RenderMounted from 'app/render-props/render-mounted';
import { throwEvent } from 'scripts/analytics-helper';

const propTypes = {
  location: locationShape.isRequired,
};

const defaultProps = {};

@prepare(async ({ store, location }) => {
  const slug = location.query.tldr;
  const lang = 'ru';

  if (slug) {
    await store.dispatch(loadGroup({ slug, lang }));
  }

  await store.dispatch(
    loadGroups({
      random: 'true',
      lang,
    }),
  );
})
class EmbeddedStories extends React.Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  constructor(...arguments_) {
    super(...arguments_);

    this.showed = false;
  }

  onShow = () => {
    if (this.showed === false) {
      this.showed = true;

      throwEvent({
        category: 'stories',
        action: 'embedded_in_viewport',
      });
    }
  };

  render() {
    const { location } = this.props;

    return (
      <RenderMounted rootMargin="0px 0px 0px 0px" onShow={this.onShow}>
        {({ onChildReference }) => (
          <div className="embedded-stories" ref={(element) => onChildReference(element)}>
            <Stories embedded lang="ru" autoPlayOnViewport={location.query.autoPlay === 'true'} />
          </div>
        )}
      </RenderMounted>
    );
  }
}

export default EmbeddedStories;
