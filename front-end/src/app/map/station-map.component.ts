import { Component, ElementRef, OnDestroy, OnInit, ViewChild, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { EMPTY, Subscription, forkJoin } from 'rxjs';
import { catchError, exhaustMap } from 'rxjs/operators';
import { LngLatBounds, Map as MapLibreMap, Marker, NavigationControl, Popup, ScaleControl } from 'maplibre-gl';
import { Site } from '../models/site';
import { Project } from '../models/project';
import { SiteService } from '../services/site.service';
import { ProjectService } from '../services/project.service';
import { ThemeService } from '../services/theme.service';
import { I18nService } from '../i18n/i18n.service';
import { refreshWhileVisible } from '../services/auto-refresh';
import { token } from '../services/chart-theme';

/**
 * Vector tile styles, keyless and unmetered.
 *
 * Vector rather than raster because the 3D view extrudes real building
 * footprints — raster tiles are flat images and cannot be tilted meaningfully.
 *
 * NOTE: MapLibre decodes vector tiles in a module web worker that it loads from
 * `new URL('./maplibre-gl-worker.mjs', import.meta.url)` — a sibling of the
 * bundle, not something the bundler can see or emit. `maplibre-gl-worker.mjs`
 * and the `maplibre-gl-shared.mjs` it imports are therefore copied to the build
 * root by the `assets` entries in angular.json. Without them the worker 404s
 * silently: raster tiles still load, but no vector tile is ever fetched, the
 * style never finishes loading, and `load` never fires.
 */
const MAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};

const TILT_PITCH = 55;

/** Slight rotation so extruded facades catch the light rather than facing flat on. */
const DEFAULT_BEARING = -15;

/** Past the building layer's minzoom, so focusing a station shows real streets. */
const STREET_ZOOM = 17;

/** Beyond this distance from the fleet's median position, a coordinate is suspect. */
const OUTLIER_KM = 300;

@Component({
  selector: 'app-station-map',
  standalone: false,
  templateUrl: './station-map.component.html',
})
export class StationMapComponent implements OnInit, OnDestroy {
  /**
   * Fires when *ngIf inserts the container.
   *
   * A static ViewChild resolves before change detection and therefore never
   * sees an element behind `*ngIf="!loading"` — the query returns undefined and
   * map creation throws.
   */
  @ViewChild('mapContainer')
  set mapContainer(ref: ElementRef<HTMLDivElement> | undefined) {
    this.container = ref?.nativeElement;
    if (this.container && !this.map) this.initMap();
  }

  project: Project | null = null;
  sites: Site[] = [];
  loading = true;
  tilted = true;
  lastUpdated: Date | null = null;

  private map?: MapLibreMap;
  private container?: HTMLDivElement;
  private markers = new Map<string, Marker>();
  private projectId: string | null = null;
  private readonly subscriptions = new Subscription();

  constructor(
    private siteService: SiteService,
    private projectService: ProjectService,
    private route: ActivatedRoute,
    private router: Router,
    private message: ToastrService,
    private theme: ThemeService,
    private i18n: I18nService
  ) {
    // Marker titles and popups are built as HTML strings rather than by the
    // template, so nothing re-renders them on its own. Reading the language
    // signal here rebuilds them the moment it changes, instead of leaving the
    // previous language on screen until the next 15-second refresh.
    effect(() => {
      this.i18n.lang();
      this.syncMarkers();
    });
  }

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id');
    if (!this.projectId) {
      this.loading = false;
      return;
    }

    forkJoin({
      project: this.projectService.getprojectByID(this.projectId),
      sites: this.siteService.getSitesByProject(this.projectId),
    }).subscribe({
      next: ({ project, sites }) => {
        this.project = project;
        this.sites = sites;
        this.lastUpdated = new Date();
        // Clearing this reveals the container; the ViewChild setter builds the
        // map once it actually exists in the DOM.
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.message.error(this.i18n.t('map.loadFailed'));
      },
    });

