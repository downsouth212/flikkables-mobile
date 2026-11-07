import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Loader2, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function HomeLocationChanger({ user, userLocation, onLocationChanged }) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateHomeLocation = async () => {
    if (!userLocation) {
      toast.error('Current location not available');
      return;
    }

    setIsUpdating(true);
    try {
      // Get location name from coordinates
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Given coordinates ${userLocation.lat}, ${userLocation.lng}, return just the city/region and country name. Be brief, like "Paris, France" or "Tokyo, Japan".`,
        response_json_schema: {
          type: "object",
          properties: {
            location: { type: "string" }
          }
        }
      });

      const locationName = response.location || 'Unknown location';

      // Update user home location
      await base44.auth.updateMe({
        home_lat: userLocation.lat,
        home_lng: userLocation.lng,
        home_location_name: locationName
      });

      // Don't close the modal, just show success message
      toast.success('Home location successfully updated!');
      
      // Optionally call the callback but don't trigger navigation
      if (onLocationChanged) {
        onLocationChanged();
      }
    } catch (err) {
      toast.error('Failed to update home location: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="w-5 h-5 text-blue-600" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-700">Home Location</p>
          <p className="text-xs text-gray-500">{user?.home_location_name || 'Not set'}</p>
        </div>
      </div>

      {userLocation && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700 mb-2">
            <AlertCircle className="w-3 h-3 inline mr-1" />
            Traveling? Update your home location to your current position.
          </p>
          <Button
            size="sm"
            onClick={handleUpdateHomeLocation}
            disabled={isUpdating}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Set Home to Current Location
              </>
            )}
          </Button>
        </div>
      )}
    </Card>
  );
}