"use client";
import { useEffect, useRef, useState } from "react";
import type * as GeoJSON from "geojson";
import type { Map as MapboxMap, GeoJSONSource } from "mapbox-gl";
import { Globe2 } from "lucide-react";
import { type Expert, type ViewBounds, fitExtent } from "@/lib/experts";
type Props = { experts: Expert[]; token: string; selected: string | null; resetKey: number; worldView: boolean; onBounds: (b: ViewBounds) => void; onSelect: (id: string) => void; onAvailable: (available: boolean) => void };
function geojson(experts: Expert[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return { type: "FeatureCollection", features: experts.map(p => ({ type: "Feature", id: p.id, properties: { id: p.id, name: p.name }, geometry: { type: "Point", coordinates: [p.longitude, p.latitude] } })) };
}
export default function ExpertMap(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const current = useRef(props);
  current.current = props;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!props.token) return;
    let disposed = false;
    let observer: ResizeObserver | undefined;
    let timeout: ReturnType<typeof setTimeout>;
    const fail = () => { if (!disposed) { setError("The map is unavailable. You can still browse experts using the list and filters."); current.current.onAvailable(false); } };
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (disposed || !container.current) return;
      const map = new mapboxgl.Map({ container: container.current, accessToken: props.token, style: "mapbox://styles/mapbox/light-v11", projection: "equirectangular", center: [8, 15], zoom: 0.5, minZoom: -2, maxZoom: 19, attributionControl: true, renderWorldCopies: false });
      mapRef.current = map;
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
      map.dragRotate.disable(); map.touchZoomRotate.disableRotation();
      const publishBounds = () => {
        const b = map.getBounds();
        if (b) current.current.onBounds({ west: b.getWest(), east: b.getEast(), south: b.getSouth(), north: b.getNorth() });
      };
      map.on("moveend", publishBounds);
      timeout = setTimeout(fail, 25000);
      map.on("error", (event) => { if (!map.isStyleLoaded() || /401|403|token|unauthorized/i.test(event.error.message)) fail(); });
      map.on("load", () => {
        if (disposed) return;
        clearTimeout(timeout);
        setError("");
        if (map.getLayer("water")) map.setPaintProperty("water", "fill-color", "#b9dbe9");
        if (map.getLayer("background")) map.setPaintProperty("background", "background-color", "#f1f4f2");
        map.addSource("experts", { type: "geojson", data: geojson(current.current.experts), cluster: true, clusterRadius: 42, clusterMaxZoom: 16 });
        map.addLayer({ id: "clusters", type: "circle", source: "experts", filter: ["has", "point_count"], paint: { "circle-color": "#075978", "circle-radius": ["step", ["get", "point_count"], 20, 10, 25], "circle-stroke-width": 3, "circle-stroke-color": "#ffffff", "circle-stroke-opacity": 0.9 } });
        map.addLayer({ id: "cluster-count", type: "symbol", source: "experts", filter: ["has", "point_count"], layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"], "text-size": 14 }, paint: { "text-color": "#ffffff" } });
        map.addLayer({ id: "points", type: "circle", source: "experts", filter: ["!", ["has", "point_count"]], paint: { "circle-color": "#087fa4", "circle-radius": 7, "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" } });
        map.addSource("selection", { type: "geojson", data: geojson([]) });
        map.addLayer({ id: "selection-ring", type: "circle", source: "selection", paint: { "circle-radius": 14, "circle-color": "#0b4764", "circle-opacity": 0.15, "circle-stroke-width": 3, "circle-stroke-color": "#082f49" } });
        map.on("click", "clusters", async event => {
          const feature = event.features?.[0];
          if (!feature || feature.geometry.type !== "Point") return;
          const source = map.getSource("experts") as GeoJSONSource;
          const clusterId = Number(feature.properties?.cluster_id);
          try {
            const profiles = current.current.experts;
            // Rendered low-zoom coordinates are quantized. Fit original profiles,
            // otherwise a co-located cluster can zoom to a nearby empty street.
            const leaves = await new Promise<GeoJSON.Feature[]>((resolve, reject) => source.getClusterLeaves(clusterId, Number(feature.properties?.point_count), 0, (error, leaves) => error ? reject(error) : resolve(leaves ?? [])));
            const ids = new Set(leaves.map(p => p.properties?.id));
            const extent = fitExtent(profiles.filter(p => ids.has(p.id)));
            const zoom = await new Promise<number>((resolve, reject) => source.getClusterExpansionZoom(clusterId, (error, zoom) => error ? reject(error) : resolve(zoom ?? 18)));
            if (disposed || profiles !== current.current.experts || !extent) return;
            map.fitBounds(extent, { padding: 48, maxZoom: Math.min(zoom, 19), duration: 600 });
          } catch { /* Filters may invalidate a cluster during expansion. */ }
        });
        map.on("click", "points", event => {
          const feature = event.features?.[0];
          if (!feature || feature.geometry.type !== "Point") return;
          const clicked = current.current.experts.find(p => p.id === feature.properties?.id);
          if (!clicked) return;
          const { longitude, latitude } = clicked;
          const atLocation = current.current.experts.filter(p => p.longitude === longitude && p.latitude === latitude);
          const index = atLocation.findIndex(p => p.id === current.current.selected);
          current.current.onSelect(atLocation.length ? atLocation[(index + 1) % atLocation.length].id : String(feature.properties?.id));
        });
        for (const layer of ["clusters", "points"]) {
          map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
        }
        setReady(true); current.current.onAvailable(true); publishBounds();
      });
      observer = new ResizeObserver(() => {
        map.resize();
        if (map.getSource("experts")) {
          const p = current.current;
          const extent = p.worldView ? [[-179, -58], [179, 78]] as [[number, number], [number, number]] : fitExtent(p.experts);
          if (extent) map.fitBounds(extent, { padding: 32, maxZoom: 9, duration: 0 });
        }
        publishBounds();
      });
      observer.observe(container.current);
    }).catch(fail);
    return () => { disposed = true; clearTimeout(timeout); observer?.disconnect(); mapRef.current?.remove(); mapRef.current = null; };
  }, [props.token]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    (map.getSource("experts") as GeoJSONSource).setData(geojson(props.experts));
    const extent = props.worldView ? [[-179, -58], [179, 78]] as [[number, number], [number, number]] : fitExtent(props.experts);
    if (extent) map.fitBounds(extent, { padding: 48, maxZoom: 9, duration: 650 });
  }, [props.experts, props.resetKey, props.worldView, ready]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const expert = props.experts.find(p => p.id === props.selected);
    (map.getSource("selection") as GeoJSONSource).setData(geojson(expert ? [expert] : []));
    if (expert) {
      let longitude = expert.longitude;
      longitude += Math.round((map.getCenter().lng - longitude) / 360) * 360;
      map.easeTo({ center: [longitude, expert.latitude], duration: 500 });
    }
  }, [props.selected, props.experts, ready]);
  const unavailable = !props.token ? "The map needs a Mapbox access token. You can still browse experts using the list and filters." : error;
  return <><div ref={container} className="map-canvas" />
    {!unavailable && <div className="map-caption"><Globe2 size={15} aria-hidden="true"/><span>{ready ? "Explore the marine network" : "Loading world map…"}</span></div>}
    {unavailable && <div className="map-status" role="status"><Globe2 size={32}/><h2>Map unavailable</h2><p>{unavailable}</p></div>}
  </>;
}
