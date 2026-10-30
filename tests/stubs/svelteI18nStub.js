// Stand-in for svelte-i18n in component tests: renders each message's
// `default` (or the key) with `{name}` values filled in, so assertions read
// the English copy without loading locales. Mock it with
// `vi.mock('svelte-i18n', () => import('<relative>/stubs/svelteI18nStub.js'))`.
const store = (/** @type {string} */ key, /** @type {object|undefined} */ opts) => {
  let text = opts?.default || key
  if (opts?.values) {
    for (const [k, v] of Object.entries(opts.values)) {
      text = text.replace(`{${k}}`, v)
    }
  }
  return text
}
store.subscribe = (/** @type {Function} */ fn) => {
  fn(store)
  return () => {}
}

export { store as _, store as t, store as format }
