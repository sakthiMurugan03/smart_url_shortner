from user_agents import parse

def get_device(user_agent):
    ua = parse(user_agent)
    if ua.is_mobile:
        return "mobile"
    elif ua.is_tablet:
        return "tablet"
    elif ua.is_pc:
        return "desktop"
    return "unknown"