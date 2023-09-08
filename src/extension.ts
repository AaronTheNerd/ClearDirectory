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

      // Get all files located within directory
      const files = getFilesInDir(dirContent);
      if (files.length === 0) {
        showError(getDirectoryName(dirUri));
        return;
      }

      // Confirm choice with user
      const warningResponse = await showWarning(
        getDirectoryName(dirUri),
        files.length
      );
      if (warningResponse === undefined) {
        return;
      }

      deleteFiles(dirUri, files);
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
    `There are no files to clear from directory '${dir}'.`
  );
}

function showWarning(
  dir: string,
  filesToBeDeleted: number
): Thenable<"Continue" | undefined> {
  return vscode.window.showWarningMessage(
    `Clearing directory '${dir}' would result in ${filesToBeDeleted} files being deleted.`,
    { modal: true },
    "Continue"
  );
}

function deleteFiles(dirUri: vscode.Uri, files: [string, vscode.FileType][]) {
  const fs = vscode.workspace.fs;
  files.forEach((file) => {
    const fileName = file[0];
    const fileUri = vscode.Uri.joinPath(dirUri, fileName);
    fs.delete(fileUri);
  });
}
