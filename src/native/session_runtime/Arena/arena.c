#include "ArenaStorage.h"
#include <stdlib.h>
#include <string.h>


static void set_bitmap_format_u64(uint32_t slot_count, uint64_t* bitmap, uint32_t bitmap_size)
{
    if (bitmap == NULL) return;
    memset(bitmap, 0xFF, bitmap_size);

    uint32_t valid_tail_bits = slot_count % 64;
    if (valid_tail_bits == 0) return;
    
    uint64_t mask = (1ULL << valid_tail_bits) - 1;
    uint32_t last_index = (slot_count + 63) / 64 - 1;
    bitmap[last_index] &= mask;
}


static void set_bitmap_format_u32(uint32_t slot_count, uint32_t* bitmap, uint32_t bitmap_size)
{
    if (bitmap == NULL) return;
    memset(bitmap, 0xFF, bitmap_size);

    uint32_t valid_tail_bits = slot_count % 32;
    if (valid_tail_bits == 0) return;

    uint32_t mask = (1U << valid_tail_bits) -1;
    uint32_t last_index = (slot_count + 31) / 32 -1;
    bitmap[last_index] &= mask;
}


static Container* _create_container( uint16_t slot_size )
{
    if (slot_size > MAX_SLOT_SIZE) return NULL;

    Container* container = malloc(sizeof(Container));
    uint8_t* memory = malloc(MAX_SLOT * slot_size);

    if (
        container == NULL ||
        memory == NULL
    ){
        free(container);
        free(memory);
        return NULL;
    }

    // cleaning the bitmap
    set_bitmap_format_u64(
        MAX_SLOT,
        container->slot_bitmap,
        sizeof(container->slot_bitmap)
    );

    set_bitmap_format_u32(
        BITMAP_WORD_COUNT,
        container->word_bitmap,
        sizeof(container->word_bitmap)
    );

    container->summary_bitmap = 
        (1u << WORD_BITMAP_WORDS) - 1;

    container->memory = memory;
    container->slot_size = slot_size;
    return container;
}


static inline void _destroy_container(Container* container){
    if (container == NULL) return;

    free(container -> memory);
    free(container);
}


static inline uint32_t _container_alloc(Container* container, uint8_t full)
{
    uint8_t summery = __builtin_ctz(container->summary_bitmap);

    if (summery == NULL) 
    {
        full = 1;
        return NULL;
    }
    uint8_t word = __builtin_ctzll(container->word_bitmap[summery]);
    uint8_t slot = __builtin_ctzll(container->slot_bitmap[word]);
    
    uint16_t index = (((summery * 32) + word) * 64) + slot;
    // how do we know none is full? throw summery right then what it will return?

    // ser used as marked
    container->slot_bitmap[word] &= ~(1ULL << slot);

    // check if slot is full
    if (container->slot_bitmap[word] == 0)
    {
        container->word_bitmap[summery] &= ~(1ULL << word);
        container->summary_bitmap &= ~(1U << summery);
    }

    if (container->summary_bitmap == 0)
    {
        full = 1;
    }

    return index;
}

/*
=========================[ Arena] ========================
*/

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



// old one cant be used anymore because random pointer access 
// to reduse it wwe will pack everything in 1 just not the actual memory
// typedef struct
// {
//     uint8_t* free_bitmap_words;
//     uint8_t* memory;
//     uint16_t free_word_top;
//     uint16_t slot_size;
//     uint64_t* bitmap;

// } Container;
// static Container* _create_container( uint16_t slot_size )
// {
//     if (slot_size > MAX_SLOT_SIZE) return NULL;

//     // Initializing
//     uint8_t* memory = malloc( slot_size * MAX_SLOT );
//     uint8_t* free_bitmap_words = malloc((MAX_SLOT + 63) / 64);
//     uint64_t* bitmap = create_bitmap(MAX_SLOT);
//     Container* container = malloc(sizeof(Container));

//     if (
//         memory == NULL ||
//         bitmap == NULL ||
//         container == NULL || 
//         free_bitmap_words == NULL
//     ){
//         free(free_bitmap_words);
//         free(memory);
//         free(bitmap);
//         free(container);
//         return NULL;
//     }

//     uint32_t word_count = (MAX_SLOT + 63) / 64;
//     for (uint32_t i = 0; i < word_count; i++)
//     {
//         free_bitmap_words[i] = i;
//     }

//     // creating object 
//     container -> memory = memory;
//     container -> bitmap = bitmap;
//     container -> free_bitmap_words = free_bitmap_words;
//     container -> slot_size = slot_size;
//     container -> free_word_top = word_count-1;
//     return container;
// }

// static void _destroy_container(Container* container){
//     if (container == NULL) return;
//     free(container -> free_bitmap_words);
//     free(container -> memory);
//     free(container -> bitmap);
//     free(container);
// }