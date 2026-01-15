import React, { useEffect, useRef } from "react";

type MapViewProps = {
  currentLocation?: [number, number];
};

declare global {
  interface Window {
    google: any;
  }
}

/* ---------- Google Maps Loader（只加载一次） ---------- */
let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve) => {
    if (window.google?.maps) return resolve();

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

export default function MapView({ currentLocation }: MapViewProps) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const overlayRef = useRef<any>(null);

  /* ---------- Init Map (只执行一次) ---------- */
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !mapDivRef.current) return;

    let isMounted = true;

    (async () => {
      await loadGoogleMaps(apiKey);
      if (!isMounted) return;

      const google = window.google;

      if (!mapRef.current) {
        mapRef.current = new google.maps.Map(mapDivRef.current, {
          center: { lat: 39.9042, lng: 116.4074 },
          zoom: 15,
          disableDefaultUI: true,
          gestureHandling: "greedy",
        });
      }

      /* ---------- OverlayView ---------- */
      class LocationOverlay extends google.maps.OverlayView {
        div: HTMLDivElement | null = null;

        onAdd() {
          this.div = document.createElement("div");
          this.div.style.position = "absolute";
          this.getPanes().overlayLayer.appendChild(this.div);
        }

        draw() {
          if (!this.div || !currentLocation) return;
          const projection = this.getProjection();
          if (!projection) return;

          const point = projection.fromLatLngToDivPixel(
            new google.maps.LatLng(currentLocation[0], currentLocation[1])
          );

          this.div.style.left = `${point.x - 150}px`;
          this.div.style.top = `${point.y - 150}px`;
          this.div.style.width = "300px";
          this.div.style.height = "300px";
          this.div.innerHTML = `
            <svg width="300" height="300">
              <circle cx="150" cy="150" r="15" fill="#3b82f6" opacity="0.3">
                <animate attributeName="r" from="15" to="30" dur="1.5s" repeatCount="indefinite"/>
                <animate attributeName="opacity" from="0.3" to="0" dur="1.5s" repeatCount="indefinite"/>
              </circle>
              <circle cx="150" cy="150" r="8" fill="#3b82f6" stroke="white" stroke-width="3"/>
            </svg>
          `;
        }

        onRemove() {
          if (this.div) this.div.remove();
          this.div = null;
        }
      }

      if (!overlayRef.current) {
        overlayRef.current = new LocationOverlay();
        overlayRef.current.setMap(mapRef.current);
      }
    })();

    /* ---------- cleanup（关键） ---------- */
    return () => {
      isMounted = false;

      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }

      // ⚠️ 不销毁 mapRef.current
      // Google Maps 实例必须复用，否则会白屏
    };
  }, []);

  /* ---------- Update location ---------- */
  useEffect(() => {
    if (!mapRef.current || !currentLocation) return;

    mapRef.current.setCenter({
      lat: currentLocation[0],
      lng: currentLocation[1],
    });

    if (overlayRef.current) {
      overlayRef.current.draw();
    }
  }, [currentLocation]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapDivRef} className="absolute inset-0" />
    </div>
  );
}
