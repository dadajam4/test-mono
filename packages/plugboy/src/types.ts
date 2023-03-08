import { PackageJson } from 'pkg-types';

type RequiredPackageJSON<Field extends string> = PackageJson &
  Required<Pick<PackageJson, Field>>;

const PROJECT_REQUIRED_FIELDS = ['name'] as const;

type ProjectRequiredField = (typeof PROJECT_REQUIRED_FIELDS)[number];

export type ProjectPackageJson = RequiredPackageJSON<ProjectRequiredField>;

export function isProjectPackageJson(
  json: PackageJson,
): json is ProjectPackageJson {
  return (
    !!json.private && PROJECT_REQUIRED_FIELDS.every((filed) => !!json[filed])
  );
}

const WORKSPACE_REQUIRED_FIELDS = ['name', 'version'] as const;

type WorkspaceRequiredField = (typeof WORKSPACE_REQUIRED_FIELDS)[number];

export interface WorkspaceMeta {
  exports?: Record<string, string>;
}

export type WorkspacePackageJson =
  RequiredPackageJSON<WorkspaceRequiredField> & {
    plugboy?: WorkspaceMeta;
  };

export function isWorkspacePackageJson(
  json: PackageJson,
): json is ProjectPackageJson {
  return (
    !json.private && WORKSPACE_REQUIRED_FIELDS.every((filed) => !!json[filed])
  );
}

import { Options as TsupOptions } from 'tsup';

export type EsbuildPlugin = NonNullable<TsupOptions['esbuildPlugins']>[number];
