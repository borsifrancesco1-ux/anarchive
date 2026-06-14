// JSDoc type definitions for Anarchive core models.
// Import with: /** @type {import('./types').Clip} */ or use @typedef refs below.

/**
 * @typedef {Object} Clip
 * @property {string} id
 * @property {string} text
 * @property {'text'|'url'|'code'|'image'} kind
 * @property {string} [app]      - Source application name
 * @property {number} at         - Unix ms timestamp
 * @property {boolean} pinned
 * @property {boolean} [locked]
 * @property {string} [meta]     - Display metadata (e.g. "38 chars")
 */

/**
 * @typedef {Object} VaultFile
 * @property {string} id
 * @property {string} name
 * @property {string} ext        - Uppercase extension (e.g. "PDF")
 * @property {'document'|'image'|'audio'|'video'|'app'|'file'} kind
 * @property {string} size       - Human-readable size
 * @property {number} at         - Unix ms timestamp
 * @property {string} [path]     - Absolute path on disk (only in Electron)
 * @property {string} [srcPath]  - Original source path before copy into vault
 * @property {string} [color]    - Dominant colour (images, for thumbnail bg)
 * @property {boolean} [locked]
 * @property {string[]} [tags]
 * @property {string} [category]
 * @property {string} [ocrText]
 */

/**
 * @typedef {Object} Project
 * @property {string} id
 * @property {string} name
 * @property {string} emoji
 * @property {number} at         - Unix ms creation timestamp
 */

/**
 * @typedef {Object} Snippet
 * @property {string} id
 * @property {string} title
 * @property {string} text
 * @property {'text'|'code'|'prompt'} kind
 * @property {number} at
 * @property {boolean} [pinned]
 * @property {boolean} [locked]
 * @property {string} [sectionId]
 */

/**
 * @typedef {Object} Workspace
 * @property {string} id
 * @property {'clipboard'|'drop'|'snippets'} tab
 * @property {'all'|'pinned'|'url'|'code'|'text'|'image'} filter
 * @property {'all'|'document'|'image'|'audio'|'video'|'app'} fileFilter
 * @property {string} query
 * @property {string|null} activeProject
 * @property {string|null} openedFile
 * @property {string|null} tagFilter
 * @property {Array<{view: string, activeProject: string|null, openedFile: string|null}>} history
 */

export {};
