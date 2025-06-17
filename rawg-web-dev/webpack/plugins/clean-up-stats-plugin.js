/* eslint-disable no-param-reassign */

class CleanUpStatsPlugin {
  /**
   * @param {Object} child
   * @param {string} child.name
   * @returns {boolean}
   */
  shouldPickStatChild = child =>
    child.name.indexOf('mini-css-extract-plugin') !== 0 &&
    child.name.indexOf('extract-css-chunks-webpack-plugin') !== 0;

  apply(compiler) {
    compiler.plugin('done', (stats) => {
      if (Array.isArray(stats.compilation.children)) {
        stats.compilation.children = stats.compilation.children.filter(
          this.shouldPickStatChild,
        );
      }
    });
  }
}

export default CleanUpStatsPlugin;
