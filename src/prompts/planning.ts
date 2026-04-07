export function buildPlanningPrompt(userMessage: string, projectFiles: string[]): string {
  return `The user wants: ${userMessage}

## Current Project Structure
${projectFiles.join("\n")}

## Task
Create a concise plan for implementing the user's request.

## Output Format
1. **Summary**: One sentence describing what will be built
2. **Steps**: Numbered list of steps (max 5)
3. **Files**: List of files that will be created or modified

Keep it brief. Do NOT write any code yet.`;
}
