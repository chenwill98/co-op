// Convert neighborhood text from, for example, hells-kitchen to Hells Kitchen for display purposes
export function FormatDisplayText(text?: string) {
  if (!text) return '';
  return text.replace(/-/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

// Format amenity name for display
export function formatAmenityName(name: string) {
  // Special formatting for certain amenities
  const amenityNameOverrides: Record<string, string> = {
      "central_ac": "Central AC",
      "pied_a_terre": "Pied-à-terre",
      "washer_dryer": "In-Unit Washer/Dryer",
      "nyc_evacuation_1": "NYC Evacuation Zone 1",
      "nyc_evacuation_2": "NYC Evacuation Zone 2",
      "nyc_evacuation_3": "NYC Evacuation Zone 3",
      "nyc_evacuation_5": "NYC Evacuation Zone 5",
      "nyc_evacuation_6": "NYC Evacuation Zone 6",
      "fios_available": "Fios Available",
      "co_purchase": "Co-Purchase Allowed",
      "childrens_playroom": "Children's Playroom",
      "live_in_super": "Live-in Super",
      "full_time_doorman": "Full-Time Doorman",
      "part_time_doorman": "Part-Time Doorman",
      "virtual_doorman": "Virtual Doorman",
      "pets": "Allows Pets"
  };
  // Check if we have an override for this amenity name
  if (amenityNameOverrides[name]) {
      return amenityNameOverrides[name];
  }

  // Default formatting
  return name
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
}
