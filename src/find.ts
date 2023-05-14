import path from 'path';
import { stdout } from 'process';

import { getDirectoryNames, scanDirectory } from './fs';
import { textBlock } from './text';

interface Result {
  name: string;
  cleanName: string;
  organization: string;
  path: string;
}

interface QueryOptions {
  /** Find extension type. */
  type?: string;
}

function removeDatePrefix(name: string) {
  const datePrefixRegex = /^\d{2}\d{2}\d{2}_/;
  return name.replace(datePrefixRegex, '');
}

function removeUnderscores(name: string) {
  return name.replaceAll('_', ' ').toLowerCase();
}

export async function find(
  rootProjectsDirectory: string,
  query: string,
  options?: QueryOptions
) {
  if (query === undefined) {
    stdout.write(`Query is required\n\n`);

    stdout.write(textBlock`
      Example:
        project find "tax"                      # Find all projects with "tax" in the name
        project find "space" --type ".blend"    # Find all projects with "space" in the name that have a .blend file
        project find "" --type ".blend"         # Find all projects that have a .blend file
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

      let fileTypeMatch = false;

      if (options?.type && options.type !== undefined) {
        // console.log(options.type)
        const files = await scanDirectory(projectDirectoryPath);

        fileTypeMatch = files.some(
          (file) => path.extname(file.name) === options.type
        );
      }

      const queryMatch = normalizedName.includes(normalizedQuery);

      if (options?.type) {
        if (queryMatch && fileTypeMatch) {
          results.push({
            name: projectDirectoryName,
            cleanName: normalizedName,
            organization: organizationDirectoryName,
            path: projectDirectoryPath
          });
        }
      } else if (queryMatch) {
        results.push({
          name: projectDirectoryName,
          cleanName: normalizedName,
          organization: organizationDirectoryName,
          path: projectDirectoryPath
        });
      }
    }
  }

  if (options?.type) {
    stdout.write(
      `Found ${results.length} results for "${query}" that included "${options.type}" files:\n\n`
    );
  } else {
    stdout.write(`Found ${results.length} results for "${query}":\n\n`);
  }

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
