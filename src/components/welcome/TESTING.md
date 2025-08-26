# Welcome Flow Testing Plan

## Test Scenarios

### 1. Fresh Install Test

- **Precondition**: No API keys configured in settings
- **Expected Behavior**: Welcome flow should be displayed instead of main UI
- **Steps**:
  1. Clear all API keys from settings
  2. Set `hasCompletedOnboarding` to `false`
  3. Open sidepanel
  4. Verify welcome flow is shown

### 2. Existing User Test

- **Precondition**: Valid API key configured
- **Expected Behavior**: Welcome flow should NOT be displayed
- **Steps**:
  1. Configure a valid API key
  2. Open sidepanel
  3. Verify main UI is shown instead of welcome flow

### 3. Step Navigation Test

- **Precondition**: Welcome flow is displayed
- **Expected Behavior**: User can navigate between steps using Next/Back buttons
- **Steps**:
  1. Open welcome flow
  2. Click Next on Language step
  3. Verify API Setup step is shown
  4. Click Back
  5. Verify Language step is shown again

### 4. Language Selection Test

- **Precondition**: On Language step
- **Expected Behavior**: UI language updates when language is selected
- **Steps**:
  1. Select a language other than English
  2. Click Next
  3. Verify UI elements are translated in subsequent steps

### 5. API Key Test

- **Precondition**: On API Setup step
- **Expected Behavior**: API key is validated and stored
- **Steps**:
  1. Select a provider
  2. Enter a valid API key
  3. Click Test API Key
  4. Verify success message is shown
  5. Verify Next button becomes enabled

### 6. Invalid API Key Test

- **Precondition**: On API Setup step
- **Expected Behavior**: Error message is shown for invalid API key
- **Steps**:
  1. Select a provider
  2. Enter an invalid API key
  3. Click Test API Key
  4. Verify error message is shown
  5. Verify Next button remains disabled

### 7. Summary Language Test

- **Precondition**: On Summary Language step
- **Expected Behavior**: Summary language is saved
- **Steps**:
  1. Select a summary language
  2. Click Finish Setup
  3. Verify onboarding is completed and settings are saved

### 8. Animation Test

- **Precondition**: Welcome flow is displayed
- **Expected Behavior**: Smooth slide animations when navigating between steps
- **Steps**:
  1. Navigate between steps
  2. Verify slide animations are smooth and consistent

### 9. Settings Persistence Test

- **Precondition**: Welcome flow completed
- **Expected Behavior**: Settings are correctly saved and persisted
- **Steps**:
  1. Complete welcome flow
  2. Close and reopen sidepanel
  3. Verify main UI is shown (not welcome flow)
  4. Verify selected settings are applied

## Edge Cases

### 1. Network Error During API Test

- Simulate network error during API key test
- Verify appropriate error message is shown

### 2. Closing Tab During Onboarding

- Close browser tab during onboarding process
- Reopen and verify onboarding resumes from correct step

### 3. Invalid Provider Selection

- Try to select an invalid provider
- Verify system handles gracefully

### 4. Corrupted Settings Data

- Manually corrupt settings data
- Verify system can recover or provide appropriate error handling

## Manual Testing Checklist

- [ ] Fresh install shows welcome flow
- [ ] Existing user doesn't see welcome flow
- [ ] Step navigation works correctly
- [ ] Language selection updates UI
- [ ] Valid API key test passes
- [ ] Invalid API key test fails appropriately
- [ ] Summary language selection works
- [ ] Animations are smooth
- [ ] Settings are persisted correctly
- [ ] Edge cases handled appropriately
