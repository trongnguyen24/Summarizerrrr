import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { closeDatabase, DB_NAME } from '@/lib/db/indexedDBService.js'
import {
  applyConversationSyncChanges,
  getSourceById,
  hydrateSourceContent,
  putSourceSnapshot,
} from '@/lib/db/conversationRepository.js'
import { toStubSource } from '@/lib/db/conversationSyncMerge.js'

function deleteDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Test database deletion was blocked'))
  })
}

beforeEach(async () => {
  closeDatabase()
  await deleteDatabase()
})

afterEach(async () => {
  closeDatabase()
  await deleteDatabase()
})

const fullSource = {
  normalizedUrl: 'https://example.com/article',
  url: 'https://example.com/article',
  title: 'Article',
  sourceType: 'webpage',
  sourceKey: 'https://example.com/article:webpage:hash-full',
  contentHash: 'hash-full',
  rawContent: 'Original full text.',
  condensedContent: null,
  originalLength: 19,
}

describe('hydrateSourceContent', () => {
  it('fills a synced stub, keeping its id and sourceKey', async () => {
    const stub = toStubSource({ ...fullSource, id: 'source-stub-1' })
    await applyConversationSyncChanges({ sources: [stub] })
    expect((await getSourceById('source-stub-1')).contentOmitted).toBe(true)

    const hydrated = await hydrateSourceContent('source-stub-1', 'Re-captured article text.')

    expect(hydrated).toMatchObject({
      id: 'source-stub-1',
      sourceKey: stub.sourceKey,
      rawContent: 'Re-captured article text.',
      originalLength: 'Re-captured article text.'.length,
      contentOmitted: false,
    })
    expect(hydrated.hydratedAt).toEqual(expect.any(String))
    expect(hydrated.contentHash).not.toBe(stub.contentHash)
    expect((await getSourceById('source-stub-1')).rawContent).toBe('Re-captured article text.')
  })

  it('never overwrites a source that already has content', async () => {
    const full = await putSourceSnapshot({ ...fullSource, id: 'source-full-1' })

    const result = await hydrateSourceContent(full.id, 'Something else.')

    expect(result).toBeNull()
    expect((await getSourceById(full.id)).rawContent).toBe('Original full text.')
  })

  it('a second hydration of the same stub does not clobber the first', async () => {
    const stub = toStubSource({ ...fullSource, id: 'source-stub-2' })
    await applyConversationSyncChanges({ sources: [stub] })

    await hydrateSourceContent('source-stub-2', 'First capture.')
    const second = await hydrateSourceContent('source-stub-2', 'Late duplicate capture.')

    expect(second).toBeNull()
    expect((await getSourceById('source-stub-2')).rawContent).toBe('First capture.')
  })
})
