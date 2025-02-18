// Import your database client/ORM here, e.g. Prisma
import { PrismaClient } from '@prisma/client';
import { Property, PropertyDetails, CombinedPropertyDetails, PropertyTags } from './definitions';
import { BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from './dynamodb';
import { callClaudeHaikuAPI } from '@/app/lib/claude';
// Import the redis client that points to ElastiCache
// import { redis } from '@/app/lib/redis';

const prisma = new PrismaClient();

export async function fetchPropertiesRDS(params: {text: string; neighborhood: string; minPrice: string; maxPrice: string; brokerFee: string}) {
  const limit = 10;
  const page = 1;
  const skip = (page - 1) * limit;

  // Destructure parameters
  const { neighborhood, minPrice, maxPrice, brokerFee } = params;

  // Build the where condition based on provided filters
  const whereCondition: any = {};

  if (neighborhood) {
    whereCondition.neighborhood = {
      equals: neighborhood,
      mode: 'insensitive'
    };
  }

  if (minPrice || maxPrice) {
    whereCondition.price = {};
    if (minPrice) {
      whereCondition.price.gte = Number(minPrice);
    }
    if (maxPrice) {
      whereCondition.price.lte = Number(maxPrice);
    }
  }

  // if (brokerFee) {
  //   whereCondition.brokerFee = {
  //     equals: brokerFee,
  //     mode: 'insensitive'
  //   };
  // }

  try {
    const properties = await prisma.dim_property_details.findMany({
      where: whereCondition,
      take: limit,
      skip: skip,
    });

    const formattedProperties = properties.map(property => ({
      ...property,
      price: property.price ? property.price.toNumber() : 0,
      latitude: property.latitude ? String(property.latitude) : 0,
      longitude: property.longitude ? String(property.longitude) : 0,
      listed_at: property.listed_at ? property.listed_at.toDateString() : '',
      closed_at: property.closed_at ? property.closed_at.toDateString() : '',
      available_from: property.available_from ? property.available_from.toDateString() : '',
      entered_at: property.entered_at ? property.entered_at.toDateString() : '',
    }))

    return formattedProperties as Property[];
  } catch (error) {
    console.error('Error fetching properties with Prisma:', error);
    throw error;
  }
}

export async function fetchProperties(params: { text: string; neighborhood: string; minPrice: string; maxPrice: string; brokerFee: string }) {
    try {
      const dummyData: Property[] = [
        {
            id: '1',
            status: 'Available',
            listed_at: '2025-01-01T10:00:00Z',
            closed_at: '',
            days_on_market: 10,
            available_from: '2025-02-01T00:00:00Z',
            address: '123 Main St #4B',
            price: 5000,
            borough: 'Brooklyn',
            neighborhood: 'Williamsburg',
            zipcode: '11211',
            property_type: 'Condo',
            sqft: 850,
            bedrooms: 2,
            bathrooms: 1,
            type: 'Sale',
            latitude: '40.7142700',
            longitude: '-73.9614800',
            amenities: 'Elevator, Doorman, Gym, Roof Deck, In-Unit Laundry',
            built_in: '2015',
            building_id: 'bldg_001',
            agents: 'John Smith, Sarah Johnson',
            no_fee: false,
            entered_at: '2025-01-01T09:00:00Z'
        },
        {
            id: '2',
            status: 'In Contract',
            listed_at: '2025-01-15T14:30:00Z',
            closed_at: '',
            days_on_market: 5,
            available_from: '2025-03-01T00:00:00Z',
            address: '456 Park Ave #12A',
            price: 3000,
            borough: 'Manhattan',
            neighborhood: 'Upper East Side',
            zipcode: '10021',
            property_type: 'Co-op',
            sqft: 1200,
            bedrooms: 3,
            bathrooms: 2,
            type: 'Sale',
            latitude: 40.7681800,
            longitude: -73.9645100,
            amenities: 'Full-Time Doorman, Concierge, Private Storage, Bike Room, Pet Spa',
            built_in: '1925',
            building_id: 'bldg_002',
            agents: 'Michael Brown',
            no_fee: true,
            entered_at: '2025-01-15T13:00:00Z'
        },
        {
            id: '3',
            status: 'Available',
            listed_at: '2025-01-20T09:15:00Z',
            closed_at: '',
            days_on_market: 7,
            available_from: '2025-02-15T00:00:00Z',
            address: '789 Broadway #3C',
            price: 4500,
            borough: 'Manhattan',
            neighborhood: 'Greenwich Village',
            zipcode: '10003',
            property_type: 'Rental',
            sqft: 750,
            bedrooms: 1,
            bathrooms: 1,
            type: 'Rental',
            latitude: 40.7320100,
            longitude: -73.9927400,
            amenities: 'Elevator, Laundry in Building, Dishwasher, Central AC, Hardwood Floors',
            built_in: '2000',
            building_id: 'bldg_003',
            agents: 'Emily Davis, Robert Wilson',
            no_fee: false,
            entered_at: '2025-01-20T08:00:00Z'
        },
        {
            id: '4',
            status: 'Available',
            listed_at: '2025-01-18T11:45:00Z',
            closed_at: '',
            days_on_market: 9,
            available_from: '2025-03-01T00:00:00Z',
            address: '321 Court St #2F',
            price: 6000,
            borough: 'Brooklyn',
            neighborhood: 'Cobble Hill',
            zipcode: '11231',
            property_type: 'Condo',
            sqft: 925,
            bedrooms: 2,
            bathrooms: 2,
            type: 'Sale',
            latitude: 40.6882100,
            longitude: -73.9959400,
            amenities: 'Private Balcony, In-Unit Washer/Dryer, Storage Unit, Video Intercom',
            built_in: '2018',
            building_id: 'bldg_004',
            agents: 'Lisa Anderson',
            no_fee: true,
            entered_at: '2025-01-18T10:30:00Z'
        },
        {
            id: '5',
            status: 'Available',
            listed_at: '2025-01-22T13:20:00Z',
            closed_at: '',
            days_on_market: 5,
            available_from: '2025-02-01T00:00:00Z',
            address: '567 Vernon Blvd #8E',
            price: 3200,
            borough: 'Queens',
            neighborhood: 'Long Island City',
            zipcode: '11106',
            property_type: 'Rental',
            sqft: 680,
            bedrooms: 1,
            bathrooms: 1,
            type: 'Rental',
            latitude: 40.7559800,
            longitude: -73.9403400,
            amenities: 'Gym, Roof Deck, Package Room, Bike Storage, Pet Friendly',
            built_in: '2020',
            building_id: 'bldg_005',
            agents: 'David Chen, Maria Rodriguez',
            no_fee: false,
            entered_at: '2025-01-22T12:00:00Z'
        }
    ];


    // Repeat the data to create more listings
    const repeatedData = Array(3).fill(dummyData).flat().map((item, index) => ({
        ...item,
        id: `${index + 1}`, // Use index + 1 for increasing numbers starting from 1
        address: `${item.address} ${Math.floor(index / 5) + 1}`
    }));
        return repeatedData;

        const {
          text,
          neighborhood,
          minPrice,
          maxPrice,
          brokerFee,
        } = params;
    
        // 1) Optionally parse user's text with Claude
        let parsedText = text;
        try {
          parsedText = await callClaudeHaikuAPI(text);
        } catch (err) {
          console.error('Claude API error:', err);
          // fallback: just use raw text
        }
    
        // 2) Build the DB 'where' clause
        const whereClause: any = {};
    
        if (neighborhood) {
          whereClause.neighborhood = {
            contains: neighborhood,
            mode: 'insensitive',
          };
        }
    
        if (minPrice) {
          whereClause.price = { gte: Number(minPrice) };
        }
    
        if (maxPrice) {
          whereClause.price = {
            ...whereClause.price,
            lte: Number(maxPrice),
          };
        }
    
        if (brokerFee && brokerFee !== 'Any') {
          if (brokerFee === 'No Fee') {
            whereClause.brokerFee = 0;
          } else if (brokerFee.startsWith('Low Fee')) {
            whereClause.brokerFee = { lt: 10 };
          }
          // ... handle other fee scenarios
        }
    
        if (parsedText) {
          whereClause.OR = [
            { title: { contains: parsedText, mode: 'insensitive' } },
            { description: { contains: parsedText, mode: 'insensitive' } },
          ];
        }
    
        // 3) Generate a cache key from the user’s search parameters
        const cacheKey = `search:${JSON.stringify({
          text: parsedText,
          neighborhood,
          minPrice,
          maxPrice,
          brokerFee,
        })}`;
    
        // 4) Check the ElastiCache Redis for a cached result
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
          // Cache hit - parse and return immediately
          const cachedListings = JSON.parse(cachedData);
          return cachedListings
        }
    
        // 5) Cache miss - query the DB
        const listings = await prisma.property.findMany({
          where: whereClause,
          take: 50, // limit results if desired
        });
    
        // 6) Store results in Redis with an expiration (e.g. 5 min)
        // await redis.set(cacheKey, JSON.stringify(listings), 'EX', 60 * 5);
    
        // 7) Return fresh results
        
        return listings;
      } catch (error) {
        console.error(error);
        return [];
      }
}

