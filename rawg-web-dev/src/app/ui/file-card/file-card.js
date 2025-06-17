import React from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader/root';
import { Link } from 'app/components/link';
import striptags from 'striptags';

import './file-card.styl';

import toPairs from 'lodash/toPairs';
import isPlainObject from 'lodash/isPlainObject';
import isArray from 'lodash/isArray';

import when from 'ramda/src/when';

import simpleTruncate from 'tools/string/simple-truncate';
import DownloadButton from 'app/ui/download-button';

const hoc = compose(hot);

const toNameValue = when(isPlainObject, (attributes) => toPairs(attributes).map(([name, value]) => ({ name, value })));

// eslint-disable-next-line react/prop-types
const Property = ({ name, value }) => (
  <div key={name} className="file-card__props__prop">
    <div className="file-card__props__prop__name">{name}:</div>
    <div className="file-card__props__prop__value">{value}</div>
  </div>
);

const propTypes = {
  name: PropTypes.node.isRequired,
  description: PropTypes.string,
  attrs: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.node.isRequired,
        value: PropTypes.node.isRequired,
      }),
    ),
    PropTypes.object,
  ]),
  titleUrl: PropTypes.string,
  url: PropTypes.string,
  urlToNewPage: PropTypes.bool,
};

const defaultProps = {
  description: undefined,
  titleUrl: undefined,
  url: undefined,
  attrs: undefined,
  urlToNewPage: true,
};

const cleanString = (string) =>
  string
    .replace(/FFF/g, '')
    .replace(/NNN/g, '')
    .replace(/CCC/g, '');

const processDescription = (string) => simpleTruncate(200, striptags(cleanString(string)));

const FileCardComponent = ({ name, attrs, url, titleUrl, description, urlToNewPage }) => (
  <div className="file-card">
    <div className="file-card__name-wrap">
      {!titleUrl && <div className="file-card__name">{name}</div>}
      {titleUrl && (
        <Link className="file-card__name" to={titleUrl}>
          {name}
        </Link>
      )}
    </div>
    {isArray(attrs) && <div className="file-card__props">{toNameValue(attrs).map(Property)}</div>}
    {description && <div className="file-card__description">{processDescription(description)}</div>}
    {url && (
      <DownloadButton
        path={url}
        text="program.files_download"
        linkProps={{ target: urlToNewPage ? '_blank' : undefined }}
      />
    )}
  </div>
);

FileCardComponent.propTypes = propTypes;
FileCardComponent.defaultProps = defaultProps;

const FileCard = hoc(FileCardComponent);

export default FileCard;
