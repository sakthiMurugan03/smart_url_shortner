import string

BASE62 = string.digits + string.ascii_letters

def encode_base62(num):
    result = []
    while num:
        num, rem = divmod(num, 62)
        result.append(BASE62[rem])
    return ''.join(reversed(result)) or "0"