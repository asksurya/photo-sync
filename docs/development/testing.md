# Testing Guidelines

> **Note:** This project is currently in initial setup phase. Testing infrastructure is configured and basic tests are in place, but comprehensive test coverage will be built alongside core feature implementation following TDD principles.

## Test-Driven Development (TDD)

All features MUST follow TDD:

1. Write failing test
2. Run test to verify it fails
3. Write minimal code to pass test
4. Run test to verify it passes
5. Refactor if needed
6. Commit

## Coverage Requirements

- **Target**: 100% coverage
- **Exceptions**: Only extreme edge cases that cannot be tested
- **Tools**:
  - pytest (Python services: grouping, deduplication)
  - Jest (API Gateway)
  - Vitest (Web UI)

## Test Structure

### Python Services

```python
# tests/test_module.py
import pytest

def test_specific_behavior():
    """Test description."""
    # Arrange
    input_data = create_test_data()

    # Act
    result = function_under_test(input_data)

    # Assert
    assert result == expected_output
```

### TypeScript Services

```typescript
// src/__tests__/module.test.ts
describe('Module', () => {
  it('should handle specific behavior', () => {
    // Arrange
    const input = createTestData();

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe(expectedOutput);
  });
});
```

## Running Tests

### With Coverage

```bash
# Python
pytest --cov=src --cov-report=html

# TypeScript
npm test -- --coverage
```

### Watch Mode

```bash
# Gateway (Jest)
cd services/gateway && npm run test:watch

# Web (Vitest)
cd services/web && npm run test:watch
```

> **Note:** Python services do not currently have watch mode configured. Run `pytest` manually after changes, or configure a watch tool like `pytest-watch` if needed.

## Test Data

- Use fixtures for reusable test data
- Create minimal test data (YAGNI)
- Clean up after tests (especially file operations)
