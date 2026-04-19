import string

BASE62 = string.digits + string.ascii_letters

def encode_base62(num):
    if num == 0:
        return BASE62[0]

    result = []
    while num:
        num, rem = divmod(num, 62)
        result.append(BASE62[rem])

    return ''.join(reversed(result))