"use client";

import * as React from "react";
import Map, { Marker, NavigationControl, type MapRef, type MarkerDragEvent } from "react-map-gl/maplibre";
import * as maplibregl from "maplibre-gl";
import {
  MapPin,
  Navigation,
  Search,
  X,
  Check,
  Compass,
  Building2,
  Plane,
  ShoppingBag,
  Sparkles,
  Loader2,
  Truck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Real accurate coordinates for InstaCar Pavia Hub, Iloilo
export const BRANCH_COORDS = {
  lat: 10.7766,
  lng: 122.5444,
  name: "InstaCar Pavia Hub",
  address: "Instacar Car Rental Services, Pandac, Pavia, 5001 Iloilo",
};

export const DEFAULT_MAP_BRANCHES = [
  {
    id: 1,
    name: "InstaCar Pavia Hub (Main)",
    address: "Instacar Car Rental Services, Pandac, Pavia, 5001 Iloilo",
    lat: 10.7766,
    lng: 122.5444,
  },
  {
    id: 2,
    name: "Iloilo City Airport Branch",
    address: "Iloilo International Airport, Cabatuan, 5031 Iloilo",
    lat: 10.8329,
    lng: 122.4934,
  },
];

export const POPULAR_DESTINATIONS = [
  {
    name: "Iloilo International Airport",
    subtitle: "Cabatuan, Iloilo",
    lat: 10.8329,
    lng: 122.4934,
    icon: Plane,
  },
  {
    name: "Megaworld Festive Walk",
    subtitle: "Mandurriao, Iloilo City",
    lat: 10.7161,
    lng: 122.5488,
    icon: Building2,
  },
  {
    name: "SM City Iloilo",
    subtitle: "Benigno Aquino Ave, Mandurriao",
    lat: 10.7135,
    lng: 122.5518,
    icon: ShoppingBag,
  },
  {
    name: "Jaro Cathedral / Plaza",
    subtitle: "Jaro, Iloilo City",
    lat: 10.7247,
    lng: 122.5583,
    icon: MapPin,
  },
  {
    name: "Molo Plaza / Church",
    subtitle: "Molo, Iloilo City",
    lat: 10.6974,
    lng: 122.5412,
    icon: MapPin,
  },
];

// Classic "Normal" Map Style via Geoapify OSM-Carto (or universal OSM fallback if no key is supplied)
const getClassicMapStyle = (apiKey: string): string => {
  if (apiKey) {
    // Geoapify's classic, normal light OpenStreetMap cartography vector style
    return `https://maps.geoapify.com/v1/styles/osm-carto/style.json?apiKey=${apiKey}`;
  }
  // Universal standard fallback
  return "https://demotiles.maplibre.org/style.json";
};

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function calculateDeliveryFee(distanceKm: number): number {
  if (distanceKm <= 0.8) return 0; // At or adjacent to branch
  if (distanceKm <= 3) return 150; // Base Pavia delivery rate
  // Base ₱150 + ₱25 per additional km
  return Math.round(150 + (distanceKm - 3) * 25);
}

interface UberInteractiveMapProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialAddress?: string;
  onConfirmLocation: (data: {
    address: string;
    lat: number;
    lng: number;
    distanceKm: number;
    deliveryFee: number;
    mode?: "branch" | "delivery";
    branchId?: number;
    branchName?: string;
  }) => void;
  title?: string;
  branches?: Array<{ id: number; name: string; address?: string | null; lat?: number; lng?: number }>;
  initialMode?: "branch" | "delivery";
  allowBranchSelection?: boolean;
}

