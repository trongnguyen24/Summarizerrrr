export const ACTION_BUTTONS = [
  {
    key: 'analyze',
    label: 'Analyze',
    icon: 'heroicons:chart-bar-16-solid',
    description: 'Analyze content structure and arguments',
  },
  {
    key: 'explain',
    label: 'Explain',
    icon: 'heroicons:light-bulb-16-solid',
    description: 'Explain in simple terms',
  },
  {
    key: 'debate',
    label: 'Debate',
    icon: 'heroicons:scale-16-solid',
    description: 'Analyze from multiple perspectives',
  },
  {
    key: 'chapters',
    label: 'Chapters',
    icon: 'heroicons:queue-list-16-solid',
    description: 'Summarize by chapters',
    showOnlyForYouTube: true,
  },
  {
    key: 'comments',
    label: 'Comments',
    icon: 'heroicons:chat-bubble-bottom-center-text-16-solid',
    description: 'Summarize YouTube comments',
    showOnlyForYouTube: true,
  },
  {
    key: 'courseConcepts',
    label: 'Concepts',
    icon: 'heroicons:academic-cap-16-solid',
    description: 'Extract key concepts from course',
    showOnlyForCourse: true,
  },
]


/**
 * Action buttons to render for the current page.
 * @param {{ isYouTube?: boolean, isCourse?: boolean, hidden?: string[] }} opts
 *   `hidden` is `settings.hiddenActionButtons` — keys the user turned off.
 */
export function getVisibleActions({ isYouTube = false, isCourse = false, hidden = [] } = {}) {
  return ACTION_BUTTONS.filter((action) => {
    if (hidden?.includes(action.key)) return false
    if (action.showOnlyForYouTube) return isYouTube
    if (action.showOnlyForCourse) return isCourse
    return true
  })
}
