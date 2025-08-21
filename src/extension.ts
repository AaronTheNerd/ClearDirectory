// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "cleardirectory.clear",
    async (dirUri) => {

      // Check for case that the command is being execute by command prompt or keybind
      if (!dirUri) {
        await vscode.commands.executeCommand("copyFilePath");
        dirUri = await vscode.env.clipboard.readText();
        dirUri = vscode.Uri.file(dirUri);
      }

      const fs = vscode.workspace.fs;
      const stat = await fs.stat(dirUri);
      
      // Verify that the resource is a directory
      if (stat.type !== vscode.FileType.Directory) {
        return;
      }
      const dirContent = await fs.readDirectory(dirUri);

      const configs = vscode.workspace.getConfiguration("cleardirectory");
      const deleteSubdirectories = configs.get("deleteSubdirectories");
      let topLevelDirectories: [string, vscode.FileType][] = [];
      if (deleteSubdirectories) {
        topLevelDirectories = getDirectoriesInDir(dirContent);
      }

      // Get all files located within directory
      const topLevelFiles = getFilesInDir(dirContent);
      const topLevelResources = [...topLevelFiles, ...topLevelDirectories];
      if (topLevelResources.length === 0) {
        showError(getDirectoryName(dirUri));
        return;
      }

      // Confirm choice with user
      const warningResponse = await showWarning(
        getDirectoryName(dirUri),
        topLevelFiles.length,
        topLevelDirectories.length
      );
      if (warningResponse === undefined) {
        return;
      }

      deleteFiles(dirUri, topLevelResources);
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

function getDirectoryName(uri: vscode.Uri): string {
  const path = uri.path;
  const index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")) + 1;
  return path.slice(index);
}

function getFilesInDir(
  dirContent: [string, vscode.FileType][]
): [string, vscode.FileType][] {
  return dirContent.filter((fileOrDir) => {
    const fileType = fileOrDir[1];
    return fileType === vscode.FileType.File;
  });
}

function showError(dir: string) {
  vscode.window.showErrorMessage(
    `There is nothing to clear from directory '${dir}'.`
  );
}

function getDirectoriesInDir(
  dirContent: [string, vscode.FileType][]
): [string, vscode.FileType][] {
  return dirContent.filter((fileOrDir) => {
    const fileType = fileOrDir[1];
    return fileType === vscode.FileType.Directory;
  });
}

function showWarning(
  dir: string,
  filesToBeDeleted: number,
  foldersToBeDeleted: number
): Thenable<"Continue" | undefined> {
  const infoString = getInfoString(filesToBeDeleted, foldersToBeDeleted);
  const message = `Clearing directory '${dir}' would result in ${infoString} being deleted`;
  return vscode.window.showWarningMessage(
    message,
    { modal: true },
    "Continue"
  );
}

function getInfoString(filesToBeDeleted: number, foldersToBeDeleted: number) {
  let infoStrings = [];
  if (filesToBeDeleted > 0) {
    let fileString = `${filesToBeDeleted} file`;
    if (filesToBeDeleted > 1) {
      fileString += "s";
    }
    infoStrings.push(fileString);
  }
  if (foldersToBeDeleted > 0) {
    let folderString = `${foldersToBeDeleted} folder`;
    if (foldersToBeDeleted > 1) {
      folderString += "s";
    }
    infoStrings.push(folderString);
  }
  return infoStrings.join(" and ");
}

function deleteFiles(dirUri: vscode.Uri, resources: [string, vscode.FileType][]) {
  const fs = vscode.workspace.fs;
  resources.forEach((resource) => {
    const resourceName = resource[0];
    const resourceUri = vscode.Uri.joinPath(dirUri, resourceName);
    fs.delete(resourceUri, { recursive: true });
  });
}
