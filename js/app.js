import { config } from '../config.js';
import { validateProfiles, filterExperts, inBounds, fitExtent } from './experts.js';
import { createProfileCard, createPortrait } from './profile-card.js';

const $ = id => document.getElementById(id);
let experts = [], filtered = [], visible = [], selected = null, map, ready = false, available = false;
let profilePopup = null;
const world = () => $('expertise').value === 'all' && $('region').value === 'all';
const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 600;
const geojson = profiles => ({type:'FeatureCollection', features:profiles.map(p => ({type:'Feature',properties:{id:p.id},geometry:{type:'Point',coordinates:[p.longitude,p.latitude]}}))});
function element(tag, className, text) {
  const node = document.createElement(tag); node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function renderList() {
  const bounds = available && map?.getBounds();
  visible = bounds ? filtered.filter(p => inBounds(p, {west:bounds.getWest(),east:bounds.getEast(),south:bounds.getSouth(),north:bounds.getNorth()})) : filtered;
  $('count').textContent = visible.length;
  $('list-description').textContent = available ? '' : 'Matching your filters';
  const fragment = document.createDocumentFragment();
  for (const p of visible) {
    const card = element('article','expert-card'); card.id = `expert-${p.id}`;
    const button = element('button','profile-button'); button.type = 'button'; button.setAttribute('aria-label',`Show ${p.name} on map`);
    const top = element('span','profile-top'), name = element('span','profile-name');
    name.append(element('strong','',p.name),element('span','',p.role));
    const portrait = createPortrait(p,'expert-initials',34,'span');
    top.append(portrait,name,element('span','profile-arrow','↗'));
    const tags = element('span','tags'); for(const expertise of p.expertise) tags.append(element('span','',expertise));
    button.append(top,element('span','location',`${p.city}, ${p.country}`),tags);
    button.addEventListener('click',()=>selectExpert(p.id));card.append(button);
    const contacts = element('div','contact-links');
    for(const [value,href] of [[p.email,`mailto:${p.email}`],[p.phone,`tel:${p.phone?.replace(/[^+\d]/g,'')}`],[p.sourceUrl && 'View Sedgwick profile',p.sourceUrl]]) {
      if(value) { const link=element('a','',value);link.href=href;contacts.append(link); }
    }
    card.append(contacts);fragment.append(card);
  }
  if(!visible.length) {
    const empty = element('div','empty-state'); const reset = element('button','','Reset filters');reset.addEventListener('click',resetFilters);
    empty.append(element('h3','','No experts in this view'),element('p','','Try a different filter or zoom out to explore more locations.'),reset);fragment.append(empty);
  }
  // Preserve keyboard focus when a map movement refreshes the same list.
  const focusedId = document.activeElement?.closest('.expert-card')?.id;
  const focusedHref = document.activeElement?.getAttribute('href');
  $('expert-list').replaceChildren(fragment);updateSelection();
  const focusedCard = focusedId && document.getElementById(focusedId);
  if(focusedCard) {
    const target=focusedHref ? [...focusedCard.querySelectorAll('a')].find(a=>a.getAttribute('href')===focusedHref) : focusedCard.querySelector('button');
    target?.focus({preventScroll:true});
  }
}
function updateSelection() {
  for(const card of $('expert-list').children) {
    const active=card.id===`expert-${selected}`;card.classList.toggle('selected',active);
    card.querySelector('.profile-button')?.setAttribute('aria-pressed',String(active));
  }
  if(ready) map.getSource('selection').setData(geojson(filtered.filter(p=>p.id===selected)));
}
function selectExpert(id, fromMap=false) {
  selected=id;updateSelection(); const p=filtered.find(p=>p.id===id);
  if(ready && available && p) {
    closeProfile();
    const popup = new mapboxgl.Popup({className:'expert-popup',maxWidth:'360px',offset:18,closeOnClick:false,focusAfterOpen:false})
      .setLngLat([p.longitude,p.latitude]).setDOMContent(createProfileCard(p)).addTo(map);
    profilePopup=popup;
    sizeProfile();
    popup.on('close',()=>{if(profilePopup===popup)profilePopup=null;});
    const close = popup.getElement().querySelector('.mapboxgl-popup-close-button');
    close.setAttribute('aria-label',`Close ${p.name}'s profile`);
    close.addEventListener('click',()=>focusSelected());
    map.easeTo({center:[p.longitude,p.latitude],offset:profileOffset(),duration});
    if(!fromMap && innerWidth<700) $('map').scrollIntoView({block:'start',behavior:duration?'smooth':'instant'});
    close.focus({preventScroll:true});
  }
  if(fromMap) document.getElementById(`expert-${id}`)?.scrollIntoView({block:'nearest',behavior:duration?'smooth':'instant'});
}
function focusSelected() {
  document.getElementById(`expert-${selected}`)?.querySelector('button')?.focus({preventScroll:true});
}
function closeProfile() {
  profilePopup?.remove();profilePopup=null;
}
function profileOffset() {
  return [0, -$('map').clientHeight/4];
}
function sizeProfile() {
  if(!profilePopup)return;
  const container=$('map');
  profilePopup.setMaxWidth(`${Math.min(360,container.clientWidth-32)}px`);
  profilePopup.getElement().style.setProperty('--profile-max-height',`${Math.max(100,container.clientHeight*.75-76)}px`);
}
document.addEventListener('keydown',event=>{
  if(event.key==='Escape' && profilePopup) {closeProfile();focusSelected();}
});
function fitMap(animate=true) {
  if(!ready || !available) return;
  const extent=world() ? [[-180,-58],[180,78]] : fitExtent(filtered);
  if(extent) map.fitBounds(extent,{padding:innerWidth<700?24:48,maxZoom:9,duration:animate?duration:0});
}
function applyFilters() {
  closeProfile();
  selected=null; filtered=filterExperts(experts,$('expertise').value,$('region').value);
  if(ready) map.getSource('experts').setData(geojson(filtered));
  renderList();fitMap();
}
function resetFilters() { $('expertise').value='all';$('region').value='all';applyFilters(); }
function unavailable(message) {
  closeProfile();
  available=false;$('map-caption').hidden=true;$('map-status').hidden=false;
  $('map-message').textContent=message;renderList();
}
async function fetchJSON(url) {
  const response=await fetch(url,{cache:'no-cache'});
  if(!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}
async function start() {
  try {
    const files=await fetchJSON('data/experts/index.json');
    if(!Array.isArray(files)||files.some(f=>typeof f!=='string'||!(/^[a-z0-9-]+\.json$/).test(f)||f==='index.json')||new Set(files).size!==files.length) throw new Error('Invalid profile index');
    const entries=await Promise.all(files.map(async file=>[file,await fetchJSON(`data/experts/${file}`)]));
    experts=validateProfiles(Object.fromEntries(entries));filtered=experts;
    for(const [id,values] of [['expertise',experts.flatMap(p=>p.expertise)],['region',experts.map(p=>p.region)]]) {
      for(const value of [...new Set(values)].sort()) $(id).add(new Option(value,value));
      $(id).disabled=false;$(id).addEventListener('change',applyFilters);
    }
    $('reset').addEventListener('click',resetFilters);renderList();
  } catch(error) {
    $('list-description').textContent='Expert profiles could not be loaded.';
    $('expert-list').append(element('p','empty-state','Please check the profile files and reload the page.'));
    $('map-caption').textContent='Expert data unavailable';console.error(error);return;
  }
  let token=config.mapboxToken;
  // Local-only convenience file, excluded from Git. Hosted sites use config.js.
  if(!token) { try { token=(await fetchJSON('config.local.json')).mapboxToken; } catch {} }
  if(!token) { unavailable('The map needs a Mapbox access token. You can still browse experts using the list and filters.');return; }
  if(!window.mapboxgl) { unavailable('The map could not load. You can still browse experts using the list and filters.');return; }
  try { initializeMap(token); } catch(error) { console.error(error);unavailable('The map is unavailable. You can still browse experts using the list and filters.'); }
}
function initializeMap(token) {
  // At zoom 0 the equirectangular world is 512px wide. Keep the
  // latitude span from 85°S to 85°N tall enough to fill the viewport.
  const minimumZoom = () => Math.max(-2, Math.log2(Math.max(1,$('map').clientHeight) / (512 * 170 / 360)));
  map=new mapboxgl.Map({container:'map',accessToken:token,style:'mapbox://styles/mapbox/light-v11',projection:'equirectangular',center:[8,15],zoom:.5,minZoom:minimumZoom(),maxZoom:19,maxBounds:[[-180,-85],[180,85]],renderWorldCopies:false});
  map.addControl(new mapboxgl.NavigationControl({showCompass:false}),'bottom-right');map.dragRotate.disable();map.touchZoomRotate.disableRotation();
  map.on('moveend',()=>{if(ready)renderList();});
  const fail=()=>unavailable('The map is unavailable. You can still browse experts using the list and filters.');
  const timeout=setTimeout(fail,25000);
  map.on('error',event=>{if(!map.isStyleLoaded()||/401|403|token|unauthorized/i.test(event.error.message))fail();});
  map.on('load',()=>{
    clearTimeout(timeout);
    if(map.getLayer('water'))map.setPaintProperty('water','fill-color','#b9dbe9');
    if(map.getLayer('background'))map.setPaintProperty('background','background-color','#f1f4f2');
    // The light basemap uses dark Sedgwick text for every geographic label.
    for (const layer of map.getStyle().layers) {
      if (layer.type === 'symbol' && layer.layout?.['text-field']) {
        map.setPaintProperty(layer.id, 'text-color', '#212121');
      }
    }
    map.addSource('experts',{type:'geojson',data:geojson(filtered),cluster:true,clusterRadius:42,clusterMaxZoom:16});
    map.addLayer({id:'clusters',type:'circle',source:'experts',filter:['has','point_count'],paint:{'circle-color':'#212121','circle-radius':['step',['get','point_count'],20,10,25],'circle-stroke-width':3,'circle-stroke-color':'#fff'}});
    map.addLayer({id:'cluster-count',type:'symbol',source:'experts',filter:['has','point_count'],layout:{'text-field':['get','point_count_abbreviated'],'text-font':['DIN Offc Pro Medium','Arial Unicode MS Bold'],'text-size':14},paint:{'text-color':'#FFFFFF'}});
    map.addLayer({id:'points',type:'circle',source:'experts',filter:['!',['has','point_count']],paint:{'circle-color':'#212121','circle-radius':7,'circle-stroke-width':2,'circle-stroke-color':'#fff'}});
    map.addSource('selection',{type:'geojson',data:geojson([])});
    map.addLayer({id:'selection-ring',type:'circle',source:'selection',paint:{'circle-radius':14,'circle-color':'#0b4764','circle-opacity':.15,'circle-stroke-width':3,'circle-stroke-color':'#082f49'}});
    map.on('click','clusters',async event=>{
      const feature=event.features?.[0];if(!feature)return;
      const source=map.getSource('experts'),profiles=filtered,id=Number(feature.properties.cluster_id);
      try {
        const leaves=await new Promise((resolve,reject)=>source.getClusterLeaves(id,Number(feature.properties.point_count),0,(err,result)=>err?reject(err):resolve(result??[])));
        const ids=new Set(leaves.map(p=>p.properties.id));
        const extent=fitExtent(profiles.filter(p=>ids.has(p.id)));
        const zoom=await new Promise((resolve,reject)=>source.getClusterExpansionZoom(id,(err,result)=>err?reject(err):resolve(result??18)));
        if(profiles===filtered&&extent)map.fitBounds(extent,{padding:48,maxZoom:Math.min(zoom,19),duration});
      } catch { /* A filter change can invalidate the clicked cluster. */ }
    });
    map.on('click','points',event=>{
      const clicked=filtered.find(p=>p.id===event.features?.[0]?.properties.id);if(!clicked)return;
      const colocated=filtered.filter(p=>p.longitude===clicked.longitude&&p.latitude===clicked.latitude);
      const index=colocated.findIndex(p=>p.id===selected);selectExpert(colocated[(index+1)%colocated.length].id,true);
    });
    for(const layer of ['clusters','points']) {
      map.on('mouseenter',layer,()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave',layer,()=>map.getCanvas().style.cursor='');
    }
    ready=true;available=true;$('map-status').hidden=true;$('map-caption').hidden=true;fitMap(false);renderList();
  });
  new ResizeObserver(()=>{
    map.setMinZoom(minimumZoom());
    map.resize();sizeProfile();
    const p=profilePopup && filtered.find(p=>p.id===selected);
    if(p) map.easeTo({center:[p.longitude,p.latitude],offset:profileOffset(),duration:0});
    else fitMap(false);
    if(ready)renderList();
  }).observe($('map'));
}
// Start after the deferred Mapbox script has either loaded or failed.
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
