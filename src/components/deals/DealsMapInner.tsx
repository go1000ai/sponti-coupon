'use client';

import { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { Navigation, Search } from 'lucide-react';
import { DealTypeBadge } from '@/components/ui/SpontiBadge';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import type { Deal } from '@/lib/types/database';

// Fix leaflet default icon
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;

const spontiIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="28" height="42"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#E8632B"/><circle cx="12" cy="12" r="6" fill="white"/><text x="12" y="15" text-anchor="middle" fill="#E8632B" font-size="10" font-weight="bold">S</text></svg>`),
  iconSize: [28, 42],
  iconAnchor: [14, 42],
  popupAnchor: [0, -42],
});

const steadyIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="28" height="42"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#29ABE2"/><circle cx="12" cy="12" r="6" fill="white"/><text x="12" y="15" text-anchor="middle" fill="#29ABE2" font-size="10" font-weight="bold">D</text></svg>`),
  iconSize: [28, 42],
  iconAnchor: [14, 42],
  popupAnchor: [0, -42],
});

const userIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#3B82F6" stroke="white" stroke-width="3"/><circle cx="12" cy="12" r="4" fill="white"/></svg>`),
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});

function DealPopupCard({ deal }: { deal: Deal }) {
  const vendor = deal.vendor;
  const distance = (deal as Deal & { distance?: number }).distance;

  return (
    <div className="w-60">
      <div className="flex items-start gap-2 mb-2">
        <DealTypeBadge type={deal.deal_type} size="sm" />
        <span className="text-xs font-bold text-primary-500 bg-primary-50 px-2 py-0.5 rounded-full">
          {formatPercentage(deal.discount_percentage)} OFF
        </span>
      </div>
      <Link
        href={`/deals/${deal.id}`}
        className="font-bold text-sm text-secondary-500 hover:text-primary-500 transition-colors line-clamp-2 block"
      >
        {deal.title}
      </Link>
      {vendor && (
        <p className="text-xs text-gray-500 mt-1">{vendor.business_name}</p>
      )}
      <div className="flex items-center gap-2 mt-2">
        <span className="text-gray-400 line-through text-xs">{formatCurrency(deal.original_price)}</span>
        <span className="text-primary-500 font-bold text-sm">{formatCurrency(deal.deal_price)}</span>
      </div>
      {distance != null && (
        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
          <Navigation className="w-3 h-3" />
          {distance.toFixed(1)} miles away
        </div>
      )}
      <Link
        href={`/deals/${deal.id}`}
        className="mt-3 block text-center bg-gradient-to-r from-primary-500 to-orange-500 text-white text-xs font-semibold py-2 rounded-lg hover:from-primary-600 hover:to-orange-600 transition-all"
      >
        View Deal
      </Link>
    </div>
  );
}

// Detects when the user pans/zooms and shows "Search this area"
function MapMoveHandler({ onMoved }: { onMoved: (center: { lat: number; lng: number }, radiusMiles: number) => void }) {
  useMapEvents({
    moveend(e) {
      const map = e.target;
      const center = map.getCenter();
      const bounds = map.getBounds();
      // Calculate approximate radius in miles from center to corner
      const ne = bounds.getNorthEast();
      const distMeters = center.distanceTo(ne); // meters
      const distMiles = distMeters / 1609.34;
      onMoved({ lat: center.lat, lng: center.lng }, Math.ceil(distMiles));
    },
  });
  return null;
}

interface DealsMapInnerProps {
  deals: Deal[];
  userLocation?: { lat: number; lng: number } | null;
  onSearchArea?: (center: { lat: number; lng: number }, radiusMiles: number) => void;
}

export default function DealsMapInner({ deals, userLocation, onSearchArea }: DealsMapInnerProps) {
  const [mapMoved, setMapMoved] = useState(false);
  const [pendingSearch, setPendingSearch] = useState<{ center: { lat: number; lng: number }; radius: number } | null>(null);

  const geoDeals = useMemo(
    () => deals.filter(d => d.vendor?.lat && d.vendor?.lng),
    [deals]
  );

  const center = useMemo(() => {
    if (userLocation) return [userLocation.lat, userLocation.lng] as [number, number];
    if (geoDeals.length > 0) {
      const avgLat = geoDeals.reduce((s, d) => s + (d.vendor?.lat || 0), 0) / geoDeals.length;
      const avgLng = geoDeals.reduce((s, d) => s + (d.vendor?.lng || 0), 0) / geoDeals.length;
      return [avgLat, avgLng] as [number, number];
    }
    return [25.7617, -80.1918] as [number, number];
  }, [userLocation, geoDeals]);

  const handleMapMoved = useCallback((newCenter: { lat: number; lng: number }, radiusMiles: number) => {
    if (!onSearchArea) return;
    setPendingSearch({ center: newCenter, radius: radiusMiles });
    setMapMoved(true);
  }, [onSearchArea]);

  const handleSearchArea = useCallback(() => {
    if (pendingSearch && onSearchArea) {
      onSearchArea(pendingSearch.center, pendingSearch.radius);
      setMapMoved(false);
    }
  }, [pendingSearch, onSearchArea]);

  return (
    <div className="relative">
      {/* Map legend */}
      <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 text-xs space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary-500" />
          <span className="text-gray-600">Sponti Coupons</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent-500" />
          <span className="text-gray-600">Steady Deals</span>
        </div>
        {userLocation && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow" />
            <span className="text-gray-600">Your Location</span>
          </div>
        )}
        <div className="border-t border-gray-100 pt-1 text-gray-400">
          {geoDeals.length} deal{geoDeals.length !== 1 ? 's' : ''} on map
        </div>
      </div>

      {/* "Search this area" button — appears after user pans/zooms */}
      {mapMoved && onSearchArea && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000]">
          <button
            onClick={handleSearchArea}
            className="flex items-center gap-2 bg-white shadow-lg border border-gray-200 rounded-full px-5 py-2.5 text-sm font-semibold text-secondary-500 hover:bg-gray-50 hover:shadow-xl transition-all"
          >
            <Search className="w-4 h-4 text-primary-500" />
            Search this area
          </button>
        </div>
      )}

      {/* Map */}
      <div className="w-full h-[500px] sm:h-[600px] rounded-2xl overflow-hidden shadow-xl border border-gray-200">
        <MapContainer
          center={center}
          zoom={12}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {onSearchArea && <MapMoveHandler onMoved={handleMapMoved} />}

          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
              <Popup>
                <div className="text-center text-sm font-medium">You are here</div>
              </Popup>
            </Marker>
          )}

          {geoDeals.map(deal => (
            <Marker
              key={deal.id}
              position={[deal.vendor!.lat!, deal.vendor!.lng!]}
              icon={deal.deal_type === 'sponti_coupon' ? spontiIcon : steadyIcon}
            >
              <Popup maxWidth={280} minWidth={260}>
                <DealPopupCard deal={deal} />
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {deals.length > geoDeals.length && (
        <p className="text-xs text-gray-400 mt-2 text-center">
          {deals.length - geoDeals.length} deal{deals.length - geoDeals.length !== 1 ? 's' : ''} not shown (no location data)
        </p>
      )}
    </div>
  );
}
