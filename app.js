const REPORTS_ENABLED=false;
const labels={public:'Открыт для всех',restricted:'Только команда',unknown:'Доступ не проверен',missing:'Макет не найден',reported:'Сообщили: ссылка закрыта',checked:'Проверено'};
let campaigns=[], reports={}, filter='all';
const byId=id=>document.getElementById(id);
const escapeHtml=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function status(item){return item.reviewed?'checked':'unknown';}
function toast(message){const el=byId('toast');el.textContent=message;el.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('visible'),5000);}
function render(){
 const search=byId('search').value.trim().toLocaleLowerCase('ru');
 const list=campaigns.filter(i=>(!search||i.name.toLocaleLowerCase('ru').includes(search))&&(filter==='all'||(filter==='missing'?!i.url:status(i)===filter)));
 const groups=new Map();for(const i of list){if(!groups.has(i.date))groups.set(i.date,[]);groups.get(i.date).push(i);}
 const dates=[...groups.keys()].sort((a,b)=>byId('sort').value==='asc'?a.localeCompare(b):b.localeCompare(a));
 byId('date-nav').innerHTML=dates.map(d=>`<a href="#date-${d}">${Number(d.slice(-2))} октября <span>${groups.get(d).length}</span></a>`).join('');
 byId('catalog').innerHTML=dates.length?dates.map(d=>`<section class="date-group" id="date-${d}"><div class="date-heading"><h2>${Number(d.slice(-2))} октября <span>2026</span></h2><span class="count">${groups.get(d).length}</span></div><div class="rows">${groups.get(d).map(item=>{
 const s=status(item),name=item.name.split(' — ')[0],detail=item.name.includes(' — ')?item.name.split(' — ').slice(1).join(' — '):'';
 const extra=[detail,item.note].filter(Boolean).join(' · ');
 const checked=item.reviewed?'Проверено пользователем':item.checkedAt?'Проверено '+new Date(item.checkedAt).toLocaleString('ru-RU',{timeZone:'Europe/Moscow',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'Проверка доступа ещё не завершена';
 return `<article class="campaign"><div><div class="campaign-name">${escapeHtml(name)}</div>${extra?`<div class="campaign-sub">${escapeHtml(extra)}</div>`:''}</div><div class="status ${s}" title="${escapeHtml(checked)}">${labels[s]}</div><div class="actions">${item.url?`<a class="open-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Открыть в Figma <b aria-hidden="true">↗</b></a><a class="word-link" href="./download/${item.id}.docx" download title="Скачать Word-файл" aria-label="Скачать Word-файл ${escapeHtml(name)}">↓</a>`:'<span class="unavailable">Ссылка появится позже</span>'}</div></article>`;
 }).join('')}</div></section>`).join(''):'<div class="empty"><strong>Ничего не найдено</strong>Попробуйте другое название или измените фильтр.</div>';
 byId('total').textContent=campaigns.length;byId('all-count').textContent=campaigns.length;
 byId('found').textContent=campaigns.filter(i=>i.url).length;
 byId('opened').textContent=campaigns.filter(i=>status(i)==='checked').length;
 byId('pending').textContent=campaigns.filter(i=>status(i)==='unknown').length;
 const issues=campaigns.filter(i=>['reported','restricted'].includes(status(i))).length;byId('issue-count').textContent=issues||'';
 document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('selected',b.dataset.filter===filter));
}
let visitor;
try{visitor=localStorage.getItem('promo-links-visitor');if(!visitor){visitor=crypto.randomUUID();localStorage.setItem('promo-links-visitor',visitor);}}catch{visitor=crypto.randomUUID();}
document.addEventListener('click',async e=>{
 const f=e.target.closest('[data-filter]');if(f){filter=f.dataset.filter;render();return;}
 const button=e.target.closest('[data-report]');if(!button)return;
 const id=button.dataset.report;button.disabled=true;button.textContent='Отправляем…';
 try{const r=await fetch('/api/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,visitor})});if(!r.ok)throw new Error('HTTP '+r.status);reports[id]={reportedAt:new Date().toISOString()};render();toast('Сообщение принято. Алиса увидит уведомление на рабочем Mac.');}catch{button.disabled=false;button.textContent='⚑ Ссылка закрыта';toast('Не удалось отправить сообщение. Попробуйте ещё раз.');}
});
byId('search').addEventListener('input',render);byId('sort').addEventListener('change',render);
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();byId('search').focus();}});
async function refreshReports(){if(!REPORTS_ENABLED)return;try{const r=await fetch('/api/status',{cache:'no-store'});if(r.ok){reports=await r.json();render();}}catch{}}
fetch('./campaigns.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{campaigns=data;render();const times=data.map(i=>i.checkedAt).filter(Boolean).sort();if(times.length)byId('update-time').textContent='Проверка доступа: '+new Date(times.at(-1)).toLocaleString('ru-RU',{timeZone:'Europe/Moscow',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});refreshReports();}).catch(()=>{byId('catalog').innerHTML='<div class="empty"><strong>Не удалось загрузить ссылки</strong>Обновите страницу через минуту.</div>';});
setInterval(refreshReports,60000);
