import { PackageJson } from 'pkg-types';

type RequiredField = 'name';

export interface PlugboyMeta {
  exports?: Record<string, string>;
}

export type PlugboyPackageJson = PackageJson &
  Required<Pick<PackageJson, RequiredField>> & {
    plugboy?: PlugboyMeta;
  };
