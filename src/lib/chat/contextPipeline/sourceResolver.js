import { isStubSource } from '../../db/conversationSyncMerge.js'

/**
 * @param {string | object} ref
 * @param {'conversation' | 'attachment'} placement
 */
function normalizeRef(ref, placement) {
  if (typeof ref === 'string') {
    return { sourceId: ref, placement, isActive: false }
  }

  const sourceId = ref?.sourceId || ref?.id || null
  return {
    ...ref,
    sourceId,
    placement,
    isActive: Boolean(ref?.isActive || ref?.kind === 'active' || ref?.type === 'active'),
  }
}

/**
 * Resolve immutable source snapshots through injected dependencies only.
 * Browser capture belongs to a caller-provided function, keeping this module
 * deterministic and usable in Node tests.
 * @param {object} options
 * @param {Array<string | object>} [options.conversationSourceRefs]
 * @param {Array<string | object>} [options.newAttachmentRefs]
 * @param {{getSourceById?: (id: string) => Promise<object | undefined>}} options.repository
 * @param {(ref: object) => Promise<object | undefined>} [options.captureSource]
 */
export async function resolveSources({
  conversationSourceRefs = [],
  newAttachmentRefs = [],
  repository,
  captureSource,
}) {
  if (!repository?.getSourceById) {
    throw new Error('sourceResolver requires repository.getSourceById')
  }

  const warnings = []
  const unresolvedRefs = []

  async function resolveRef(ref, placement) {
    const normalizedRef = normalizeRef(ref, placement)
    let source = normalizedRef.sourceId
      ? await repository.getSourceById(normalizedRef.sourceId)
      : undefined

    // A stub has metadata only (synced without content) and not yet been
    // re-captured on this device. Treat it as missing so an empty source never
    // reaches the prompt.
    if (source && isStubSource(source)) source = undefined

    if (!source && normalizedRef.isActive && captureSource) {
      source = await captureSource(normalizedRef)
    }

    if (!source) {
      unresolvedRefs.push(normalizedRef)
      warnings.push({
        code: 'source_unresolved',
        params: {
          sourceId: normalizedRef.sourceId || null,
          isActive: normalizedRef.isActive,
        },
      })
      return null
    }

    const capturedAt = source.capturedAt || null
    return {
      ...source,
      sourceId: source.id || normalizedRef.sourceId,
      placement,
      isActive: normalizedRef.isActive,
      provenance: {
        sourceId: source.id || normalizedRef.sourceId,
        sourceKey: source.sourceKey || null,
        normalizedUrl: source.normalizedUrl || null,
        capturedAt,
        ageMs: capturedAt ? Math.max(0, Date.now() - new Date(capturedAt).getTime()) : null,
      },
      rawContent: source.rawContent || source.content || null,
      condensedContent: source.condensedContent || null,
    }
  }

  // Dedupe by resolved sourceId so a single source is never emitted twice.
  // A source carried in from history (conversation) that is also re-attached on
  // the current turn (e.g. the active tab captured every send) would otherwise
  // have its full content included twice — doubling input tokens and the
  // grounding-source count.
  const seenSourceIds = new Set()

  const conversationSources = []
  for (const ref of conversationSourceRefs) {
    const source = await resolveRef(ref, 'conversation')
    if (source && !seenSourceIds.has(source.sourceId)) {
      seenSourceIds.add(source.sourceId)
      conversationSources.push(source)
    }
  }

  const attachmentSources = []
  for (const ref of newAttachmentRefs) {
    const source = await resolveRef(ref, 'attachment')
    if (source && !seenSourceIds.has(source.sourceId)) {
      seenSourceIds.add(source.sourceId)
      attachmentSources.push(source)
    }
  }

  return { conversationSources, attachmentSources, unresolvedRefs, warnings }
}
