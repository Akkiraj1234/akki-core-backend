#include "containers.h"
#include "arena.h"
#include "utils.h"
#include <stdlib.h>
#include <string.h>



Arena* arena_create(uint16_t slot_size)
{
    // should i keep it here? because its check also happen in container create
    if (slot_size > MAX_SLOT_SIZE) return NULL;

    Arena* arena = malloc(sizeof(Arena));
    if (arena == NULL) return NULL;

    set_bitmap_format_u64(
        MAX_CONTAINER,
        arena->container_bitmap,
        sizeof(arena->container_bitmap)
    );

    arena->summary_bitmap = 
        (1u << ARENA_BITMAP_WORDS) - 1;

    memset(
        arena->containers, 
        0, 
        sizeof(arena->containers)
    );

    arena->slot_size = slot_size;
    return arena;
}


void arena_destroy(Arena* arena)
{
    if (arena == NULL) return;

    for (uint32_t i = 0; i < MAX_CONTAINER; i++)
    {
        container_destroy(arena->containers[i]); 
        arena->containers[i] = NULL;
    }
    free(arena);
}


uint32_t arena_alloc(Arena* arena)
{

    if (arena == NULL) return UINT32_MAX;

    // finding the free slot 
    uint8_t summery_idx = __builtin_ctz(arena->summary_bitmap);
    uint8_t bitmap_idx = __builtin_ctzll(arena->container_bitmap[summery_idx]);
    uint8_t arena_index = (summery_idx * 64) + bitmap_idx;
    
    // if container not exists create one
    if (arena->containers[arena_index] == NULL) 
    {
        arena->containers[arena_index] = 
            container_create(arena->slot_size);
    }

    if (arena->containers[arena_index] == NULL) return UINT32_MAX;
    // calculating index
    uint8_t full = 0;
    uint16_t index = container_alloc(
        arena->containers[arena_index],
        &full
    );

    arena->container_bitmap[summery_idx] &= ~(-full & (1ULL << bitmap_idx));
    arena->summary_bitmap &= ~(
        -(arena->container_bitmap[summery_idx] == 0)
        & (1U << summery_idx)
    );

    return (arena_index * MAX_SLOT) + index;
}


void* arena_access( Arena* arena, ArenaHandle handle )
{
    // first we need to find container index and then index.
    uint8_t container_idx = handle >> 13; //max slot is 8192 power of2
    uint16_t index = handle & (MAX_SLOT - 1);

    if (arena == NULL || container_idx >= MAX_CONTAINER) return NULL;

    // return null auto if something is invalid
    return container_access(
        arena->containers[container_idx],
        index
    );
}


void arena_free( Arena* arena, ArenaHandle handle )
{
    uint8_t container_idx = handle >> 13;
    uint16_t index = handle & (MAX_SLOT - 1);
    uint8_t sb_idx = container_idx >> 6; // container_idx / 64
    uint8_t cb_idx = container_idx & 63; // container_idx % 64


    if (arena == NULL || container_idx >= MAX_CONTAINER) return;
    
    // updating bitmap
    arena->summary_bitmap |= (1U << sb_idx);
    arena->container_bitmap[sb_idx] |= (1ULL << cb_idx);
    container_free(arena->containers[container_idx], index);
}