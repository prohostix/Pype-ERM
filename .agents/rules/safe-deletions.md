# Safe Data Deletion Rule

## Scope
This rule applies whenever the agent writes or executes a script, query, or command intended to permanently delete data from a database or file system.

## Invariants
1. **Mandatory Backup**: Before executing any code or command that deletes data (e.g., `deleteMany`, `DROP`, `rm`), you MUST first fetch the target data and dump it to a local file in the workspace (e.g., a `.json` backup file).
2. **User Notification**: Inform the user where the backup was saved so they know how to easily retrieve and restore the data if the deletion needs to be reverted.
