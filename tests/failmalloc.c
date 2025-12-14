/**
 * LD_PRELOAD wrapper to force realloc to fail for testing
 * 
 * Compile: gcc -shared -fPIC -o libfailmalloc.so failmalloc.c -ldl -std=gnu11
 * 
 * Usage:
 *   export FAIL_REALLOC_AFTER=1  # fail on first realloc call
 *   LD_PRELOAD=./libfailmalloc.so ./your_test_binary
 * 
 * This will force realloc to return NULL and will show what your code does.
 * If you didn't implement the tmp pattern, you'll see the leak or crash.
 */

#define _GNU_SOURCE
#include <dlfcn.h>
#include <stdlib.h>
#include <stdio.h>
#include <stddef.h>
#include <stdatomic.h>

static void *(*real_realloc)(void *, size_t) = NULL;
static atomic_int callcount = 0;
int fail_after = 2; // configure by env var

void init_real() {
    if (!real_realloc) {
        real_realloc = dlsym(RTLD_NEXT, "realloc");
        char *env = getenv("FAIL_REALLOC_AFTER");
        if (env) fail_after = atoi(env);
    }
}

void* realloc(void *ptr, size_t size) {
    init_real();
    int c = atomic_fetch_add(&callcount, 1) + 1;
    if (c == fail_after) {
        // Simulate failure
        return NULL;
    }
    return real_realloc(ptr, size);
}

