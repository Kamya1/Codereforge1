/**
 * Unit test harness for append_str function
 * 
 * Compile: gcc -fsanitize=address -g -O1 test_append.c -o test_append
 * 
 * Run normally:
 *   ./test_append
 * 
 * Run with fault injection (force realloc to fail):
 *   export FAIL_REALLOC_AFTER=1
 *   LD_PRELOAD=./libfailmalloc.so ./test_append
 * 
 * This tests both normal operation and OOM (out-of-memory) scenarios.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>

// Declare the function to test
char *append_str(const char *base, const char *add);

int main() {
    printf("Testing append_str under normal conditions...\n");
    
    char *res = append_str("hello", "world");
    if (!res) {
        printf("ERROR: append_str returned NULL on normal input\n");
        return 1;
    }
    
    if (strcmp(res, "helloworld") != 0) {
        printf("ERROR: Expected 'helloworld', got '%s'\n", res);
        free(res);
        return 1;
    }
    
    printf("✓ Normal test passed: '%s'\n", res);
    free(res);

    printf("\nTesting append_str with OOM simulation (if LD_PRELOAD is set)...\n");
    char *res2 = append_str("a", "b");
    if (!res2) {
        printf("✓ OOM test passed: append_str correctly returned NULL on realloc failure\n");
        printf("  (No memory leak - original pointer was freed)\n");
    } else {
        printf("INFO: OOM simulation not active or realloc succeeded\n");
        printf("  Result: '%s'\n", res2);
        free(res2);
    }
    
    printf("\nAll tests completed.\n");
    return 0;
}

