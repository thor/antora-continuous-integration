import { join } from 'path';
import * as yaml from 'js-yaml';
import { readFile } from 'fs/promises';
import { name as pkgName, injectEnvironment } from './utils.mjs';

let log;

/**
 * Abstract customisation class.
 *
 * Strictly speaking, pretty unnecessary at the moment.
 * @property {Object} pipeline Antora pipeline
 * @property {Object} ci CI/CD environment details
 * @property {Object<string,string>} config Configuration options
 */
class Customisation {
  constructor (pipeline, ci, config) {
    if (this.constructor === Customisation) {
      throw new Error("Abstract customisation can't be instantiated");
    }
    log = pipeline.require('@antora/logger').get(pkgName);
    this.ci = ci;
    this.config = config;
    this.pipeline = pipeline;
  }
}

/**
 * Customisation for a single component.
 *
 * The following limitation is essential:
 * we cannot easily filter out duplicate content sources, thus we do not allow
 * other content sources if a version is specified.
 *
 * TODO: Add support for removing the content sources our merge request targets
 */
export class ComponentCustomisation extends Customisation {
  config = {
    componentPath: 'docs',
    componentAsStartPage: true,
    keepOwnComponentVersions: true,
    keepOtherComponents: false
  };

  configEnvironment = {
    componentPath: 'ANTORA_COMPONENT_PATH',
    keepOwnComponentVersions: 'ANTORA_KEEP_OWN_COMPONENT_VERSIONS',
    keepOtherComponents: 'ANTORA_KEEP_OTHER_COMPONENTS'
  }

  constructor (...args) {
    super(...args);
    this.config = injectEnvironment({ ...this.config, ...super.config },
      this.configEnvironment);

    this.register(this.pipeline);
    log.info(this.config, 'Component customisations for CI/CD loaded');
  }

  register (pipeline) {
    pipeline
      .on('playbookBuilt', this.setSiteUrl)
      .on('playbookBuilt', this.config.componentAsStartPage
        ? this.setSiteStartPage
        : () => null)
      .on('playbookBuilt', this.removeComponents)
      .on('playbookBuilt', this.addHeadComponent);
  }

  setSiteUrl = async ({ playbook }) => {
    playbook = JSON.parse(JSON.stringify(playbook));
    playbook.site.url = this.ci.siteUrl;
    log.info(`Updated the site URL to ${playbook.site.url}`);
    this.pipeline.updateVars({ playbook });
  }

  setSiteStartPage = async ({ playbook }) => {
    playbook = JSON.parse(JSON.stringify(playbook));
    const component = await this.readComponent();
    playbook.site.startPage = `${component.name}:${component.startPage || ':index.adoc'}`;
    log.info(`Updated the site start page to ${playbook.site.startPage}`);
    this.pipeline.updateVars({ playbook });
  }

  addHeadComponent = async ({ playbook }) => {
    const headComponent = {
      url: this.ci.projectPath,
      startPath: this.config.componentPath,
      branches: ['HEAD'],
      version: 'WIP'
    };
    playbook = JSON.parse(JSON.stringify(playbook));
    playbook.content.sources = playbook.content.sources.concat(headComponent);

    this.pipeline.updateVars({ playbook });
  }

  // Remove components not belonging to this repository
  // TODO: Remove other start_path(s) that aren't relevant
  removeComponents = async ({ playbook }) => {
    this.forceDeletionIfStaticVersion(await this.readComponent());

    playbook = JSON.parse(JSON.stringify(playbook));
    playbook.content.sources = playbook.content.sources.filter(
      ({ url, startPath, startPaths }) => {
        return (this.ci.repositoryUrl === url || this.config.keepOtherComponents) &&
          (this.config.componentPath === startPath ||
            startPaths.includes(this.config.componentPath)) &&
          this.config.keepOwnComponentVersions;
      });
    this.pipeline.updateVars({ playbook });
  }

  /**
   * In the event the component has a version set in its component configuration, we will not be able to deduce outside of a pipeline
   * extension whether we can render the site with existing docs, unless we validate the other versions.
   * @param {String} version Component version descriptor
   */
  forceDeletionIfStaticVersion = async ({ version }) => {
    // const component = await this.readComponent();
    if (!version || version === '~') {
      log.trace('No forced deletion of other versions required to prevent errors');
      return;
    }
    log.warn('Removing other component sources from preview due to static version');
    this.config.keepOwnComponentVersions = false;
  }

  /**
   * Read the component.
   * @returns {Promise<Object<string,string>>} the component.
   */
  async readComponent () {
    const antoraPath = join(this.ci.projectPath, this.config.componentPath, 'antora.yml');
    const str = await readFile(antoraPath);
    return yaml.load(str);
  }
}

export const customisations = [ComponentCustomisation];
