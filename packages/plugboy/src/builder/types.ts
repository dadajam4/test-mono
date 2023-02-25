import { PlugboyPackage } from '../package';
import { Path } from '../path';

export type PlugboyEntryLinkType = 'js' | 'css';

export interface PlugboyEntryLink {
  from: string;
  to: string;
  type: PlugboyEntryLinkType;
}

export interface PlugboyObjectExport {
  types: string;
  import: {
    default: string;
  };
}

// export interface PlugboyExport = [string, string | PlugboyObjectExport];
export interface PlugboyExport {
  id: string;
  at: string | PlugboyObjectExport;
  link?: PlugboyEntryLink;
}

export interface PlugboyConfig extends PlugboyPackage {
  dirs: {
    src: Path;
    dist: Path;
  };
  uses: {
    vue: boolean;
    css: boolean;
  };
  entry: Record<string, string>;
  exports: PlugboyExport[];
}
