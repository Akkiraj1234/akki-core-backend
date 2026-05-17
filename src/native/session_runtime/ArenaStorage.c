#include "ArenaStorage.h"
#include <stdlib.h>
#include <string.h>

// do not change these value everything 
// optimize for these value only
#define MAX_CONTAINER 255
#define MAX_SLOT_SIZE 320
#define MAX_SLOT 8192
#define BITMAP_WORD_COUNT ((MAX_SLOT + 63) / 64)


static void set_bitmap_format(uint32_t slot_count, uint64_t* bitmap, uint32_t bitmap_size)
{
    if (bitmap == NULL) return;
    memset(bitmap, 0xFF, bitmap_size);

    uint32_t valid_tail_bits = slot_count % 64;
    if (valid_tail_bits == 0) return;
    
    uint64_t mask = (1ULL << valid_tail_bits) - 1;
    uint32_t last_index = (slot_count + 63) / 64 - 1;
    bitmap[last_index] &= mask;
}


static uint64_t* create_bitmap(uint32_t slot_count){

    uint32_t bitmap_size = (slot_count + 63 ) / 64 * sizeof(uint64_t);
    uint64_t* bitmap = malloc(bitmap_size);
    if (bitmap == NULL) return NULL;

    set_bitmap_format(
        slot_count,
        bitmap,
        bitmap_size
    );

    return bitmap;
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
    set_bitmap_format(
        MAX_SLOT,
        container->bitmap,
        sizeof(container->bitmap)
    );

    for (uint32_t i = 0; i < BITMAP_WORD_COUNT; i++)
    {
        container->free_bitmap_words[i] = i;
    }

    container->memory = memory;
    container->free_word_top = BITMAP_WORD_COUNT-1;
    container->slot_size = slot_size;
    return container;
}

static inline void _destroy_container(Container* container){
    if (container == NULL) return;

    free(container -> memory);
    free(container);
}


static inline uint32_t _container_insert(Container* container, const void* data)
{

}

void arena_insert(Arena* arena)
{
    // idk how to do that the api degine
    // data dierctly should be written in container
    // and its called _container_insert so?
}

// correctness
// insertion
// deletion
// slot lookup
// bitmap updates
// testing
// edge cases



Arena* arena_create(
    uint8_t max_container,
    uint16_t slot_size
)
{
    if (max_container > MAX_CONTAINER || slot_size > MAX_SLOT_SIZE){
        return NULL;
    }

    Arena* arena = malloc(sizeof(arena));


    Container* containers = malloc(
        sizeof(Container*) * max_container
    );



    

    // creating container here
    Container* containers = malloc( 
        sizeof(Container*) * max_container 
    );

    Container* container = _create_container(
        slot_size,
        container_capacity
    );  
    Arena* arena = malloc(sizeof(Arena));

    if (
        containers == NULL ||
        container == NULL ||
        arena == NULL
    ){
        _destroy_container(container);
        free(containers);
        free(arena);
        return NULL;
    }

    for (uint32_t i = 0; i < max_container; i++)
    {
        containers[i] = NULL;
    }

    containers[0] = container;
    arena -> containers = containers;
    arena -> max_containers = max_container;
    arena -> free_container_index = 0;
    arena -> slot_size = slot_size;
    arena -> container_capacity = container_capacity;
    return arena;
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