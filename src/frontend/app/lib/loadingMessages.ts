/**
 * NYC-themed loading messages for the chat UI
 */
export const NYC_LOADING_MESSAGES = [
  "Feeding the subway rats...",
  "Making radiators extra creaky...",
  "Dodging Times Square tourists...",
  "Waiting for the L train...",
  "Checking for rooftop access...",
  "Negotiating with the bodega cat...",
  "Measuring closet-sized bedrooms...",
  "Converting bathtubs to kitchens...",
  "Bribing the super...",
  "Decoding broker fees...",
  "Searching for actual sunlight...",
  "Counting exposed brick...",
  "Verifying 'cozy' means tiny...",
  "Inspecting fire escapes...",
  "Testing water pressure...",
  "Listening for upstairs neighbors...",
  "Calculating walk-up calories...",
  "Checking if 'renovated' means paint...",
  "Finding the hidden garbage room...",
  "Confirming 'spacious' is relative...",
  "Asking the bodega guy for advice...",
  "Checking subway proximity claims...",
  "Measuring that 'chef's kitchen'...",
  "Investigating mysterious building smells...",
  "Evaluating laundry room vibes...",
  "Counting steps to the train...",
  "Verifying the roof deck exists...",
  "Assessing natural light angles...",
  "Reading between the listing lines...",
  "Consulting the building's oldest tenant...",
];

/**
 * Get a random NYC-themed loading message
 */
export function getRandomLoadingMessage(): string {
  return NYC_LOADING_MESSAGES[
    Math.floor(Math.random() * NYC_LOADING_MESSAGES.length)
  ];
}
