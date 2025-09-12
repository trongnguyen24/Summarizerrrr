# WXT Storage Migration Plan - Giải quyết vấn đề State Sharing

## 🎯 Mục tiêu

Giải quyết vấn đề Logdev component không đọc được dữ liệu từ store khi chạy trong content script (FloatingButton) bằng cách migration từ chromeService sang WXT Storage API.

## 🔍 Phân tích vấn đề hiện tại

### Vấn đề

- **Logdev** hoạt động bình thường trên **sidepanel**
- **Logdev** không đọc được dữ liệu store khi import vào **FloatingButton** (content script)
- FloatingButton là integrated UI chèn vào trang web

### Nguyên nhân

1. **Context Isolation**: Content script và sidepanel chạy trong các isolated context khác nhau
2. **Separate Store Instances**: Mỗi context có instance riêng của settingsStore và themeStore
3. **Manual Synchronization**: Mặc dù cả hai có thể truy cập `browser.storage.sync`, việc đồng bộ state không tự động
4. **Reactive Issues**: Store reactivity không work cross-context

### Current Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Sidepanel     │    │ Content Script  │
│                 │    │ (FloatingButton)│
├─────────────────┤    ├─────────────────┤
│ settingsStore   │    │ settingsStore   │
│ (Instance A)    │    │ (Instance B)    │
├─────────────────┤    ├─────────────────┤
│ chromeService   │    │ chromeService   │
│ browser.storage │    │ browser.storage │
└─────────────────┘    └─────────────────┘
```

## 💡 Giải pháp: WXT Storage API

### Tại sao WXT Storage?

- ✅ **Reactive Storage**: Tự động đồng bộ giữa tất cả contexts
- ✅ **Real-time Updates**: State changes propagate instantly
- ✅ **Type Safety**: TypeScript support với schema validation
- ✅ **Performance**: Built-in caching và batching
- ✅ **Cross-context**: Hoạt động seamless giữa popup, sidepanel, content script, background
- ✅ **API Familiarity**: Tương tự localStorage API nhưng async và reactive

### Target Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Sidepanel     │    │ Content Script  │
│                 │    │ (FloatingButton)│
├─────────────────┤    ├─────────────────┤
│ settingsStore   │◄──►│ settingsStore   │
│ (Shared State)  │    │ (Shared State)  │
├─────────────────┤    ├─────────────────┤
│      WXT Storage (sync:settings)       │
│           Auto Sync All Contexts       │
└────────────────────────────────────────┘
```

## 📋 Implementation Plan

### Phase 1: Setup & Analysis ✅

- [x] Phân tích vấn đề hiện tại
- [x] Research WXT Storage documentation
- [x] Xác định scope migration

### Phase 2: WXT Storage Service

**File**: `src/services/wxtStorageService.js`

#### 2.1 Core Storage Service

```javascript
// @ts-nocheck
import { storage } from 'wxt/storage'

// Define storage items với type safety
export const settingsStorage = storage.defineItem('sync:settings', {
  defaultValue: DEFAULT_SETTINGS,
})

export const themeStorage = storage.defineItem('sync:theme', {
  defaultValue: DEFAULT_THEME_SETTINGS,
})

// Replacement functions for chromeService
export async function getStorage(keys) {
  // Implementation với WXT storage
}

export async function setStorage(items) {
  // Implementation với WXT storage
}

export function onStorageChange(callback) {
  // Implementation với WXT storage watcher
}
```

#### 2.2 Key Features

- **Reactive Updates**: Auto-sync across contexts
- **Schema Validation**: Type-safe storage operations
- **Error Handling**: Robust error handling và fallbacks
- **Performance**: Batched updates và caching
- **Backward Compatibility**: Same API interface as chromeService

### Phase 3: Settings Store Migration

**File**: `src/stores/settingsStore.svelte.js`

#### 3.1 Replace Import

```javascript
// OLD
import {
  getStorage,
  setStorage,
  onStorageChange,
} from '@/services/chromeService.js'

// NEW
import {
  getStorage,
  setStorage,
  onStorageChange,
} from '@/services/wxtStorageService.js'
```

#### 3.2 Add Reactive Watching

```javascript
// NEW: Auto-sync across contexts
settingsStorage.watch((newValue, oldValue) => {
  Object.assign(settings, newValue)
  // Trigger reactive updates
})
```

#### 3.3 Enhanced Functions

- `loadSettings()`: Use WXT storage with reactive watching
- `updateSettings()`: Batch updates với WXT storage
- `subscribeToSettingsChanges()`: Enhanced với real-time sync

### Phase 4: Theme Store Migration

**File**: `src/stores/themeStore.svelte.js`

#### 4.1 Similar Migration Pattern

- Replace chromeService import
- Add reactive watching for theme changes
- Enhanced cross-context theme synchronization

#### 4.2 Theme-specific Features

- Auto-apply theme changes across all contexts
- System theme detection sync
- Performance optimization for theme switching

### Phase 5: Dependency Check & Migration

**Files to Check**:

- `src/entrypoints/content/services/FloatingPanelStorageService.js`
- Any other files importing chromeService
- Component files using storage directly

#### 5.1 Search & Replace Strategy

```bash
# Find all chromeService imports
grep -r "chromeService" src/

# Systematic replacement
```

#### 5.2 Testing Each Migration

