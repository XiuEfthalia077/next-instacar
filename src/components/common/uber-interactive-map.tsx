"use client";

import * as React from "react";
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
  ChevronUp,
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
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const markerRef = React.useRef<any>(null);

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
    Array<{ display_name: string; lat: string; lon: string }>
  >([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isGeocoding, setIsGeocoding] = React.useState(false);
  const [isLocating, setIsLocating] = React.useState(false);
  const [bottomSheetExpanded, setBottomSheetExpanded] = React.useState(true);

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

  // Reverse geocoding on pin drag / location change
  const reverseGeocode = React.useCallback(async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "en-US,en;q=0.9",
          },
        },
      );
      if (res.ok) {
        const data = await res.json();
        if (data.display_name) {
          // Construct clean short address: road, suburb/village, city
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
      // Fallback to coordinates
    } finally {
      setIsGeocoding(false);
    }
    setAddress(`Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
  }, []);

  // Initialize interactive Leaflet map (client-only, strictly no iframes)
  React.useEffect(() => {
    if (!open) return;

    let isMounted = true;
    let leafletModule: any = null;

    const initMap = async () => {
      // Dynamic import of Leaflet for Next.js SSR compatibility
      leafletModule = await import("leaflet");
      const L = leafletModule.default || leafletModule;

      if (!mapContainerRef.current || !isMounted) return;

      // Cleanup existing map instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Create map
      const map = L.map(mapContainerRef.current, {
        center: [currentCoords.lat, currentCoords.lng],
        zoom: 14,
        zoomControl: false,
      });

      // OpenStreetMap standard tiles (universal, reliable, not blocked by privacy extensions)
      const tileLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          subdomains: ["a", "b", "c"],
          maxZoom: 19,
          crossOrigin: true,
        },
      ).addTo(map);

      // Automatic fallback if OSM has connection or rate-limit issues
      tileLayer.on("tileerror", function (err: any) {
        const tile = err?.tile as HTMLImageElement;
        if (tile && !tile.dataset.retried) {
          tile.dataset.retried = "true";
          const coords = err.coords;
          if (coords) {
            tile.src = `https://a.basemaps.cartocdn.com/rastertiles/voyager/${coords.z}/${coords.x}/${coords.y}.png`;
          }
        }
      });

      // Add Zoom control at top-right
      L.control.zoom({ position: "topright" }).addTo(map);

      // Precision Needle Tip Pin Icon (The sharp bottom point touches exact geographic coordinate)
      const pinIcon = L.divIcon({
        className: "custom-uber-pin",
        html: `
          <div style="position: relative; width: 34px; height: 44px; pointer-events: none;">
            <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.5));">
              <path d="M17 1C8.163 1 1 8.163 1 17C1 28.5 17 43 17 43C17 43 33 28.5 33 17C33 8.163 25.837 1 17 1Z" fill="#ffcc00" stroke="#000000" stroke-width="2"/>
              <circle cx="17" cy="17" r="7" fill="#000000"/>
              <circle cx="17" cy="17" r="3" fill="#ffffff"/>
            </svg>
          </div>
        `,
        iconSize: [34, 44],
        iconAnchor: [17, 43],
        popupAnchor: [0, -43],
      });

      // Draggable marker
      const marker = L.marker([currentCoords.lat, currentCoords.lng], {
        icon: pinIcon,
        draggable: true,
      }).addTo(map);

      marker.on("dragend", async () => {
        const pos = marker.getLatLng();
        setCurrentCoords({ lat: pos.lat, lng: pos.lng });
        reverseGeocode(pos.lat, pos.lng);
      });

      // Click on map moves the pin
      map.on("click", (e: any) => {
        marker.setLatLng(e.latlng);
        setCurrentCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        reverseGeocode(e.latlng.lat, e.latlng.lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Invalidate map size after animation transitions
      const t1 = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 100);
      const t2 = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 300);
      const t3 = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 600);
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [open, reverseGeocode]);

  // Pan map and update marker
  const flyToCoords = (lat: number, lng: number, label?: string) => {
    setCurrentCoords({ lat, lng });
    if (label) setAddress(label);

    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current.flyTo([lat, lng], 16, {
        duration: 1.0,
      });
    }

    if (!label) {
      reverseGeocode(lat, lng);
    }
  };

  // "Use My Current Location" GPS trigger
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

  // Address search autocomplete
  React.useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const queryWithContext = `${searchQuery.trim()}, Iloilo, Philippines`;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryWithContext)}&limit=5&countrycodes=ph`,
          {
            headers: {
              "Accept-Language": "en-US,en;q=0.9",
            },
          },
        );
        if (res.ok) {
          const list = await res.json();
          setSearchResults(list);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSearchResult = (item: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    setSearchQuery("");
    setSearchResults([]);
    flyToCoords(lat, lng, item.display_name);
  };

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-5xl p-0 h-[92vh] sm:h-[86vh] border-border bg-card overflow-hidden rounded-2xl sm:rounded-3xl flex flex-col shadow-2xl">
        <DialogHeader className="hidden">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* TOP DEDICATED TOOLBAR (Fixed header, zero overlap on map) */}
        <div className="bg-card border-b border-border/80 px-4 py-2.5 sm:px-5 sm:py-3 flex items-center justify-between gap-3 shrink-0 z-30">
          {/* Mode Switcher Tabs */}
          {allowBranchSelection && (
            <div className="inline-flex rounded-xl bg-muted/60 p-1 border border-border/80 gap-1 shrink-0">
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
                    : "text-muted-foreground hover:text-foreground"
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
                    : "text-muted-foreground hover:text-foreground"
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search street, hotel, mall in Iloilo..."
                className="pl-9 pr-8 h-9 rounded-xl border border-border bg-muted/40 text-xs text-foreground focus-visible:ring-1 focus-visible:ring-[#ffcc00]"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-muted-foreground" />
              )}
              {searchQuery && !isSearching && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
              {/* Autocomplete Search Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 divide-y divide-border/60 rounded-xl border border-border bg-card max-h-56 overflow-y-auto shadow-2xl z-[1000]">
                  {searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSearchResult(item)}
                      className="flex w-full items-start gap-2.5 p-2.5 text-left text-xs hover:bg-[#ffcc00]/10 transition cursor-pointer"
                    >
                      <MapPin className="size-4 shrink-0 text-[#ffcc00] mt-0.5" />
                      <span className="line-clamp-2 text-foreground font-medium">
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
                        ? "bg-[#ffcc00]/15 border-[#ffcc00] text-foreground font-black"
                        : "border-border/60 hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <Building2 className="size-3" />
                    <span className="truncate max-w-[160px]">{b.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Close Modal Button */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
            aria-label="Close map"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* MOBILE SEARCH (Visible on < sm when in delivery mode) */}
        {activeMode === "delivery" && (
          <div className="sm:hidden px-3 py-2 bg-card border-b border-border/80">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search street, hotel, mall in Iloilo..."
                className="pl-9 pr-8 h-9 rounded-xl border border-border bg-muted/40 text-xs text-foreground focus-visible:ring-1 focus-visible:ring-[#ffcc00]"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-muted-foreground" />
              )}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 divide-y divide-border/60 rounded-xl border border-border bg-card max-h-48 overflow-y-auto shadow-2xl z-[1000]">
                  {searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSearchResult(item)}
                      className="flex w-full items-start gap-2 p-2 text-left text-xs hover:bg-[#ffcc00]/10 transition cursor-pointer"
                    >
                      <MapPin className="size-3.5 shrink-0 text-[#ffcc00] mt-0.5" />
                      <span className="line-clamp-2 text-foreground font-medium">
                        {item.display_name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* EXPANDED FULL INTERACTIVE MAP CANVAS (Maximized size) */}
        <div className="relative flex-1 w-full h-full min-h-[350px]">
          <div ref={mapContainerRef} className="size-full z-0 outline-none" />

          {/* Quick Floating Action Controls */}
          <div className="absolute right-4 bottom-4 z-[400] flex flex-col gap-2">
            {/* GPS "Use My Location" Button */}
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              title="Use My Current Location"
              className="flex size-10 items-center justify-center rounded-xl bg-card border border-border shadow-xl text-foreground hover:border-[#ffcc00] hover:text-[#b38a00] dark:hover:text-[#ffcc00] transition active:scale-95 cursor-pointer disabled:opacity-50"
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
              title="Reset to InstaCar Hub"
              className="flex size-10 items-center justify-center rounded-xl bg-card border border-border shadow-xl text-foreground hover:border-[#ffcc00] transition active:scale-95 cursor-pointer"
            >
              <Compass className="size-4 text-[#ffcc00]" />
            </button>
          </div>
        </div>

        {/* SLEEK, COMPACT BOTTOM CONFIRMATION SHEET */}
        <div className="bg-card border-t border-border px-4 py-3 sm:px-6 sm:py-3.5 shrink-0 z-30 space-y-2.5">
          {/* Row 1: Selected Address + Quick Distance & Fee Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  {activeMode === "branch" ? "Pickup Branch" : "Selected Destination"}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-[#ffcc00] font-semibold">
                  <Sparkles className="size-3" /> Drag pin or click map to reposition
                </span>
                {isGeocoding && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#ffcc00] font-semibold">
                    <Loader2 className="size-3 animate-spin" /> Resolving address...
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs sm:text-sm font-bold text-foreground truncate">
                {address}
              </p>
            </div>

            {/* Distance & Fee Badges */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-right">
                <span className="block text-[9px] text-muted-foreground font-semibold">Distance</span>
                <span className="text-xs font-black text-foreground">{distanceKm} km</span>
              </div>
              <div className="rounded-lg border border-[#ffcc00]/50 bg-[#ffcc00]/10 px-2.5 py-1 text-right">
                <span className="block text-[9px] font-bold text-[#b38a00] dark:text-[#ffcc00]">Fee</span>
                <span className="text-xs font-black text-foreground">
                  {activeMode === "branch" ? "₱0 (Free)" : `₱${deliveryFee.toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>

          {/* Row 2: Popular Destination Quick Chips (compact horizontal row) */}
          {activeMode === "delivery" && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                Quick:
              </span>
              {POPULAR_DESTINATIONS.map((dest, i) => {
                const Icon = dest.icon;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => flyToCoords(dest.lat, dest.lng, `${dest.name}, ${dest.subtitle}`)}
                    className="inline-flex items-center gap-1 shrink-0 rounded-md border border-border bg-secondary/50 px-2 py-0.5 text-[10px] font-semibold text-foreground hover:border-[#ffcc00] hover:bg-[#ffcc00]/15 transition cursor-pointer"
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
              className="rounded-xl text-xs font-semibold h-9 px-4"
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