export function UberInteractiveMapDialog({
  open,
  onOpenChange,
  initialAddress = "",
  onConfirmLocation,
  title = "Choose Pickup Branch or Doorstep Delivery",
  branches,
  initialMode = "branch",
  allowBranchSelection = true,
}: UberInteractiveMapProps) {
  const mapRef = React.useRef<MapRef>(null);

  // Map branches list with coordinates fallback
  const branchList = React.useMemo(() => {
    if (!branches || branches.length === 0) return DEFAULT_MAP_BRANCHES;
    return branches.map((b, idx) => {
      const fallback = DEFAULT_MAP_BRANCHES[idx] || DEFAULT_MAP_BRANCHES[0];
      return {
        id: b.id,
        name: b.name,
        address: b.address || fallback.address,
        lat: b.lat ?? fallback.lat,
        lng: b.lng ?? fallback.lng,
      };
    });
  }, [branches]);

  const [activeMode, setActiveMode] = React.useState<"branch" | "delivery">(initialMode);
  const [selectedBranchId, setSelectedBranchId] = React.useState<number>(() => {
    return branchList[0]?.id || 1;
  });

  const [currentCoords, setCurrentCoords] = React.useState({
    lat: BRANCH_COORDS.lat,
    lng: BRANCH_COORDS.lng,
  });
  const [address, setAddress] = React.useState(initialAddress || BRANCH_COORDS.address);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<
    Array<{ display_name: string; lat: number; lng: number }>
  >([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isGeocoding, setIsGeocoding] = React.useState(false);
  const [isLocating, setIsLocating] = React.useState(false);

  const geoapifyApiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || "";

  // Classic Light OpenStreetMap cartography style
  const mapStyleUrl = React.useMemo(() => getClassicMapStyle(geoapifyApiKey), [geoapifyApiKey]);

  const distanceKm = React.useMemo(() => {
    return calculateDistanceKm(
      BRANCH_COORDS.lat,
      BRANCH_COORDS.lng,
      currentCoords.lat,
      currentCoords.lng,
    );
  }, [currentCoords]);

  const deliveryFee = React.useMemo(() => {
    return calculateDeliveryFee(distanceKm);
  }, [distanceKm]);

  // Reverse Geocoding with Geoapify (filtered to PH)
  const reverseGeocode = React.useCallback(async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      if (geoapifyApiKey) {
        // Geoapify Reverse Geocoding API with country filter
        const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&filter=countrycode:ph&apiKey=${geoapifyApiKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const firstFeature = data.features?.[0]?.properties;
          const firstResult = data.results?.[0];
          const best = firstFeature || firstResult;
          if (best) {
            const formatted =
              best.formatted ||
              `${best.name || best.street || "Location"}, ${best.city || best.county || "Iloilo"}`;
            setAddress(formatted);
            return;
          }
        }
      }

      // Fallback to OpenStreetMap Nominatim if no Geoapify key is set
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { "Accept-Language": "en-US,en;q=0.9" } }
      );
      if (nomRes.ok) {
        const data = await nomRes.json();
        if (data.display_name) {
          const addr = data.address || {};
          const parts = [
            addr.amenity || addr.building || addr.road,
            addr.suburb || addr.neighbourhood || addr.village,
            addr.city || addr.town || addr.municipality || "Iloilo",
          ].filter(Boolean);
          const formatted = parts.length > 0 ? parts.join(", ") : data.display_name;
          setAddress(formatted);
          return;
        }
      }
    } catch {
      // Ignore network errors and keep coordinate label
    } finally {
      setIsGeocoding(false);
    }
    setAddress(`Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
  }, [geoapifyApiKey]);

  // Center/Fly to coordinate smoothly
  const flyToCoords = React.useCallback((lat: number, lng: number, label?: string) => {
    setCurrentCoords({ lat, lng });
    if (label) setAddress(label);

    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [lng, lat],
        zoom: 16,
        duration: 1000,
        essential: true,
      });
    }

    if (!label) {
      reverseGeocode(lat, lng);
    }
  }, [reverseGeocode]);

  // Forward Geocoding / Autocomplete (Geoapify biased to Iloilo City 122.56, 10.72 and countrycode:ph)
  React.useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        if (geoapifyApiKey) {
          // Geoapify Autocomplete API with country filter (PH) and proximity bias (Iloilo City: 122.56, 10.72)
          const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
            searchQuery.trim()
          )}&filter=countrycode:ph&bias=proximity:122.56,10.72&limit=6&apiKey=${geoapifyApiKey}`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data.features && Array.isArray(data.features)) {
              const mapped = data.features.map((f: any) => ({
                display_name: f.properties.formatted || f.properties.address_line1 || f.properties.name,
                lat: f.properties.lat,
                lng: f.properties.lon,
              }));
              setSearchResults(mapped);
              return;
            }
          }
        }

        // Fallback to Nominatim if Geoapify key is not provided yet
        const queryWithContext = `${searchQuery.trim()}, Iloilo, Philippines`;
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            queryWithContext
          )}&limit=5&countrycodes=ph`,
          { headers: { "Accept-Language": "en-US,en;q=0.9" } }
        );
        if (nomRes.ok) {
          const list = await nomRes.json();
          setSearchResults(
            list.map((item: any) => ({
              display_name: item.display_name,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
            }))
          );
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, geoapifyApiKey]);

  // Handle autocomplete search selection
  const handleSelectSearchResult = (item: { display_name: string; lat: number; lng: number }) => {
    setSearchQuery("");
    setSearchResults([]);
    flyToCoords(item.lat, item.lng, item.display_name);
  };

  // Dragging the pin
  const handleMarkerDragEnd = (event: MarkerDragEvent) => {
    const nextLat = event.lngLat.lat;
    const nextLng = event.lngLat.lng;
    setCurrentCoords({ lat: nextLat, lng: nextLng });
    reverseGeocode(nextLat, nextLng);
  };

  // Clicking on map moves the pin
  const handleMapClick = (event: any) => {
    const clickedLat = event.lngLat.lat;
    const clickedLng = event.lngLat.lng;
    setCurrentCoords({ lat: clickedLat, lng: clickedLng });
    reverseGeocode(clickedLat, clickedLng);
  };

  // Geolocation trigger ("Use My Current Location")
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        flyToCoords(latitude, longitude);
      },
      (err) => {
        setIsLocating(false);
        alert(
          err.code === 1
            ? "Location permission denied. Please allow location access or choose a destination from the list."
            : "Could not retrieve your current location. Please search for your address or click directly on the map."
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Confirm and save location
  const handleConfirm = () => {
    if (activeMode === "branch") {
      const br = branchList.find((b) => b.id === selectedBranchId) || branchList[0];
      onConfirmLocation({
        address: br.address,
        lat: br.lat,
        lng: br.lng,
        distanceKm: 0,
        deliveryFee: 0,
        mode: "branch",
        branchId: br.id,
        branchName: br.name,
      });
    } else {
      onConfirmLocation({
        address,
        lat: currentCoords.lat,
        lng: currentCoords.lng,
        distanceKm,
        deliveryFee,
        mode: "delivery",
      });
    }
    onOpenChange(false);
  };

  // Reset viewport when dialog opens
  React.useEffect(() => {
    if (open && mapRef.current) {
      const timer = setTimeout(() => {
        mapRef.current?.resize();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[96vw] max-w-5xl p-0 h-[92vh] sm:h-[86vh] border border-[#2b2b2b] bg-[#121212] text-white overflow-hidden rounded-2xl sm:rounded-3xl flex flex-col shadow-2xl"
      >
        <DialogHeader className="hidden">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* ── TOP DEDICATED TOOLBAR (Sleek Dark Theme with Yellow Accents, Zero Overlap) ── */}
        <div className="bg-[#181818] border-b border-[#282828] px-4 py-2.5 sm:px-5 sm:py-3 flex items-center justify-between gap-3 shrink-0 z-30">
          {/* Mode Switcher Tabs */}
          {allowBranchSelection && (
            <div className="inline-flex rounded-xl bg-[#222222] p-1 border border-[#333333] gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveMode("branch");
                  const br = branchList.find((b) => b.id === selectedBranchId) || branchList[0];
                  if (br) {
                    setAddress(br.address);
                    flyToCoords(br.lat, br.lng, br.address);
                  }
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                  activeMode === "branch"
                    ? "bg-[#ffcc00] text-black font-black shadow-xs"
                    : "text-gray-400 hover:text-white"
                )}
              >
                <Building2 className="size-3.5" />
                <span>Pickup Branch (Free)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode("delivery")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                  activeMode === "delivery"
                    ? "bg-[#ffcc00] text-black font-black shadow-xs"
                    : "text-gray-400 hover:text-white"
                )}
              >
                <Truck className="size-3.5" />
                <span>Doorstep Delivery</span>
              </button>
            </div>
          )}

          {/* Autocomplete Search Input (when in Delivery mode) */}
          {activeMode === "delivery" ? (
            <div className="relative flex-1 max-w-md hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search street, hotel, mall in Iloilo (Geoapify)..."
                className="pl-9 pr-8 h-9 rounded-xl border border-[#333333] bg-[#222222] text-xs text-white placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-[#ffcc00]"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-[#ffcc00]" />
              )}
              {searchQuery && !isSearching && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              )}
              {/* Autocomplete Search Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 divide-y divide-[#333333] rounded-xl border border-[#333333] bg-[#1a1a1a] max-h-56 overflow-y-auto shadow-2xl z-[1000]">
                  {searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSearchResult(item)}
                      className="flex w-full items-start gap-2.5 p-2.5 text-left text-xs hover:bg-[#ffcc00]/15 transition cursor-pointer"
                    >
                      <MapPin className="size-4 shrink-0 text-[#ffcc00] mt-0.5" />
                      <span className="line-clamp-2 text-white font-medium">
                        {item.display_name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Branch Quick Selector in Header */
            <div className="hidden sm:flex items-center gap-2 overflow-x-auto flex-1 max-w-md">
              {branchList.map((b) => {
                const isSel = selectedBranchId === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setSelectedBranchId(b.id);
                      setAddress(b.address);
                      flyToCoords(b.lat, b.lng, b.address);
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border shrink-0 cursor-pointer",
                      isSel
                        ? "bg-[#ffcc00]/15 border-[#ffcc00] text-[#ffcc00] font-black"
                        : "border-[#333333] bg-[#222222] hover:bg-[#2c2c2c] text-gray-400 hover:text-white"
                    )}
                  >
                    <Building2 className="size-3" />
                    <span className="truncate max-w-[160px]">{b.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* SINGLE PRIMARY CLOSE BUTTON (Cleanly integrated into header bar) */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-9 items-center justify-center rounded-xl border border-[#333333] bg-[#222222] text-gray-300 hover:bg-[#ffcc00] hover:text-black hover:border-[#ffcc00] transition active:scale-95 cursor-pointer shrink-0"
            aria-label="Close location picker"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* MOBILE SEARCH (Visible on < sm when in delivery mode) */}
        {activeMode === "delivery" && (
          <div className="sm:hidden px-3 py-2 bg-[#181818] border-b border-[#282828]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search street, hotel, mall in Iloilo..."
                className="pl-9 pr-8 h-9 rounded-xl border border-[#333333] bg-[#222222] text-xs text-white placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-[#ffcc00]"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-[#ffcc00]" />
              )}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 divide-y divide-[#333333] rounded-xl border border-[#333333] bg-[#1a1a1a] max-h-48 overflow-y-auto shadow-2xl z-[1000]">
                  {searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSearchResult(item)}
                      className="flex w-full items-start gap-2 p-2 text-left text-xs hover:bg-[#ffcc00]/15 transition cursor-pointer"
                    >
                      <MapPin className="size-3.5 shrink-0 text-[#ffcc00] mt-0.5" />
                      <span className="line-clamp-2 text-white font-medium">
                        {item.display_name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── EXPANDED FULL INTERACTIVE MAP CANVAS (MapLibre GL + Classic Light OSM-Carto Vector Map) ── */}
        <div className="relative flex-1 w-full h-full min-h-[350px] bg-[#e5e3df]">
          <Map
            ref={mapRef}
            mapLib={maplibregl}
            initialViewState={{
              latitude: currentCoords.lat,
              longitude: currentCoords.lng,
              zoom: 15,
            }}
            mapStyle={mapStyleUrl}
            onClick={handleMapClick}
            cursor="crosshair"
            attributionControl={false}
            style={{ width: "100%", height: "100%" }}
          >
            {/* Top-Right Navigation Controls (Zoom & Pitch) */}
            <NavigationControl position="top-right" showCompass={false} />

            {/* Precision Draggable Needle-Tip Pin Marker */}
            <Marker
              latitude={currentCoords.lat}
              longitude={currentCoords.lng}
              anchor="bottom"
              draggable
              onDragEnd={handleMarkerDragEnd}
            >
              <div
                className="group relative cursor-grab active:cursor-grabbing select-none transition-transform duration-200 hover:scale-110"
                title="Drag to adjust exact location"
              >
                {/* Pulsing ring indicator */}
                <div className="absolute -inset-1.5 rounded-full bg-[#ffcc00]/50 animate-ping opacity-60 pointer-events-none" />

                {/* SVG Needle Pin with bottom center anchor */}
                <svg
                  width="36"
                  height="46"
                  viewBox="0 0 36 46"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.55))" }}
                >
                  <path
                    d="M18 1C8.611 1 1 8.611 1 18C1 30.2 18 45 18 45C18 45 35 30.2 35 18C35 8.611 27.389 1 18 1Z"
                    fill="#ffcc00"
                    stroke="#000000"
                    strokeWidth="2.5"
                  />
                  <circle cx="18" cy="18" r="7.5" fill="#000000" />
                  <circle cx="18" cy="18" r="3.5" fill="#ffffff" />
                </svg>
              </div>
            </Marker>
          </Map>

          {/* Quick Floating Action Controls */}
          <div className="absolute right-4 bottom-4 z-20 flex flex-col gap-2">
            {/* GPS "Use My Location" Button */}
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              title="Use My Current Location"
              className="flex size-10 items-center justify-center rounded-xl bg-[#1e1e1e] border border-[#333333] shadow-xl text-white hover:border-[#ffcc00] hover:text-[#ffcc00] transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isLocating ? (
                <Loader2 className="size-4 animate-spin text-[#ffcc00]" />
              ) : (
                <Navigation className="size-4 fill-current" />
              )}
            </button>

            {/* Reset to Pavia Hub */}
            <button
              type="button"
              onClick={() => flyToCoords(BRANCH_COORDS.lat, BRANCH_COORDS.lng, BRANCH_COORDS.address)}
              title="Reset to InstaCar Pavia Hub"
              className="flex size-10 items-center justify-center rounded-xl bg-[#1e1e1e] border border-[#333333] shadow-xl text-white hover:border-[#ffcc00] transition active:scale-95 cursor-pointer"
            >
              <Compass className="size-4 text-[#ffcc00]" />
            </button>
          </div>
        </div>

        {/* ── SLEEK DARK THEME BOTTOM CONFIRMATION SHEET ── */}
        <div className="bg-[#181818] border-t border-[#282828] px-4 py-3 sm:px-6 sm:py-3.5 shrink-0 z-30 space-y-2.5">
          {/* Row 1: Selected Address + Quick Distance & Fee Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                  {activeMode === "branch" ? "Pickup Branch" : "Selected Destination"}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-[#ffcc00] font-semibold">
                  <Sparkles className="size-3" /> Drag pin or click map to reposition
                </span>
                {isGeocoding && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#ffcc00] font-semibold">
                    <Loader2 className="size-3 animate-spin" /> Resolving address...
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs sm:text-sm font-bold text-white truncate">
                {address}
              </p>
            </div>

            {/* Distance & Fee Badges */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="rounded-lg border border-[#333333] bg-[#222222] px-2.5 py-1 text-right">
                <span className="block text-[9px] text-gray-400 font-semibold">Distance</span>
                <span className="text-xs font-black text-white">{distanceKm} km</span>
              </div>
              <div className="rounded-lg border border-[#ffcc00]/50 bg-[#ffcc00]/10 px-2.5 py-1 text-right">
                <span className="block text-[9px] font-bold text-[#ffcc00]">Fee</span>
                <span className="text-xs font-black text-white">
                  {activeMode === "branch" ? "₱0 (Free)" : `₱${deliveryFee.toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>

          {/* Row 2: Popular Destination Quick Chips (compact horizontal row) */}
          {activeMode === "delivery" && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 shrink-0">
                Quick:
              </span>
              {POPULAR_DESTINATIONS.map((dest, i) => {
                const Icon = dest.icon;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => flyToCoords(dest.lat, dest.lng, `${dest.name}, ${dest.subtitle}`)}
                    className="inline-flex items-center gap-1 shrink-0 rounded-md border border-[#333333] bg-[#222222] px-2 py-0.5 text-[10px] font-semibold text-gray-200 hover:border-[#ffcc00] hover:bg-[#ffcc00]/15 transition cursor-pointer"
                  >
                    <Icon className="size-2.5 text-[#ffcc00]" />
                    <span>{dest.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Row 3: Action Buttons */}
          <div className="flex items-center gap-2 pt-0.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs font-semibold h-9 px-4 border-[#333333] bg-[#222222] text-gray-300 hover:bg-[#2c2c2c] hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              className="flex-1 rounded-xl bg-[#ffcc00] text-black font-black text-xs h-9 hover:bg-[#ffd633] shadow-md transition-all active:scale-[0.98] cursor-pointer"
            >
              <Check className="size-3.5 mr-1 stroke-[2.5]" />
              {activeMode === "branch"
                ? "Confirm Branch Pickup (Free)"
                : `Confirm Delivery Location (₱${deliveryFee.toLocaleString()})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
