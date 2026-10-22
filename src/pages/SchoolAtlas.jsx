import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, SlidersHorizontal, X } from 'lucide-react';
import { format } from 'd3-format';
import SchoolMap from '../components/SchoolMap';
import usePageMeta from '../hooks/usePageMeta';
import { datasetById, dataAtlasPath } from '../data/dataAtlas';
import {
  STATES, LOCALE, LOCALE_GROUP, RACES, NO_DATA, gradeLabel, COLOR_MODES, LEVEL_FILTERS, TYPE_FILTERS,
  colorMode, defaultFilters, filterSchools, classify, shownMask, binCounts, summarize, loadSchoolAtlas, searchText, matchesSearch,
} from '../data/schoolAtlasModel';
import './SchoolAtlas.css';

const dataset = datasetById('us-public-schools');
const fmt = format(',');
const noDataColor = () => (document.documentElement.dataset.theme === 'daylight' ? '#a8b0bc' : '#5b6676');
const swatch = color => (color === NO_DATA ? noDataColor() : color);

export default function SchoolAtlas() {
  usePageMeta(`${dataset.title} Map | Data Atlas | CAIO Forum`, dataset.summary, { canonicalPath: dataAtlasPath(dataset.id) });
  const [load, setLoad] = useState({ status: 'loading' });

  useEffect(() => {
    let active = true;
    loadSchoolAtlas(dataset.dataUrl)
      .then(({ D, topo }) => { if (active) setLoad({ status: 'ready', D, topo }); })
      .catch(error => { if (active) setLoad({ status: 'error', message: error.message }); });
    return () => { active = false; };
  }, []);

  if (load.status !== 'ready') {
    return (
      <main className="atlas-page atlas-loading">
        <div>
          <b>{load.status === 'error' ? "The school data didn't load" : `Loading ${fmt(dataset.rows)} schools`}</b>
          {load.status === 'error' ? `Reload the page to try again. (${load.message})` : 'This takes a few seconds on a fast connection.'}
        </div>
      </main>
    );
  }
  return <Atlas D={load.D} topo={load.topo} />;
}

