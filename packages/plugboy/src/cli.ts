#!/bin/env node
import { cac } from 'cac';

import { Builder } from './builder';
import { loadInScopePlugboyConfig } from './builder';

export async function main() {
  const cli = cac('plugboy');
  cli.version('0.0.0');
  cli
    .command('link', 'Linking distribution and source directories.')
    .action(async (files, options) => {
      const config = await loadInScopePlugboyConfig();
      const builder = new Builder(config);
      await builder.preparePackageJSON();
      await builder.link();
    });

  cli
    .command('build', 'Guess all entries and bundle source code.')
    .action(async (files, options) => {
      const config = await loadInScopePlugboyConfig();
      const builder = new Builder(config);
      await builder.preparePackageJSON();
      await builder.build();
    });

  cli.command('clean', 'xxxxx.').action(async (files, options) => {
    const config = await loadInScopePlugboyConfig();
    const builder = new Builder(config);
    await builder.clean();
  });

  cli.help();
  cli.parse();
}

main();
