import React, { useEffect, useMemo, useState } from 'react';
import { Scissors, CalendarDays, Clock, MapPin, Phone, Check, ChevronRight, ChevronLeft, ShieldCheck, UserRound, Banknote, Package, TrendingUp, X, Menu, Plus, LockKeyhole, CircleCheck, CircleX, RefreshCw } from 'lucide-react';

const CONFIG = {
  name: 'Dom Moura',
  address: 'Avenida Carlos Cruz, nº 2709, bairro Juvêncio Santana',
  whatsapp: '5588988781338',
  hours: 'Segunda a sábado, das 08h30 às 20h',
  lunchStart: '12:00',
  lunchEnd: '13:00',
};
const BARBERS = ['Arthur', 'Andrey', 'Dom Moura'];
const SERVICES = [
  { id: 'corte', name: 'Corte de cabelo', price: 30, duration: 30, desc: 'Corte personalizado e acabamento.' },
  { id: 'barba', name: 'Barba', price: 30, duration: 30, desc: 'Desenho, alinhamento e acabamento.' },
  { id: 'combo', name: 'Corte + barba', price: 55, duration: 60, desc: 'Visual completo em um só horário.' },
  { id: 'sobrancelha', name: 'Sobrancelha', price: 10, duration: 10, desc: 'Limpeza e alinhamento.' },
  { id: 'pig-cabelo', name: 'Pigmentação de cabelo', price: 25, duration: 20, desc: 'Acabamento com pigmentação.' },
  { id: 'pig-barba', name: 'Pigmentação de barba', price: 15, duration: 15, desc: 'Realce e definição da barba.' },
  { id: 'luzes', name: 'Luzes', price: null, duration: 90, desc: 'Valor e duração a confirmar.' },
  { id: 'botox', name: 'Botox', price: null, duration: 60, desc: 'Valor e duração a confirmar.' },
  { id: 'progressiva', name: 'Progressiva', price: null, duration: 90, desc: 'Valor e duração a confirmar.' },
];
const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const dateBR = s => s ? new Date(`${s}T12:00:00`).toLocaleDateString('pt-BR') : '';
const load = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const today = dateKey(new Date());
const slots = () => {
  const out = [];
  for (let m = 8*60+30; m < 20*60; m += 30) {
    if (m >= 12*60 && m < 13*60) continue;
    out.push(`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`);
  }
  return out;
};
const initialAppts = load('dm_appts', []);
const initialMoves = load('dm_moves', []);
const initialProducts = load('dm_products', []);
const initialClients = load('dm_clients', []);

