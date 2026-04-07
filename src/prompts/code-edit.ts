export function buildCodeEditPrompt(
  userMessage: string,
  currentFiles: Array<{ path: string; content: string }>
): string {
  const filesContext = currentFiles
    .map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
    .join("\n\n");

  return `The user wants to make the following changes:

${userMessage}

## Current Project Files
${filesContext}

## Instructions
1. Plan the changes briefly
2. Show ONLY the files that need to be modified (not unchanged files)
3. For each file, show the COMPLETE updated contents
4. Use this format for each file:

\`\`\`file: path/to/file
<complete updated file contents>
\`\`\`

For new files, use:
\`\`\`file: path/to/new-file
<file contents>
\`\`\`

For deletions, use:
\`\`\`delete: path/to/file
\`\`\`

Make minimal changes. Preserve existing code that doesn't need to change.`;
}
