import React, { Component } from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import throttle from 'lodash/throttle';
import isBoolean from 'lodash/isBoolean';

import subtract from 'ramda/src/subtract';
import when from 'ramda/src/when';
import always from 'ramda/src/always';
import __ from 'ramda/src/__';

import env from 'config/env';

import Loading2 from 'app/ui/loading-2';

import './load-more.styl';

import getScrollContainer from 'tools/get-scroll-container';
import getAppContainerHeight from 'tools/get-app-container-height';

import appHelper from 'app/pages/app/app.helper';
import { appSizeType } from 'app/pages/app/app.types';
import SimpleIntlMessage from 'app/components/simple-intl-message';

// import keysEqual from 'tools/keys-equal';

export const loadMorePropTypes = {
  appSize: appSizeType.isRequired,
  load: PropTypes.func,
  next: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.object]),
  loading: PropTypes.bool,
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]).isRequired,
  isOnScroll: PropTypes.bool,
  needLoadOnScroll: PropTypes.func,
  count: PropTypes.number,
};

const componentDefaultProperties = {
  load: undefined,
  next: undefined,
  loading: false,
  isOnScroll: false,
  count: 0,
  needLoadOnScroll: undefined,
};

export default class LoadMore extends Component {
  static propTypes = loadMorePropTypes;

  static defaultProps = componentDefaultProperties;

  constructor(props) {
    super(props);

    const { loading = false } = props;

    this.state = {
      loading,
    };

    this.loadMoreButtonRef = React.createRef();
    this.onScroll = throttle(this.onScroll, 100);
  }

  componentDidMount() {
    if (this.props.isOnScroll) {
      getScrollContainer().addEventListener('scroll', this.onScroll);
    }
  }

  static getDerivedStateFromProps(props, state) {
    const { loading } = props;

    if (isBoolean(loading) && state.loading !== loading) {
      return {
        loading,
      };
    }

    return null;
  }

  componentWillUnmount() {
    if (this.props.isOnScroll) {
      getScrollContainer().removeEventListener('scroll', this.onScroll);
    }
  }

  onScroll = () => {
    if (!this.loadMoreButtonRef.current) {
      return;
    }

    const { needLoadOnScroll, appSize } = this.props;

    const isPhone = always(appHelper.isPhoneSize(appSize));
    const windowHeight = getAppContainerHeight();
    const loadMoreOrgPosition = this.loadMoreButtonRef.current.getBoundingClientRect().top;

    // На мобайле запускаем загрузку немного заранее
    const loadMorePosition = when(isPhone, subtract(__, 1000), loadMoreOrgPosition);

    if (
      loadMorePosition <= windowHeight &&
      ((needLoadOnScroll && needLoadOnScroll()) || needLoadOnScroll === undefined)
    ) {
      this.load();
    }
  };

  load = () => {
    const { next, load } = this.props;
    const { loading } = this.state;

    if (!next || !load || loading) return;

    this.setState({ loading: true });

    load().then(() => {
      this.setState({ loading: false });
    });
  };

  render() {
    const { count, next, load } = this.props;
    const { loading } = this.state;

    return (
      <div className="load-more" id="load-more-button">
        {this.props.children}
        {load && env.isClient() && (
          <div className="load-more__bottom">
            {count > 0 && next && (
              <div
                className={cn('load-more__button', { 'load-more__loader': loading })}
                onClick={this.load}
                role="button"
                tabIndex={0}
                onScroll={this.load}
                ref={this.loadMoreButtonRef}
              >
                {loading ? <Loading2 radius={24} stroke={2} /> : <SimpleIntlMessage id="shared.load_more" />}
              </div>
            )}
            {count <= 0 && loading && <Loading2 radius={48} stroke={2} />}
          </div>
        )}
      </div>
    );
  }
}
