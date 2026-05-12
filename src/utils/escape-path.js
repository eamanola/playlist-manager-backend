// eslint-disable-next-line prefer-named-capture-group
const escapePath = (path) => path.replace(/([`])/ug, '\\$1');

module.exports = escapePath;
