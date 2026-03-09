# Playwright E2E Test Documentation

## Overview

Comprehensive end-to-end test suite for the AI Chat application, covering user flows, API endpoints, and accessibility requirements.

## Test Structure

```
e2e/
├── fixtures.ts              # Custom test utilities and fixtures
├── landing.spec.ts          # Landing page functionality tests
├── credentials.spec.ts      # API credential management tests
├── chat.spec.ts             # Chat interface and conversations
├── model-selection.spec.ts  # Model selection and persistence
├── api.spec.ts              # API endpoint validation
├── accessibility.spec.ts    # WCAG 2.1 Level AA compliance
└── flows.spec.ts            # Complete user flow scenarios
```

## Test Coverage

### 1. Landing Page Tests (`landing.spec.ts`)
Tests the hero section and initial user experience:
- ✅ Page renders with proper hero section and heading
- ✅ Model selector button is visible
- ✅ Prompt input is available
- ✅ Start button disabled without model selection
- ✅ Recent conversations displayed
- ✅ Navigation to chat page works

### 2. Credential Management Tests (`credentials.spec.ts`)
Tests API key management dialog and form:
- ✅ Dialog opens from button
- ✅ Form inputs visible in dialog
- ✅ BaseURL field appears for OpenAI-compatible
- ✅ Form validation works (required fields)
- ✅ Save button enabled only with required data
- ✅ Error handling for invalid input
- ✅ Connected platforms list displays

### 3. Chat Interface Tests (`chat.spec.ts`)
Tests the chat page and conversation handling:
- ✅ Chat page renders correctly
- ✅ Model control available on chat page
- ✅ Send button disabled without model selection
- ✅ New chat button in sidebar
- ✅ Home navigation from footer
- ✅ Conversation page loads
- ✅ Chat interface displays properly
- ✅ Model selection persists after reload

### 4. Model Selection Tests (`model-selection.spec.ts`)
Tests model selection state and persistence:
- ✅ No model selected initially
- ✅ Model selection saved to localStorage
- ✅ localStorage cleared when option deleted
- ✅ Same model used across pages
- ✅ Model persistence after page reload

### 5. API Tests (`api.spec.ts`)
Tests backend API endpoints:
- ✅ GET /api/ai/credentials - lists credentials
- ✅ POST /api/ai/credentials - validates required fields
- ✅ POST /api/ai/credentials - validates API key format
- ✅ POST /api/ai/credentials - enforces unique names
- ✅ GET /api/ai/models - returns available models
- ✅ POST /api/chat - requires credential and model
- ✅ POST /api/chat - validates message array
- ✅ POST /api/chat - rejects invalid credentials
- ✅ GET /api/conversations - lists conversations
- ✅ POST /api/conversations - creates conversation
- ✅ POST /api/conversations - accepts model selection
- ✅ GET /api/conversations/[id] - retrieves conversation
- ✅ GET /api/conversations/[id] - handles non-existent IDs

### 6. Accessibility Tests (`accessibility.spec.ts`)
Tests WCAG 2.1 Level AA compliance:
- ✅ Proper heading hierarchy (h1 before h2)
- ✅ Buttons have accessible labels/aria-labels
- ✅ Form inputs have associated labels or placeholders
- ✅ Dialog has proper role and label
- ✅ Keyboard navigation (Tab key)
- ✅ Sufficient color contrast
- ✅ Visible focus indicators on interactive elements
- ✅ Language attribute on html element
- ✅ Descriptive page title
- ✅ Images have alt text or are hidden
- ✅ Form submission feedback
- ✅ Error messages associated with fields

### 7. User Flow Tests (`flows.spec.ts`)
Tests complete end-to-end user scenarios:
- ✅ Model control dialog accessible on all pages
- ✅ Landing page: can't send without model
- ✅ Chat page: can't send without model
- ✅ Navigation between pages works
- ✅ New conversation creation
- ✅ Model control dialog has consistent appearance
- ✅ Sidebar shows conversation data
- ✅ Model selection persists on reload
- ✅ Dialog close behavior (outside click/Escape)
- ✅ Theme toggle (if available)

## Running Tests

### Install Dependencies
```bash
npm install -D @playwright/test
npx playwright install
```

### Run All Tests
```bash
npx playwright test
```

### Run Specific Test File
```bash
npx playwright test e2e/landing.spec.ts
```

### Run in Debug Mode
```bash
npx playwright test --debug
```

### Run with UI
```bash
npx playwright test --ui
```

### View Test Report
```bash
npx playwright show-report
```

## Test Configuration

- **Base URL**: http://localhost:3000
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile Testing**: Pixel 5 (Chrome), iPhone 12 (Safari)
- **Retries**: 0 (local), 2 (CI)
- **Timeout**: Default Playwright timeout
- **Screenshots**: Only on failure
- **Trace**: On first retry

## Prerequisites

1. **Dev Server Running**
   ```bash
   npm run dev
   ```

2. **Database Initialized**
   - Prisma migrations applied

3. **Environment Variables**
   - Set up as per `.env` configuration

## Common Issues & Solutions

### Tests timeout
- Ensure dev server is running: `npm run dev`
- Check network connectivity to localhost:3000
- Increase timeout in playwright.config.ts

### Browser download issues
```bash
npx playwright install-deps
```

### Port 3000 in use
```bash
lsof -i :3000  # Find process
kill -9 <PID>  # Kill process
```

## Continuous Integration

Tests are designed to run in CI with:
- Retries enabled (2)
- Single worker (non-parallel)
- HTML report generation
- Screenshot on failure

Add to CI pipeline:
```bash
npm run build
npx playwright test
```

## Future Test Expansions

- Visual regression testing
- Performance benchmarks
- Load testing with multiple concurrent users
- i18n testing for multiple languages
- Mobile gesture testing
- Audio/speech input testing (if feature added)

## Notes

- Tests use real API calls (no mocking) for realistic validation
- Tests respect rate limiting of external APIs
- Credential tests don't actually save to database unless needed
- All tests clean up their state where applicable
