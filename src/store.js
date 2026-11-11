/**
 * Small JSON stores under `$DSH_HOME/workbench/`.
 *
 * A store tolerates a missing, unparsable or older file by starting empty, so a
 * downgrade or a partial write costs a cache and never a crash. Writes are serialized
 * per file and atomic (write a sibling, then rename); nothing here throws into a route.
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

const VERSION = 1

/** The plugin's private directory. */
export function workbenchDir(home = process.env.DSH_HOME) {
  return join(typeof home === 'string' && home !== '' ? home : join(homedir(), '.dsh'), 'workbench')
}

/**
 * Open one JSON store.
 *
 * @param name - file name inside the workbench directory.
 * @param empty - the value a missing or unreadable file starts from.
 * @returns `{ read(), update(fn), path() }`.
 */
export function openStore(name, empty) {
  let loaded
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
    const job = queue.then(async () => {
      const state = await read()
      const result = await mutate(state)
      state.updatedAt = Date.now()
      await save(path(), state)
      return result
    })
    queue = job.catch(() => {})
    return job
  }
  return { read, update, path }
}

async function save(path, state) {
  try {
    await mkdir(join(path, '..'), { recursive: true })
    const temporary = `${path}.${process.pid}.tmp`
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
    await rename(temporary, path)
  } catch {
    // A read-only home must not break the panel: the in-memory value still answers.
  }
}

/** Empty shapes of the stores this plugin keeps. */
export function emptyTasks() {
  return { version: VERSION, updatedAt: 0, tasks: [] }
}

export function emptyAlerts() {
  return { version: VERSION, updatedAt: 0, entries: {} }
}

export function emptyProgress() {
  return { version: VERSION, updatedAt: 0, projects: {} }
}