export async function fetchPropertyDetailsById(ids: string[]): Promise<{ [key: string]: PropertyDetails }> {
  try {
    // For development/testing, return dummy data that matches the property IDs
    const dummyMediaData: { [key: string]: PropertyDetails } = {
      '1': {
        id: '1',
        description: 'Stunning Williamsburg condo with modern finishes and amazing views',
        entered_at: '2025-01-01T09:00:00Z',
        floorplans: [
          'https://example.com/floorplans/1_1.pdf',
          'https://example.com/floorplans/1_2.pdf'
        ],
        images: [
          'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop&fp-y=.7',
          'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop&fp-y=.3'
        ],
        videos: [
          'https://example.com/videos/1_tour.mp4'
        ]
      },
      '2': {
        id: '2',
        description: 'Luxurious Upper East Side co-op with park views and premium amenities',
        entered_at: '2025-01-15T13:00:00Z',
        floorplans: [
          'https://example.com/floorplans/2_1.pdf',
          'https://example.com/floorplans/2_2.pdf'
        ],
        images: [
          'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&fp-y=.6',
          'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&fp-y=.2'
        ],
        videos: [
          'https://example.com/videos/2_tour.mp4',
          'https://example.com/videos/2_amenities.mp4'
        ]
      },
      '3': {
        id: '3',
        description: 'Charming Greenwich Village rental with hardwood floors and high ceilings',
        entered_at: '2025-01-20T08:00:00Z',
        floorplans: [
          'https://example.com/floorplans/3_1.pdf'
        ],
        images: [
          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&fp-y=.8',
          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&fp-y=.4'
        ],
        videos: []
      },
      '4': {
        id: '4',
        description: 'Bright and spacious Cobble Hill condo with private outdoor space',
        entered_at: '2025-01-18T10:30:00Z',
        floorplans: [
          'https://example.com/floorplans/4_1.pdf',
          'https://example.com/floorplans/4_2.pdf'
        ],
        images: [
          'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&auto=format&fit=crop&fp-y=.7',
          'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&auto=format&fit=crop&fp-y=.3'
        ],
        videos: [
          'https://example.com/videos/4_tour.mp4'
        ]
      },
      '5': {
        id: '5',
        description: 'Modern Long Island City rental with stunning Manhattan skyline views',
        entered_at: '2025-01-22T12:00:00Z',
        floorplans: [
          'https://example.com/floorplans/5_1.pdf'
        ],
        images: [
          'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&auto=format&fit=crop&fp-y=.6',
          'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&auto=format&fit=crop&fp-y=.2'
        ],
        videos: [
          'https://example.com/videos/5_tour.mp4',
          'https://example.com/videos/5_amenities.mp4'
        ]
      }
    };

    // Repeat the data to create more listings
    const repeatedData = Object.values(dummyMediaData).reduce((acc, item, index) => {
      // Start with the original item
      acc[item.id] = item;
      
      // Create two more copies with continuing numbers
      for (let i = 1; i < 3; i++) {
        const newId = String(5 + (index * 2) + i);
        acc[newId] = {
          ...item,
          id: newId
        };
      }
      return acc;
    }, {} as { [key: string]: PropertyDetails });

    // Filter the dummy data to only include the IDs in the listing IDs
    const filteredData = Object.values(repeatedData).filter(item => ids.includes(item.id));

    console.log(ids);

    return filteredData.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {} as { [key: string]: PropertyDetails });

    // // Prepare the BatchGet command
    // const batchGetCommand = new BatchGetCommand({
    //   RequestItems: {
    //     'property_media': {
    //       Keys: ids.map(id => ({ id }))
    //     }
    //   }
    // });

    // // Execute the batch get operation
    // const response = await docClient.send(batchGetCommand);

    // if (!response.Responses || !response.Responses.property_media) {
    //   throw new Error('No responses received from DynamoDB');
    // }

    // // Convert array of results to a map keyed by id
    // const mediaDetailsMap = response.Responses.property_media.reduce((acc, item) => {
    //   if (item) {
    //     acc[item.id] = {
    //       id: item.id,
    //       description: item.description || '',
    //       entered_at: item.entered_at || new Date().toISOString(),
    //       floorplans: Array.isArray(item.floorplans) ? item.floorplans : [],
    //       images: Array.isArray(item.images) ? item.images : [],
    //       videos: Array.isArray(item.videos) ? item.videos : []
    //     };
    //   }
    //   return acc;
    // }, {} as { [key: string]: PropertyDetails });

    // // Handle any unprocessed items if they exist
    // if (response.UnprocessedKeys && Object.keys(response.UnprocessedKeys).length > 0) {
    //   console.warn('Some items were not processed:', response.UnprocessedKeys);
    // }

    // return mediaDetailsMap;
  } catch (error) {
    console.error('Failed to fetch listing details:', error);
    throw new Error('Failed to fetch listing details');
  }
}


