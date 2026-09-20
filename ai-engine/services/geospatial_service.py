import math
from typing import Tuple, Optional

# Earth's radius in meters
EARTH_RADIUS_METERS = 6371000.0
DEFAULT_DUPLICATE_RADIUS_METERS = 100.0


def calculate_haversine_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    """
    Calculate the great-circle distance between two geographic points
    on Earth using the Haversine formula. Returns distance in meters.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    distance = EARTH_RADIUS_METERS * c

    return round(distance, 2)


def is_within_radius(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
    radius_meters: float = DEFAULT_DUPLICATE_RADIUS_METERS,
) -> Tuple[bool, float]:
    """Check if point 2 is within radius_meters of point 1."""
    distance = calculate_haversine_distance(lat1, lon1, lat2, lon2)
    return (distance <= radius_meters, distance)
