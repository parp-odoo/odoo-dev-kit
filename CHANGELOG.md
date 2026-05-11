# Odoo Dev Kit - Changelog

## [0.1.3]

### Runtime & Execution

* Added explicit service registration before sidebar service initialization to avoid missing handler registration at runtime.
* Refactored sidebar command dispatch to use service handler maps directly.
* Added automatic port cleanup before starting the Odoo server or test runner when a port is configured.
* Updated server and test execution to activate the configured Python virtual environment before running Odoo commands.
* Improved virtualenv path handling so the configuration can accept a venv root, Python executable path, or activation script path.

## [0.1.0]

### UI & Experience

* Added a sidebar-driven Odoo workflow with dedicated `Server`, `Git Control`, and configuration views.
* Added persistent webview state restoration for:

  * Server settings
  * Git history
  * Repository paths
  * Commit message drafts
* Added automatic release notes preview when the extension version changes.
* Added new theme photos and updated extension branding visuals.

### Server Management

* Added server configuration support for:

  * Python virtual environments
  * `odoo-bin`
  * Addons paths
  * Grouped CLI options
* Added automatic Odoo root detection from `odoo-bin`, including auto-population of the `community` addons path.
* Added Odoo run command generation from sidebar settings, with clipboard copy support.
* Added integrated Odoo server execution in VS Code terminals with live running/stopped status feedback.

### Database & Testing

* Added automatic database name resolution based on the first configured addon branch.
* Added a database drop action from the sidebar using the resolved or configured database name.
* Added test command generation and test execution directly from the sidebar.

### Git Integration

* Added automatic registration of the main Odoo repository in Git settings with default `odoo` and `odoo-dev` remotes.
* Added Git operations support, including:

  * Current branch detection
  * Branch checkout
  * Remote update/fetch
  * Branch creation
  * Push and force-push
* Added Git history tracking for created and checked-out branches, including cleanup support.
* Added commit and amend actions across configured repositories.

### AI Features

* Added GitHub Copilot-powered commit message enhancement when Copilot Chat is available.
