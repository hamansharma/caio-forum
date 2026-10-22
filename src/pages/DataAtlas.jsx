import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Database, Map } from 'lucide-react';
import usePageMeta from '../hooks/usePageMeta';
import { DATASETS, dataAtlasPath } from '../data/dataAtlas';
import './Playground.css';
import './DataAtlas.css';

const fmt = new Intl.NumberFormat('en-US');

export default function DataAtlas() {
  usePageMeta('Data Atlas | Explore Public Datasets | CAIO Forum', 'Explore public datasets through interactive maps and charts in the CAIO Forum AI Playground, with every figure traceable to its source.', { canonicalPath: dataAtlasPath() });

  return (
    <main className="playground-page">
      <Link to="/playground" className="data-atlas-back"><ArrowLeft size={14} /> AI Playground</Link>
      <section className="playground-hero">
        <span className="playground-eyebrow"><Database size={15} /> Open data</span>
        <h1>Data Atlas</h1>
        <p>Public datasets you can explore directly: interactive maps and charts with every figure traceable to its source.</p>
      </section>

      <section className="data-atlas-grid" aria-label="Datasets">
        {DATASETS.map(dataset => (
          <article key={dataset.id} className="playground-card data-atlas-card">
            <div className="playground-icon data-atlas-icon"><Map size={22} /></div>
            <div className="playground-card-copy">
              <div className="playground-label">{dataset.kind}</div>
              <h2>{dataset.title}</h2>
              <p>{dataset.summary}</p>
              <ul className="data-atlas-tags">{dataset.highlights.map(item => <li key={item}>{item}</li>)}</ul>
              <dl className="data-atlas-facts">
                <div><dt>Records</dt><dd>{fmt.format(dataset.rows)} {dataset.rowsLabel}</dd></div>
                <div><dt>Period</dt><dd>{dataset.period}</dd></div>
                <div><dt>Sources</dt><dd>{dataset.sources.map((source, k) => <React.Fragment key={source.url}>{k > 0 && <br />}<a href={source.url} target="_blank" rel="noopener noreferrer">{source.name}</a></React.Fragment>)}</dd></div>
              </dl>
            </div>
            <div className="playground-card-footer">
              <span>No sign-in required</span>
              <Link to={dataAtlasPath(dataset.id)} className="data-atlas-open">Explore the map <ArrowRight size={16} /></Link>
            </div>
          </article>
        ))}
      </section>

      <section className="playground-note">
        <h2>More datasets are on the way</h2>
        <p>Each dataset gets a page built for exploring it, with its source and known caveats stated up front. Have a public dataset you'd like to see here? <Link to="/playground/community">Suggest it in the Playground Community.</Link></p>
      </section>
    </main>
  );
}
