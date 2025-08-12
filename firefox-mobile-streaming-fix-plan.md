# Firefox Mobile Streaming Fix Plan

## Tổng quan vấn đề

Khi test trên Firefox mobile, extension gặp lỗi:

```
AI SDK Stream Error: Error: Permission denied to access property "flush"
```

## Nguyên nhân phân tích

### 1. **Firefox Mobile Security Restrictions**

- Firefox mobile áp dụng security policies nghiêm ngặt hơn desktop
- Hạn chế access tới low-level Stream APIs trong WebExtension context
- Property `flush` của ReadableStream/WritableStream bị block

### 2. **AI SDK v5.0 Streaming Issues**

- Sử dụng smooth streaming features (`smoothTextStream`)
- Relies on browser APIs không fully supported trên Firefox mobile
- Smooth streaming options có thể gây conflict:

```javascript
const defaultSmoothingOptions = {
  smoothing: {
    minDelayMs: 15,
    maxDelayMs: 80,
  },
}
```

### 3. **Missing Browser Compatibility Layer**

- Không có browser detection cho mobile
- Không có fallback mechanism
- Không handle streaming capabilities differences

## Plan Implementation

### Phase 1: Browser Detection Utility

**File: `src/lib/utils/browserDetection.js`**

```javascript
// Tạo utility để detect Firefox mobile và streaming capabilities
```

**Features cần implement:**

- Detect Firefox mobile vs desktop
- Check streaming API support
- Detect WebExtension context limitations
- Check smooth streaming compatibility

### Phase 2: Enhanced AI SDK Adapter

**File: `src/lib/api/aiSdkAdapter.js`**

**Modifications:**

- Thêm browser-specific streaming configuration
- Disable smooth streaming cho Firefox mobile
- Implement fallback options
- Enhanced error handling

### Phase 3: Updated SummarizationService

**File: `src/entrypoints/content/services/SummarizationService.js`**

**Changes:**

- Browser-aware streaming logic
- Graceful degradation cho unsupported features
- Better error messages cho users

### Phase 4: API Layer Updates

**File: `src/lib/api/api.js`**

**Updates:**

- Browser compatibility checks
- Conditional streaming based on capabilities
- Progressive enhancement approach

## Implementation Details

### 1. Browser Detection Strategy

```javascript
// Detect Firefox mobile
const isFirefoxMobile = () => {
  const userAgent = navigator.userAgent
  return /Firefox/.test(userAgent) && /Mobile/.test(userAgent)
}

// Check streaming support
const supportsAdvancedStreaming = () => {
  // Check for specific APIs availability
  return !isFirefoxMobile() && typeof ReadableStream !== 'undefined'
}
```

### 2. Streaming Configuration

```javascript
// Browser-specific streaming options
const getStreamingOptions = () => {
  if (isFirefoxMobile()) {
    return {
      useSmoothing: false, // Disable smooth streaming
      fallbackToNonStreaming: true,
    }
  }
  return {
    useSmoothing: true,
    fallbackToNonStreaming: false,
  }
}
```

### 3. Fallback Mechanism

```javascript
// Graceful degradation
const summarizeWithFallback = async (content, contentType) => {
  try {
    if (supportsAdvancedStreaming()) {
      return await summarizeWithStreaming(content, contentType)
    } else {
      return await summarizeWithoutStreaming(content, contentType)
    }
  } catch (error) {
    if (error.message.includes('flush')) {
      // Firefox mobile specific fallback
      return await summarizeWithoutStreaming(content, contentType)
    }
    throw error
  }
}
```

## Files cần modify

1. **`src/lib/utils/browserDetection.js`** (new)

   - Browser detection utilities
   - Capability detection functions

2. **`src/lib/api/aiSdkAdapter.js`**

   - Browser-specific streaming options
   - Enhanced error handling
   - Fallback mechanisms

3. **`src/entrypoints/content/services/SummarizationService.js`**

   - Browser-aware logic
   - Graceful degradation
   - User-friendly error messages

4. **`src/lib/api/api.js`**
   - Conditional streaming
   - Progressive enhancement

## Expected Outcomes

### ✅ Immediate Benefits

- Extension hoạt động stable trên Firefox mobile
- Không còn "Permission denied" errors
- Better user experience across browsers

### ✅ Long-term Benefits

- Robust browser compatibility layer
- Future-proof cho browser updates
- Better error handling và user feedback
- Performance optimization cho mobile devices

## Testing Strategy

### 1. Firefox Mobile Testing

- Test trên actual Firefox mobile device
- Verify fallback behavior
- Check performance impact

### 2. Cross-browser Testing

- Ensure desktop functionality not affected
- Test on Chrome mobile, Safari mobile
- Verify streaming still works where supported

### 3. Error Scenario Testing

- Simulate API failures
- Test network connectivity issues
- Verify error messages are user-friendly

## Risk Assessment

### Low Risk

- Fallback to non-streaming is safe và tested
- Browser detection is non-invasive
- Changes are backwards compatible

### Mitigation

- Progressive rollout approach
- Feature flags cho new behavior
- Monitoring và logging improvements

## Timeline

- **Phase 1**: Browser Detection (1-2 hours)
- **Phase 2**: AI SDK Adapter updates (2-3 hours)
- **Phase 3**: Service layer updates (1-2 hours)
- **Phase 4**: Testing và refinement (2-3 hours)

**Total estimated time**: 6-10 hours

## Success Metrics

1. **Zero "Permission denied" errors** trên Firefox mobile
2. **Functional summarization** với hoặc không streaming
3. **Consistent UX** across all supported browsers
4. **Performance acceptable** trong fallback mode
5. **Error messages helpful** cho end users
