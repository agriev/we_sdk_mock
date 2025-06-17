import React from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader/root';
import { decode } from 'he';

import isArray from 'lodash/isArray';

import pipe from 'ramda/src/pipe';
import assoc from 'ramda/src/assoc';
import omit from 'ramda/src/omit';

const hoc = compose(hot);

const getAttributes = (attributes, type, idx) => {
  const addKey = assoc('key', `${type}-${idx}`);

  if (attributes.class) {
    return pipe(
      omit(['class']),
      assoc('className', attributes.class),
      addKey,
    )(attributes);
  }

  return addKey(attributes);
};

const propTypes = {
  ast: PropTypes.arrayOf(PropTypes.object).isRequired,
};

const defaultProps = {};

const AstTreeComponent = ({ ast }) => {
  if (isArray(ast)) {
    return (
      <>
        {ast.map((element, idx) => {
          if (element.type === 'text') {
            return decode(element.content);
          }

          const tagName = element.name && element.name.toLowerCase();

          if (element.type === 'tag' && tagName !== 'ib') {
            if (element.voidElement) {
              return React.createElement(tagName, getAttributes(element.attrs, element.type, idx));
            }

            return React.createElement(
              tagName,
              getAttributes(element.attrs, element.type, idx),
              <AstTree ast={element.children} />,
            );
          }

          if (element.type === 'component') {
            return element.component;
          }

          return null;
        })}
      </>
    );
  }

  return null;
};

AstTreeComponent.propTypes = propTypes;
AstTreeComponent.defaultProps = defaultProps;

const AstTree = hoc(AstTreeComponent);

export default AstTree;
