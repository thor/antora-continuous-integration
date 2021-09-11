import * as path from 'path';

export class GitlabEnvironment {
  #fullRepoUrl;
  #jobId;
  #projectUrl;
  #projectPath;

  constructor () {
    const env = process.env;
    this.#projectUrl = `${env.CI_SERVER_URL}/${env.CI_PROJECT_NAMESPACE}/${env.CI_PROJECT_NAME}`;
    ({
      CI_PROJECT_DIR: this.#projectPath,
      CI_REPOSITORY_URL: this.#fullRepoUrl,
      CI_JOB_ID: this.#jobId
    } = env);
  }

  get outputDir () {
    return path.join(this.#projectPath, 'public');
  }

  get siteUrl () {
    return `${this.#projectUrl}/-/jobs/${this.#jobId}/artifacts/file/public/index.html`;
  }

  get repositoryUrl () {
    return this.#fullRepoUrl.replace(/[\w-]+:[\w-]+@/, '');
  }

  get projectPath () {
    return this.#projectPath;
  }

  static detected () {
    return Boolean(process.env.GITLAB_CI);
  }
}

export class LocalEnvironment {
  get siteUrl () {
    return 'http://localhost:8080/index.html';
  }

  get repositoryUrl () {
    return '.';
  }

  static detected () {
    return !process.env.CI;
  }
}

export const environments = [GitlabEnvironment, LocalEnvironment];
