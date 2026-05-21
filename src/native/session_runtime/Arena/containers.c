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


inline uint32_t container_alloc( Container* container, uint8_t full )
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


inline void* container_access( Container* container, uint16_t index )
{

}


void container_free( Container* container, uint16_t index );
{
    
}