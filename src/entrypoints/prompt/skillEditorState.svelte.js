// Shared draft state for the Skills tab. SkillList (sidebar) and SkillEditor
// (main column) both read it, so it lives here instead of in either component.
// Call createSkillEditorState() once from App.svelte during component init:
// it registers an $effect that must belong to that component.
import {
  skillService,
  createUserSkill,
} from '@/lib/chat/skills/skillService.js'
import { settings } from '@/stores/settingsStore.svelte.js'

export function createSkillEditorState() {
  let selectedId = $state(null)
  let creating = $state(false)
  let draft = $state(null)
  let baseline = $state(null)
  let errors = $state([])

  const skills = $derived(skillService.listSkills(settings))

  const isModified = $derived(
    !!baseline &&
      !!draft &&
      (draft.name !== baseline.name ||
        draft.instruction !== baseline.instruction ||
        draft.pinned !== baseline.pinned),
  )

  function loadSkill(skill) {
    if (!skill) {
      draft = null
      baseline = null
      errors = []
      return
    }
    draft = { ...skill }
    baseline = { ...skill }
    errors = []
  }

  // Sync the editor with the selected skill (skip while composing a new one).
  $effect(() => {
    if (creating) return
    const skill = skills.find((s) => s.id === selectedId) || skills[0] || null
    if (skill) {
      if (!selectedId) selectedId = skill.id
      if (!draft || draft.id !== skill.id) loadSkill(skill)
    } else {
      loadSkill(null)
    }
  })

  function selectSkill(id) {
    creating = false
    selectedId = id
  }

  function newSkill() {
    creating = true
    selectedId = null
    const blank = createUserSkill({
      name: '',
      instruction: '',
    })
    draft = { ...blank }
    baseline = { ...blank }
    errors = []
  }

  async function saveSkill() {
    const result = await skillService.saveSkill(draft, settings)
    errors = result?.errors || []
    if (result?.valid) {
      creating = false
      selectedId = result.value.id
      loadSkill(result.value)
    }
  }

  function discardChanges() {
    if (baseline) loadSkill({ ...baseline })
  }

  async function deleteSkill() {
    if (!draft) return
    await skillService.deleteSkill(draft.id, settings)
    creating = false
    selectedId = skillService.listSkills(settings)[0]?.id || null
    draft = null
  }

  async function resetBuiltIn() {
    if (!draft) return
    await skillService.resetBuiltIn(draft.id, settings)
    creating = false
    const fresh = skillService
      .listSkills(settings)
      .find((s) => s.id === draft.id)
    loadSkill(fresh || null)
  }

  return {
    get skills() {
      return skills
    },
    get selectedId() {
      return selectedId
    },
    get draft() {
      return draft
    },
    get errors() {
      return errors
    },
    get isModified() {
      return isModified
    },
    selectSkill,
    newSkill,
    saveSkill,
    discardChanges,
    deleteSkill,
    resetBuiltIn,
  }
}
