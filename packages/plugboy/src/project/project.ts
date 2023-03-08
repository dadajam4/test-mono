import { findConfig } from '../utils';
import {
  ProjectPackageJson,
  isProjectPackageJson,
  isWorkspacePackageJson,
} from '../types';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Path } from '../path';
import glob from 'glob';
import { loadProjectConfig, ResolvedProjectConfig } from './config';

export class PlugboyProject {
  readonly dir: Path;
  readonly json: ProjectPackageJson;
  readonly config: ResolvedProjectConfig;
  readonly dependencies: string[];
  readonly resolvedWorkspaces: string[];

  get name() {
    return this.json.name;
  }

  constructor(
    dir: Path,
    json: ProjectPackageJson,
    config: ResolvedProjectConfig,
    resolvedWorkspaces: string[],
  ) {
    this.dir = dir;
    this.json = json;
    this.config = config;
    const allDeps = {
      ...json.dependencies,
      ...json.devDependencies,
    };

    this.dependencies = Object.keys(allDeps);
    this.resolvedWorkspaces = resolvedWorkspaces;
  }
}

export async function getProject<
  AllowMissing extends boolean | undefined = false,
>(
  searchDir?: string,
  allowMissing?: AllowMissing,
): Promise<AllowMissing extends true ? PlugboyProject | null : PlugboyProject> {
  const hit = await findConfig(
    {
      fileName: 'package.json',
      allowMissing,
      test: (result) => isProjectPackageJson(JSON.parse(result.code)),
    },
    searchDir,
  );
  if (!hit) {
    if (allowMissing) return null as any;
    throw new Error('missing project package.');
  }
  const dir = new Path(hit.dir);
  const json: ProjectPackageJson = JSON.parse(hit.code);
  const resolvedWorkspaces: string[] = [];
  const { workspaces = [] } = json;
  const workspacesPattern = workspaces.map(
    (workspace) => dir.join(workspace, 'package.json').value,
  );
  const workspaceHits = await glob(workspacesPattern);
  for (const hit of workspaceHits) {
    const json = JSON.parse(await fs.readFile(hit, 'utf-8'));
    if (!isWorkspacePackageJson(json)) {
      continue;
    }
    resolvedWorkspaces.push(path.dirname(hit));
  }
  resolvedWorkspaces.sort((a, b) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });

  const config = await loadProjectConfig(dir.value, 0);

  return new PlugboyProject(dir, json, config, resolvedWorkspaces);
}
