# Odoo Dev Kit

A VS Code sidebar tool to **quickly run Odoo and manage multiple repositories from one place**.

## Features

### 🖥️ Server
Run and control your Odoo instance
- Configure Odoo addons, CLI options, and environment paths.
- Generate a ready-to-run Odoo command.
- Run / stop the server from the sidebar.
- Drop the current database and re-run the server in one click.
- Auto-detect a default database name from the first addon branch (optional).

### ⚙️ Config
Define everything needed to run Odoo.
- Add multiple addon paths with individual enable/disable toggles.
- Set Python venv and `odoo-bin` paths.
- Toggle CLI flags (dev mode, log level, workers, etc.) per group.

### 🌿 Git Control
Manage branches across all Odoo repositories together.

- Enter a branch name → click ✓ → checks out the branch if found, otherwise falls back to the base version (e.g. 16.0, master).
- Keeps a history of successful checkouts (grouped by version) for Re-checkouts
- Quick actions:
  * **Fetch** → fetch all repos
  * **Branch** → create branch in all repos
  * **Push** → push current branch
  * **Force** → force push (`-f`)

---

### Screenshots
| Config | Server | Git Control |
| --- | --- | --- |
| <img src="assets/images/config.png" alt="Config" width="240" /> | <img src="assets/images/server.png" alt="Server" width="240" /> | <img src="assets/images/git.png" alt="Git Control" width="240" /> |

## Library Usage
- **OWL**: used to build the sidebar UI.
- **Codicons** → used for icons in the UI (buttons, actions, indicators)

## License
MIT
