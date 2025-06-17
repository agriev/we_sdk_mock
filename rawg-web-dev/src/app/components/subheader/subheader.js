import React from 'react';
import PropTypes from 'prop-types';
import debounce from 'lodash/debounce';

import Tabs from 'app/ui/tabs';
import Tab from 'app/ui/tabs/tab';
import SimpleIntlMessage from 'app/components/simple-intl-message';

import './subheader.styl';

const propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      path: PropTypes.string,
      labelId: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
      active: PropTypes.bool,
    }),
  ).isRequired,
};

class Subheader extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      pointer: {
        x: 0,
      },
    };

    this.currentPointerEl = undefined;
  }

  componentDidMount() {
    window.addEventListener('resize', this.calcPointerDebounced);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.calcPointerDebounced);
  }

  calcPointer = (elementArgument) => {
    const element = elementArgument instanceof window.Event ? this.currentPointerEl : elementArgument;

    if (element) {
      this.currentPointerEl = element;

      const size = element.getBoundingClientRect();
      this.setState({
        pointer: {
          x: size.x + size.width / 2,
        },
      });
    } else {
      this.setState({
        pointer: {},
      });
    }
  };

  /* eslint-disable-next-line react/sort-comp */
  calcPointerDebounced = debounce(this.calcPointer, 200);

  render() {
    const { pointer } = this.state;
    const { items } = this.props;

    return (
      <div className="subheader">
        <span className="subheader__pointer" style={{ left: `${pointer.x - 10 || -10}px` }} />
        <Tabs className="subheader__tabs" centred={false}>
          {items.map((item) => (
            <Tab className="subheader__tab" active={item.active} to={item.path} key={item.path}>
              <SimpleIntlMessage id={item.labelId} />
            </Tab>
          ))}
        </Tabs>
      </div>
    );
  }
}

Subheader.propTypes = propTypes;

export default Subheader;
