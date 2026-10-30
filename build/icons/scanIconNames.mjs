import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Iconify collections this project is allowed to pull from.
 *
 * Doubles as a false-positive filter: `src/` is full of quoted strings shaped
 * like `prefix:name` that are not icons at all (Tailwind variants such as
 * `dark:bg-black`, message types, i18n keys). Only these prefixes are treated
 * as icon references.
 *
 * Adding a collection is a deliberate decision — see the throw in
 * `scanIconNames()` for how an unknown prefix surfaces.
 */
export const KNOWN_PREFIXES = new Set([
  'bxl',
  'carbon',
  'heroicons',
  'heroicons-outline',
  'heroicons-solid',
  'hugeicons',
  'line-md',
  'logos',
  'lucide',
  'mdi',
  'mingcute',
  'octicon',
  'simple-icons',
  'solar',
  'svg-spinners',
  'tabler',
])

const SCANNED_EXTENSIONS = new Set(['.svelte', '.js'])
const SKIPPED_DIRS = new Set(['node_modules', '.wxt', '.output'])

/**
 * The generated bundle must never be scanned. It lists every icon it contains
 * in `iconNames`, so scanning it would make the set self-sustaining and no icon
 * could ever be pruned once added.
 */
const SKIPPED_FILES = new Set(['lib/icons/iconBundle.js'])

/** Any quoted `prefix:name` literal. */
const QUOTED_PAIR = /['"]([a-z0-9-]+:[a-z0-9-]+)['"]/g

/** An `icon` prop on an `<Icon …>` tag, used only to detect unknown prefixes. */
const ICON_PROP = /\bicon\s*=\s*['"]([a-z0-9-]+):([a-z0-9-]+)['"]/g

async function collectFiles(dir, out) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIPPED_DIRS.has(entry.name)) continue
      await collectFiles(full, out)
    } else if (SCANNED_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(full)
    }
  }
  return out
}

/**
 * Scan a source tree for every Iconify icon name it references.
 *
 * Scans `.js` as well as `.svelte` on purpose: several call sites bind the
 * icon name dynamically (`providerRegistry.js` `iconifyIcon:` fields,
 * `actionConstants.js` `icon:` fields, `iconForSourceKind()` returns), but the
 * literal always lives somewhere under `src/`.
 *
 * @param {string} srcDir
 * @returns {Promise<string[]>} sorted, unique `prefix:name` strings
 */
export async function scanIconNames(srcDir) {
  const allFiles = await collectFiles(srcDir, [])
  const files = allFiles.filter(
    (file) => !SKIPPED_FILES.has(path.relative(srcDir, file).split(path.sep).join('/'))
  )
  const names = new Set()
  const unknown = new Map() // prefix -> Set<file>

  for (const file of files) {
    const source = await readFile(file, 'utf8')

    for (const match of source.matchAll(QUOTED_PAIR)) {
      const name = match[1]
      if (KNOWN_PREFIXES.has(name.slice(0, name.indexOf(':')))) names.add(name)
    }

    // An explicit `<Icon icon="…">` with an unrecognised prefix is a real
    // mistake (typo, or a collection nobody opted into) — never silence it.
    for (const match of source.matchAll(ICON_PROP)) {
      const prefix = match[1]
      if (KNOWN_PREFIXES.has(prefix)) continue
      if (!unknown.has(prefix)) unknown.set(prefix, new Set())
      unknown.get(prefix).add(path.relative(srcDir, file))
    }
  }

  if (unknown.size > 0) {
    const detail = [...unknown]
      .map(([prefix, where]) => `  ${prefix}  (${[...where].join(', ')})`)
      .join('\n')
    throw new Error(
      `Unknown Iconify collection(s) referenced by an <Icon icon="…"> prop:\n${detail}\n\n` +
        `Add the prefix to KNOWN_PREFIXES in build/icons/scanIconNames.mjs if it is intentional, ` +
        `otherwise fix the typo.`
    )
  }

  return [...names].sort()
}
