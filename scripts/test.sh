#!/bin/bash

# AI Chat - Test Runner Script
# Helps run E2E and unit tests with common options

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}==================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}==================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if dev server is running
check_dev_server() {
    if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
        print_warning "Dev server not running on localhost:3000"
        print_warning "Run 'npm run dev' in another terminal"
        return 1
    fi
    print_success "Dev server is running"
    return 0
}

# Function to show help
show_help() {
    cat << EOF
AI Chat - Test Runner

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    e2e                Run E2E tests
    e2e:ui             Run E2E tests in UI mode
    e2e:debug          Run E2E tests in debug mode
    e2e:report         Show E2E test report
    e2e:chrome         Run E2E tests with Chromium only
    e2e:firefox        Run E2E tests with Firefox only
    
    unit               Run unit tests
    unit:watch         Run unit tests in watch mode
    unit:coverage      Run unit tests with coverage
    
    all                Run all tests (unit + e2e)
    help               Show this help message

Options:
    --single-browser   Run E2E tests on Chromium only
    --no-ui            Skip browser downloads (for CI)

Examples:
    $0 unit              # Run unit tests
    $0 e2e               # Run E2E tests
    $0 all               # Run all tests
    $0 e2e:ui            # Run E2E tests with Playwright UI
    $0 e2e:debug         # Run E2E tests with Playwright debugger
EOF
}

# Main script
main() {
    local cmd="${1:-help}"
    
    case "$cmd" in
        e2e)
            print_header "E2E Tests (Playwright)"
            if check_dev_server; then
                npm run test:e2e
            fi
            ;;
        
        e2e:ui)
            print_header "E2E Tests - UI Mode"
            if check_dev_server; then
                npm run test:e2e:ui
            fi
            ;;
        
        e2e:debug)
            print_header "E2E Tests - Debug Mode"
            if check_dev_server; then
                npm run test:e2e:debug
            fi
            ;;
        
        e2e:report)
            print_header "E2E Test Report"
            npm run test:e2e:report
            ;;
        
        e2e:chrome)
            print_header "E2E Tests - Chromium Only"
            if check_dev_server; then
                npx playwright test --project=chromium
            fi
            ;;
        
        e2e:firefox)
            print_header "E2E Tests - Firefox Only"
            if check_dev_server; then
                npx playwright test --project=firefox
            fi
            ;;
        
        unit)
            print_header "Unit Tests (Vitest)"
            npm run test:unit
            ;;
        
        unit:watch)
            print_header "Unit Tests - Watch Mode"
            npm run test:unit:watch
            ;;
        
        unit:coverage)
            print_header "Unit Tests - With Coverage"
            npm run test:unit:coverage
            ;;
        
        all)
            print_header "All Tests (Unit + E2E)"
            
            # Run unit tests first
            print_header "Running Unit Tests..."
            npm run test:unit
            
            # Check dev server for E2E tests
            if check_dev_server; then
                print_header "Running E2E Tests..."
                npm run test:e2e
                print_success "All tests completed!"
            else
                print_error "Skipping E2E tests. Start dev server with 'npm run dev'"
                exit 1
            fi
            ;;
        
        help|--help|-h)
            show_help
            ;;
        
        *)
            print_error "Unknown command: $cmd"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
