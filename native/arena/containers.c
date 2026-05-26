#include "containers.h"
#include "utils.h"
#include <stdlib.h>
#include <string.h>



Container* container_create( uint16_t slot_size )
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
    container->used_count = 0;
    return container;
}


inline void container_destroy( Container* container )
{
    if (container == NULL) return;

    free(container -> memory);
    free(container);
}


inline uint16_t container_alloc( Container* container, uint8_t* full )
{
    if (container == NULL) return UINT16_MAX;
    // we never need to check because if its not free arena would never call it
    // uint8_t summery = __builtin_ctz(container->summary_bitmap);
    // if (summery == NULL){ full = 1; return NULL; }
    
    // finding the free slot
    uint8_t summery_idx = __builtin_ctz(container->summary_bitmap);
    uint8_t word_idx = __builtin_ctzll(container->word_bitmap[summery_idx]);
    uint8_t slot_word_idx = (summery_idx * 32) + word_idx;
    uint8_t slot_idx = __builtin_ctzll(container->slot_bitmap[slot_word_idx]);

    // calculating index 
    uint16_t index = (slot_word_idx * 64) + slot_idx;
    
    // update bits for empty of full
    container->slot_bitmap[slot_word_idx] &= ~(1ULL << slot_idx);

    container->word_bitmap[summery_idx] &= ~(
        - (container->slot_bitmap[slot_word_idx] == 0) 
        & (1U << word_idx)
    );
    container->summary_bitmap &= ~(
        - (container->word_bitmap[summery_idx] == 0) 
        & (1U << summery_idx)
    );

    // update the status and return
    *full = container->summary_bitmap == 0;
    container->used_count++;
    return index;
}


inline void* container_access( Container* container, uint16_t index )
{
    return (container != NULL && index < MAX_SLOT) 
        ? (container->memory + (index * container->slot_size))
        : NULL;
}


inline void container_free( Container* container, uint16_t index, uint8_t* free)
{
    if (container == NULL || index >= MAX_SLOT) return;

    uint8_t slot_index = index >> 6;
    uint8_t word_index = slot_index >> 5;

    container->slot_bitmap[slot_index] |= (1ULL << (index & 63));
    container->word_bitmap[word_index] |= (1U << (slot_index & 31));
    container->summary_bitmap |= (1U << word_index);

    container->used_count--;
    *free = container->used_count == 0;
}

// nice but we gonna use binary stuff >> and & :0 because its power of 2
// about why because / this is cheap but mod is definitely not cheap so :)
// void container_free( Container* container, uint16_t index )
// {
//     if (container == NULL || index >= MAX_SLOT) return;
//     uint8_t slot_index = index / 64;
//     uint8_t word_index = slot_index / 32;
//     container->slot_bitmap[slot_index] |= (1ULL << index % 64);
//     container->word_bitmap[word_index] |= (1U << slot_index % 32);
//     container->summary_bitmap |= (1U << word_index);
// }