function App() {
  const [view, setView] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [appts, setAppts] = useState(initialAppts);
  const [moves, setMoves] = useState(initialMoves);
  const [products, setProducts] = useState(initialProducts);
  const [clients, setClients] = useState(initialClients);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('santanaandrey077@gmail.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [step, setStep] = useState(1);
  const [booking, setBooking] = useState({ service: '', barber: '', date: today, time: '', name: '', phone: '' });
  const [notice, setNotice] = useState('');
  const [manageCode, setManageCode] = useState('');
  const [manageAppt, setManageAppt] = useState(null);
  const [period, setPeriod] = useState('day');
  const [adminTab, setAdminTab] = useState('agenda');
  const [selectedDate, setSelectedDate] = useState(today);
  const [expense, setExpense] = useState({ description: '', amount: '', type: 'saida' });
  const [productForm, setProductForm] = useState({ name: '', price: '', commission: '10', quantity: '1', barber: 'Arthur', payment: 'pix' });

  useEffect(() => save('dm_appts', appts), [appts]);
  useEffect(() => save('dm_moves', moves), [moves]);
  useEffect(() => save('dm_products', products), [products]);
  useEffect(() => save('dm_clients', clients), [clients]);

  const selectedService = SERVICES.find(s => s.id === booking.service);
  const bookedTimes = useMemo(() => appts.filter(a => a.date === booking.date && a.barber === booking.barber && !['cancelado'].includes(a.status)).map(a => a.time), [appts, booking.date, booking.barber]);
  const availableSlots = slots().filter(t => !bookedTimes.includes(t) && (booking.date !== today || t > new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit', hour12:false})));
  const adminAppts = appts.filter(a => a.date === selectedDate).sort((a,b) => a.time.localeCompare(b.time));
  const revenue = appts.filter(a => a.status === 'concluido' && (period === 'day' ? a.date === today : period === 'week' ? isWithinDays(a.date,7) : a.date.slice(0,7) === today.slice(0,7))).reduce((sum,a)=>sum+Number(a.paidAmount ?? a.price ?? 0),0);
  const expenses = moves.filter(m => m.type === 'saida' && (period === 'day' ? m.date === today : period === 'week' ? isWithinDays(m.date,7) : m.date.slice(0,7) === today.slice(0,7))).reduce((sum,m)=>sum+Number(m.amount),0);
  const productRevenue = products.reduce((s,p)=>s+Number(p.price)*Number(p.quantity),0);
  function isWithinDays(d,n){ const delta=(new Date(`${today}T12:00:00`)-new Date(`${d}T12:00:00`))/86400000; return delta>=0&&delta<n; }
  const waLink = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent('Olá, gostaria de agendar um horário na Dom Moura! ✂️💈')}`;
  function patchBooking(key, value){ setBooking(b=>({...b,[key]:value})); }
  function submitBooking(e) {
    e.preventDefault();
    if (!booking.service || !booking.barber || !booking.date || !booking.time || !booking.name.trim() || booking.phone.replace(/\D/g,'').length < 10) { setNotice('Preencha todos os campos corretamente.'); return; }
    if (appts.some(a=>a.date===booking.date&&a.barber===booking.barber&&a.time===booking.time&&a.status!=='cancelado')) { setNotice('Este horário acabou de ser reservado. Escolha outro.'); setStep(3); return; }
    const service = SERVICES.find(s=>s.id===booking.service);
    if (service.price == null) { setNotice('Este serviço precisa de confirmação de preço. Entre em contato pelo WhatsApp.'); return; }
    const code = Math.random().toString(36).slice(2,10).toUpperCase();
    const appt = { id: crypto.randomUUID?.() || String(Date.now()), code, ...booking, serviceName: service.name, price: service.price, duration: service.duration, status:'agendado', createdAt:new Date().toISOString() };
    setAppts(prev=>[...prev,appt]);
    const normalized = booking.phone.replace(/\D/g,'');
    if (!clients.some(c=>c.phone===normalized)) setClients(prev=>[...prev,{name:booking.name.trim(),phone:normalized,history:[]}]);
    setManageAppt(appt); setNotice(''); setView('confirmation'); setStep(1);
  }
  function updateStatus(id,status) {
    setAppts(prev=>prev.map(a=>a.id===id?{...a,status,...(status==='concluido'?{paidAmount:a.paidAmount??a.price,payment:a.payment??'pix'}:{})}:a));
  }
  function doLogin(e) {
    e.preventDefault();
    setLoginError('A autenticação real ainda não foi conectada. Configure Supabase conforme o README antes de usar o painel com dados reais.');
  }
  function openAdmin(){setAdminOpen(true);setLoginError('');}
  function cancelAppt(a){setAppts(prev=>prev.map(x=>x.id===a.id?{...x,status:'cancelado'}:x));setManageAppt({...a,status:'cancelado'});setNotice('Agendamento cancelado nesta demonstração.');}
  function findManage(e){e.preventDefault();const found=appts.find(a=>a.code.toUpperCase()===manageCode.trim().toUpperCase());setManageAppt(found||null);setNotice(found?'':'Não encontramos esse código. Confira o código da confirmação.');}
  function addExpense(e){e.preventDefault();if(!expense.description||!Number(expense.amount))return;setMoves(prev=>[...prev,{id:crypto.randomUUID?.()||String(Date.now()),description:expense.description,amount:Number(expense.amount),type:expense.type,date:today}]);setExpense({description:'',amount:'',type:'saida'});}
  function addProductSale(e){e.preventDefault();if(!productForm.name||!Number(productForm.price))return;const p={...productForm,id:crypto.randomUUID?.()||String(Date.now()),price:Number(productForm.price),quantity:Number(productForm.quantity)||1,commissionRate:Number(productForm.commission)||0,date:today};setProducts(prev=>[...prev,p]);setMoves(prev=>[...prev,{id:`move-${p.id}`,description:`Venda de produto: ${p.name}`,amount:p.price*p.quantity,type:'entrada',date:today,payment:p.payment,barber:p.barber}]);setProductForm({name:'',price:'',commission:'10',quantity:'1',barber:'Arthur',payment:'pix'});}
  const gold = '#d6b15c';

  return <div className="app">
    <header className="topbar">
      <a className="brand" href="#" onClick={e=>{e.preventDefault();setView('home')}}><span className="brand-mark"><Scissors size={23}/></span><span><b>DOM MOURA</b><small>BARBEARIA</small></span></a>
      <nav className={menuOpen?'nav nav-open':'nav'}>
        <button onClick={()=>{setView('home');setMenuOpen(false)}}>Início</button><button onClick={()=>{setView('services');setMenuOpen(false)}}>Serviços</button><button onClick={()=>{setView('booking');setStep(1);setMenuOpen(false)}}>Agendar</button><button onClick={()=>{setView('manage');setMenuOpen(false)}}>Meu agendamento</button>
      </nav>
      <div className="header-actions"><a className="btn btn-gold btn-small" href={waLink} target="_blank" rel="noreferrer"><Phone size={15}/> WhatsApp</a><button className="icon-btn menu-btn" aria-label="Abrir menu" onClick={()=>setMenuOpen(!menuOpen)}><Menu/></button></div>
    </header>

    {view==='home' && <main>
      <section className="hero">
        <div className="hero-overlay"></div><div className="hero-content">
          <div className="eyebrow"><span></span> ESTILO • PRECISÃO • PRESENÇA</div>
          <h1>Seu estilo.<br/><em>Seu momento.</em></h1>
          <p>Mais que um corte: uma experiência feita para valorizar quem você é.</p>
          <div className="hero-buttons"><button className="btn btn-gold" onClick={()=>{setView('booking');setStep(1)}}><CalendarDays size={18}/> Agendar horário <ChevronRight size={17}/></button><button className="btn btn-outline" onClick={()=>setView('services')}>Ver serviços</button></div>
          <div className="hero-meta"><span><Clock size={15}/> Seg–Sáb · 08h30–20h</span><span><MapPin size={15}/> Juazeiro do Norte – CE</span></div>
        </div><div className="hero-side-label">DOM MOURA / DESDE 2016</div>
      </section>
      <section className="section intro-grid"><div><p className="kicker">A BARBEARIA</p><h2>Clássico na essência.<br/><span>Atual no estilo.</span></h2></div><p className="intro-copy">Atendimento cuidadoso, ambiente acolhedor e atenção aos detalhes. Escolha seu serviço e reserve seu horário em poucos passos.</p></section>
      <section className="section services-section"><div className="section-head"><div><p className="kicker">NOSSO MENU</p><h2>Serviços em destaque</h2></div><button className="text-link" onClick={()=>setView('services')}>Ver todos <ChevronRight size={16}/></button></div><div className="service-grid">{SERVICES.filter(s=>s.price!=null).slice(0,4).map(s=><ServiceCard key={s.id} service={s} onBook={()=>{patchBooking('service',s.id);setView('booking');setStep(2)}}/>)}</div></section>
      <section className="booking-banner"><div><p className="kicker">SEU PRÓXIMO VISUAL COMEÇA AQUI</p><h2>Reserve seu horário<br/>sem complicação.</h2></div><button className="btn btn-gold" onClick={()=>{setView('booking');setStep(1)}}>Fazer agendamento <ChevronRight size={17}/></button></section>
      <section className="section location"><div><p className="kicker">ONDE ESTAMOS</p><h2>Esperamos por você.</h2><p><MapPin size={17}/> {CONFIG.address}</p><p><Clock size={17}/> {CONFIG.hours}</p><p><Phone size={17}/> (88) 98878-1338</p><a className="btn btn-outline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONFIG.address+', Juazeiro do Norte CE')}`} target="_blank" rel="noreferrer">Ver localização <ChevronRight size={16}/></a></div><div className="location-art"><Scissors size={74}/><span>DM</span><small>BARBEARIA</small></div></section>
    </main>}

    {view==='services' && <main className="page-wrap"><div className="page-heading"><p className="kicker">O MENU DOM MOURA</p><h1>Serviços & valores</h1><p>Escolha o cuidado que combina com você.</p></div><div className="service-grid all-services">{SERVICES.map(s=><ServiceCard key={s.id} service={s} onBook={()=>{if(s.price==null){window.open(waLink,'_blank');return;}patchBooking('service',s.id);setView('booking');setStep(2)}}/>)}</div></main>}

    {view==='booking' && <main className="page-wrap booking-page"><div className="page-heading"><p className="kicker">RESERVA ONLINE</p><h1>Agende seu horário</h1><p>Quatro passos rápidos para reservar seu momento.</p></div>
      <div className="steps">{['Serviço','Barbeiro','Data e hora','Seus dados'].map((s,i)=><div className={step===i+1?'step active':step>i+1?'step done':'step'} key={s}><span>{step>i+1?<Check size={15}/>:i+1}</span><small>{s}</small></div>)}</div>
      <form className="booking-card" onSubmit={submitBooking}>
        {step===1&&<><h2>O que vamos fazer?</h2><p className="muted">Escolha um serviço para continuar.</p><div className="choice-list">{SERVICES.filter(s=>s.price!=null).map(s=><button type="button" key={s.id} className={booking.service===s.id?'choice selected':'choice'} onClick={()=>patchBooking('service',s.id)}><span className="choice-icon"><Scissors size={19}/></span><span className="choice-text"><b>{s.name}</b><small>{s.duration} min</small></span><strong>{money(s.price)}</strong><span className="radio"></span></button>)}</div></>}
        {step===2&&<><h2>Escolha seu barbeiro</h2><p className="muted">Quem vai cuidar do seu visual?</p><div className="barber-grid">{BARBERS.map(b=><button type="button" key={b} className={booking.barber===b?'barber selected':'barber'} onClick={()=>patchBooking('barber',b)}><span className="avatar"><UserRound size={24}/></span><b>{b}</b><small>Barbeiro</small></button>)}</div></>}
        {step===3&&<><h2>Quando você prefere?</h2><p className="muted">Selecione o dia e um horário disponível.</p><label className="field-label">Data do atendimento<input type="date" min={today} value={booking.date} onChange={e=>{patchBooking('date',e.target.value);patchBooking('time','')}} required/></label><div className="slots-heading"><b>Horários disponíveis</b><small>{dateBR(booking.date)}</small></div><div className="slots">{availableSlots.map(t=><button type="button" key={t} className={booking.time===t?'slot selected':'slot'} onClick={()=>patchBooking('time',t)}>{t}</button>)}</div>{availableSlots.length===0&&<p className="notice">Não há horários livres nesta data. Escolha outro dia.</p>}</>}
        {step===4&&<><h2>Seus dados</h2><p className="muted">Usaremos seu WhatsApp para confirmar os detalhes.</p><label className="field-label">Nome completo<input value={booking.name} onChange={e=>patchBooking('name',e.target.value)} placeholder="Como podemos chamar você?" required/></label><label className="field-label">WhatsApp<input type="tel" value={booking.phone} onChange={e=>patchBooking('phone',e.target.value)} placeholder="(88) 99999-9999" minLength="10" required/></label><div className="summary-box"><b>Resumo do agendamento</b><p>{selectedService?.name} · {money(selectedService?.price)}</p><p>{booking.barber} · {dateBR(booking.date)} às {booking.time}</p><small>{selectedService?.duration} minutos estimados</small></div></>}
        {notice&&<p className="notice">{notice}</p>}
        <div className="form-actions">{step>1&&<button type="button" className="btn btn-outline" onClick={()=>{setStep(step-1);setNotice('')}}><ChevronLeft size={17}/> Voltar</button>}{step<4?<button type="button" className="btn btn-gold push" onClick={()=>{if(step===1&&!booking.service)return setNotice('Escolha um serviço.');if(step===2&&!booking.barber)return setNotice('Escolha um barbeiro.');if(step===3&&!booking.time)return setNotice('Escolha uma data e um horário livre.');setNotice('');setStep(step+1)}}>Continuar <ChevronRight size={17}/></button>:<button className="btn btn-gold push" type="submit">Confirmar agendamento <Check size={17}/></button>}</div>
      </form><p className="privacy-note"><ShieldCheck size={15}/> Seus dados são usados para gerenciar seu agendamento.</p>
    </main>}

    {view==='confirmation'&&<main className="page-wrap confirm-wrap"><div className="confirm-card"><div className="success-icon"><CircleCheck size={36}/></div><p className="kicker">RESERVA REGISTRADA</p><h1>Seu horário está reservado!</h1><p className="muted">Guarde o código abaixo para consultar ou cancelar o agendamento.</p>{manageAppt&&<><div className="confirmation-code"><small>CÓDIGO DE CONFIRMAÇÃO</small><b>{manageAppt.code}</b></div><div className="summary-box"><p><b>Serviço:</b> {manageAppt.serviceName}</p><p><b>Barbeiro:</b> {manageAppt.barber}</p><p><b>Data:</b> {dateBR(manageAppt.date)} às {manageAppt.time}</p><p><b>Valor:</b> {money(manageAppt.price)}</p><p><b>Cliente:</b> {manageAppt.name}</p><p><b>Status:</b> {manageAppt.status}</p></div><button className="btn btn-gold full" onClick={()=>window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(`Olá! Meu agendamento ${manageAppt.code} está marcado para ${dateBR(manageAppt.date)} às ${manageAppt.time}.`)}`,'_blank')}>Enviar confirmação pelo WhatsApp <Phone size={16}/></button></>}<button className="btn btn-outline full" onClick={()=>setView('home')}>Voltar ao início</button></div></main>}

    {view==='manage'&&<main className="page-wrap"><div className="page-heading"><p className="kicker">GERENCIE SUA RESERVA</p><h1>Meu agendamento</h1><p>Informe o código exibido na confirmação.</p></div><form className="manage-search" onSubmit={findManage}><input value={manageCode} onChange={e=>setManageCode(e.target.value)} placeholder="Ex.: A1B2C3D4" required/><button className="btn btn-gold">Consultar</button></form>{notice&&<p className="notice centered">{notice}</p>}{manageAppt&&<div className="manage-result"><div><p className="kicker">CÓDIGO {manageAppt.code}</p><h2>{manageAppt.serviceName}</h2><p>{manageAppt.barber} · {dateBR(manageAppt.date)} às {manageAppt.time}</p><b>{money(manageAppt.price)}</b><p>Status: <span className="status">{manageAppt.status}</span></p></div><div className="manage-actions"><button className="btn btn-outline" onClick={()=>{setBooking({service:manageAppt.service,barber:manageAppt.barber,date:manageAppt.date,time:'',name:manageAppt.name,phone:manageAppt.phone});setAppts(prev=>prev.map(a=>a.id===manageAppt.id?{...a,status:'cancelado'}:a));setView('booking');setStep(3)}}><RefreshCw size={15}/> Remarcar</button>{manageAppt.status!=='cancelado'&&<button className="btn btn-danger" onClick={()=>cancelAppt(manageAppt)}><X size={15}/> Cancelar</button>}</div></div>}</main>}

    {view==='admin'&&<main className="admin-page"><aside className="admin-sidebar"><div className="admin-logo"><span className="brand-mark"><Scissors size={20}/></span><b>DOM MOURA</b></div><p className="sidebar-label">GESTÃO</p>{[['agenda','Agenda'],['financeiro','Financeiro'],['produtos','Vendas de produtos'],['clientes','Clientes']].map(([id,label])=><button key={id} className={adminTab===id?'side-link active':'side-link'} onClick={()=>setAdminTab(id)}>{label}</button>)}<button className="side-link exit" onClick={()=>{setView('home');setAdminOpen(false)}}>Sair do painel</button></aside><div className="admin-content"><div className="admin-top"><div><p className="kicker">PAINEL DO PROPRIETÁRIO</p><h1>{adminTab==='agenda'?'Agenda':adminTab==='financeiro'?'Financeiro':adminTab==='produtos'?'Vendas de produtos':'Clientes'}</h1></div><span className="admin-user"><LockKeyhole size={15}/> Acesso do dono</span></div>
      {adminTab==='agenda'&&<><div className="admin-controls"><label>Dia da agenda<input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}/></label><span>{adminAppts.length} agendamento(s)</span></div><div className="table-wrap"><table><thead><tr><th>Horário</th><th>Cliente</th><th>Serviço</th><th>Barbeiro</th><th>Status</th><th>Ações</th></tr></thead><tbody>{adminAppts.map(a=><tr key={a.id}><td>{a.time}</td><td>{a.name}<small>{a.phone}</small></td><td>{a.serviceName}</td><td>{a.barber}</td><td><span className={`pill ${a.status}`}>{a.status}</span></td><td><select value={a.status} onChange={e=>updateStatus(a.id,e.target.value)}><option value="agendado">Agendado</option><option value="concluido">Concluído</option><option value="cancelado">Cancelado</option><option value="faltou">Faltou</option></select></td></tr>)}</tbody></table>{!adminAppts.length&&<div className="empty-state">Nenhum agendamento para esta data.</div>}</div></>}
      {adminTab==='financeiro'&&<><div className="period-switch">{[['day','Dia'],['week','Semana'],['month','Mês']].map(([id,l])=><button key={id} className={period===id?'selected':''} onClick={()=>setPeriod(id)}>{l}</button>)}</div><div className="metrics"><Metric label="Faturamento de serviços" value={money(revenue)} icon={<TrendingUp/>}/><Metric label="Saídas" value={money(expenses)} icon={<Banknote/>}/><Metric label="Saldo estimado" value={money(revenue-expenses)} icon={<CircleCheck/>}/><Metric label="Comissões de produtos" value={money(products.reduce((s,p)=>s+p.price*p.quantity*p.commissionRate/100,0))} icon={<Package/>}/></div><div className="admin-panel"><h3>Movimentações do caixa</h3><form className="inline-form" onSubmit={addExpense}><input placeholder="Descrição (ex.: aluguel)" value={expense.description} onChange={e=>setExpense({...expense,description:e.target.value})} required/><input type="number" min="0.01" step="0.01" placeholder="Valor R$" value={expense.amount} onChange={e=>setExpense({...expense,amount:e.target.value})} required/><select value={expense.type} onChange={e=>setExpense({...expense,type:e.target.value})}><option value="saida">Saída</option><option value="entrada">Entrada</option></select><button className="btn btn-gold"><Plus size={15}/> Lançar</button></form><div className="movement-list">{moves.map(m=><div key={m.id}><span><b>{m.description}</b><small>{dateBR(m.date)} {m.payment?`· ${m.payment}`:''}</small></span><strong className={m.type==='saida'?'negative':'positive'}>{m.type==='saida'?'-':'+'}{money(m.amount)}</strong></div>)}{!moves.length&&<p className="muted">Ainda não há movimentações registradas.</p>}</div></div></>}
      {adminTab==='produtos'&&<><div className="admin-panel"><h3>Registrar venda de produto</h3><p className="muted">A comissão é calculada apenas sobre a venda do produto.</p><form className="product-form" onSubmit={addProductSale}><label>Produto<input value={productForm.name} onChange={e=>setProductForm({...productForm,name:e.target.value})} placeholder="Ex.: pomada modeladora" required/></label><label>Preço unitário (R$)<input type="number" min="0.01" step="0.01" value={productForm.price} onChange={e=>setProductForm({...productForm,price:e.target.value})} required/></label><label>Quantidade<input type="number" min="1" value={productForm.quantity} onChange={e=>setProductForm({...productForm,quantity:e.target.value})}/></label><label>Comissão (%)<input type="number" min="0" max="100" value={productForm.commission} onChange={e=>setProductForm({...productForm,commission:e.target.value})}/></label><label>Vendedor<select value={productForm.barber} onChange={e=>setProductForm({...productForm,barber:e.target.value})}>{BARBERS.map(b=><option key={b}>{b}</option>)}</select></label><label>Pagamento<select value={productForm.payment} onChange={e=>setProductForm({...productForm,payment:e.target.value})}><option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartão</option></select></label><button className="btn btn-gold">Registrar venda <Check size={16}/></button></form></div><div className="admin-panel"><h3>Vendas registradas</h3><div className="movement-list">{products.map(p=><div key={p.id}><span><b>{p.name} × {p.quantity}</b><small>{p.barber} · {dateBR(p.date)} · Comissão {p.commissionRate}%</small></span><strong>{money(p.price*p.quantity)}<small className="commission">Comissão: {money(p.price*p.quantity*p.commissionRate/100)}</small></strong></div>)}{!products.length&&<p className="muted">Nenhuma venda registrada.</p>}</div></div></>}
      {adminTab==='clientes'&&<div className="admin-panel"><h3>Clientes cadastrados</h3><div className="table-wrap"><table><thead><tr><th>Nome</th><th>WhatsApp</th><th>Atendimentos</th></tr></thead><tbody>{clients.map(c=><tr key={c.phone}><td>{c.name}</td><td>{c.phone}</td><td>{appts.filter(a=>a.phone.replace(/\D/g,'')===c.phone&&a.status==='concluido').length}</td></tr>)}</tbody></table>{!clients.length&&<div className="empty-state">Os clientes aparecerão aqui após os primeiros agendamentos.</div>}</div></div>}
    </div></main>}

    {adminOpen&&<div className="modal-backdrop" onClick={()=>setAdminOpen(false)}><form className="login-modal" onClick={e=>e.stopPropagation()} onSubmit={doLogin}><button type="button" className="modal-close" onClick={()=>setAdminOpen(false)}><X size={19}/></button><span className="success-icon"><LockKeyhole size={28}/></span><p className="kicker">ÁREA RESTRITA</p><h2>Acesso do proprietário</h2><p className="muted">Entre com suas credenciais de administrador.</p><label className="field-label">E-mail<input type="email" value={adminEmail} onChange={e=>setAdminEmail(e.target.value)} required/></label><label className="field-label">Senha<input type="password" value={adminPassword} onChange={e=>setAdminPassword(e.target.value)} placeholder="Sua senha" required/></label>{loginError&&<p className="notice">{loginError}</p>}<button className="btn btn-gold full">Entrar no painel</button><small className="login-warning">A autenticação de produção precisa ser conectada antes de publicar.</small></form></div>}

    <footer className="footer"><div className="brand footer-brand"><span className="brand-mark"><Scissors size={21}/></span><span><b>DOM MOURA</b><small>BARBEARIA</small></span></div><p>Seu estilo, nossa assinatura.</p><span>© {new Date().getFullYear()} Dom Moura. Todos os direitos reservados.</span><button className="admin-entry" onClick={openAdmin}>Acesso do proprietário</button></footer>
  </div>;
}

function ServiceCard({service,onBook}) {
 return <article className="service-card"><div className="service-icon"><Scissors size={21}/></div><h3>{service.name}</h3><p>{service.desc}</p><div className="service-bottom"><strong>{service.price==null?'A combinar':money(service.price)}</strong><span><Clock size={14}/> {service.duration} min*</span></div><button className="service-book" onClick={onBook}>{service.price==null?'Consultar valor':'Agendar'} <ChevronRight size={15}/></button></article>;
}
function Metric({label,value,icon}){return <div className="metric"><span>{icon}</span><small>{label}</small><b>{value}</b></div>;}
export default App;
