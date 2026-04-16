export function buildErrorRepairPrompt(errorMessage: string, relevantFiles: Array<{ path: string; content: string }>): string {
  const filesContext = relevantFiles
    .map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
    .join("\n\n");

  return `The application has the following error(s):

\`\`\`
${errorMessage}
\`\`\`

## Relevant Files
${filesContext}

## Instructions
1. Analyze the error and identify the root cause
2. Show the fix with minimal changes
3. Use this format (paths must be relative to project root, never absolute):

\`\`\`file: path/to/file
<complete updated file contents>
\`\`\`

Only show files that need to change. Preserve everything else.`;
}
