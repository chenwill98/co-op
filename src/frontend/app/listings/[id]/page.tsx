import { Property } from '@/app/lib/definitions';
import { notFound } from 'next/navigation';
import { fetchPropertyPage } from '@/app/lib/data';

export default async function PropertyPage({ params }: { params: { id: string } }) {
  const propertyId = await params.id;
  const property = await fetchPropertyPage(propertyId);

  if (!property) {
    return <div className="container mx-auto px-4 py-8">Property not found</div>;
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-xl overflow-hidden">
        {/* Header Section */}
        <div className="p-6 border-b">
          <h1 className="text-3xl font-bold text-gray-900">{property.address}</h1>
          <div className="mt-2 flex items-center gap-4">
            <span className="badge badge-primary">{property.status}</span>
            <span className="text-gray-600">{property.neighborhood}, {property.borough}</span>
          </div>
          <p className="text-2xl font-bold text-primary mt-4">
            ${property.price.toLocaleString()}
          </p>
        </div>

        {/* Property Details */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Property Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">Bedrooms</p>
                <p className="font-semibold">{property.bedrooms}</p>
              </div>
              <div>
                <p className="text-gray-600">Bathrooms</p>
                <p className="font-semibold">{property.bathrooms}</p>
              </div>
              <div>
                <p className="text-gray-600">Square Feet</p>
                <p className="font-semibold">{property.sqft.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-600">Property Type</p>
                <p className="font-semibold">{property.property_type}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Location</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">Neighborhood</p>
                <p className="font-semibold">{property.neighborhood}</p>
              </div>
              <div>
                <p className="text-gray-600">Borough</p>
                <p className="font-semibold">{property.borough}</p>
              </div>
              <div>
                <p className="text-gray-600">Zipcode</p>
                <p className="font-semibold">{property.zipcode}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Amenities Section */}
        <div className="p-6 border-t">
          <h2 className="text-xl font-semibold mb-4">Amenities</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {property.amenities.split(',').map((amenity, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full"></span>
                <span>{amenity.trim()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dates Section */}
        <div className="p-6 border-t">
          <h2 className="text-xl font-semibold mb-4">Important Dates</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-gray-600">Listed Date</p>
              <p className="font-semibold">{new Date(property.listed_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Available From</p>
              <p className="font-semibold">{new Date(property.available_from).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Days on Market</p>
              <p className="font-semibold">{property.days_on_market} days</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
