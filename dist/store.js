/**
 * The Workbench's small JSON stores under `$DSH_HOME/workbench/`.
 *
 * Every store is an object with a `version`, a list of entries and an `updatedAt`
 * stamp; a read tolerates a missing, unparsable or older file by starting empty, so
 * a downgrade or a partial write can cost a cache, never a crash. Writes are
 * serialized per file and atomic (write a sibling, then rename), and a cleanup can
 * drop every entry that mentions a Session the Host no longer has.
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

const VERSION = 1

/** The Workbench's private directory. */
export function workbenchDir(home = process.env.DSH_HOME) {
  return join(typeof home === 'string' && home !== '' ? home : join(homedir(), '.dsh'), 'workbench')
}

/**
 * Open one JSON store.
 *
 * @param name - the file name inside the Workbench directory.
 * @param empty - the value a missing or unreadable store starts from.
 * @returns `{ read(), update(fn) }`; `update` mutates the store under a queue and saves.
 */
export function openStore(name, empty) {
  let loaded
  /** Serializes writes; a resolved promise costs no extra turn on the first write. */
  let queue = Promise.resolve()
  const path = () => join(workbenchDir(), name)
  const read = async () => {
    if (loaded !== undefined) return loaded
    try {
      const parsed = JSON.parse(await readFile(path(), 'utf8'))
      loaded = parsed !== null && typeof parsed === 'object' ? parsed : structuredClone(empty)
    } catch {
      loaded = structuredClone(empty)
    }
    if (loaded.version !== VERSION) loaded = { ...structuredClone(empty), ...loaded, version: VERSION }
    return loaded
  }
  const update = (mutate) => {
    queue = queue.then(async () => {
      const store = await read()
      const result = await mutate(store)
      store.updatedAt = Date.now()
      await save(path(), store)
      return result
    })
    return queue
  }
  return { read, update, path }
}

async function save(path, store) {
  try {
    await mkdir(join(path, '..'), { recursive: true })
    const temporary = `${path}.${process.pid}.tmp`
    await writeFile(temporary, `${JSON.stringify(store, null, 2)}\n`, 'utf8')
    await rename(temporary, path)
  } catch {
    // A read-only home must not break the panel: the in-memory value still answers.
  }
}

/** Empty shapes of the two stores the Workbench adds for search and progress. */
export const TASKS_VERSION = VERSION
export function emptyTasks() {
  return { version: VERSION, updatedAt: 0, tasks: [] }
}

export function emptyProgress() {
  return { version: VERSION, updatedAt: 0, projects: {} }
}