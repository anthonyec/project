import path from 'path';
import { stdout } from 'process';

import { getDirectoryNames } from './fs';
import { textBlock } from './text';

interface Result {
  name: string;
  cleanName: string;
  organization: string;
  path: string;
}

function removeDatePrefix(name: string) {
  const datePrefixRegex = /^\d{2}\d{2}\d{2}_/;
  return name.replace(datePrefixRegex, '');
}

function removeUnderscores(name: string) {
  return name.replaceAll('_', ' ').toLowerCase();
}

export async function find(rootProjectsDirectory: string, query: string) {
  if (query === undefined) {
    stdout.write(`Query is required\n\n`);

    stdout.write(textBlock`
      Example:
        project find "tax"
    `);

    return;
  }

  const normalizedQuery = removeUnderscores(query);
  const results: Result[] = [];

  const organizationDirectoryNames = await getDirectoryNames(
    rootProjectsDirectory
  );

  for (const organizationDirectoryName of organizationDirectoryNames) {
    const organizationDirectoryPath = path.join(
      rootProjectsDirectory,
      organizationDirectoryName
    );

    const projectDirectoryNames = await getDirectoryNames(
      organizationDirectoryPath
    );

    for (const projectDirectoryName of projectDirectoryNames) {
      const projectDirectoryPath = path.join(
        organizationDirectoryPath,
        projectDirectoryName
      );

      const nameWithoutDatePrefix = removeDatePrefix(projectDirectoryName);
      const normalizedName = removeUnderscores(nameWithoutDatePrefix);

      if (normalizedName.includes(normalizedQuery)) {
        results.push({
          name: projectDirectoryName,
          cleanName: normalizedName,
          organization: organizationDirectoryName,
          path: projectDirectoryPath
        });
      }
    }
  }

  stdout.write(`Found ${results.length} results for "${query}":\n\n`);

  const longestCleanNameLength = results.reduce((longest, result) => {
    return result.cleanName.length > longest
      ? result.cleanName.length
      : longest;
  }, 0);

  let lastOrganization: string | null = null;

  for (const result of results) {
    if (result.organization !== lastOrganization) {
      if (lastOrganization !== null) {
        stdout.write('\n');
      }

      stdout.write(`${result.organization}:\n`);
      lastOrganization = result.organization;
    }

    const indentedCleanName = `  ${result.cleanName}`;
    const gap = String().padStart(
      longestCleanNameLength - result.cleanName.length
    );

    stdout.write(`${indentedCleanName}${gap}        ${result.path}\n`);
  }
}