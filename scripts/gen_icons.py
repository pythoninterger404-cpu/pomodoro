import struct, zlib, os

os.makedirs('public', exist_ok=True)

def create_pixels(width, height):
    raw = b''
    cx, cy = width // 2, height // 2
    r_outer = width // 2 - 12
    r_inner = width // 2 - 20
    for y in range(height):
        raw += b'\x00'
        for x in range(width):
            dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            corner_x = abs(x - cx)
            corner_y = abs(y - cy)
            is_corner = corner_x > width // 2 - 24 and corner_y > height // 2 - 24
            if r_inner <= dist <= r_outer:
                raw += bytes([217, 164, 65, 255])
            elif dist < r_inner:
                raw += bytes([26, 29, 36, 255])
            elif is_corner:
                raw += bytes([0, 0, 0, 0])
            else:
                raw += bytes([26, 29, 36, 255])
    return raw

def make_png(width, height, pixels):
    def chunk(ctype, data):
        c = ctype + data
        crc = zlib.crc32(c) & 0xffffffff
        return struct.pack('>I', len(data)) + c + struct.pack('>I', crc)
    header = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    raw = zlib.compress(pixels)
    idat = chunk(b'IDAT', raw)
    iend = chunk(b'IEND', b'')
    return header + ihdr + idat + iend

for size, fname in [(180, 'icon-180.png'), (192, 'icon-192.png'), (512, 'icon-512.png')]:
    pixels = create_pixels(size, size)
    data = make_png(size, size, pixels)
    path = os.path.join('public', fname)
    with open(path, 'wb') as f:
        f.write(data)
    print(f'{fname}: {len(data)} bytes')
print('Done.')
