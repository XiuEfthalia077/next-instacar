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

      // Ensure Leaflet CSS is dynamically injected
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

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

      // CartoDB Voyager / OpenStreetMap standard tiles (crisp, beautiful, modern Uber-like styling)
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 20,
        },
      ).addTo(map);

      // Add Zoom control at top-right
      L.control.zoom({ position: "topright" }).addTo(map);

      // Custom Gold Uber Pin Icon
      const pinIcon = L.divIcon({
        className: "custom-uber-pin",
        html: `
          <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(255, 204, 0, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 32px; height: 32px; border-radius: 50%; background: #ffcc00; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.4); border: 2.5px solid #000;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div style="position: absolute; bottom: 0; width: 6px; height: 6px; border-radius: 50%; background: #000;"></div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 36],
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

      // Invalidate map size after animation
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 250);
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
      mapInstanceRef.current.flyTo([lat, lng], 15, {
        duration: 1.2,
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
            : "Could not retrieve your current location. Please search for your address.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
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
      <DialogContent className="max-w-4xl p-0 h-[92vh] sm:h-[82vh] border-border bg-card overflow-hidden sm:rounded-3xl flex flex-col shadow-2xl">
        <DialogHeader className="hidden">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* TOP FLOATING CONTROLS (DESKTOP & TABLET): MODE SWITCHER & SEARCH / BRANCH CARDS */}
        <div className="absolute top-4 left-4 right-16 sm:right-auto sm:w-[400px] z-[400] pointer-events-auto space-y-2">
          {allowBranchSelection && (
            <div className="inline-flex rounded-2xl bg-card/95 backdrop-blur-md p-1 border border-border shadow-xl gap-1">
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
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
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
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
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

          {activeMode === "branch" ? (
            <div className="rounded-2xl bg-card/95 backdrop-blur-md shadow-xl border border-border p-2.5 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block px-1">
                Select Pickup Branch
              </span>
              <div className="space-y-1">
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
                        "w-full flex items-center justify-between p-2 rounded-xl text-left transition cursor-pointer border",
                        isSel
                          ? "bg-[#ffcc00]/15 border-[#ffcc00]/50 text-foreground"
                          : "border-transparent hover:bg-muted text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 className={cn("size-4 shrink-0", isSel ? "text-[#ffcc00]" : "text-muted-foreground")} />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{b.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{b.address}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                        Free
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="relative rounded-2xl bg-card/95 backdrop-blur-md shadow-xl border border-border p-2">
              <div className="relative flex items-center">
                <Search className="absolute left-3 size-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search street, hotel, mall in Iloilo..."
                  className="pl-9 pr-8 h-10 rounded-xl border-none bg-muted/50 text-xs text-foreground focus-visible:ring-1 focus-visible:ring-[#ffcc00]"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 size-4 animate-spin text-muted-foreground" />
                )}
                {searchQuery && !isSearching && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Autocomplete Search Dropdown */}
              {searchResults.length > 0 && (
                <div className="mt-2 divide-y divide-border/60 rounded-xl border border-border bg-card max-h-56 overflow-y-auto shadow-lg">
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
          )}
        </div>

        {/* FULLSCREEN / DESKTOP INTERACTIVE MAP CONTAINER */}
        <div className="relative flex-1 w-full h-full min-h-[300px]">
          <div ref={mapContainerRef} className="size-full z-0 outline-none" />

          {/* Quick Floating Action Controls */}
          <div className="absolute right-4 bottom-28 sm:bottom-6 z-[400] flex flex-col gap-2">
            {/* GPS "Use My Location" Button */}
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              title="Use My Current Location"
              className="flex size-11 items-center justify-center rounded-2xl bg-card border border-border shadow-xl text-foreground hover:border-[#ffcc00] hover:text-[#b38a00] dark:hover:text-[#ffcc00] transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isLocating ? (
                <Loader2 className="size-5 animate-spin text-[#ffcc00]" />
              ) : (
                <Navigation className="size-5 fill-current" />
              )}
            </button>

            {/* Reset to Pavia Hub */}
            <button
              type="button"
              onClick={() => flyToCoords(BRANCH_COORDS.lat, BRANCH_COORDS.lng, BRANCH_COORDS.address)}
              title="Reset to InstaCar Hub"
              className="flex size-11 items-center justify-center rounded-2xl bg-card border border-border shadow-xl text-foreground hover:border-[#ffcc00] transition active:scale-95 cursor-pointer"
            >
              <Compass className="size-5 text-[#ffcc00]" />
            </button>
          </div>

          {/* DRAG INSTRUCTION PILL (Floating center-top) */}
          <div className="absolute top-16 sm:top-4 left-1/2 -translate-x-1/2 z-[399] pointer-events-none">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/75 backdrop-blur text-white text-[11px] font-bold shadow-md border border-white/10">
              <Sparkles className="size-3 text-[#ffcc00]" />
              <span>Drag pin or click map to move</span>
            </div>
          </div>
        </div>

        {/* BOTTOM SHEET UI (Mobile & Desktop Unified Card) */}
        <div
          className={cn(
            "z-[500] bg-card border-t border-border shadow-2xl transition-all duration-300 flex flex-col shrink-0",
            "sm:static sm:border-t sm:p-5",
            bottomSheetExpanded ? "p-4 max-h-[55vh]" : "p-3 max-h-16 overflow-hidden",
          )}
        >
          {/* Mobile Drag Handle */}
          <div
            onClick={() => setBottomSheetExpanded(!bottomSheetExpanded)}
            className="sm:hidden flex items-center justify-center pb-2 cursor-pointer"
          >
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="space-y-3">
            {/* Address & Fee Header Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    Selected Destination
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

              {/* Distance & Fee Badge */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-right">
                  <span className="block text-[10px] text-muted-foreground font-semibold">
                    Distance from Hub
                  </span>
                  <span className="text-xs font-black text-foreground">
                    {distanceKm} km
                  </span>
                </div>
                <div className="rounded-xl border border-[#ffcc00]/50 bg-[#ffcc00]/10 px-3 py-1.5 text-right">
                  <span className="block text-[10px] font-bold text-[#b38a00] dark:text-[#ffcc00]">
                    Calculated Fee
                  </span>
                  <span className="text-xs sm:text-sm font-black text-foreground">
                    ₱{deliveryFee.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Destination Pills */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Popular Quick Drop-offs
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {POPULAR_DESTINATIONS.map((dest, i) => {
                  const Icon = dest.icon;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => flyToCoords(dest.lat, dest.lng, `${dest.name}, ${dest.subtitle}`)}
                      className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border border-border bg-secondary/60 px-2.5 py-1 text-[11px] font-bold text-foreground hover:border-[#ffcc00] hover:bg-[#ffcc00]/10 transition cursor-pointer"
                    >
                      <Icon className="size-3 text-[#ffcc00]" />
                      <span>{dest.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl text-xs font-semibold h-10 px-4"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                className="flex-1 rounded-xl bg-[#ffcc00] text-black font-black text-xs h-10 hover:bg-[#ffd633] shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                <Check className="size-4 mr-1.5 stroke-[2.5]" />
                {activeMode === "branch"
                  ? "Confirm Branch Pickup (Free)"
                  : `Confirm Delivery Location (₱${deliveryFee.toLocaleString()})`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
