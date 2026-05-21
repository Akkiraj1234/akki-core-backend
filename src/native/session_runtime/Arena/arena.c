#include "arena.h"
#include "containers.h"
#include "containers.c"
#include "utils.c"
#include <stdlib.h>
#include <string.h>



Arena* arena_create(uint16_t slot_size)
{
    if (slot_size > MAX_SLOT_SIZE) return NULL;

    Arena* arena = malloc(sizeof(Arena));
    if (arena == NULL) return NULL;

    set_bitmap_format_u64(
        MAX_CONTAINER,
        arena->container_bitmap,
        sizeof(arena->container_bitmap)
    );

    memset(
        arena->containers, 
        0, 
        sizeof(arena->containers)
    );

    arena->summary_bitmap = 
        (1u << ARENA_BITMAP_WORDS) - 1;
        
    arena->slot_size = slot_size;
    return arena;
}


void arena_destroy(Arena* arena)
{
    if (arena == NULL) return;
    for (uint32_t i = 0; i < MAX_CONTAINER; i++)
    {
        // since other be null so it will exit anyway since inline its perfect
        _destroy_container(arena->containers[i]); 
        arena->containers[i] = NULL;
    }
    free(arena);
}


uint32_t arena_alloc(Arena* arena)
{
    // the whole insert and thsoe work like that 
    // 1. scan bitmap and get index
    // 2. set data
    // 3. scan again to update

    // scan bitmap
    uint8_t summery = __builtin_ctz(arena->summary_bitmap);
    uint8_t bitidx = __builtin_ctzll(arena->container_bitmap[summery]);
    uint8_t arena_index = summery * 64 + bitidx;

    if (arena->containers[arena_index] == NULL)
    {
        arena->containers[arena_index] = _create_container(arena->slot_size);

    } 

    Container* container = arena->containers[arena_index];
    uint8_t full = 0;
    uint16_t container_index = _container_alloc(container, &full);

    if (full == 1) 
    {
        arena->container_bitmap[summery] &= 
            ~(1ULL << bitidx);
    }

    if (arena->container_bitmap[summery] == 0)
    {
        arena->summary_bitmap &= ~(1U << summery);
    }

    return arena_index*container_index;
}


void* arena_access( Arena* arena, ArenaHandle handle )
{

}


void arena_free( Arena* arena, ArenaHandle handle )
{
    
}