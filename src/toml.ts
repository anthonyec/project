interface TomlFile {
  name: string;
  workspaceDirectory?: string;
  createdAt?: Date;
  archived?: boolean;
}

export function getProjectTomlFile(options: TomlFile) {
  const file = [`name = "${options.name}"`];

  if (options.createdAt) {
    file.push(`created_at = ${options.createdAt.toISOString()}`);
  }

  if (options.workspaceDirectory) {
    file.push(`workspace = "${options.workspaceDirectory}"`);
  }

  file.push(`archived = ${options.archived ?? false}`);

  return file.join('\n');
}
