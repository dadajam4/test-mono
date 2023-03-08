import { findConfig, findFile, rmrf } from '../utils';
import {
  ProjectPackageJson,
  WorkspacePackageJson,
  WorkspaceMeta,
  isWorkspacePackageJson,
} from '../types';
import { Path } from '../path';
import { WORKSPACE_SPEC_PREFIX } from '../constants';
import { PlugboyProject, getProject } from '../project';
import sortPackageJson from 'sort-package-json';
import fs from 'node:fs/promises';
import { Builder } from './builder';

export type WorkspaceEntryLinkType = 'js' | 'css';

export interface WorkspaceEntryLink {
  from: string;
  to: string;
  type: WorkspaceEntryLinkType;
}

export interface WorkspaceObjectExport {
  types: string;
  import: {
    default: string;
  };
}

export interface WorkspaceExport {
  id: string;
  at: string | WorkspaceObjectExport;
  link?: WorkspaceEntryLink;
}

export interface WorkspaceDirs {
  src: Path;
  dist: Path;
}

export interface WorkspaceHas {
  css: boolean;
  vanillaExtract: boolean;
  vue: boolean;
}

export const WORKSPACE_PACKAGE_SYNC_FIELDS = [
  'repository',
  'author',
  'publishConfig',
  'license',
] as const;

export function syncWorkspacePackageFields(
  projectJSON: ProjectPackageJson,
  workspaceJSON: WorkspacePackageJson,
) {
  for (const field of WORKSPACE_PACKAGE_SYNC_FIELDS) {
    const value = projectJSON[field];
    if (value && !workspaceJSON[field]) {
      workspaceJSON[field] = value;
    }
  }
}

export class PlugboyWorkspace {
  readonly name: string;
  readonly dir: Path;
  readonly meta: WorkspaceMeta;
  readonly project: PlugboyProject | null;
  readonly dirs: WorkspaceDirs;
  readonly dependencies: string[];
  readonly projectDependencies: string[];
  readonly has: WorkspaceHas;
  readonly entry: Record<string, string>;
  readonly exports: WorkspaceExport[];
  readonly builder: Builder;
  private _json: WorkspacePackageJson;

  get json() {
    return this._json;
  }

  constructor(
    dir: Path,
    json: WorkspacePackageJson,
    project: PlugboyProject | null = null,
    dirs: WorkspaceDirs,
    dependencies: string[],
    projectDependencies: string[],
    has: WorkspaceHas,
  ) {
    this.name = dir.basename;
    this.dir = dir;
    this._json = json;
    this.project = project;
    this.dirs = dirs;
    this.dependencies = dependencies;
    this.projectDependencies = projectDependencies;
    this.has = has;
    this.meta = json.plugboy || {};

    const _exports: Record<string, string> = {
      '.': 'src/index.ts',
      ...this.meta.exports,
    };

    const entry: Record<string, string> = {};
    const exports: WorkspaceExport[] = [
      {
        id: './package.json',
        at: './package.json',
      },
    ];
    const CSS_LINK_PATH = dirs.dist.join('_.css').value;

    Object.entries(_exports).forEach(([id, src]) => {
      const isMainEntry = id === '.';
      const normalizedId = isMainEntry ? this.name : id.replace('./', '');
      const dest = `./dist/${normalizedId}.mjs`;
      const types = `./dist/${normalizedId}.d.ts`;

      entry[normalizedId] = src;
      exports.push({
        id,
        at: { types, import: { default: dest } },
        link: {
          from: dir.join(dest).value,
          to: dirs.src.value,
          type: 'js',
        },
      });

      if (isMainEntry && has.css) {
        const cssName = `${normalizedId}.css`;
        const cssDest = `./dist/${cssName}`;
        exports.push({
          id: `./${cssName}`,
          at: `./dist/${cssName}`,
          link: {
            from: dir.join(cssDest).value,
            to: CSS_LINK_PATH,
            type: 'css',
          },
        });
      }
    });

    this.entry = entry;
    this.exports = exports;

    this.builder = new Builder(this);
  }

