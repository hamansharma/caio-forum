import React from 'react';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const steps = [
  { key: 'inventory', label: 'Inventory', detail: 'Add tools', path: '/playground/vendor-portfolio' },
  { key: 'profiles', label: 'Profiles', detail: 'Confirm capabilities', path: '/playground/vendor-portfolio/profiles' },
  { key: 'analysis', label: 'Analysis', detail: 'Review overlap', path: '/playground/vendor-portfolio/analysis' },
];

export default function VendorJourney({ current }) {
  const activeIndex = steps.findIndex(step => step.key === current);
  return <nav className="vendor-journey" aria-label="Vendor portfolio journey">{steps.map((step, index) => <React.Fragment key={step.key}><Link className={`vendor-journey-step ${step.key === current ? 'active' : ''} ${index < activeIndex ? 'complete' : ''}`} to={step.path} aria-current={step.key === current ? 'step' : undefined}><span>{index < activeIndex ? <Check size={14} /> : index + 1}</span><div><strong>{step.label}</strong><small>{step.detail}</small></div></Link>{index < steps.length - 1 && <i className={index < activeIndex ? 'complete' : ''} />}</React.Fragment>)}</nav>;
}
