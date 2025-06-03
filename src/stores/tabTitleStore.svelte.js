import { writable } from 'svelte/store'

export const tabTitle = writable('')

export function getTabTitle() {
  let title
  tabTitle.subscribe((value) => {
    title = value
  })()
  return title
}

export function setTabTitle(newTitle) {
  tabTitle.set(newTitle)
}
