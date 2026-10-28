import{e as y,f as a}from"./chunk-ZRQZAJ3P.js";import{a as u}from"./chunk-T7AHGDXQ.js";import{f as l}from"./chunk-PIJUNJNJ.js";import{k as f,p}from"./chunk-JSI5SXLI.js";var b=10*6e4,w=40;async function g(t){let n=await l().t.notes.add({...t.id?{id:t.id}:{},title:t.title,body:t.body??"",kind:t.kind??"note",tags:t.tags??[],dailyDate:t.dailyDate??null,paperId:t.paperId??null,pinned:!1,lastOpenedAt:Date.now()});return await y(n),await a(),u.emit({type:"note.created",noteId:n.id}),n}async function P(t,e){let n=l(),o=n.t.notes.get(t);if(!o)return;if(e.body!=null&&e.body!==o.body||e.title!=null&&e.title!==o.title){let d=n.t.noteVersions.all().filter(r=>r.noteId===t).sort((r,c)=>c.at-r.at);if(!d[0]||Date.now()-d[0].at>b){await n.t.noteVersions.add({noteId:t,title:o.title,body:o.body,at:Date.now()});let r=d.slice(w-1);r.length&&await n.t.noteVersions.purge(r.map(c=>c.id))}}let s=await n.t.notes.update(t,e);if(s)return(e.body!=null||e.kind!=null)&&await y(s),e.title!=null&&e.title!==o.title&&await a(),u.emit({type:"note.saved",noteId:t}),s}async function v(t){let e=l();await e.t.notes.remove(t);let n=e.t.links.all().filter(o=>o.fromType==="note"&&o.fromId===t);n.length&&await e.t.links.purge(n.map(o=>o.id)),await a()}function m(t,e){return t.replace(/\{\{(\w+)\}\}/g,(n,o)=>e[o]??n)}var N=`## Intentions
-

## Notes


## What I learned today


## Open questions
- `;async function A(t=f()){let e=l(),n=e.t.notes.all().find(s=>s.kind==="daily"&&s.dailyDate===t);if(n)return n;let o=e.t.notes.all().find(s=>s.kind==="template"&&s.title.toLowerCase().includes("daily")),i=m(o?.body??N,{date:t,title:p(t,"long")});return g({id:`daily_${t}`,title:p(t,"long"),body:i,kind:"daily",dailyDate:t,tags:["daily"]})}async function O(t,e){let n=l().t.notes.get(t),o=m(n?.body??"",{date:f(),title:e});return g({title:e,body:o,kind:n?.tags.includes("concept")?"concept":"note",tags:(n?.tags??[]).filter(i=>i!=="template")})}function T(t){let e=[],n=!1;for(let o of t.body.split(`
`)){if(o.trim().startsWith("```")){n=!n;continue}if(n)continue;let i=o.replace(/^\s*(?:[-*]\s+(?:\[ \]\s+)?)?/,"").trim();/^(\?\?|q:)/i.test(i)?e.push(i.replace(/^(\?\?|q:)\s*/i,"")):i.endsWith("?")&&i.length>8&&!i.startsWith("#")&&e.push(i)}return e}export{g as a,P as b,v as c,A as d,O as e,T as f};
