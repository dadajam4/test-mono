import { bundleRequire } from 'bundle-require';
import { findConfig } from '../utils';
import type { CompilerOptions } from 'typescript';
import { WorkspacePackageJson } from '../types';

export type TSConfigJSON = {
  compilerOptions?: CompilerOptions;
} & Record<string, any>;

export interface ProjectScriptsTemplate {
  name: string;
  scripts: Record<string, string>;
}

export interface UserProjectConfig {
  /**
   * xxx
   *
   * @default packages
   */
  workspacesDir?: string;
  scripts?: Record<string, string> | ProjectScriptsTemplate[];
  tsconfig?: TSConfigJSON;
  readme?: (json: WorkspacePackageJson) => string;
  peerDependencies?: Record<string, string>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ResolvedProjectConfig
  extends Required<Omit<UserProjectConfig, 'scripts' | 'tsconfig'>> {
  scripts: ProjectScriptsTemplate[];
  tsconfig?: TSConfigJSON;
}

export function resolveUserProjectConfig(
  userConfig: UserProjectConfig,
): ResolvedProjectConfig {
  const {
    workspacesDir = 'packages',
    scripts = [],
    peerDependencies = {},
    tsconfig,
    readme = (json) => `# ${json.name}\n`,
  } = userConfig;
  return {
    workspacesDir,
    scripts: Array.isArray(scripts) ? scripts : [{ name: '', scripts }],
    peerDependencies,
    tsconfig,
    readme,
  };
}

export function defineProjectConfig<Config extends UserProjectConfig>(
  config: Config,
): ResolvedProjectConfig {
  return resolveUserProjectConfig(config);
}

export async function loadProjectConfig(
  searchDir?: string,
  depth?: number,
): Promise<ResolvedProjectConfig> {
  const hit = await findConfig(
    {
      fileName: 'plugboy.config.ts',
      depth,
      allowMissing: true,
    },
    searchDir,
  );

  const userConfig: UserProjectConfig = hit
    ? (
        await bundleRequire<{ default: UserProjectConfig }>({
          filepath: hit.path,
        })
      ).mod.default
    : {};

  return resolveUserProjectConfig(userConfig);
}
