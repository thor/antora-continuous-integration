import { environments } from './environments.mjs';
import { customisations } from './customisations.mjs';
import { capitaliseFirstLetter, name as pkgName } from './utils.mjs';

let log;

/**
 * Entrypoint for Antora.
 * @param {Object} pipeline Antoras pipeline extension
 * @param {Object} context Pipeline extension additional context
 * @param {Object.<string, any>} context.config Extension configuration
 * @param {Object} context.playbook Antora playbook
 * @returns
 */
export function register (pipeline, { config }) {
  log = pipeline.require('@antora/logger').get(pkgName);
  const DetectedEnvironment = environments.find(x => x.detected());

  if (!DetectedEnvironment) {
    log.error('No supported CI/CD environment detected');
    return;
  }
  log.info('Detected CI environment');
  const ci = new DetectedEnvironment();

  const chosenMode = capitaliseFirstLetter(process.env.ANTORA_CI_MODE || '');
  const ChosenCustomisation = customisations.find((c) => c.name === `${chosenMode}Customisation`);
  if (!ChosenCustomisation) {
    log.error(`No supported customisation detected. Detected '${chosenMode}' mode`);
    return;
  }

  return new ChosenCustomisation(pipeline, ci, config);
}
