import { addCollection } from '@iconify/svelte'
import { iconCollections } from './iconBundle.js'

// Side-effect module: import this at the top level of an entrypoint's main.js,
// before anything mounts. @iconify/svelte resolves an icon synchronously once it
// is in the registry, so registering here is what stops icons from popping in
// (and reflowing their row) a frame or two after the UI paints.
for (const collection of iconCollections) {
  addCollection(collection)
}
