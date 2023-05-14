#! /usr/bin/env node
import * as fs from 'fs/promises';
import * as path from 'path';
import { stdout } from 'process';
import { exec } from 'child_process';

import { doesFileExist, getDirectoryNames } from './fs';
import { getProjectTomlFile } from './toml';
import { textBlock } from './text';
import { stats } from './stats';
import { find } from './find';

enum Command {
  Make = 'make',
  Find = 'find',
  Open = 'open',
  Stats = 'stats',
}

interface MakeOptions {
  workspace: boolean;
  noProjectFile: boolean;
}

function logUsage() {
  stdout.write('Usage: project <command> [options]');

  stdout.write('\n\n');

  stdout.write(textBlock`
    Options:
      --workspace, -w                Create a workspace with the same name
      --no-project-file, -n          Skip creating a project file
      --type, -t                     Specify the file types a project should have
  `);

  stdout.write('\n');

  stdout.write(textBlock`
    Commands:
      make <org> <name> [options]    Make a new project
      find <query> [options]         Search for a project
      open <org> <query>             Opens an organization's directory or project match in Finder
      stats <org>                    Show stats about all projects
  `);
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

  const rootProjectsDirectory = process.env['PROJECT_ROOT_DIRECTORY'];
  const rootWorkspaceDirectory = process.env['WORKSPACE_ROOT_DIRECTORY'];
  const projectRootExists = await doesFileExist(rootProjectsDirectory);
  const workspaceRootExists = await doesFileExist(rootProjectsDirectory);

  if (!projectRootExists) {
    stdout.write(
      `The project root directory "${rootProjectsDirectory}" does not exist\n\n`
    );
    return;
  }

  if (!workspaceRootExists) {
    stdout.write(
      `The workspace root directory "${rootWorkspaceDirectory}" does not exist\n\n`
    );
    return;
  }

  // Remove the first 2 arguments that NodeJS provides.
  const args = process.argv.splice(2, process.argv.length);
  const command = args[0] as Command;

  switch (command) {
    case 'make': {
      const [_, organization, projectName, ...otherArguments] = args;

      const options: MakeOptions = {
        workspace:
          otherArguments.includes('--workspace') ||
          otherArguments.includes('-w'),
        noProjectFile:
          otherArguments.includes('--no-project-file') ||
          otherArguments.includes('-n')
      };

      const organizationDirectories = await getDirectoryNames(
        rootProjectsDirectory
      );
      const organizationExists = organizationDirectories.includes(organization);

      const logAvailableOrganizations = () => {
        stdout.write(`Available organizations:\n`);

        organizationDirectories.map((organizationDirectory) => {
          stdout.write(`  ${organizationDirectory}\n`);
        });
      };

      if (!organization) {
        const examplePath = path.join(
          rootProjectsDirectory,
          'my_cool_company',
          `${getDatePrefix()}_tax_returns`
        );

        stdout.write(`Organization name is required\n\n`);
        stdout.write(`Example:\n`);
        stdout.write(
          `  make my_cool_company "tax returns"    # Creates a project at ${examplePath}\n`
        );

        stdout.write('\n');

        logAvailableOrganizations();
        return;
      }

      if (!organizationExists) {
        stdout.write(`The organization "${organization}" does not exist\n\n`);
        logAvailableOrganizations();
        return;
      }

      if (!projectName) {
        const examplePath = path.join(
          rootProjectsDirectory,
          organization,
          `${getDatePrefix()}_tax_returns`
        );

        stdout.write(`Project name is required\n\n`);
        stdout.write(`Example:\n`);
        stdout.write(
          `  make ${organization} "tax returns"    # Creates a project at ${examplePath}\n`
        );
        return;
      }

      const safeProjectName = snakify(projectName);
      const datePrefix = getDatePrefix();

      const projectDirectoryName = `${datePrefix}_${safeProjectName}`;
      const projectPath = path.join(
        rootProjectsDirectory,
        organization,
        projectDirectoryName
      );
      const projectAlreadyExists = await doesFileExist(projectPath);

      if (projectAlreadyExists) {
        stdout.write(`The project "${projectName}" already exists:\n`);
        stdout.write(`  ${projectPath}\n\n`);

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

      await fs.mkdir(projectPath);

      if (!options.noProjectFile) {
        const projectFile = getProjectTomlFile({
          name: projectName,
          createdAt: new Date()
        });

        await fs.writeFile(
          path.join(projectPath, 'project.toml'),
          projectFile,
          'utf8'
        );
      }

      stdout.write(`✅ Created project: ${projectPath}\n`);

      if (!options.workspace) {
        return;
      }

      const workspaceOrganizationDirectories = await getDirectoryNames(
        rootWorkspaceDirectory
      );
      const workspaceOrganizationExists =
        workspaceOrganizationDirectories.includes(organization);

      if (!workspaceOrganizationExists) {
        stdout.write(
          `The workspace organization "${organization}" does not exist\n\n`
        );
        return;
      }

      const workspacePath = path.join(
        rootWorkspaceDirectory,
        organization,
        projectDirectoryName
      );
      const workspaceAlreadyExists = await doesFileExist(workspacePath);

      if (workspaceAlreadyExists) {
        stdout.write(`The workspace "${projectName}" already exists:\n`);
        stdout.write(`  ${workspacePath}\n\n`);
        return;
      }

      await fs.mkdir(workspacePath);

      stdout.write(`✅ Created workspace: ${workspacePath}\n`);

      if (!options.noProjectFile) {
        const projectFile = getProjectTomlFile({
          name: projectName,
          workspaceDirectory: workspacePath,
          createdAt: new Date()
        });

        await fs.writeFile(
          path.join(projectPath, 'project.toml'),
          projectFile,
          'utf8'
        );
      }

      break;
    }
    case 'stats': {
      const organization = args[1];
      await stats(rootProjectsDirectory, organization);
      break;
    }

    case 'find': {
      const [_, query, ...otherArguments] = args;

      const options = {
        // TODO(anthony): This only works with one argument in a fixed order.
        // Update so that it's dynamic and share functionality between commands.
        type:
          otherArguments[0] === '--type' || otherArguments[0] === '-t'
            ? otherArguments[1]
            : undefined
      };

      await find(rootProjectsDirectory, query, options);
      break;
    }

    case 'open': {
      const [_, organization, query] = args;

      if (!organization) {
        stdout.write(`Organization name is required\n\n`);
        stdout.write(textBlock`
          Example:
            project open my_cool_company        # Opens the organization's directory
            project open my_cool_company tax    # Opens the first matching project directory where the name includes "tax"
        `)
        return;
      }

      const organizationDirectoryNames = await getDirectoryNames(
        rootProjectsDirectory
      );
      const organizationExists = organizationDirectoryNames.includes(organization);

      if (!organizationExists) {
        stdout.write(`The organization "${organization}" does not exist\n\n`);
        return;
      }

      if (!query) {
        exec(`open ${path.join(rootProjectsDirectory, organization)}`);
        return
      }

      const organizationDirectoryPath = path.join(
        rootProjectsDirectory,
        organization
      );

      const projectDirectoryNames = await getDirectoryNames(
        organizationDirectoryPath
      );

      const match = projectDirectoryNames.find((projectDirectoryName) => {
        return projectDirectoryName.toLowerCase().includes(query.toLowerCase());
      });

      if (!match) {
        stdout.write(`No project found with a name matching "${query}"\n\n`);
        return;
      }

      exec(`open ${path.join(rootProjectsDirectory, organization, match)}`);
      break
    }

    default:
      logUsage();
  }
}

main();
