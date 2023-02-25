import { Options as TsupOptions } from 'tsup';

export type EsbuildPlugin = NonNullable<TsupOptions['esbuildPlugins']>[number];
