export function buildProjectCreationPrompt(userPrompt: string): string {
  return `Create a new web application based on this description:

${userPrompt}

## Requirements
1. Generate a complete, working project structure
2. Include all necessary files (package.json, config files, source files)
3. Use modern best practices
4. Make it visually appealing with good UX
5. Ensure it runs without errors

## Output Format
For each file, use:

\`\`\`file: path/to/file
<complete file contents>
\`\`\`

Start with package.json and config files, then source files.
Generate ALL files needed for the app to run successfully.

Begin now.`;
}
