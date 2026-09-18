"use client";
import { useMemo, useState } from "react";
import { Anchor, ArrowUpRight, Globe2, Mail, MapPin, Phone, RotateCcw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Expert, type ViewBounds, filterExperts, inBounds } from "@/lib/experts";
import ExpertMap from "./expert-map";
import { useDirectoryTools } from "@/lib/use-directory-tools";
export default function ExpertDirectory({ experts, token }: { experts: Expert[]; token: string }) {
  const [expertise, setExpertise] = useState("all");
  const [region, setRegion] = useState("all");
  const [bounds, setBounds] = useState<ViewBounds | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [mapAvailable, setMapAvailable] = useState(false);
  const filtered = useMemo(() => filterExperts(experts, expertise, region), [experts, expertise, region]);
  const visible = useMemo(() => mapAvailable && bounds ? filtered.filter(p => inBounds(p, bounds)) : filtered, [filtered, bounds, mapAvailable]);
  useDirectoryTools({ expertise, region, experts: visible });
  const options = useMemo(() => ({ expertise: [...new Set(experts.flatMap(p => p.expertise))].sort(), region: [...new Set(experts.map(p => p.region))].sort() }), [experts]);
  const reset = () => { setExpertise("all"); setRegion("all"); setSelected(null); setBounds(null); setResetKey(x => x + 1); };
  const selectFromMap = (id: string) => { setSelected(id); requestAnimationFrame(() => document.getElementById(`expert-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" })); };
  return <main className="directory">
    <header className="brand-header">
      <div className="logo-panel">{/* eslint-disable-next-line @next/next/no-img-element */}<img className="brand-logo" src="/sedgwick-logo.png" alt="Sedgwick" width="176" height="38" /></div>
      <div className="header-title"><span>Global specialty</span><h1>Marine expert network</h1></div>
      <div className="header-world"><Globe2 size={19} aria-hidden="true" /><span>Worldwide expertise</span></div>
    </header>
    <section className="filter-bar" aria-label="Filter experts">
      <div className="filter-intro"><Anchor size={22} aria-hidden="true"/><span>Find an expert</span></div>
      <div className="filter-field"><label id="expertise-label">Expertise</label>
        <Select value={expertise} onValueChange={v => { setExpertise(v); setSelected(null); }}>
          <SelectTrigger className="filter-select" aria-labelledby="expertise-label"><SelectValue /></SelectTrigger>
          <SelectContent position="popper"><SelectItem value="all">All expertise</SelectItem>{options.expertise.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="filter-field"><label id="region-label">Region</label>
        <Select value={region} onValueChange={v => { setRegion(v); setSelected(null); }}>
          <SelectTrigger className="filter-select" aria-labelledby="region-label"><SelectValue /></SelectTrigger>
          <SelectContent position="popper"><SelectItem value="all">All regions</SelectItem>{options.region.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <button className="reset-button" onClick={reset}><RotateCcw size={16} aria-hidden="true"/>Reset filters</button>
    </section>
    <div className="workspace">
      <aside className="expert-panel" aria-label="Experts in current view">
        <div className="list-heading"><div><h2>Experts <span className="count">{visible.length}</span></h2><p>{mapAvailable ? "In your current map view" : "Matching your filters"}</p></div><MapPin size={20} aria-hidden="true" /></div>
        <div className="expert-list" aria-live="polite" aria-atomic="false">
          {!visible.length && <div className="empty-state"><MapPin size={28}/><h3>No experts in this view</h3><p>Try a different filter or zoom out to explore more locations.</p><button onClick={reset}>Reset filters</button></div>}
          {visible.map(p => <article key={p.id} id={`expert-${p.id}`} className={`expert-card ${selected === p.id ? "selected" : ""}`}>
            <button className="profile-button" onClick={() => setSelected(p.id)} aria-pressed={selected === p.id} aria-label={`Show ${p.name} on map`}>
              <div className="profile-top"><span className="expert-initials" aria-hidden="true">{p.name.split(" ").map(x => x[0]).join("")}</span><span className="profile-name"><strong>{p.name}</strong><span>{p.role}</span></span><ArrowUpRight className="profile-arrow" size={16} aria-hidden="true"/></div>
              <span className="location"><MapPin size={13} aria-hidden="true"/>{p.city}, {p.country}</span>
              <span className="tags">{p.expertise.map(x => <span key={x}>{x}</span>)}</span>
            </button>
            <div className="contact-links">{p.email && <a href={`mailto:${p.email}`}><Mail size={13} aria-hidden="true"/>{p.email}</a>}{p.phone && <a href={`tel:${p.phone.replace(/[^+\d]/g, "")}`}><Phone size={13} aria-hidden="true"/>{p.phone}</a>}</div>
          </article>)}
        </div>
        <div className="sample-notice"><span aria-hidden="true"/>Fictional profiles · Sample data</div>
      </aside>
      <section className="map-panel" aria-label="World map of marine experts">
        <ExpertMap experts={filtered} token={token} selected={selected} resetKey={resetKey} worldView={expertise === "all" && region === "all"} onBounds={setBounds} onSelect={selectFromMap} onAvailable={setMapAvailable}/>
      </section>
    </div>
  </main>;
}
