const name = 'continuous-integration';

/**
 * Inject configured environment variables into object.
 * @param {Object} config
 * @param {Object.<string,string>} map
 */
function injectEnvironment (config, map) {
  return Object
    .entries(map)
    .reduce((accumulator, [setting, variable]) => (
      {
        ...accumulator,
        [setting]: typeof process.env[variable] !== 'undefined' ? tryStringToBool(process.env[variable]) : config[setting]
      }
    ), config);
}

/**
 * Capitalise the first letter.
 * @param {string} string Input string
 * @returns {String} String with the first letter capitalised
 */
function capitaliseFirstLetter (string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Convert string into boolean if applicable.
 * @param {String} string
 * @returns {Boolean|String}
 */
function tryStringToBool (string) {
  if (typeof string !== 'string') {
    return string;
  }
  switch (string.toLowerCase().trim()) {
    case 'true': case 'yes': case '1': return true;
    case 'false': case 'no': case '0': case null: return false;
    default: return string;
  }
}
export { injectEnvironment, capitaliseFirstLetter, name };
