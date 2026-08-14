import { conversationRepository } from '@/lib/db/conversationRepository.js'
import { getSourceById } from '@/lib/db/conversationRepository.js'
import {
  exportConversationAsJson,
  exportConversationAsMarkdown,
  conversationExportFilename,
} from '@/services/exportImport/conversationExportService.js'
import { downloadBlob } from '@/services/exportImport/exportService.js'

let conversationList = $state([])
let selectedConversation = $state(null)
let selectedConversationId = $state(null)
let selectedMessages = $state([])
let selectedSources = $state([])

async function loadConversationDetails(conversation) {
  const messages = await conversationRepository.listMessagesByConversation(conversation.id)
  const sourceIds = [...new Set(messages.flatMap((message) => message.attachmentRefs || []))]
  const sources = (await Promise.all(sourceIds.map((id) => getSourceById(id)))).filter(Boolean)
  return { messages, sources, conversation }
}

/**
 * Loads the conversation list only — no per-conversation message/source fan-out.
 * Messages and sources are loaded lazily by selectConversation, so the merged
 * archive list stays cheap even though it now loads on both tabs.
 *
 * Does not auto-select: archiveStore drives initial selection across the
 * unified summary+chat list. It does refresh the details of an already
 * selected conversation, so rename/archive/delete refreshes stay correct.
 */
export async function loadConversationArchive() {
  conversationList = await conversationRepository.listConversations({ includeArchived: true })

  if (selectedConversationId) {
    const stillPresent = conversationList.find(
      (conversation) => conversation.id === selectedConversationId,
    )
    if (stillPresent) applySelection(await loadConversationDetails(stillPresent))
    else clearConversationSelection()
  }
  return conversationList
}

function applySelection(detail) {
  selectedConversation = detail.conversation
  selectedConversationId = detail.conversation.id
  selectedMessages = detail.messages
  selectedSources = detail.sources
}

export async function selectConversation(conversation) {
  applySelection(await loadConversationDetails(conversation))
  return selectedConversation
}

export function clearConversationSelection() {
  selectedConversation = null
  selectedConversationId = null
  selectedMessages = []
  selectedSources = []
}

export async function renameArchivedConversation(id, title) {
  const conversation = await conversationRepository.updateConversationMetadata(id, { title: String(title || '').trim() || 'New conversation' })
  await loadConversationArchive()
  return conversation
}

export async function setArchivedConversationState(id, archived) {
  const conversation = await conversationRepository.archiveConversation(id, archived)
  await loadConversationArchive()
  return conversation
}

export async function deleteArchivedConversation(id) {
  const conversation = await conversationRepository.softDeleteConversation(id)
  await loadConversationArchive()
  return conversation
}

export async function exportArchivedConversation(id, format) {
  const conversation = await conversationRepository.getConversation(id)
  const blob = format === 'markdown'
    ? await exportConversationAsMarkdown(id)
    : await exportConversationAsJson(id)
  const extension = format === 'markdown' ? 'md' : 'json'
  await downloadBlob(blob, conversationExportFilename(conversation?.title, extension), blob.type, `.${extension}`)
}

export async function resumeArchivedConversation(id) {
  await browser.runtime.sendMessage({ type: 'RESUME_CONVERSATION', conversationId: id })
}

export const conversationArchiveStore = {
  get conversationList() { return conversationList },
  get selectedConversation() { return selectedConversation },
  get selectedConversationId() { return selectedConversationId },
  get selectedMessages() { return selectedMessages },
  get selectedSources() { return selectedSources },
  loadConversationArchive,
  selectConversation,
  clearConversationSelection,
}
