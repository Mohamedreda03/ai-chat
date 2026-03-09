# Testing Guide

## Overview

This project uses Playwright for end-to-end testing and includes comprehensive test coverage for all major features.

## Running Tests

### Install Dependencies
```bash
npm install
npx playwright install
```

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npx playwright test tests/e2e/chat.spec.ts
```

### Run Tests in UI Mode
```bash
npx playwright test --ui
```

### Run Tests in Debug Mode
```bash
npx playwright test --debug
```

### Run Tests in Specific Browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### View Test Report
```bash
npx playwright show-report
```

## Test Structure

### E2E Tests (`tests/e2e/`)

- **landing.spec.ts** - Landing page functionality
  - Page rendering
  - Model selector UI
  - Navigation
  - Theme toggle
  - Responsive design

- **credentials.spec.ts** - Credential management
  - Adding credentials (OpenAI, Anthropic, Google)
  - Deleting credentials
  - Form validation
  - API key masking
  - Error handling

- **chat.spec.ts** - Chat functionality
  - Model selection
  - Message sending
  - Model persistence
  - Error scenarios

- **navigation.spec.ts** - Navigation and accessibility
  - Page navigation
  - Sidebar functionality
  - Responsive design testing
  - Keyboard navigation

### Unit Tests (`tests/unit/`)

- **ai-platforms.spec.ts** - Utility function tests
  - API key masking
  - Model fetching logic

## Test Fixtures

Custom Playwright fixtures are available in `tests/e2e/fixtures.ts`:

- `mockModels` - Mock model listing APIresponses
- `addMockCredential` - Helper to add mock credentials

### Usage Example

```typescript
import { test, expect } from './fixtures';
test('my test', async ({ page, mockCredentials, mockModels }) => {
  await mockCredentials();
  await mockModels();
  await page.goto('/');
  // ... test logic
});
```

## Writing New Tests

### Best Practices

1. **Use data-testid attributes** for reliable element selection
   ```tsx
   <Button data-testid="save-credential">Save</Button>
   ```

2. **Wait for async operations**
   ```typescript
   await page.waitForLoadState('networkidle');
   await page.waitForTimeout(1000); // Use sparingly

4. **Test error scenarios**
   });
   ```
   ```typescript
   await expect(page.getByRole('button', { name: /save/i })).toBeVisible();
   ```

## Coverage Goals

- ✅ All user flows covered
- ✅ Error scenarios tested
- ✅ Responsive design validated
- ✅ Accessibility checked
- ✅ Cross-browser compatibility

- Pull requests
- Merges to main branch
- Scheduled nightly builds
1. Ensure dev server is running: `npm run dev`
2. Clear browser cache: `npx playwright clean`
- Use `waitForLoadState('networkidle')` before assertions
- Mock external API calls

### Debugging Tips

1. Use `--debug` flag to step through tests
2. Add `await page.pause()` to inspect at specific points
3. Take screenshots: `await page.screenshot({ path: 'debug.png' })`
4. Enable video recording in playwright.config.ts

## Test Data Management

- Use factories or fixtures for test data
- Clean up after tests (delete created resources)
- Use unique IDs to avoid conflicts

## Performance

- Tests run in parallel by default
- Use `test.describe.serial()` for sequential tests
- Limit browser instances in CI: `workers: 1`

## Updating Tests

When adding new features:

1. Add corresponding E2E tests
2. Update fixtures if needed
3. Add unit tests for utilities
4. Update this guide

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-test)
