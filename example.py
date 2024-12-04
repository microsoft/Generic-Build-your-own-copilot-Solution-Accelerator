import math
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(_name_)

def calculate_area_of_circle(radius):
    """
    Calculate the area of a circle given its radius.

    Args:
        radius (float): Radius of the circle.

    Returns:
        float: Area of the circle.
    """
    if radius < 0:
        raise ValueError("Radius cannot be negative")
    return math.pi * radius ** 2

def main():
    """
    Main function to demonstrate a simple calculation.
    """
    try:
        radius = 5.0
        area = calculate_area_of_circle(radius)
        logger.info(f"Area of circle with radius {radius}: {area:.2f}")
    except ValueError as e:
        logger.error(f"An error occurred: {e}")

if _name_ == "_main_":
    main()