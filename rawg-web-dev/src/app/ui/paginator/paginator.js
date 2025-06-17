/* eslint-disable react/no-string-refs */

import range from 'lodash/range';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import env from 'config/env';
import Loading2 from 'app/ui/loading-2';

import './paginator.styl';

export default class Paginator extends Component {
  static propTypes = {
    load: PropTypes.func.isRequired,
    loading: PropTypes.bool,
    count: PropTypes.number,
    active: PropTypes.number,
    children: PropTypes.node,
  };

  static defaultProps = {
    loading: false,
    count: 0,
    active: 0,
    children: null,
  };

  constructor(props) {
    super(props);

    const { loading, active } = this.props;

    this.state = {
      loading,
      active,
    };
  }

  componentDidMount() {
    this.paginatorPosition = this.refs.paginator.getBoundingClientRect();
  }

  static getDerivedStateFromProps(props, state) {
    const { active } = props;

    if (state.active !== active) {
      return {
        active,
      };
    }

    return null;
  }

  getItemClassName(item) {
    const { active } = this.state;

    return classnames('paginator__item', {
      paginator__item_active: item === active,
    });
  }

  load = (item) => {
    const { load } = this.props;
    const { loading, active } = this.state;

    if (active === item || loading) return;

    this.setState({
      loading: true,
      active: item,
    });

    Promise.resolve(load(item + 1)).then(() => {
      this.setState({ loading: false });

      if (env.isClient()) {
        window.setTimeout(() => {
          window.scrollTo(0, this.paginatorPosition.top);
        }, 50);
      }
    });
  };

  render() {
    const { count } = this.props;
    const { loading, active } = this.state;

    const lastPage = Math.ceil(count);

    let rangePages = range(lastPage);
    rangePages = rangePages.slice(
      Math.max(1, active - 1),
      Math.min(active >= 3 ? active + 2 : active + 3, lastPage - 1),
    );

    return (
      <div className="paginator" ref="paginator">
        {!loading && this.props.children}

        {loading && <Loading2 radius={48} stroke={2} />}

        {lastPage > 1 && (
          <div className="paginator__items">
            <div className={this.getItemClassName(0)} onClick={() => this.load(0)} role="button" tabIndex={0}>
              {1}
            </div>

            {active >= 3 && <div className="paginator__item_empty">•••</div>}

            {rangePages.map((item) => (
              <div
                className={this.getItemClassName(item)}
                onClick={() => this.load(item)}
                role="button"
                tabIndex={0}
                key={item}
              >
                {item + 1}
              </div>
            ))}

            {active < lastPage - 3 && <div className="paginator__item_empty">•••</div>}

            <div
              className={this.getItemClassName(lastPage - 1)}
              onClick={() => this.load(lastPage - 1)}
              role="button"
              tabIndex={0}
            >
              {lastPage}
            </div>
          </div>
        )}
      </div>
    );
  }
}
