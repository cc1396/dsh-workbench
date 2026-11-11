/**
 * The Workbench bundle entry.
 *
 * The implementation lives in `src/`: `src/index.js` installs the routes, `src/host.js`
 * is the only place DSH is touched, and `src/snapshot.js` is the single shape the panel
 * renders. This file stays a re-export so the package entry never churns.
 */

export { apply, inject, ROUTE_PATH, SCHEMA } from './src/index.js'
