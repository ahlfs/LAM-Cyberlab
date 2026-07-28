---
name: second-brain-sync
description: Use this skill whenever the user asks to save, sync, or learn a document or image to their Second Brain.
---

# Second Brain Sync Skill

Whenever the user asks you to "save to second brain", "pelajari materi ini", "sync ke second brain", or anything similar regarding an attached image, text, or code snippet, you MUST follow these exact steps:

1. **Extract Information**: Read the user's message and any attached images (using your vision capabilities). Extract all the important text, context, and information.
2. **Determine Vault Directory**: Read the `/home/ahlfs/lam-cyberlab/.env` file to find `OBSIDIAN_VAULT_DIR`. If not set, default to `/home/ahlfs/obsidian/memo`.
3. **Write to Notes Directory**: Use your `file` or `write_to_file` tool to write this extracted information as a markdown file into the Second Brain's extracted docs directory:
   `<OBSIDIAN_VAULT_DIR>/03-Notes/Extracted-Docs/<descriptive_name>.md`
4. **Run Sync Script**: Use your `terminal` or `run_command` tool to execute the Second Brain sync script so the new note is converted into the Wiki.
   Command: `/home/ahlfs/lam-cyberlab/scripts/sync-second-brain.sh`
5. **Report Back**: Tell the user that the knowledge has been successfully synthesized into their Second Brain.
