# Odoo Dev Kit - Changelog

All notable changes to the `odoo-dev-kit` extension are documented in this file.

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
