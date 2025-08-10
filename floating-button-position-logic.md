# Floating Button Y Position Save/Restore Logic

## Overview

Implement functionality to save and restore the Y position of the floating button using animejs `setY()` method with optimized performance for cross-tab synchronization.

## Core Requirements

- Save Y position only once after drag ends (not continuously)
- Support cross-tab synchronization with minimal performance impact
- Use animejs `setY()` method for position restoration
- Use browser.storage.local for storage

## Detailed Logic Flow

### 1. Storage Service Extension

**File**: `src/entrypoints/content/services/FloatingPanelStorageService.js`

**New Methods**:

```
BUTTON_POSITION_KEY = 'floatingButtonPosition'

saveButtonPosition(y):
  - Check if new Y differs from last saved Y by > 10px threshold
  - Only save if significant change to reduce storage writes
  - Store: { y: number, timestamp: number }

getButtonPosition():
  - Return saved Y position or null if not found
  - Include error handling for storage read failures
```

### 2. Debounced Save Mechanism

**Logic**:

```
Variables:
- saveTimeout: number | null
- lastSavedY: number
- isDragging: boolean
- SAVE_DELAY: 300ms (wait time after drag stops)
- POSITION_THRESHOLD: 10px (minimum change to trigger save)

savePositionDebounced(currentY):
  1. Clear existing saveTimeout if any
  2. Set new timeout for SAVE_DELAY ms
  3. In timeout callback:
     - Check if |currentY - lastSavedY| > POSITION_THRESHOLD
     - If yes: call FloatingPanelStorageService.saveButtonPosition(currentY)
     - Update lastSavedY = currentY
     - Set isDragging = false
```

### 3. Draggable Configuration Updates

**File**: `src/entrypoints/content/composables/useFloatingButtonDraggable.svelte.js`

**New Variables**:

```
- draggableInstance: exposed for external setY() access
- saveTimeout: for debouncing
- lastSavedY: track last saved position
- isDragging: track drag state
- storageListener: reference for cleanup
- isListening: prevent duplicate listeners
```

**Enhanced createDraggable Config**:

```
createDraggable(buttonElement, {
  container: '.snapedge',
  x: { snap: [0, getWindowWidth()] },
  cursor: { onHover: 'pointer', onGrab: 'grabbing' },

  onUpdate: (draggable) => {
    isDragging = true
    savePositionDebounced(draggable.y)
  },

  onResize: (self) => {
    // existing resize logic
  }
})
```

### 4. Cross-Tab Sync with Performance Optimization

**Smart Listener Management**:

```
initStorageListener():
  - Only initialize if not already listening
  - Only activate when tab is visible (document.visibilityState === 'visible')
  - Add browser.storage.onChanged listener

handleStorageChange(changes, areaName):
  - Check if changes.floatingButtonPosition exists
  - Compare new Y with current draggable.y
  - Only update if difference > POSITION_THRESHOLD (avoid micro-movements)
  - Use draggable.setY(newY, true) with muteCallback=true to prevent infinite loops

cleanupStorageListener():
  - Remove storage listener when tab becomes hidden
  - Cleanup on component destroy

visibilityChange Handler:
  - When tab visible: initStorageListener()
  - When tab hidden: cleanupStorageListener()
```

### 5. Position Restoration on Load

**loadSavedPosition() Function**:

```
loadSavedPosition():
  1. Call FloatingPanelStorageService.getButtonPosition()
  2. If position exists and draggableInstance is available:
     - Call draggableInstance.setY(savedY, true)
     - Set lastSavedY = savedY
  3. Error handling for failed loads
  4. Fallback to default position if needed
```

### 6. Component Integration

**File**: `src/entrypoints/content/components/FloatingButton.svelte`

**$effect() Updates**:

```
$effect(() => {
  if (buttonElement) {
    const { initializeDraggable, destroy, loadSavedPosition, initStorageListener } =
      useFloatingButtonDraggable(buttonElement)

    // Initialize draggable first
    initializeDraggable()

    // Load saved position after draggable is ready
    setTimeout(() => {
      loadSavedPosition()
    }, 50) // Small delay to ensure draggable is fully initialized

    // Initialize cross-tab sync
    initStorageListener()

    // Rest of existing logic...

    return () => {
      destroy()
      cleanupStorageListener()
      // existing cleanup...
    }
  }
})
```

## Performance Optimizations

### 1. Minimal Storage Writes

- Only save when position changes by > 10px
- Debounce saves to prevent rapid writes during drag
- Include timestamp to track save frequency

### 2. Smart Listener Management

- Only listen to storage changes when tab is visible
- Auto cleanup listeners when tab inactive
- Prevent duplicate listener initialization

### 3. Efficient Position Updates

- Use position threshold for cross-tab updates
- Mute callbacks when updating from storage to prevent loops
- Debounce storage change handling

### 4. Memory Management

- Clear timeouts on component destroy
- Remove all event listeners properly
- Cleanup storage listeners

## Error Handling

### Storage Failures

- Try-catch blocks around all storage operations
- Fallback to default behavior if storage unavailable
- Console warnings for debugging

### Invalid Positions

- Validate Y position is within viewport bounds
- Fallback to center position if invalid
- Handle undefined/null positions gracefully

## Testing Scenarios

### Single Tab Testing

1. Drag button to various Y positions
2. Reload page and verify position is restored
3. Test with multiple drag operations
4. Verify only one save occurs per drag session

### Multi-Tab Testing

1. Open multiple tabs with the extension
2. Drag button in tab A, verify position updates in tab B
3. Test with tabs in background/foreground
4. Monitor performance with dev tools
5. Test cleanup when closing tabs

### Edge Cases

1. Storage quota exceeded
2. Invalid stored positions
3. Rapid tab switching during drag
4. Browser storage disabled
5. Extension reload during drag operation

## Implementation Order

1. **Extend FloatingPanelStorageService** - Add button position methods
2. **Update useFloatingButtonDraggable** - Add debounced save and expose draggable instance
3. **Add loadSavedPosition function** - Implement position restoration
4. **Integrate cross-tab sync** - Add smart storage listeners
5. **Update FloatingButton.svelte** - Wire everything together
6. **Test and optimize** - Verify functionality and performance

## Configuration Constants

```
SAVE_DELAY = 300ms           // Debounce time after drag stops
POSITION_THRESHOLD = 10px    // Minimum change to trigger save/update
RESTORE_DELAY = 50ms         // Delay before restoring position on load
STORAGE_KEY = 'floatingButtonPosition'
```
