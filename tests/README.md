# Memory Safety Test Files

This directory contains test files for detecting and validating memory safety issues, specifically realloc misuse patterns.

## Files

- **`append_str_buggy.c`** - Demonstrates the buggy pattern: `ptr = realloc(ptr, ...)`
- **`append_str_fixed.c`** - Shows the correct pattern using a temporary pointer
- **`test_append.c`** - Unit test harness for testing append_str function
- **`failmalloc.c`** - LD_PRELOAD wrapper to simulate realloc failures for testing

## Building and Running Tests

### 1. Compile the fault injection library

```bash
gcc -shared -fPIC -o libfailmalloc.so failmalloc.c -ldl -std=gnu11
```

### 2. Compile test harness with AddressSanitizer

```bash
gcc -fsanitize=address -g -O1 test_append.c append_str_fixed.c -o test_append_fixed
gcc -fsanitize=address -g -O1 test_append.c append_str_buggy.c -o test_append_buggy
```

### 3. Run tests

**Normal test (should pass):**
```bash
./test_append_fixed
```

**Test with fault injection (simulates OOM):**
```bash
export FAIL_REALLOC_AFTER=1
LD_PRELOAD=./libfailmalloc.so ./test_append_fixed
```

**Test buggy version (will show memory leak with ASAN):**
```bash
export FAIL_REALLOC_AFTER=1
LD_PRELOAD=./libfailmalloc.so ./test_append_buggy
```

## Expected Results

- **Fixed version**: Should handle realloc failure gracefully, free the original pointer, and return NULL
- **Buggy version**: Will show a memory leak when realloc fails (original pointer is lost)

## Integration with Static Analysis

The static analyzer in `lib/analysis/static-analyzer.ts` detects the pattern:
```c
ptr = realloc(ptr, ...)
```

And flags it as a critical error, recommending the safe pattern:
```c
tmp = realloc(ptr, ...);
if (!tmp) {
    free(ptr);
    return NULL;
}
ptr = tmp;
```

## Using cppcheck

For additional static analysis, you can run cppcheck:

```bash
cppcheck --enable=all --inconclusive --std=c11 append_str_buggy.c 2> cppcheck.out
```

This will catch additional issues beyond the realloc misuse pattern.

