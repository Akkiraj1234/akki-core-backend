#include <stdlib.h>
#include <string.h>
#include <stdint.h>

void set_bitmap_format_u64(uint32_t slot_count, uint64_t* bitmap, uint32_t bitmap_size)
{
    if (bitmap == NULL) return;
    memset(bitmap, 0xFF, bitmap_size);

    uint32_t valid_tail_bits = slot_count & 63; //slot_count % 64
    if (valid_tail_bits == 0) return;
    
    uint64_t mask = (1ULL << valid_tail_bits) - 1;
    uint32_t last_index = ((slot_count + 63) >> 6) - 1; //slot_count / 64
    bitmap[last_index] &= mask;
}


void set_bitmap_format_u32(uint32_t slot_count, uint32_t* bitmap, uint32_t bitmap_size)
{
    if (bitmap == NULL) return;
    memset(bitmap, 0xFF, bitmap_size);

    uint32_t valid_tail_bits = slot_count & 31; //slot_count % 32
    if (valid_tail_bits == 0) return;

    uint32_t mask = (1U << valid_tail_bits) -1;
    uint32_t last_index = ((slot_count + 31) >> 5) -1; ////slot_count / 32
    bitmap[last_index] &= mask;
}