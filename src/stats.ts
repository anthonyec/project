import fs from 'fs/promises';
import path from 'path';
import { stdout } from 'process';

import { getDirectoryNames } from './fs';

export async function stats(
  projectRootDirectory: string,
  organization?: string
) {
  const organizationDirectories = await getDirectoryNames(projectRootDirectory);

  if (organization) {
    const organizationExists = organizationDirectories.includes(organization);

    if (!organizationExists) {
      // TODO(anthony): Reuse `logAvailableOrganizations` from `src/index.ts`.
      stdout.write(`The organization "${organization}" does not exist\n\n`);
      return;
    }
  }

  for (const organizationDirectory of organizationDirectories) {
    if (organization && organization !== organizationDirectory) {
      continue;
    }

    const projectDirectory = path.join(
      projectRootDirectory,
      organizationDirectory
    );
    const projectDirectories = await getDirectoryNames(projectDirectory);

    const countByYear: Map<number, number> = new Map();

    for (const projectDirectoryName of projectDirectories) {
      const projectDirectoryPath = path.join(
        projectDirectory,
        projectDirectoryName
      );

      const stat = await fs.stat(projectDirectoryPath);
      const date = new Date(stat.birthtime);
      const year = date.getFullYear();
      const previousCount = countByYear.get(year) ?? 0;

      countByYear.set(year, previousCount + 1);
    }

    stdout.write(`${organizationDirectory}\n`);

    const years = Array.from(countByYear.keys()).sort();

    for (const year of years) {
      const count = countByYear.get(year) ?? 0;
      stdout.write(`  ${year}: ${count}\n`);
    }

    stdout.write(`  total: ${projectDirectories.length}\n`);
    stdout.write(`\n`);
  }
}
