import * as fs from 'fs/promises';
import * as path from 'path';
import { constants } from 'fs';

export async function getDirectoryNames(
  directoryPath: string
): Promise<string[]> {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !entry.name.startsWith('.'))
    .map((entry) => entry.name);
}

export async function doesFileExist(filePath: string) {
  try {
    await fs.access(filePath, constants.F_OK);
    return true;
  } catch (error) {
    if (error instanceof Error) {
      // TODO: Fix type error.
      // @ts-ignore
      if (error.code === 'ENOENT') {
        return false;
      }

      throw new Error(error.message);
    }
  }
}

const IGNORED_FILES = ['.DS_Store'];

interface File {
  name: string;
  path: string;
  isDirectory: boolean;
  isEmpty: boolean;
}

export async function scanDirectory(
  targetDirectory: string,
  ignorePathsAndDirectories: string[] = [],
  callback?: (file: File) => Promise<void>
): Promise<File[]> {
  // Remove `./` from ignored paths.
  const normalizedIgnorePathsAndDirectories = ignorePathsAndDirectories.map(
    path.normalize
  );

  async function scan(currentTargetDirectory: string) {
    const files: File[] = [];
    const entries = await fs.readdir(currentTargetDirectory, {
      withFileTypes: true
    });

    for await (const entry of entries) {
      const entryPath = path.join(currentTargetDirectory, entry.name);
      const isIgnored = normalizedIgnorePathsAndDirectories.find(
        (pathOrDirectory) => pathOrDirectory.startsWith(entryPath)
      );

      if (isIgnored) {
        continue;
      }

      if (IGNORED_FILES.includes(entry.name)) {
        continue;
      }

      if (entry.isDirectory()) {
        const subDirectoryFiles = await scan(entryPath);
        files.push(...subDirectoryFiles);

        const file = {
          name: entry.name,
          path: entryPath,
          isDirectory: true,
          isEmpty: subDirectoryFiles.length === 0
        };

        files.push(file);
        callback && (await callback(file));
      } else {
        const file = {
          name: entry.name,
          path: entryPath,
          isDirectory: false,
          isEmpty: false
        };

        files.push(file);
        callback && (await callback(file));
      }
    }

    return files;
  }

  return await scan(targetDirectory);
}