    // Pins recolour in place; the map itself is never rebuilt, so the operator
    // does not lose their pan and zoom every time the data refreshes.
    this.subscriptions.add(
      refreshWhileVisible()
        .pipe(
          exhaustMap(() =>
            this.siteService.getSitesByProject(this.projectId!).pipe(catchError(() => EMPTY))
          )
        )
        .subscribe((sites) => {
          this.sites = sites;
          this.lastUpdated = new Date();
          this.syncMarkers();
        })
    );

    this.subscriptions.add(this.theme.changes().subscribe((mode) => this.applyStyle(mode)));
  }

  ngOnDestroy(): void {
    this.markers.forEach((m) => m.remove());
    this.map?.remove();
    this.subscriptions.unsubscribe();
  }

  /** Stations that carry coordinates at all. */
  private get located(): Site[] {
    return this.sites.filter(
      (s) =>
        Number.isFinite(s.latitude) &&
        Number.isFinite(s.longitude) &&
        Math.abs(s.latitude) <= 90 &&
        Math.abs(s.longitude) <= 180 &&
        !(Math.abs(s.latitude) < 0.001 && Math.abs(s.longitude) < 0.001)
    );
  }

  /**
   * Stations whose coordinates sit implausibly far from the rest of the fleet.
   *
   * A range check is not enough — a placeholder like "12, 12" is a perfectly
   * valid coordinate that happens to be in Chad, and one such record is enough
   * to stretch the fitted view across an ocean and render the map useless.
   * These are still drawn (the data is what it is) but are kept out of the
   * default framing and reported so the record can be corrected.
   */
  get misplaced(): Site[] {
    const located = this.located;
    if (located.length < 3) return [];

    const median = (values: number[]) => {
      const sorted = [...values].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)];
    };
    const centreLat = median(located.map((s) => s.latitude));
    const centreLon = median(located.map((s) => s.longitude));

    // Equirectangular approximation is ample at this scale.
    const kmFromCentre = (s: Site) => {
      const dLat = (s.latitude - centreLat) * 111;
      const dLon = (s.longitude - centreLon) * 111 * Math.cos((centreLat * Math.PI) / 180);
      return Math.hypot(dLat, dLon);
    };

    return located.filter((s) => kmFromCentre(s) > OUTLIER_KM);
  }

  private get wellLocated(): Site[] {
    const bad = new Set(this.misplaced.map((s) => s._id));
    return this.located.filter((s) => !bad.has(s._id));
  }

  get offlineCount(): number {
    return this.sites.filter((s) => !s.status).length;
  }

  get unlocatedCount(): number {
    return this.sites.length - this.located.length;
  }

  private initMap(): void {
    const located = this.located;
    if (!located.length || !this.container) return;

    this.map = new MapLibreMap({
      container: this.container,
      style: MAP_STYLES[this.theme.resolved()],
      pitch: TILT_PITCH,
      bearing: DEFAULT_BEARING,
      attributionControl: { compact: true },
    });

    this.map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');
    this.map.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left');

    // Pins are DOM overlays and need neither the style nor a measured
    // container, so they go up straight away rather than waiting for tiles.
    this.syncMarkers();

    this.map.on('load', () => {
      // Framing must wait for layout. fitBounds derives a zoom from the
      // viewport size, and the container is still unmeasured when the map is
      // constructed during change detection — a zero-size viewport yields a
      // nonsense zoom and the map sits at world level, never requesting the
      // street-level tiles it needs.
      this.map!.resize();
      this.fitToStations();
      this.ensureBuildings();
    });

    // setStyle discards custom layers, so the extrusion is re-added each time.
    this.map.on('styledata', () => this.ensureBuildings());
  }

  /**
   * Guarantees a 3D building layer exists.
   *
   * The light style ships one (`building-3d`); the dark style only has flat
   * fills, so the extrusion is added from the same vector source rather than
   * leaving the dark map stubbornly 2D.
   */
  private ensureBuildings(): void {
    const map = this.map;
    if (!map || !map.isStyleLoaded()) return;
    if (map.getLayer('building-3d') || map.getLayer('mi8-buildings')) return;
    if (!map.getSource('openmaptiles')) return;

    map.addLayer({
      id: 'mi8-buildings',
      type: 'fill-extrusion',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: 14,
      paint: {
        'fill-extrusion-color': token('--line-strong') || '#2c3855',
        'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': 0.6,
      },
    });
  }

  private applyStyle(mode: 'light' | 'dark'): void {
    this.map?.setStyle(MAP_STYLES[mode]);
  }

  /**
   * Groups stations that share a coordinate.
   *
   * Most records currently carry the project's rough centre rather than a
   * per-station fix, so dozens land on the same point. Drawing one pin per
   * station would stack them invisibly, and fanning them out would invent
   * positions the data does not contain — a counted pin states plainly that
   * several stations are recorded here.
   */
  get groups(): { key: string; lat: number; lon: number; sites: Site[] }[] {
    const byPoint = new Map<string, { key: string; lat: number; lon: number; sites: Site[] }>();
    for (const site of this.located) {
      const key = `${site.latitude},${site.longitude}`;
      const group = byPoint.get(key);
      if (group) group.sites.push(site);
      else byPoint.set(key, { key, lat: site.latitude, lon: site.longitude, sites: [site] });
    }
    return [...byPoint.values()];
  }

  /** Largest number of stations sharing one point — surfaced as a data warning. */
  get sharedPointCount(): number {
    return this.groups.reduce((worst, g) => Math.max(worst, g.sites.length), 0);
  }

  /**
   * Creates or updates one marker per distinct location.
   *
   * Markers are reused across refreshes — recreating them would close an open
   * popup and make the map flicker every fifteen seconds.
   */
  private syncMarkers(): void {
    if (!this.map) return;

    const seen = new Set<string>();

    for (const group of this.groups) {
      seen.add(group.key);
      const existing = this.markers.get(group.key);
      const element = existing?.getElement() ?? this.createPin();

      this.paintPin(element, group.sites);

      if (existing) {
        existing.setLngLat([group.lon, group.lat]);
        existing.getPopup()?.setHTML(this.popupHtml(group.sites));
        continue;
      }

      const marker = new Marker({ element, anchor: 'center' })
        .setLngLat([group.lon, group.lat])
        .setPopup(new Popup({ offset: 18, closeButton: true, maxWidth: '320px' })
          .setHTML(this.popupHtml(group.sites)))
        .addTo(this.map);

      this.markers.set(group.key, marker);
    }

    // Drop markers whose location no longer has any station.
    for (const [key, marker] of this.markers) {
      if (!seen.has(key)) {
        marker.remove();
        this.markers.delete(key);
      }
    }
  }

  private createPin(): HTMLElement {
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'map-pin';
    return pin;
  }

  private paintPin(element: HTMLElement, sites: Site[]): void {
    const down = sites.filter((s) => !s.status).length;
    // Any station down colours the whole point: an operator must not have to
    // open a pin to discover something behind it has failed.
    element.classList.toggle('is-down', down > 0);
    element.classList.toggle('is-group', sites.length > 1);
    element.textContent = sites.length > 1 ? String(sites.length) : '';

    element.title =
      sites.length === 1
        ? `${sites[0].nom} (${sites[0].ip})`
        : this.i18n.t('map.stationsHere', { count: sites.length, down });
    element.setAttribute('aria-label', element.title);
  }

  /** Escapes interpolated values; station names are operator-supplied. */
  private escape(value: unknown): string {
    return String(value ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
    );
  }

  private popupHtml(sites: Site[]): string {
    // Street-level imagery without an API key or billing: this deep link opens
    // Google's panorama viewer at the coordinates in a new tab.
    const streetView =
      `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${sites[0].latitude},${sites[0].longitude}`;

    const row = (site: Site) => {
      const voltage =
        site.lastReading?.Battery_Voltage != null
          ? `${site.lastReading.Battery_Voltage.toFixed(2)} V`
          : '—';
      const detail = site.project ? `#/project/${site.project._id}/analysis/${site._id}` : null;
      const name = detail
        ? `<a href="${detail}">${this.escape(site.nom)}</a>`
        : this.escape(site.nom);

      return `
        <li class="map-popup-item">
          <span class="map-popup-state ${site.status ? 'is-up' : 'is-down'}"></span>
          <span class="map-popup-name">${name}
            <span class="map-popup-ip">${this.escape(site.ip)}</span>
          </span>
          <span class="map-popup-volt">${voltage}</span>
        </li>`;
    };

    const header =
      sites.length === 1
        ? `<p class="map-popup-title">${this.escape(sites[0].nom)}</p>`
        : `<p class="map-popup-title">${this.escape(this.i18n.t('map.popupMulti', { count: sites.length }))}</p>
           <p class="map-popup-note">${this.escape(this.i18n.t('map.popupNote'))}</p>`;

    return `
      <div class="map-popup">
        ${header}
        <ul class="map-popup-list">${sites.map(row).join('')}</ul>
        <div class="map-popup-actions">
          <a href="${streetView}" target="_blank" rel="noopener">${this.escape(this.i18n.t('map.streetView'))}</a>
          ${sites.length === 1
            ? `<a href="http://${this.escape(sites[0].ip)}:888/" target="_blank" rel="noopener">${this.escape(this.i18n.t('map.camera'))}</a>`
            : ''}
        </div>
      </div>`;
  }

  /** Frames the fleet, ignoring records whose coordinates are clearly wrong. */
  fitToStations(): void {
    const located = this.wellLocated.length ? this.wellLocated : this.located;
    if (!this.map || !located.length) return;

    const bounds = located.reduce(
      (acc, s) => acc.extend([s.longitude, s.latitude]),
      new LngLatBounds(
        [located[0].longitude, located[0].latitude],
        [located[0].longitude, located[0].latitude]
      )
    );
    // Pitch and bearing must be restated. fitBounds derives its camera from
    // cameraForBounds, which only reports centre, zoom and bearing — the tilt
    // is dropped on the way through and the 3D view silently flattens.
    this.map.fitBounds(bounds, {
      padding: 80,
      maxZoom: 15,
      duration: 800,
      pitch: this.tilted ? TILT_PITCH : 0,
      bearing: DEFAULT_BEARING,
    });
  }

  toggleTilt(): void {
    this.tilted = !this.tilted;
    this.map?.easeTo({ pitch: this.tilted ? TILT_PITCH : 0, duration: 600 });
  }

  /**
   * Centres on one station from the side list.
   *
   * Zooms past the building layer's minzoom so the station is seen against
   * extruded streets rather than an abstract regional view.
   */
  focus(site: Site): void {
    if (!this.map) return;
    if (!Number.isFinite(site.latitude) || !Number.isFinite(site.longitude)) {
      this.message.info(this.i18n.t('map.noCoordinates', { name: site.nom }));
      return;
    }

    this.map.flyTo({
      center: [site.longitude, site.latitude],
      zoom: STREET_ZOOM,
      pitch: this.tilted ? TILT_PITCH : 0,
      bearing: DEFAULT_BEARING,
      duration: 900,
    });

    // Markers are keyed by location, not by station: several stations can share
    // one pin, so the popup is found through the point the station sits on.
    const marker = this.markers.get(`${site.latitude},${site.longitude}`);
    if (marker && !marker.getPopup()?.isOpen()) marker.togglePopup();
  }

  trackById(_index: number, site: Site): string {
    return site._id;
  }

  openDetail(site: Site): void {
    if (!site.project) return;
    void this.router.navigate(['/project', site.project._id, 'analysis', site._id]);
  }
}
