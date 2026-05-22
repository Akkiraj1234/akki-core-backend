#include "containers.h"
#include "utils.c"
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
    return container;
}


inline void container_destroy( Container* container )
{
    if (container == NULL) return;

    free(container -> memory);
    free(container);
}


inline uint32_t container_alloc( Container* container, uint8_t* full )
{
    if (container == NULL) return;
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
    return index;
}


inline void* container_access( Container* container, uint16_t index )
{
    return (container != NULL && index < MAX_SLOT) 
        ? (container->memory + (index * container->slot_size))
        : NULL;
}


void container_free( Container* container, uint16_t index );
{
    if (container == NULL) return;
}