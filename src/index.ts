#! /usr/bin/env node
import * as fs from 'fs/promises';
import * as path from 'path';
import { stdout } from 'process';
import { doesFileExist, getDirectoryNames } from './fs';

type Command = 'make';

function logUsage() {
  stdout.write('Usage: project <command> [options]');
  stdout.write('\n\n');

  stdout.write('Options:');
  stdout.write('\n');
  stdout.write(
    '  --workspace, -w       Create a workspace with the same name\n'
  );
  stdout.write('\n');

  stdout.write('Commands:');
  stdout.write('\n');
  stdout.write('  make [options]        Make a new project\n');
  stdout.write('\n');
}

function snakify(text: string) {
  return (
    text
      .toLowerCase()

      // Replace all spaces with underscores.
      .replace(/ /g, '_')

      // Remove all non-alphanumeric characters except underscores.
      .replace(/[^a-z0-9_]/g, '')

      // Remove all non-alphanumeric characters from the beginning or end of the string.
      .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
  );
}

function prefixWithZero(number: number): string {
  if (number >= 0 && number < 10) {
    return '0' + number;
  }

  return number.toString();
}

function getDatePrefix() {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return `${year.toString().substring(2, 4)}${prefixWithZero(
    month
  )}${prefixWithZero(day)}`;
}

async function main() {
  // Initial setup checks.
  if (!process.env['PROJECT_ROOT_DIRECTORY']) {
    stdout.write(
      `The environment variable $PROJECT_ROOT_DIRECTORY needs to be set\n\n`
    );
    return;
  }

  if (!process.env['WORKSPACE_ROOT_DIRECTORY']) {
    stdout.write(
      `The environment variable $WORKSPACE_ROOT_DIRECTORY needs to be set\n\n`
    );
    return;
  }

  const projectRootDirectory = process.env['PROJECT_ROOT_DIRECTORY'];
  const workspaceRootDirectory = process.env['WORKSPACE_ROOT_DIRECTORY'];
  const projectRootExists = await doesFileExist(projectRootDirectory);
  const workspaceRootExists = await doesFileExist(projectRootDirectory);

  if (!projectRootExists) {
    stdout.write(
      `The project root directory "${projectRootDirectory}" does not exist\n\n`
    );
    return;
  }

  if (!workspaceRootExists) {
    stdout.write(
      `The workspace root directory "${workspaceRootDirectory}" does not exist\n\n`
    );
    return;
  }

  // Remove the first 2 arguments that NodeJS provides.
  const args = process.argv.splice(2, process.argv.length);
  const command = args[0] as Command;

  switch (command) {
    case 'make':
      const organization = args[1];
      const projectName = args[2];

      const organizationDirectories = await getDirectoryNames(
        projectRootDirectory
      );
      const organizationExists = organizationDirectories.includes(organization);

      const logAvailableOrganizations = () => {
        stdout.write(`Available organizations:\n`);

        organizationDirectories.map((organizationDirectory) => {
          stdout.write(`  ${organizationDirectory}\n`);
        });
      };

      if (!organization) {
        stdout.write('Organization name is required\n\n');
        logAvailableOrganizations();
        return;
      }

      if (!organizationExists) {
        stdout.write(`The organization "${organization}" does not exist\n\n`);
        logAvailableOrganizations();
        return;
      }

      if (!projectName) {
        stdout.write(`Project name is required\n\n`);
        stdout.write(`Example:\n`);
        stdout.write(`  make ${organization} "tax returns"\n`);
        return;
      }

      const safeProjectName = snakify(projectName);
      const datePrefix = getDatePrefix();

      const projectDirectoryName = `${datePrefix}_${safeProjectName}`;
      const projectWorkspacePath = path.join(
        projectRootDirectory,
        organization,
        projectDirectoryName
      );
      const projectAlreadyExists = await doesFileExist(projectWorkspacePath);

      if (projectAlreadyExists) {
        stdout.write(`The project "${projectName}" already exists:\n`);
        stdout.write(`  ${projectWorkspacePath}\n\n`);

        stdout.write(
          `Choose a different name, different date or change the existing project\n\n`
        );
        stdout.write(`Example:\n`);
        stdout.write(`  make ${organization} "${safeProjectName}_2"\n`);
        stdout.write(
          `  make ${organization} "${safeProjectName}" --date 2021-01-01\n`
        );
        return;
      }

      await fs.mkdir(projectWorkspacePath);
      stdout.write(`✅ Created project: ${projectWorkspacePath}\n`);

      break;
    default:
      logUsage();
  }
}

main();