function Atlas({ D, topo }) {
  const [filters, setFilters] = useState(defaultFilters);
  const [modeId, setModeId] = useState('frl');
  const [hiddenBins, setHiddenBins] = useState(() => new Set());
  const [selected, setSelected] = useState(-1);
  const [flyTo, setFlyTo] = useState(null);
  const [railOpen, setRailOpen] = useState(false);

  const mode = useMemo(() => colorMode(D, modeId), [D, modeId]);
  const cls = useMemo(() => classify(D, mode), [D, mode]);
  const visible = useMemo(() => filterSchools(D, filters), [D, filters]);
  const counts = useMemo(() => binCounts(visible, cls, mode.bins.length), [visible, cls, mode]);
  const shown = useMemo(() => shownMask(visible, cls, hiddenBins), [visible, cls, hiddenBins]);
  const stats = useMemo(() => summarize(D, shown), [D, shown]);
  const states = useMemo(() => Object.keys(STATES).filter(abbr => D.dict.st.includes(abbr)).sort((a, b) => STATES[a].localeCompare(STATES[b])), [D]);

  const toggleIn = (key, value) => setFilters(current => {
    const next = new Set(current[key]);
    if (next.has(value)) next.delete(value); else next.add(value);
    return { ...current, [key]: next };
  });
  const toggleBin = bin => setHiddenBins(current => {
    const next = new Set(current);
    if (next.has(bin)) next.delete(bin); else next.add(bin);
    return next;
  });
  const chooseSchool = i => {
    if (!visible[i] || hiddenBins.size) { setFilters(current => ({ ...defaultFilters(), state: current.state })); setHiddenBins(new Set()); }
    setSelected(i);
    setFlyTo({ index: i });
    setRailOpen(false);
  };

  return (
    <main className="atlas-page">
      <aside className={`atlas-rail ${railOpen ? 'open' : ''}`} id="atlas-rail">
        <div className="atlas-rail-head">
          <Link to={dataAtlasPath()} className="atlas-back"><ArrowLeft size={14} /> Data Atlas</Link>
          <button type="button" className="atlas-rail-close" onClick={() => setRailOpen(false)} aria-label="Close filters"><X size={16} /></button>
        </div>
        <div>
          <h1>{dataset.title}</h1>
          <p className="atlas-sub">{dataset.summary}</p>
        </div>

        <SchoolSearch D={D} stateFilter={filters.state} onChoose={chooseSchool} />

        <div className="atlas-group">
          <label className="atlas-label" htmlFor="atlas-state">State or territory</label>
          <select id="atlas-state" value={filters.state} onChange={event => setFilters(current => ({ ...current, state: event.target.value }))}>
            <option value="">All states and territories</option>
            {states.map(abbr => <option key={abbr} value={abbr}>{STATES[abbr]}</option>)}
          </select>
        </div>

        <div className="atlas-stats">
          {[
            [fmt(stats.schools), 'schools shown'],
            [stats.students >= 1e6 ? `${(stats.students / 1e6).toFixed(1)}M` : fmt(stats.students), 'students (2022–23)'],
            [stats.frlPercent == null ? '—' : `${stats.frlPercent}%`, 'eligible for free or reduced lunch'],
            [stats.studentsPerTeacher ?? '—', 'students per teacher'],
            [stats.charterPercent == null ? '—' : `${stats.charterPercent}%`, 'are charter schools'],
            [filters.state ? STATES[filters.state] : 'All', 'state or territory'],
          ].map(([value, label]) => <div key={label}><b>{value}</b><span>{label}</span></div>)}
        </div>

        <div className="atlas-group">
          <label className="atlas-label" htmlFor="atlas-color">Color schools by</label>
          <select id="atlas-color" value={modeId} onChange={event => { setModeId(event.target.value); setHiddenBins(new Set()); }}>
            {COLOR_MODES.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
          <div className="atlas-legend">
            {mode.bins.map((bin, k) => (bin.label === 'No data' && counts[k] === 0 ? null : (
              <button type="button" key={bin.label} className={hiddenBins.has(k) ? 'off' : ''} aria-pressed={!hiddenBins.has(k)} onClick={() => toggleBin(k)}>
                <span className="atlas-swatch" style={{ background: swatch(bin.color) }} />
                <span>{bin.label}</span>
                <span className="atlas-count">{fmt(counts[k])}</span>
              </button>
            )))}
          </div>
          <p className="atlas-hint">Click a legend row to hide or show those schools.</p>
        </div>

        <ChipGroup label="School level" items={LEVEL_FILTERS.map(([key]) => [key, key])} active={filters.levels} onToggle={key => toggleIn('levels', key)} />
        <ChipGroup label="Locale" items={Object.entries(LOCALE_GROUP).map(([key, label]) => [label, key])} active={filters.locales} onToggle={key => toggleIn('locales', key)} />
        <ChipGroup label="Type" items={TYPE_FILTERS} active={filters.types} onToggle={key => toggleIn('types', key)} />

        <div className="atlas-foot">
          <p>Source: <a href={dataset.source.url} target="_blank" rel="noopener noreferrer">{dataset.source.name}</a>. Locations 2024–25; characteristics 2022–23. Schools that opened after 2022–23 have a location but no enrollment data.</p>
          <p>Lunch eligibility is not comparable across all states. Districts using community eligibility (common in MS, DC and others) report every student as eligible.</p>
        </div>
      </aside>

      <div className="atlas-map">
        <SchoolMap D={D} topo={topo} shown={shown} cls={cls} bins={mode.bins} selected={selected} onSelect={i => setSelected(i)} focusState={filters.state} flyTo={flyTo} />
        <button type="button" className="atlas-menu" onClick={() => setRailOpen(true)} aria-controls="atlas-rail" aria-expanded={railOpen}><SlidersHorizontal size={14} /> Filters</button>
        {selected >= 0 && <SchoolCard D={D} i={selected} onClose={() => setSelected(-1)} />}
      </div>
    </main>
  );
}

function ChipGroup({ label, items, active, onToggle }) {
  return (
    <div className="atlas-group">
      <span className="atlas-label">{label}</span>
      <div className="atlas-chips">
        {items.map(([text, key]) => (
          <button type="button" key={key} className="atlas-chip" aria-pressed={active.has(key)} onClick={() => onToggle(key)}>{text}</button>
        ))}
      </div>
    </div>
  );
}

function SchoolSearch({ D, stateFilter, onChoose }) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(-1);
  const [open, setOpen] = useState(false);
  const haystack = useMemo(() => D.name.map((name, i) => searchText(name, D.city[i])), [D]);
  const hits = useMemo(() => {
    if (query.trim().length < 2) return [];
    const stateIndex = stateFilter ? D.dict.st.indexOf(stateFilter) : -1;
    const found = [];
    for (let i = 0; i < D.n && found.length < 12; i += 1) if ((stateIndex < 0 || D.st[i] === stateIndex) && matchesSearch(haystack[i], query)) found.push(i);
    return found;
  }, [query, stateFilter, D, haystack]);
  const choose = i => { setQuery(D.name[i]); setOpen(false); onChoose(i); };

  return (
    <div className="atlas-group atlas-search">
      <label className="atlas-label" htmlFor="atlas-q">Find a school</label>
      <input
        id="atlas-q" type="search" placeholder="School name or city" autoComplete="off" value={query}
        onChange={event => { setQuery(event.target.value); setCursor(-1); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={event => {
          if (event.key === 'ArrowDown') { setCursor(c => Math.min(hits.length - 1, c + 1)); event.preventDefault(); }
          else if (event.key === 'ArrowUp') { setCursor(c => Math.max(0, c - 1)); event.preventDefault(); }
          else if (event.key === 'Enter' && hits.length) choose(hits[Math.max(cursor, 0)]);
          else if (event.key === 'Escape') setOpen(false);
        }}
      />
      {open && hits.length > 0 && (
        <div className="atlas-results">
          {hits.map((i, n) => (
            <button type="button" key={i} className={n === cursor ? 'on' : ''} onMouseDown={event => event.preventDefault()} onClick={() => choose(i)}>
              {D.name[i]}<small>{D.city[i]}, {D.dict.st[D.st[i]]}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SchoolCard({ D, i, onClose }) {
  const dict = (field, index) => D.dict[field][index];
  const enrollment = D.enr[i];
  const state = dict('st', D.st[i]);
  const locale = LOCALE[dict('locale', D.locale[i])] ?? '';
  const charter = dict('charter', D.charter[i]);
  const virtual = dict('virtual', D.virtual[i]);
  const type = dict('type', D.type[i]);
  const level = dict('level', D.level[i]);
  const district = dict('lea', D.lea[i]);
  const cd = D.cd[i]?.length === 4 ? (['00', '98'].includes(D.cd[i].slice(2)) ? `${state} at-large` : `${state}-${+D.cd[i].slice(2)}`) : '';
  const tags = [
    enrollment != null && level && { text: level },
    D.gslo[i] && D.gslo[i] !== 'N' && { text: `Grades ${gradeLabel(D.gslo[i])}–${gradeLabel(D.gshi[i])}` },
    charter === 'Yes' && { text: 'Charter', highlight: true },
    virtual === 'Full Virtual' && { text: 'Full virtual', highlight: true },
    type && type !== 'Regular School' && type !== 'Unknown' && { text: type.replace(' School', '') },
    locale && { text: locale },
  ].filter(Boolean);
  const races = RACES.map(([code, label, color]) => [label, color, D[`r_${code}`][i] ?? 0]).filter(([, , value]) => value > 0);

  return (
    <section className="atlas-card" aria-live="polite">
      <button type="button" className="atlas-card-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
      <h2>{D.name[i]}</h2>
      <div className="atlas-card-meta">
        {district && district !== '—' && <>{district}<br /></>}
        {D.street[i]}, {D.city[i]}, {state} {D.zip[i]}<br />
        {dict('county', D.county[i])}{cd && ` · Congressional district ${cd}`}{D.phone[i] && ` · ${D.phone[i]}`}
      </div>
      <div className="atlas-tags">{tags.map(tag => <span key={tag.text} className={`atlas-tag ${tag.highlight ? 'hl' : ''}`}>{tag.text}</span>)}</div>
      {enrollment != null ? (
        <>
          <div className="atlas-kv">
            <div><b>{fmt(enrollment)}</b><span>students</span></div>
            <div><b>{D.ratio[i] != null ? (D.ratio[i] / 10).toFixed(1) : '—'}</b><span>per teacher</span></div>
            <div><b>{D.frl[i] != null ? `${D.frl[i]}%` : '—'}</b><span>free/reduced lunch</span></div>
          </div>
          {D.r_WH[i] != null && races.length > 0 && (
            <>
              <span className="atlas-label">Students by race or ethnicity</span>
              <div className="atlas-bar">{races.map(([label, color, value]) => <span key={label} title={`${label} ${value}%`} style={{ width: `${value}%`, background: color }} />)}</div>
              <div className="atlas-rlist">
                {[...races].sort((a, b) => b[2] - a[2]).map(([label, color, value]) => (
                  <div key={label}><span className="atlas-swatch small" style={{ background: color }} />{label}<span className="atlas-v">{value}%</span></div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <p className="atlas-note">This school is in the 2024–25 directory but not in the 2022–23 characteristics file, usually because it opened recently. Enrollment and demographics are not available.</p>
      )}
      <p className="atlas-note">NCES ID {D.id[i]} · <a href={`https://nces.ed.gov/ccd/schoolsearch/school_detail.asp?ID=${D.id[i]}`} target="_blank" rel="noopener noreferrer">Full NCES profile</a></p>
    </section>
  );
}