  clean(withDepsAndCache?: boolean) {
    const { dir, dirs } = this;
    const paths: string[] = [dirs.dist.value];
    if (withDepsAndCache) {
      paths.push(dir.join('node_modules').value, dir.join('.turbo').value);
    }
    return rmrf(...paths);
  }

  async preparePackageJSON() {
    const { exports, json, project } = this;
    const _exports: Record<string, any> = {};
    const typesVersions: Record<string, any> = {};
    let main: string | undefined;
    let mainTypes: string | undefined;

    exports.forEach(({ id, at }) => {
      _exports[id] = at;
      if (typeof at !== 'object') return;
      const isMainExport = id === '.';
      const trimedId = isMainExport ? id : id.replace(/^\.\//, '');
      typesVersions[trimedId] = [at.types];

      if (isMainExport) {
        main = at.import.default;
        mainTypes = at.types;
      }
    });

    const cloned: typeof json = JSON.parse(JSON.stringify(json));
    cloned.exports = _exports;
    cloned.typesVersions = {
      '*': typesVersions,
    };
    if (main) cloned.main = main;
    if (mainTypes) cloned.types = mainTypes;

    const projectPeerDependencies = project?.config.peerDependencies;
    (['dependencies', 'devDependencies', 'peerDependencies'] as const).forEach(
      (prop) => {
        const deps = cloned[prop];
        if (!deps) return;
        Object.keys(deps).forEach((dep) => {
          const version = deps[dep];
          if (version.startsWith('workspace:')) {
            deps[dep] = 'workspace:*';
          } else if (projectPeerDependencies && projectPeerDependencies[dep]) {
            deps[dep] = projectPeerDependencies[dep];
          }
        });
      },
    );

    cloned.files = cloned.files || [];
    if (!cloned.files.some((file) => /(\.\/)?dist\/?/.test(file))) {
      cloned.files.unshift('dist');
    }

    if (project) {
      syncWorkspacePackageFields(project.json, cloned);
    }

    const sorted = sortPackageJson(cloned);
    const fromStr = JSON.stringify(cloned, null, 2);
    const toStr = JSON.stringify(sorted, null, 2);
    if (fromStr !== toStr || process) {
      await fs.writeFile(this.dir.join('package.json').value, toStr);
      this._json = sorted;
    }
    return sorted;
  }

  getLinks(): WorkspaceEntryLink[] {
    const links: WorkspaceEntryLink[] = [];
    this.exports.forEach(({ link }) => {
      link && links.push(link);
    });
    return links;
  }

  async link() {
    await this.clean();
    await fs.mkdir(this.dirs.dist.value);
    return this.builder.link();
  }

  async build() {
    await this.clean();
    return this.builder.build();
  }
}

export async function getWorkspace(
  searchDir?: string,
): Promise<PlugboyWorkspace> {
  const hit = await findConfig(
    {
      fileName: 'package.json',
      test: (result) => isWorkspacePackageJson(JSON.parse(result.code)),
    },
    searchDir,
  );
  const dir = new Path(hit.dir);
  const json: WorkspacePackageJson = JSON.parse(hit.code);
  const project = await getProject(dir.value, true);

  const dirs: WorkspaceDirs = {
    src: dir.join('src'),
    dist: dir.join('dist'),
  };

  const { dependencies, peerDependencies, optionalDependencies } = json;
  const allDeps = {
    ...dependencies,
    ...peerDependencies,
    ...optionalDependencies,
  };

  const _dependencies = Object.keys(allDeps);

  const projectDependencies = Object.entries(allDeps)
    .filter(([dep, spec]) => spec.startsWith(WORKSPACE_SPEC_PREFIX))
    .map(([dep]) => dep);

  const [hasCSS, hasVanillaExtract] = await Promise.all([
    !!findFile(dirs.src.value, /\.css?$/),
    !!findFile(dirs.src.value, /\.css\.ts$/),
  ]);

  const has: WorkspaceHas = {
    css: hasCSS,
    vanillaExtract: hasVanillaExtract,
    vue: _dependencies.includes('vue'),
  };

  const workspace = new PlugboyWorkspace(
    dir,
    json,
    project,
    dirs,
    _dependencies,
    projectDependencies,
    has,
  );
  return workspace;
}