export async function fetchPropertyTagsById(ids: string[]): Promise<Record<string, PropertyTags>> {
  try {
    const dummyPropertyTags = {
      '1': { 
        id: '1', 
        tags: [
          'New ✨', 
          'Price Drop 📉', 
          'Popular 🔥', 
          'Modern Design 🆕', 
          'Underpriced 🤫', 
          'Waterfront 🌊'
        ]
      },
      '2': { 
        id: '2', 
        tags: [
          'Luxury 💎', 
          'Great Deal 💰', 
          'Park View 🌳', 
          'Eco Friendly 🌿', 
          'Discounted 🔖', 
          'City Center 🏙️'
        ]
      },
      '3': { 
        id: '3', 
        tags: [
          'Renovated 🔨', 
          'Pet Friendly 🐾', 
          'Near Subway 🚇', 
          'Modern Design 🆕', 
          'Cozy 🔥', 
          'Gym 💪'
        ]
      },
      '4': { 
        id: '4', 
        tags: [
          'Open House 🏠', 
          'Price 📈', 
          'Solar Powered ☀️', 
          'Eco Friendly 🌿', 
          'Concierge Service 🤵', 
          'Bike Friendly 🚴'
        ]
      },
      '5': { 
        id: '5', 
        tags: [
          'Short Term 🕒', 
          'Furnished 🛋️', 
          'Home Office 💻', 
          'Eco Friendly 🌿', 
          'Modern Design 🆕', 
          'Close to Train Station 🚉', 
          'Walk Score High 🚶'
        ]
      }
    };

    const repeatedData = Object.values(dummyPropertyTags).reduce((acc, item, index) => {
      acc[item.id] = item;
      for (let i = 1; i < 3; i++) {
        const newId = String(5 + (index * 2) + i);
        acc[newId] = { ...item, id: newId, tags: [...item.tags, `Copy ${i} 🔄`] };
      }
      return acc;
    }, {} as Record<string, PropertyTags>);

    const filteredData = Object.values(repeatedData).filter(item => ids.includes(item.id));
    
    return filteredData.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {} as Record<string, PropertyTags>);
  } catch (error) {
    console.error(`Failed to fetch property tags for ids ${ids}:`, error);
    throw new Error(`Failed to fetch property tags for ids ${ids}`);
  }
}


export async function fetchPropertyPage(id: string): Promise<CombinedPropertyDetails> {
  try {
    // Fetch all relevant property details
    const properties = await fetchProperties({
      text: '',
      neighborhood: '',
      minPrice: '',
      maxPrice: '',
      brokerFee: 'Any',
    } as { text: string; neighborhood: string; minPrice: string; maxPrice: string; brokerFee: string });
    // Filter list of property dictionaries by id
    const property = properties.find((p: Property) => p.id === id);

    const propertyTags = await fetchPropertyTagsById([id]).then(data => data[id]);
    const propertyDetails = await fetchPropertyDetailsById([id]).then(data => data[id]);
    const propertyCombined = {...propertyDetails, ...propertyTags, ...property};
    return propertyCombined;
    
  } catch (error) {
    console.error(`Failed to fetch listing id ${id}:`, error);
    throw new Error(`Failed to fetch listing id ${id}`);
  }
}