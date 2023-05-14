import * as fs from 'fs/promises';
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
