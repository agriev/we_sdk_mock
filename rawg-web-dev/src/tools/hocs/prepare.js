/* eslint-disable no-console, react/prop-types, sonarjs/cognitive-complexity */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ReactReduxContext } from 'react-redux';

import config from 'config/config';
import logPerfomance from 'tools/log-perfomance';

import {
  setLoading,
  getRatings,
  getReactions,
  getPlatforms,
  getGenres,
  setStatus,
  getGamesCount,
  getStores,
} from 'app/pages/app/app.actions';

import { loadCurrentUser } from 'app/components/current-user/current-user.actions';
import { loadBrowseFull } from 'app/pages/browse/browse.actions';

export const initAppPrepareFuncs = async ({ store }) => {
  logPerfomance.start('prepare.mainAppData');
  await Promise.all([
    store.dispatch(loadCurrentUser()),
    store.dispatch(getGamesCount()),
    store.dispatch(getRatings()),
    store.dispatch(getReactions()),
    store.dispatch(getPlatforms()),
    store.dispatch(getGenres()),
    store.dispatch(getStores()),
    store.dispatch(loadBrowseFull()),
  ]);
  logPerfomance.end('prepare.mainAppData');
};

const prepare = (prepareFunction, options = {}) => (decoratedComponent) =>
  class PrepareComponentDecorator extends Component {
    static prepare = prepareFunction;

    static contextType = ReactReduxContext;

    constructor(...arguments_) {
      super(...arguments_);

      const { store } = this.context;
      const {
        app: { firstRender },
      } = store.getState();

      this.state = {
        preloaded: config.ssr && firstRender,
      };

      this.showWithoutWaiting = !firstRender;
      this.firstRender = firstRender;
    }

    componentDidMount() {
      if (!this.state.preloaded) {
        this.runPrepare(true);
      }
    }

    componentDidUpdate(previousProperties) {
      const { updateParam, updateOn } = options;
      const { params } = this.props;

      if (updateParam && previousProperties.params && previousProperties.params[updateParam] !== params[updateParam]) {
        this.runPrepare();
      }

      if (updateOn && updateOn(this.props, previousProperties)) {
        this.runPrepare();
      }
    }

    runPrepare = (init = false) => {
      const { store } = this.context;
      const { loading = true } = options;

      if (loading) store.dispatch(setLoading(true));

      this.prepare()
        .then(() => {
          if (loading) store.dispatch(setLoading(false));
          if (init) {
            this.setState({ preloaded: true });
          }
        })
        .catch((error) => {
          console.error(error);

          if (error && error.status === 404) {
            store.dispatch(setStatus(404));
          }

          if (loading) store.dispatch(setLoading(false));
        });
    };

    async prepare(prepareOptions = {}) {
      const promises = [];
      const {
        context: { store },
        props: { location, params, route },
      } = this;

      let initAppPromise = Promise.resolve();

      if (this.firstRender) {
        initAppPromise = initAppPrepareFuncs({ store });

        promises.push(initAppPromise);

        this.firstRender = false;
      }

      if (prepareFunction) {
        promises.push(
          prepareFunction({
            store,
            location,
            route,
            params,
            options: prepareOptions,
            initAppPromise,
          }),
        );
      }

      return Promise.all(promises);
    }

    render() {
      const { preloaded } = this.state;
      if (preloaded || this.showWithoutWaiting) {
        return React.createElement(decoratedComponent, this.props);
      }
      return <div />;
    }
  };

prepare.propTypes = {
  params: PropTypes.shape().isRequired,
};

export default prepare;
