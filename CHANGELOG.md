# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## 1.0.0 (2025-07-29)

## [1.0.1]  2025-07-29

### Added
- Installed and configured postcss, postcss-cli, and utoprefixer as dev dependencies.
- Created postcss.config.cjs to support CommonJS in ES module project.
- Added 	ailwind.prefixed.css build target using PostCSS.
- Updated package.json scripts:
  - Added "build:css" to compile Tailwind CSS with PostCSS.
  - Updated "build" script to run both 
pm install and CSS build step.

### Fixed
- Resolved "require is not defined" issue by renaming postcss.config.js to postcss.config.cjs.