- Verify functionality after each file migration
- Ensure no breaking changes
- Check reactive updates work

### Phase 6: Testing & Validation

#### 6.1 Test Scenarios

1. **Logdev in Sidepanel**: Verify settings display correctly
2. **Logdev in FloatingButton**: Verify settings sync from sidepanel
3. **Cross-context Updates**: Change setting in sidepanel, verify FloatingButton updates
4. **Real-time Sync**: Multiple contexts open, verify instant sync
5. **Page Reload**: Verify state persistence
6. **Theme Changes**: Verify theme sync across contexts

#### 6.2 Performance Testing

- Load time comparison
- Memory usage analysis
- Network requests optimization
- Reactive update performance

#### 6.3 Error Scenarios

- Network disconnection
- Storage quota exceeded
- Invalid data handling
- Context crash recovery

### Phase 7: Cleanup & Optimization

#### 7.1 Code Cleanup

- Remove unused chromeService functions
- Optimize import statements
- Clean up console logs
- Update comments và documentation

#### 7.2 Performance Optimization

- Implement debouncing for frequent updates
- Optimize storage access patterns
- Cache frequently accessed data
- Minimize reactive overhead

#### 7.3 Documentation Update

- Update API documentation
- Add migration notes
- Performance guidelines
- Troubleshooting guide

## 🔧 Technical Implementation Details

### WXT Storage API Examples

#### Basic Usage

```javascript
import { storage } from 'wxt/storage'

// Define storage item
const settings = storage.defineItem('sync:settings', {
  defaultValue: { theme: 'dark', lang: 'en' },
})

// Get value
const currentSettings = await settings.getValue()

// Set value
await settings.setValue({ theme: 'light', lang: 'vi' })

// Watch changes (reactive across all contexts)
settings.watch((newValue, oldValue) => {
  console.log('Settings changed:', newValue)
})
```

#### Advanced Features

```javascript
// Schema validation
const settings = storage.defineItem('sync:settings', {
  defaultValue: DEFAULT_SETTINGS,
  schema: {
    theme: z.enum(['light', 'dark', 'system']),
    lang: z.string(),
  },
})

// Batched updates
await settings.setValue(updatedSettings)

// Remove item
await settings.removeValue()

// Get all keys
const allKeys = await storage.getKeys()
```

### Migration Strategy

#### 1. Gradual Migration

- Migrate one store at a time
- Test each migration thoroughly
- Rollback capability if issues arise

#### 2. Backward Compatibility

- Keep same API interface
- Maintain existing function signatures
- Ensure no breaking changes for components

#### 3. Error Handling

- Fallback to chromeService if WXT Storage fails
- Graceful degradation
- Comprehensive error logging

## 🚨 Risk Assessment

### High Risk

- **Breaking Changes**: Components might break during migration
- **Data Loss**: Potential setting loss during migration
- **Performance**: Reactive overhead might impact performance

### Mitigation Strategies

- **Incremental Migration**: One store at a time
- **Backup Strategy**: Export settings before migration
- **Rollback Plan**: Keep chromeService as fallback
- **Extensive Testing**: Test all scenarios thoroughly

### Low Risk

- **API Compatibility**: WXT Storage API is mature
- **Cross-browser Support**: WXT handles browser differences
- **Documentation**: Well-documented API

## 📈 Success Metrics

### Functional Success

- ✅ Logdev displays data correctly in FloatingButton
- ✅ Settings sync real-time between sidepanel và content script
- ✅ No performance degradation
- ✅ All existing functionality preserved

### Technical Success

- ✅ Code maintainability improved
- ✅ TypeScript support enhanced
- ✅ Error handling robust
- ✅ Performance metrics acceptable

### User Experience Success

- ✅ Seamless experience across contexts
- ✅ No data loss during migration
- ✅ Instant updates visible
- ✅ No UI delays or glitches

## 🛠 Development Environment Setup

### Prerequisites

- WXT version: `^0.20.6` ✅
- Node.js version compatible
- Extension contexts: sidepanel, content script

### Development Steps

1. **Local Development**: Test on localhost
2. **Extension Testing**: Load unpacked extension
3. **Multi-context Testing**: Open sidepanel + content script simultaneously
4. **Cross-page Testing**: Test on multiple websites
5. **Production Testing**: Test with built extension

## 📚 References

### WXT Storage Documentation

- [Official WXT Storage Guide](https://wxt.dev/storage.html)
- [Storage API Reference](https://wxt.dev/api/wxt/storage.html)
- [Migration Examples](https://wxt.dev/examples/storage.html)

### Current Project Files

- `src/stores/settingsStore.svelte.js`
- `src/stores/themeStore.svelte.js`
- `src/services/chromeService.js`
- `src/components/settings/Logdev.svelte`
- `src/entrypoints/content/components/FloatingButton.svelte`

---

## 🎯 Next Steps

1. **Review Plan**: Đảm bảo plan đầy đủ và chính xác
2. **User Approval**: Xác nhận user đồng ý với approach
3. **Implementation**: Bắt đầu Phase 2 - tạo WXT Storage Service
4. **Testing**: Comprehensive testing mỗi phase
5. **Documentation**: Update documentation sau migration

**Estimated Timeline**: 1-2 days implementation + testing
**Risk Level**: Medium (có rollback plan)
**Impact**: High (giải quyết core functionality issue)
