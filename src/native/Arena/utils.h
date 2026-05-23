#ifndef UTILS_H
#define UTILS_H

#include <stdint.h>

void set_bitmap_format_u64(
    uint32_t slot_count,
    uint64_t* bitmap,
    uint32_t bitmap_size
);

void set_bitmap_format_u32(
    uint32_t slot_count,
    uint32_t* bitmap,
    uint32_t bitmap_size
);

#endif