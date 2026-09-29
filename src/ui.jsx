import React, {useEffect,useRef} from 'react';
import {riskLabel} from './domain.mjs';
export function Icon({name,size=20}) {
 const paths={dashboard:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',cows:'M5 9L3 5l5 1 M19 9l2-4-5 1 M7 8q5-4 10 0v9q-5 6-10 0z M9 16h6 M9 11h.01 M15 11h.01',live:'M2 12h4l3-8 5 16 3-8h5',health:'M12 20S2 14 2 8a5 5 0 0 1 10-1A5 5 0 0 1 22 8c0 6-10 12-10 12',milk:'M9 3h6 M10 3v4l-3 4v9h10v-9l-3-4V3 M7 14h10',alerts:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',sensors:'M8 8h8v8H8z M9 2v6 M15 2v6 M9 16v6 M15 16v6 M2 9h6 M2 15h6 M16 9h6 M16 15h6',history:'M3 11a9 9 0 1 1 2 7 M3 4v7h7 M12 7v5l3 3',treatments:'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',assistant:'M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2',arrow:'M5 12h14 M14 7l5 5-5 5',download:'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6',plus:'M12 4v16 M4 12h16',menu:'M3 6h18 M3 12h18 M3 18h18',mic:'M9 4a3 3 0 0 1 6 0v8a3 3 0 0 1-6 0z M5 10v2a7 7 0 0 0 14 0v-2 M12 19v3',check:'M4 12l5 5L20 6',logout:'M9 3H3v18h6 M9 12h12 M16 7l5 5-5 5'};
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]||paths.dashboard}/></svg>;
}
export function Badge({score,children,tone}) {return <span className={'badge '+(tone||riskLabel(score).toLowerCase())}>{children||riskLabel(score)}</span>}
export function Card({children,className=''}) {return <section className={'card '+className}>{children}</section>}
export function Empty({text='No records yet.',children}) {return <div className="empty"><Icon name="history" size={30}/><h3>{text}</h3>{children}</div>}
export function Metric({label,value,note,icon,tone=''}) {return <Card className={'metric '+tone}><div className="metric-top"><span>{label}</span><Icon name={icon}/></div><strong>{value}</strong><small>{note}</small></Card>}
export function PageHeading({eyebrow,title,description,children}) {return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div><div className="actions">{children}</div></div>}
export function Field({label,children}) {return <label className="field"><span>{label}</span>{children}</label>}
export function Modal({title,onClose,children}) {
 const ref=useRef(null);
 useEffect(()=>{const el=ref.current;const previous=document.activeElement;el.showModal();return()=>{el.close();previous?.focus();};},[]);
 return <dialog ref={ref} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}}><div className="dialog-inner"><header><h2>{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></header>{children}</div></dialog>;
}
export function Trend({rows,field='cowTemperature',unit='°C',color='#2a8064'}) {
 if(!rows.length)return <Empty text="No observations in this period."/>;
 const data=rows.filter(r=>r[field]!==null&&r[field]!==undefined&&r[field]!==''&&Number.isFinite(Number(r[field]))).sort((a,b)=>a.timestamp.localeCompare(b.timestamp)), vals=data.map(r=>r[field]),low=Math.min(...vals)-0.3,high=Math.max(...vals)+0.3;
 if(!data.length)return <Empty text="No numeric observations in this period."/>;
 const points=vals.map((n,i)=>`${48+i*(650/Math.max(1,vals.length-1))},${170-(n-low)/(high-low)*140}`).join(' ');
 return <div className="trend"><svg viewBox="0 0 740 220" role="img" aria-label={`${field} trend, ${vals.length} observations. Latest ${vals.at(-1)} ${unit}`}>
 {[0,1,2,3].map(i=><g key={i}><line x1="48" y1={30+i*47} x2="710" y2={30+i*47} stroke="var(--line)" strokeDasharray="4 5"/><text x="2" y={34+i*47} fill="var(--muted)" fontSize="11">{(high-i*(high-low)/3).toFixed(1)}</text></g>)}
 <polygon points={`48,170 ${points} ${48+(vals.length-1)*(650/Math.max(1,vals.length-1))},170`} fill={color} opacity=".07"/><polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round"/>
 {vals.map((n,i)=><circle key={i} cx={48+i*650/Math.max(1,vals.length-1)} cy={170-(n-low)/(high-low)*140} r="3" fill={color}><title>{data[i].timestamp}: {n} {unit}</title></circle>)}
 <text x="48" y="205" fill="var(--muted)" fontSize="11">{new Date(data[0].timestamp).toLocaleDateString()}</text><text x="690" y="205" textAnchor="end" fill="var(--muted)" fontSize="11">{new Date(data.at(-1).timestamp).toLocaleDateString()} · {unit}</text></svg></div>;
}
export function download(name,content,type='text/plain') {const u=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
export const time=iso=>iso?new Date(iso).toLocaleString(): 'Not synced';
