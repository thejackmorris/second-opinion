# Second Opinion
A simple plugin that makes it easy to use Claude in your notes via the Anthropic API.

## Requirements
Anthropic API key must be added in plugin settings.

## Current Commands
### quick-question
Runs from the command palette or inline via `/` (if enabled). Takes prompt via Obsidian's simple modal interface and submits it to Claude via Anthropic API. The prompt and response are then added in the active file.

## Planned Commands
### quick-conversation
Creates a new .md file that approximates a conversation with Claude by appending new prompts to the file before submission.

### summarize
Takes one or more files in the Obsidian vault and returns a summary of them.

### opine
Takes one or more files in the Obsidian vault and returns an opinion on them.

