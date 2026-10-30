#!/usr/bin/env node
/**
 * Build a publish-ready copy of this bundle under a public npm package name.
 *
 * The live plugin is installed from a local link under `@local/dsh-workbench`;
 * a registry package needs a name the publisher owns, and that name appears in
 * three places: the manifest, the bundle patch row, and the browser module id.
 * This script copies the runtime files, rewrites those three references, and
 * syntax-checks the result.
 *
 * Usage:
 *   node publish/prepare.mjs --name cc1396-dsh-workbench [--version 1.0.0] [--out publish/dist]
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const source = resolve(here, '..')
const LIVE_NAME = '@local/dsh-workbench'

function fail(message) {
  console.error(`prepare: ${message}`)
  process.exit(1)
}

const options = new Map()
for (let index = 2; index < process.argv.length; index += 2) {
  const flag = process.argv[index]
  const value = process.argv[index + 1]
  if (!flag.startsWith('--') || value === undefined) fail(`unexpected argument ${String(flag)}`)
  options.set(flag.slice(2), value)
}

const name = options.get('name')
const version = options.get('version') ?? '1.0.0'
if (name === undefined) fail('missing --name <public package name>, for example cc1396-dsh-workbench')
if (!/^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/u.test(name) || name.length > 214) {
  fail(`"${name}" is not a valid npm package name`)
}
if (!/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u.test(version)) {
  fail(`"${version}" is not an exact SemVer version`)
}
if (name === LIVE_NAME) fail(`choose a public name; ${LIVE_NAME} is the local link and cannot be published`)

const out = resolve(options.get('out') ?? join(here, 'dist'))
const files = ['index.js', 'client.js', 'cordis.patch.yml', 'README.md', 'icon.svg']
for (const file of files) if (!existsSync(join(source, file))) fail(`missing ${file} in ${source}`)

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
for (const file of files) cpSync(join(source, file), join(out, file))
cpSync(join(source, 'locale'), join(out, 'locale'), { recursive: true })

overwrite('client.js', LIVE_NAME, name)
overwrite('cordis.patch.yml', `'${LIVE_NAME}'`, `'${name}'`)

const manifest = JSON.parse(readFileSync(join(here, 'package.publish.json'), 'utf8'))
manifest.name = name
manifest.version = version
writeFileSync(join(out, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)

for (const file of ['index.js', 'client.js']) {
  const check = spawnSync(process.execPath, ['--check', join(out, file)], { encoding: 'utf8' })
  if (check.status !== 0) fail(`syntax error in ${file}:\n${check.stderr}`)
}

console.log(`prepared ${name}@${version} in ${out}`)
console.log('')
console.log('next:')
console.log(`  1. npm publish --access public   (run inside ${out})`)
console.log('  2. copy publish/index.example.json, then set name / version / publishTimestamp')
console.log('  3. host the index and its icon.svg over HTTPS, add the URL under Plugins → Discover')

function overwrite(file, from, to) {
  const path = join(out, file)
  const text = readFileSync(path, 'utf8')
  if (!text.includes(from)) fail(`${file} does not reference ${from}`)
  writeFileSync(path, text.split(from).join(to))
}