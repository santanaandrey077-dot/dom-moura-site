import React, { useEffect, useMemo, useState } from 'react';
import { Scissors, CalendarDays, Clock, MapPin, Phone, Check, ChevronRight, ChevronLeft, ShieldCheck, UserRound, Banknote, Package, TrendingUp, X, Menu, Plus, LockKeyhole, CircleCheck, CircleX, RefreshCw } from 'lucide-react';

import { supabase } from './supabase';

const CONFIG = {
  name: 'Dom Moura',
  address: 'Avenida Carlos Cruz, nº 2709, bairro Juvêncio Santana',
  whatsapp: '5588988781338',
  hours: 'Segunda a sábado, das 08h30 às 20h',
  lunchStart: '12:00',
  lunchEnd: '13:00',
};
const BARBERS = ['Arthur', 'Andrey', 'Dom Moura'];
const BARBER_IDS = {
  'Arthur': '158b1f79-0ae2-4a7c-9ba8-67bdaa7f632a',
  'Andrey': '1f8ccd4b-70a4-4671-bead-9cdd5b90847c',
  'Dom Moura': 'cb920543-a8c9-4f13-9743-2d24bf7d976c',
};

const SERVICE_IDS = {
  'corte': '9320014a-9711-4ab3-81f3-0861240de370',
  'barba': 'b78b442e-12a5-4dec-b6fc-817d89032e52',
  'combo': '015d6e64-434e-4b35-a214-1268160ec679',
  'sobrancelha': 'd5fc9280-0eb1-4af5-9743-9f4f0480d7a4',
  'pig-cabelo': '02af1e07-54c3-4473-a769-c63fcd7cb06d',
  'pig-barba': '60ba7e0d-cf43-4d27-9566-b9cf4dc300d7',
};
const SERVICES = [
  { id: 'corte', name: 'Corte de cabelo', price: 30, duration: 30, desc: 'Corte personalizado e acabamento.' },
  { id: 'barba', name: 'Barba', price: 30, duration: 30, desc: 'Desenho, alinhamento e acabamento.' },
  { id: 'combo', name: 'Corte + barba', price: 55, duration: 60, desc: 'Visual completo em um só horário.' },
  { id: 'sobrancelha', name: 'Sobrancelha', price: 10, duration: 10, desc: 'Limpeza e alinhamento.' },
  { id: 'pig-cabelo', name: 'Pigmentação de cabelo', price: 25, duration: 30, desc: 'Acabamento com pigmentação.' },
  { id: 'pig-barba', name: 'Pigmentação de barba', price: 15, duration: 20, desc: 'Realce e definição da barba.' },
  { id: 'luzes', name: 'Luzes', price: null, duration: 90, desc: 'Valor e duração a confirmar.' },
  { id: 'botox', name: 'Botox', price: null, duration: 60, desc: 'Valor e duração a confirmar.' },
  { id: 'progressiva', name: 'Progressiva', price: null, duration: 90, desc: 'Valor e duração a confirmar.' },
];
const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const timeZone = 'America/Fortaleza';
const localParts = value => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone, year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', hourCycle:'h23'
  }).formatToParts(new Date(value));
  return Object.fromEntries(parts.map(x => [x.type, x.value]));
};
const dateKey = d => {
  const p = localParts(d);
  return `${p.year}-${p.month}-${p.day}`;
};
const hourKey = d => { const p = localParts(d); return `${p.hour}:${p.minute}`; };
const dateBR = s => s ? s.split('-').reverse().join('/') : '';
const today = dateKey(new Date());
const maxBookingDate = dateKey(new Date(Date.now() + 89 * 86400000));
const inFortaleza = (day, time) => new Date(`${day}T${time}:00-03:00`).toISOString();
const digits = value => String(value || '').replace(/\D/g, '');
const reportError = e => e?.message || 'Não foi possível concluir. Tente novamente.';
const slots = () => {
  const out = [];
  for (let m = 8*60+30; m < 20*60; m += 30) {
    if (m >= 12*60 && m < 13*60) continue;
    out.push(`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`);
  }
  return out;
};
const normalizeAdminAppt = a => ({
  id: a.id, code: a.confirmation_code, clientId: a.client_id,
  date: dateKey(a.starts_at), time: hourKey(a.starts_at),
  name: a.clients?.name || '—', phone: a.clients?.whatsapp || '',
  barber: a.barbers?.name || '—', serviceName: a.services?.name || '—',
  price: Number(a.services?.price || 0), status: a.status,
  paidAmount: a.paid_amount, payment: a.payment_method,
});
const normalizeSale = p => ({
  id: p.id, name: p.products?.name || 'Produto',
  barber: p.barbers?.name || '—', price: Number(p.unit_price),
  quantity: Number(p.quantity), commissionRate: Number(p.commission_percent),
  date: dateKey(p.sold_at), payment: p.payment_method,
});
function App() {
  const [view, setView] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [serviceList, setServiceList] = useState(SERVICES);
  const [barberList, setBarberList] = useState(BARBERS);
  const [serviceIds, setServiceIds] = useState(SERVICE_IDS);
  const [barberIds, setBarberIds] = useState(BARBER_IDS);
  const [catalogReady, setCatalogReady] = useState(false);
  const [appts, setAppts] = useState([]);
  const [moves, setMoves] = useState([]);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [dbServices, setDbServices] = useState([]);
  const [dbBarbers, setDbBarbers] = useState([]);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('santanaandrey077@gmail.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [sessionUser, setSessionUser] = useState(null);
  const [adminAuthorized, setAdminAuthorized] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [step, setStep] = useState(1);
  const [booking, setBooking] = useState({ service:'', barber:'', date:today, time:'', name:'', phone:'' });
  const [notice, setNotice] = useState('');
  const [unavailable, setUnavailable] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState(false);
  const [slotsFetchedFor, setSlotsFetchedFor] = useState('');
  const [slotsReload, setSlotsReload] = useState(0);
  const [savingBooking, setSavingBooking] = useState(false);
  const [manageCode, setManageCode] = useState('');
  const [managePhone, setManagePhone] = useState('');
  const [manageBusy, setManageBusy] = useState(false);
  const [manageAppt, setManageAppt] = useState(null);
  const [rescheduling, setRescheduling] = useState(null);
  const [period, setPeriod] = useState('day');
  const [adminTab, setAdminTab] = useState('agenda');
  const [selectedDate, setSelectedDate] = useState(today);
  const [expense, setExpense] = useState({ description:'', amount:'', type:'saida' });
  const [editingMovement, setEditingMovement] = useState(null);
  const [productForm, setProductForm] = useState({ name:'', price:'', commission:'10', quantity:'1', barber:'Arthur', payment:'pix' });
  const [completion, setCompletion] = useState(null);
  const [blockForm, setBlockForm] = useState({ barber:'', date:today, start:'09:00', end:'10:00', reason:'Indisponível' });
  const [newService, setNewService] = useState({ name:'', price:'', duration:'30' });
  const [newBarber, setNewBarber] = useState('');

  async function refreshPublic() {
    const [servicesRes, barbersRes] = await Promise.all([
      supabase.from('services').select('id,name,price,duration_minutes,active'),
      supabase.from('barbers').select('id,name,active')
    ]);
    if (servicesRes.error) throw servicesRes.error;
    if (barbersRes.error) throw barbersRes.error;
    const servRows = servicesRes.data || [];
    const barRows = barbersRes.data || [];
    setDbServices(servRows);
    setDbBarbers(barRows);
    const activeServices = servRows.filter(s => s.active && Number(s.price) > 0);
    const next = activeServices.map(row => {
      const local = SERVICES.find(s => SERVICE_IDS[s.id] === row.id);
      return {
        id: local?.id || row.id, name: local?.name || row.name,
        price:Number(row.price), duration:Number(row.duration_minutes),
        desc: local?.desc || 'Atendimento personalizado.'
      };
    });
    const order = x => SERVICES.findIndex(s => s.id === x.id);
    next.sort((a,b) => (order(a) === -1 ? 999 : order(a)) - (order(b) === -1 ? 999 : order(b)));
    setServiceList([...next, ...SERVICES.filter(s => s.price == null)]);
    setServiceIds(Object.fromEntries(activeServices.map(s => [Object.keys(SERVICE_IDS).find(k => SERVICE_IDS[k] === s.id) || s.id, s.id])));
    const activeBarbers = barRows.filter(b => b.active);
    activeBarbers.sort((a,b) => {
      const ia=BARBERS.indexOf(a.name), ib=BARBERS.indexOf(b.name);
      return (ia<0?999:ia)-(ib<0?999:ib);
    });
    setBarberList(activeBarbers.map(b => b.name));
    setBarberIds(Object.fromEntries(activeBarbers.map(b => [b.name,b.id])));
    setCatalogReady(true);
  }
  useEffect(() => {
    let alive = true;
    refreshPublic().catch(e => {
      if (alive) { setCatalogReady(false); setNotice('Não foi possível carregar os serviços. '+reportError(e)); }
    });
    supabase.auth.getUser().then(({data}) => {
      if (alive) setSessionUser(data?.user || null);
    }).catch(() => {});
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) setSessionUser(session?.user || null);
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!sessionUser) { setAdminAuthorized(false); return; }
    let alive = true;
    supabase.rpc('dm_is_admin').then(({data,error}) => {
      if (alive) { setAdminAuthorized(!error && data === true); if (error) setAdminError(reportError(error)); }
    }).catch(() => { if (alive) setAdminAuthorized(false); });
    return () => { alive = false; };
  }, [sessionUser?.id]);
  useEffect(() => {
    if (view !== 'admin' || !adminAuthorized) return;
    refreshAdmin();
  }, [view, adminAuthorized]);
  useEffect(() => {
    let cancelled = false;
    const key = `${booking.barber}|${booking.date}`;
    setSlotsFetchedFor('');
    setUnavailable([]);
    setSlotsError(false);
    if (!catalogReady || !booking.barber || !booking.date || !barberIds[booking.barber]) {
      setLoadingSlots(false);
      return;
    }
    setLoadingSlots(true);
    (async () => {
      try {
        const {data,error} = await supabase.rpc('get_unavailable_slots', {
          p_barber_id: barberIds[booking.barber], p_date: booking.date
        });
        if (error) throw error;
        if (cancelled) return;
        setUnavailable(data || []);
        setSlotsFetchedFor(key);
      } catch (e) {
        if (!cancelled) { setSlotsError(true); setNotice('Não foi possível consultar os horários. Atualize a agenda e tente novamente.'); }
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    })();
    return () => { cancelled = true; };
  }, [booking.barber, booking.date, barberIds, catalogReady, slotsReload]);

  const selectedService = serviceList.find(s => s.id === booking.service);
  const availableSlots = useMemo(() => {
    if (loadingSlots || slotsError || !catalogReady || !booking.barber || !booking.date ||
        slotsFetchedFor !== `${booking.barber}|${booking.date}` ||
        !selectedService || selectedService.price == null) return [];
    if (new Date(`${booking.date}T12:00:00-03:00`).getUTCDay() === 0) return [];
    const duration = selectedService.duration;
    return slots().filter(time => {
      const start = new Date(inFortaleza(booking.date, time));
      const end = new Date(start.getTime() + duration*60000);
      if (start <= new Date()) return false;
      const startM = Number(time.slice(0,2))*60 + Number(time.slice(3,5));
      const endM = startM + duration;
      if (endM > 1200 || (startM < 780 && endM > 720)) return false;
      return !unavailable.some(item => start < new Date(item.ends_at) && end > new Date(item.starts_at));
    });
  }, [booking.barber, booking.date, selectedService, unavailable, loadingSlots, slotsError, slotsFetchedFor, catalogReady]);

  async function refreshAdmin() {
    setAdminLoading(true); setAdminError('');
    try {
      const results = await Promise.all([
        supabase.from('appointments').select('id,confirmation_code,client_id,barber_id,service_id,starts_at,ends_at,status,paid_amount,payment_method,clients(name,whatsapp),services(name,price),barbers(name)').order('starts_at', {ascending:false}).limit(5000),
        supabase.from('clients').select('id,name,whatsapp').order('name').limit(5000),
        supabase.from('cash_movements').select('id,type,description,amount,movement_date,payment_method').order('movement_date', {ascending:false}).limit(5000),
        supabase.from('product_sales').select('id,quantity,unit_price,commission_percent,payment_method,sold_at,products(name),barbers(name)').order('sold_at', {ascending:false}).limit(5000),
        supabase.from('products').select('id,name,price,active').limit(5000),
        supabase.from('blocked_times').select('id,barber_id,starts_at,ends_at,reason').order('starts_at',{ascending:false}).limit(500),
      ]);
      for (const result of results) if (result.error) throw result.error;
      setAppts((results[0].data || []).map(normalizeAdminAppt));
      setClients(results[1].data || []);
      setMoves((results[2].data || []).map(m => ({...m,date:m.movement_date})));
      setProducts((results[3].data || []).map(normalizeSale));
      setCatalog(results[4].data || []);
      setBlocks(results[5].data || []);
    } catch(e) { setAdminError('Erro no painel: '+reportError(e)); }
    finally { setAdminLoading(false); }
  }
  const adminAppts = appts.filter(a => a.date === selectedDate).sort((a,b) => a.time.localeCompare(b.time));
  function inPeriod(d) {
    if (!d) return false;
    if (period === 'day') return d === today;
    if (period === 'month') return d.slice(0,7) === today.slice(0,7);
    const delta = (new Date(`${today}T12:00:00-03:00`) - new Date(`${d}T12:00:00-03:00`))/86400000;
    return delta >= 0 && delta < 7;
  }
  const revenue = appts.filter(a => a.status === 'concluido' && inPeriod(a.date))
    .reduce((sum,a) => sum + Number(a.paidAmount ?? a.price ?? 0), 0);
  const expenses = moves.filter(m => m.type === 'saida' && inPeriod(m.date))
    .reduce((sum,m) => sum + Number(m.amount), 0);
  const extraIncome = moves.filter(m => m.type === 'entrada' && inPeriod(m.date))
    .reduce((sum,m) => sum + Number(m.amount), 0);
  const productRevenue = products.filter(p => inPeriod(p.date)).reduce((s,p) => s+p.price*p.quantity, 0);
  const commissions = products.filter(p => inPeriod(p.date)).reduce((s,p)=>s+p.price*p.quantity*p.commissionRate/100,0);
  const waLink = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent('Olá, gostaria de agendar um horário na Dom Moura! ✂️💈')}`;
  function patchBooking(key, value) {
    setBooking(b=>({...b,[key]:value, ...(['service','barber','date'].includes(key)?{time:''}:{})}));
    setNotice('');
  }
  function beginBooking() { setRescheduling(null); setNotice(''); setBooking(b=>({...b,time:''})); setStep(1); setView('booking'); }
  async function submitBooking(e) {
    e.preventDefault();
    if (savingBooking) return;
    if (!selectedService || selectedService.price == null || !serviceIds[booking.service] || !barberIds[booking.barber] ||
        !booking.time || booking.name.trim().length < 2 || digits(booking.phone).length < 10 || digits(booking.phone).length > 15) {
      setNotice('Preencha todos os campos corretamente.'); return;
    }
    if (!availableSlots.includes(booking.time) || loadingSlots || slotsError || !catalogReady) {
      setNotice('A disponibilidade não foi confirmada. Escolha um horário novamente.'); setStep(3); return;
    }
    if (rescheduling && (rescheduling.barber !== booking.barber || rescheduling.service !== booking.service)) {
      setNotice('Para remarcar, mantenha o mesmo serviço e barbeiro da reserva original.'); setStep(3); return;
    }
    setSavingBooking(true); setNotice('');
    try {
      const startsAt = inFortaleza(booking.date, booking.time);
      let code;
      let id;
      if (rescheduling) {
        const {error} = await supabase.rpc('dm_manage_booking', {
          p_code:rescheduling.code, p_whatsapp:rescheduling.phone,
          p_action:'remarcar', p_new_starts_at:startsAt
        });
        if (error) throw error;
        code = rescheduling.code;
        id = rescheduling.id;
      } else {
        const {data,error} = await supabase.rpc('book_appointment', {
          p_name:booking.name.trim(), p_whatsapp:digits(booking.phone),
          p_barber_id:barberIds[booking.barber], p_service_id:serviceIds[booking.service],
          p_starts_at:startsAt
        });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        code = row?.confirmation_code;
        id = row?.appointment_id;
      }
      if (!code) throw new Error('O banco não retornou o código de confirmação. Verifique a reserva antes de tentar novamente.');
      setManageAppt({id,code,...booking,serviceName:selectedService.name,price:selectedService.price,
        duration:selectedService.duration,status:'agendado'});
      setManageCode(code); setManagePhone(booking.phone);
      setRescheduling(null); setView('confirmation'); setStep(1); setSlotsReload(x=>x+1);
    } catch(e) {
      setNotice('Não foi possível confirmar: '+reportError(e));
      setStep(3); setSlotsReload(x=>x+1);
    } finally { setSavingBooking(false); }
  }
  async function adminAction(action) {
    if (!adminAuthorized || adminLoading) return;
    setAdminLoading(true); setAdminError('');
    try {
      await action();
      await Promise.all([refreshAdmin(), refreshPublic()]);
      setAdminError('Alteração registrada com sucesso.');
      setSlotsReload(x=>x+1);
    } catch(e) { setAdminError('Não foi possível salvar: '+reportError(e)); }
    finally { setAdminLoading(false); }
  }
  async function updateStatus(id,status) {
    if (status === 'concluido') {
      const a = appts.find(a=>a.id===id);
      if (a) setCompletion({id,amount:String(a.paidAmount ?? a.price),payment:a.payment || 'pix'});
      return;
    }
    await adminAction(async () => {
      const {error} = await supabase.from('appointments').update({status}).eq('id',id);
      if (error) throw error;
    });
  }
  async function submitCompletion(e) {
    e.preventDefault(); if (!completion) return;
    const {id, amount, payment} = completion;
    if (!Number.isFinite(Number(amount)) || Number(amount) < 0) return;
    await adminAction(async () => {
      const {error} = await supabase.from('appointments').update({status:'concluido',paid_amount:Number(amount),payment_method:payment}).eq('id',id);
      if (error) throw error;
      setCompletion(null);
    });
  }
  async function doLogin(e) {
    e.preventDefault(); setLoginError(''); setAdminLoading(true);
    try {
      const {error} = await supabase.auth.signInWithPassword({email:adminEmail,password:adminPassword});
      if (error) throw error;
      const check = await supabase.rpc('dm_is_admin');
      if (check.error || check.data !== true) {
        await supabase.auth.signOut();
        throw new Error('Esta conta não está autorizada como proprietária.');
      }
      setAdminAuthorized(true); setAdminPassword(''); setAdminOpen(false); setView('admin');
    } catch(e) { setLoginError(reportError(e)); }
    finally { setAdminLoading(false); }
  }
  function openAdmin() {
    setLoginError('');
    if (adminAuthorized) { setView('admin'); return; }
    setAdminOpen(true);
  }
  async function logoutAdmin() {
    await supabase.auth.signOut();
    setAdminAuthorized(false); setAppts([]); setClients([]); setMoves([]); setProducts([]);
    setView('home'); setAdminOpen(false);
  }
  async function lookupBooking(code,phone) {
    const {data,error} = await supabase.rpc('dm_find_booking', {p_code:code.trim().toUpperCase(),p_whatsapp:digits(phone)});
    if (error) throw error;
    const row=Array.isArray(data)?data[0]:data;
    if (!row) throw new Error('Reserva não encontrada. Confira o código e o WhatsApp informado.');
    const service=serviceList.find(s=>serviceIds[s.id]===row.service_id);
    const barber=barberList.find(b=>barberIds[b]===row.barber_id);
    return {id:row.appointment_id,code:row.confirmation_code,name:row.client_name,
      phone,date:dateKey(row.starts_at),time:hourKey(row.starts_at),status:row.status,
      service:service?.id || '',serviceName:service?.name || row.service_name,
      barber:barber || row.barber_name,price:Number(row.price || 0),duration:Number(row.duration_minutes || 0)};
  }
  async function findManage(e) {
    e.preventDefault(); setManageBusy(true); setNotice(''); setManageAppt(null);
    try { setManageAppt(await lookupBooking(manageCode,managePhone)); }
    catch(e) { setNotice(reportError(e)); }
    finally { setManageBusy(false); }
  }
  async function cancelAppt(a) {
    if (!window.confirm('Deseja realmente cancelar este agendamento?')) return;
    setManageBusy(true); setNotice('');
    try {
      const {error} = await supabase.rpc('dm_manage_booking', {
        p_code:a.code,p_whatsapp:digits(managePhone || a.phone),p_action:'cancelar',p_new_starts_at:null
      });
      if (error) throw error;
      setManageAppt({...a,status:'cancelado'});
      setNotice('Agendamento cancelado com sucesso.'); setSlotsReload(x=>x+1);
    } catch(e) { setNotice('Não foi possível cancelar: '+reportError(e)); }
    finally { setManageBusy(false); }
  }
  function startRescheduling(a) {
    if (!a.service || !barberIds[a.barber] || a.status !== 'agendado') {
      setNotice('Esta reserva não pode ser remarcada automaticamente. Contate a barbearia.'); return;
    }
    setRescheduling({id:a.id,code:a.code,phone:digits(managePhone || a.phone),barber:a.barber,service:a.service});
    setBooking({service:a.service,barber:a.barber,date:a.date,time:'',name:a.name,phone:a.phone});
    setStep(3); setView('booking'); setNotice('Escolha uma nova data e horário. A reserva atual permanece válida até confirmar a alteração.');
    setSlotsReload(x=>x+1);
  }
  async function addExpense(e) {
    e.preventDefault();
    if (!expense.description.trim() || Number(expense.amount)<=0) return;
    await adminAction(async () => {
      const {error}=await supabase.from('cash_movements').insert({
        description:expense.description.trim(),amount:Number(expense.amount),
        type:expense.type,movement_date:today
      });
      if (error) throw error;
      setExpense({description:'',amount:'',type:'saida'});
    });
  }
  function startEditMovement(m) {
    setEditingMovement({id:m.id,description:m.description || '',amount:String(m.amount),type:m.type,date:m.date});
  }
  async function saveMovement(e) {
    e.preventDefault();
    if (!editingMovement || adminLoading) return;
    const {id,description,amount,type,date} = editingMovement;
    const value = Number(amount);
    if (!description.trim() || !Number.isFinite(value) || value<=0 || !['saida','entrada'].includes(type) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setAdminError('Preencha uma descrição, data válida e valor maior que zero.'); return;
    }
    await adminAction(async () => {
      const {data,error} = await supabase.from('cash_movements')
        .update({description:description.trim(),amount:value,type,movement_date:date})
        .eq('id',id).select('id').single();
      if (error) throw error;
      if (!data) throw new Error('Lançamento não encontrado ou sem permissão para edição.');
      setEditingMovement(null);
    });
  }
  async function deleteMovement(m) {
    if (adminLoading || !window.confirm(`Excluir definitivamente a movimentação "${m.description}" de ${money(m.amount)}?`)) return;
    await adminAction(async () => {
      const {data,error} = await supabase.from('cash_movements').delete().eq('id',m.id).select('id').single();
      if (error) throw error;
      if (!data) throw new Error('Lançamento não encontrado ou sem permissão para exclusão.');
      setEditingMovement(current=>current?.id===m.id?null:current);
    });
  }
  async function addProductSale(e) {
    e.preventDefault();
    if (!productForm.name.trim() || Number(productForm.price)<=0 || Number(productForm.quantity)<1) return;
    await adminAction(async () => {
      let product = catalog.find(p=>p.name.toLowerCase()===productForm.name.trim().toLowerCase());
      if (!product) {
        const created=await supabase.from('products').insert({name:productForm.name.trim(),price:Number(productForm.price)}).select('id,name,price,active').single();
        if (created.error) throw created.error;
        product=created.data;
      }
      const {error}=await supabase.from('product_sales').insert({
        product_id:product.id,barber_id:barberIds[productForm.barber],
        unit_price:Number(productForm.price),quantity:Number(productForm.quantity),
        commission_percent:Number(productForm.commission),payment_method:productForm.payment
      });
      if (error) throw error;
      setProductForm({name:'',price:'',commission:'10',quantity:'1',barber:barberList[0] || 'Arthur',payment:'pix'});
    });
  }
  async function addBlockedTime(e) {
    e.preventDefault();
    if (blockForm.end<=blockForm.start) {setAdminError('O término deve ser após o início.');return;}
    await adminAction(async () => {
      const {error}=await supabase.rpc('dm_create_block', {
        p_barber_id:blockForm.barber ? barberIds[blockForm.barber] : null,
        p_starts_at:inFortaleza(blockForm.date,blockForm.start),
        p_ends_at:inFortaleza(blockForm.date,blockForm.end),p_reason:blockForm.reason
      });
      if (error) throw error;
    });
  }
  async function addService(e) {
    e.preventDefault();
    if (dbServices.some(s=>s.name.toLowerCase()===newService.name.trim().toLowerCase())) {
      setAdminError('Já existe um serviço com esse nome.'); return;
    }
    await adminAction(async () => {
      const {error}=await supabase.from('services').insert({
        name:newService.name.trim(),price:Number(newService.price),duration_minutes:Number(newService.duration),active:true
      });
      if(error) throw error;
      setNewService({name:'',price:'',duration:'30'});
    });
  }
  async function addBarber(e) {
    e.preventDefault();
    if (dbBarbers.some(b=>b.name.toLowerCase()===newBarber.trim().toLowerCase())) {
      setAdminError('Já existe um barbeiro com esse nome.'); return;
    }
    await adminAction(async () => {
      const {error}=await supabase.from('barbers').insert({name:newBarber.trim(),active:true});
      if(error) throw error;
      setNewBarber('');
    });
  }
  return <div className="app">
    <style>{`.manage-search input { min-width: 0; }
      .field-label select { width: 100%; padding: 13px 12px; min-height: 44px;
        background: #090909; border: 1px solid #3a362d; color: #f4f1e9; }
      .field-label select:focus { border-color: #d6b15c; }
      .btn:disabled { opacity: .65; cursor: not-allowed; transform: none; }`}</style>
    <header className="topbar">
      <a className="brand" href="#" onClick={e=>{e.preventDefault();setView('home')}}><span className="brand-mark"><Scissors size={23}/></span><span><b>DOM MOURA</b><small>BARBEARIA</small></span></a>
      <nav className={menuOpen?'nav nav-open':'nav'}>
        <button onClick={()=>{setView('home');setMenuOpen(false)}}>Início</button><button onClick={()=>{setView('services');setMenuOpen(false)}}>Serviços</button><button onClick={()=>{beginBooking();setMenuOpen(false)}}>Agendar</button><button onClick={()=>{setView('manage');setMenuOpen(false)}}>Meu agendamento</button>
      </nav>
      <div className="header-actions"><a className="btn btn-gold btn-small" href={waLink} target="_blank" rel="noreferrer"><Phone size={15}/> WhatsApp</a><button className="icon-btn menu-btn" aria-label="Abrir menu" onClick={()=>setMenuOpen(!menuOpen)}><Menu/></button></div>
    </header>

    {view==='home' && <main>
      <section className="hero">
        <div className="hero-overlay"></div><div className="hero-content">
          <div className="eyebrow"><span></span> ESTILO • PRECISÃO • PRESENÇA</div>
          <h1>Seu estilo.<br/><em>Seu momento.</em></h1>
          <p>Mais que um corte: uma experiência feita para valorizar quem você é.</p>
          <div className="hero-buttons"><button className="btn btn-gold" onClick={()=>{beginBooking()}}><CalendarDays size={18}/> Agendar horário <ChevronRight size={17}/></button><button className="btn btn-outline" onClick={()=>setView('services')}>Ver serviços</button></div>
          <div className="hero-meta"><span><Clock size={15}/> Seg–Sáb · 08h30–20h</span><span><MapPin size={15}/> Juazeiro do Norte – CE</span></div>
        </div><div className="hero-side-label">DOM MOURA / DESDE 2016</div>
      </section>
      <section className="section intro-grid"><div><p className="kicker">A BARBEARIA</p><h2>Clássico na essência.<br/><span>Atual no estilo.</span></h2></div><p className="intro-copy">Atendimento cuidadoso, ambiente acolhedor e atenção aos detalhes. Escolha seu serviço e reserve seu horário em poucos passos.</p></section>
      <section className="section services-section"><div className="section-head"><div><p className="kicker">NOSSO MENU</p><h2>Serviços em destaque</h2></div><button className="text-link" onClick={()=>setView('services')}>Ver todos <ChevronRight size={16}/></button></div><div className="service-grid">{serviceList.filter(s=>s.price!=null).slice(0,4).map(s=><ServiceCard key={s.id} service={s} onBook={()=>{setRescheduling(null);patchBooking('service',s.id);setView('booking');setStep(2)}}/>)}</div></section>
      <section className="booking-banner"><div><p className="kicker">SEU PRÓXIMO VISUAL COMEÇA AQUI</p><h2>Reserve seu horário<br/>sem complicação.</h2></div><button className="btn btn-gold" onClick={()=>{beginBooking()}}>Fazer agendamento <ChevronRight size={17}/></button></section>
      <section className="section location"><div><p className="kicker">ONDE ESTAMOS</p><h2>Esperamos por você.</h2><p><MapPin size={17}/> {CONFIG.address}</p><p><Clock size={17}/> {CONFIG.hours}</p><p><Phone size={17}/> (88) 98878-1338</p><a className="btn btn-outline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONFIG.address+', Juazeiro do Norte CE')}`} target="_blank" rel="noreferrer">Ver localização <ChevronRight size={16}/></a></div><div className="location-art"><Scissors size={74}/><span>DM</span><small>BARBEARIA</small></div></section>
    </main>}

    {view==='services' && <main className="page-wrap"><div className="page-heading"><p className="kicker">O MENU DOM MOURA</p><h1>Serviços & valores</h1><p>Escolha o cuidado que combina com você.</p></div><div className="service-grid all-services">{serviceList.map(s=><ServiceCard key={s.id} service={s} onBook={()=>{if(s.price==null){window.open(waLink,'_blank');return;}setRescheduling(null);patchBooking('service',s.id);setView('booking');setStep(2)}}/>)}</div></main>}

    {view==='booking' && <main className="page-wrap booking-page"><div className="page-heading"><p className="kicker">RESERVA ONLINE</p><h1>Agende seu horário</h1><p>Quatro passos rápidos para reservar seu momento.</p></div>
      <div className="steps">{['Serviço','Barbeiro','Data e hora','Seus dados'].map((s,i)=><div className={step===i+1?'step active':step>i+1?'step done':'step'} key={s}><span>{step>i+1?<Check size={15}/>:i+1}</span><small>{s}</small></div>)}</div>
      <form className="booking-card" onSubmit={submitBooking}>
        {step===1&&<><h2>O que vamos fazer?</h2><p className="muted">Escolha um serviço para continuar.</p><div className="choice-list">{serviceList.filter(s=>s.price!=null).map(s=><button type="button" key={s.id} className={booking.service===s.id?'choice selected':'choice'} onClick={()=>patchBooking('service',s.id)}><span className="choice-icon"><Scissors size={19}/></span><span className="choice-text"><b>{s.name}</b><small>{s.duration} min</small></span><strong>{money(s.price)}</strong><span className="radio"></span></button>)}</div></>}
        {step===2&&<><h2>Escolha seu barbeiro</h2><p className="muted">Quem vai cuidar do seu visual?</p><div className="barber-grid">{barberList.map(b=><button type="button" key={b} className={booking.barber===b?'barber selected':'barber'} onClick={()=>patchBooking('barber',b)}><span className="avatar"><UserRound size={24}/></span><b>{b}</b><small>Barbeiro</small></button>)}</div></>}
        {step===3&&<><h2>Quando você prefere?</h2><p className="muted">Selecione o dia e um horário disponível.</p><label className="field-label">Data do atendimento<input type="date" min={today} max={maxBookingDate} value={booking.date} onChange={e=>{patchBooking('date',e.target.value);patchBooking('time','')}} required/></label><div className="slots-heading"><b>Horários disponíveis</b><small>{dateBR(booking.date)}</small></div>{loadingSlots && <p className="muted">Consultando horários disponíveis...</p>}<div className="slots">{availableSlots.map(t=><button type="button" key={t} className={booking.time===t?'slot selected':'slot'} onClick={()=>patchBooking('time',t)}>{t}</button>)}</div>{!catalogReady&&<p className="notice">Não foi possível carregar o catálogo do Supabase. Recarregue a página antes de tentar agendar.</p>}{slotsError&&<p className="notice">Erro ao consultar agenda. <button type="button" className="text-link" onClick={()=>setSlotsReload(x=>x+1)}>Tentar novamente</button></p>}{catalogReady && !loadingSlots && !slotsError && availableSlots.length===0&&<p className="notice">Não há horários livres nesta data. Escolha outro dia.</p>}</>}
        {step===4&&<><h2>Seus dados</h2><p className="muted">Usaremos seu WhatsApp para confirmar os detalhes.</p><label className="field-label">Nome completo<input value={booking.name} onChange={e=>patchBooking('name',e.target.value)} placeholder="Como podemos chamar você?" required/></label><label className="field-label">WhatsApp<input type="tel" value={booking.phone} onChange={e=>patchBooking('phone',e.target.value)} placeholder="(88) 99999-9999" minLength="10" required/></label><div className="summary-box"><b>Resumo do agendamento</b><p>{selectedService?.name} · {money(selectedService?.price)}</p><p>{booking.barber} · {dateBR(booking.date)} às {booking.time}</p><small>{selectedService?.duration} minutos estimados</small></div></>}
        {notice&&<p className="notice">{notice}</p>}
        <div className="form-actions">{step>1&&<button type="button" className="btn btn-outline" onClick={()=>{setStep(step-1);setNotice('')}}><ChevronLeft size={17}/> Voltar</button>}{step<4?<button type="button" className="btn btn-gold push" onClick={()=>{if(step===1&&!booking.service)return setNotice('Escolha um serviço.');if(step===2&&!booking.barber)return setNotice('Escolha um barbeiro.');if(step===3&&(!booking.time||!availableSlots.includes(booking.time)))return setNotice('Escolha uma data e um horário livre.');setNotice('');setStep(step+1)}}>Continuar <ChevronRight size={17}/></button>:<button className="btn btn-gold push" type="submit" disabled={savingBooking||loadingSlots||slotsError||!catalogReady}>{savingBooking?'Confirmando...':rescheduling?'Confirmar remarcação':'Confirmar agendamento'} <Check size={17}/></button>}</div>
      </form><p className="privacy-note"><ShieldCheck size={15}/> Seus dados são usados para gerenciar seu agendamento.</p>
    </main>}

    {view==='confirmation'&&<main className="page-wrap confirm-wrap"><div className="confirm-card"><div className="success-icon"><CircleCheck size={36}/></div><p className="kicker">RESERVA REGISTRADA</p><h1>Seu horário está reservado!</h1><p className="muted">Guarde o código abaixo para consultar ou cancelar o agendamento.</p>{manageAppt&&<><div className="confirmation-code"><small>CÓDIGO DE CONFIRMAÇÃO</small><b>{manageAppt.code}</b></div><div className="summary-box"><p><b>Serviço:</b> {manageAppt.serviceName}</p><p><b>Barbeiro:</b> {manageAppt.barber}</p><p><b>Data:</b> {dateBR(manageAppt.date)} às {manageAppt.time}</p><p><b>Valor:</b> {money(manageAppt.price)}</p><p><b>Cliente:</b> {manageAppt.name}</p><p><b>Status:</b> {manageAppt.status}</p></div><button className="btn btn-gold full" onClick={()=>window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(`Olá! Meu agendamento ${manageAppt.code} está marcado para ${dateBR(manageAppt.date)} às ${manageAppt.time}.`)}`,'_blank')}>Enviar confirmação pelo WhatsApp <Phone size={16}/></button></>}<button className="btn btn-outline full" onClick={()=>setView('home')}>Voltar ao início</button></div></main>}

    {view==='manage'&&<main className="page-wrap"><div className="page-heading"><p className="kicker">GERENCIE SUA RESERVA</p><h1>Meu agendamento</h1><p>Informe o código da confirmação e o WhatsApp usado na reserva.</p></div><form className="manage-search" onSubmit={findManage}><input value={manageCode} onChange={e=>setManageCode(e.target.value)} placeholder="Código de confirmação" required/><input type="tel" value={managePhone} onChange={e=>setManagePhone(e.target.value)} placeholder="WhatsApp da reserva" required/><button className="btn btn-gold" disabled={manageBusy}>{manageBusy?'Consultando...':'Consultar'}</button></form>{notice&&<p className="notice centered">{notice}</p>}{manageAppt&&<div className="manage-result"><div><p className="kicker">CÓDIGO {manageAppt.code}</p><h2>{manageAppt.serviceName}</h2><p>{manageAppt.barber} · {dateBR(manageAppt.date)} às {manageAppt.time}</p><b>{money(manageAppt.price)}</b><p>Status: <span className="status">{manageAppt.status}</span></p></div>{manageAppt.status==='agendado'&&<div className="manage-actions"><button className="btn btn-outline" disabled={manageBusy} onClick={()=>startRescheduling(manageAppt)}><RefreshCw size={15}/> Remarcar</button><button className="btn btn-danger" disabled={manageBusy} onClick={()=>cancelAppt(manageAppt)}><X size={15}/> Cancelar</button></div>}</div>}</main>}

    {view==='admin'&&adminAuthorized&&<main className="admin-page"><aside className="admin-sidebar"><div className="admin-logo"><span className="brand-mark"><Scissors size={20}/></span><b>DOM MOURA</b></div><p className="sidebar-label">GESTÃO</p>{[['agenda','Agenda'],['financeiro','Financeiro'],['produtos','Vendas de produtos'],['clientes','Clientes'],['bloqueios','Bloqueios'],['config','Configurações']].map(([id,label])=><button key={id} className={adminTab===id?'side-link active':'side-link'} onClick={()=>setAdminTab(id)}>{label}</button>)}<button className="side-link exit" onClick={logoutAdmin}>Sair do painel</button></aside><div className="admin-content"><div className="admin-top"><div><p className="kicker">PAINEL DO PROPRIETÁRIO</p><h1>{adminTab==='agenda'?'Agenda':adminTab==='financeiro'?'Financeiro':adminTab==='produtos'?'Vendas de produtos':adminTab==='clientes'?'Clientes':adminTab==='bloqueios'?'Bloqueios':'Configurações'}</h1></div><span className="admin-user"><LockKeyhole size={15}/> Acesso do dono</span></div>{adminError&&<p className="notice">{adminError}</p>}<button className="btn btn-outline btn-small" type="button" disabled={adminLoading} onClick={refreshAdmin}><RefreshCw size={15}/> Atualizar dados</button>
      {adminTab==='agenda'&&<><div className="admin-controls"><label>Dia da agenda<input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}/></label><span>{adminAppts.length} agendamento(s)</span></div><div className="table-wrap"><table><thead><tr><th>Horário</th><th>Cliente</th><th>Serviço</th><th>Barbeiro</th><th>Status</th><th>Ações</th></tr></thead><tbody>{adminAppts.map(a=><tr key={a.id}><td>{a.time}</td><td>{a.name}<small>{a.phone}</small></td><td>{a.serviceName}</td><td>{a.barber}</td><td><span className={`pill ${a.status}`}>{a.status}</span></td><td><select value={a.status} onChange={e=>updateStatus(a.id,e.target.value)}><option value="agendado">Agendado</option><option value="concluido">Concluído</option><option value="cancelado">Cancelado</option><option value="faltou">Faltou</option></select></td></tr>)}</tbody></table>{!adminAppts.length&&<div className="empty-state">Nenhum agendamento para esta data.</div>}</div></>}
      {adminTab==='financeiro'&&<><div className="period-switch">{[['day','Dia'],['week','Semana'],['month','Mês']].map(([id,l])=><button key={id} className={period===id?'selected':''} onClick={()=>setPeriod(id)}>{l}</button>)}</div><div className="metrics"><Metric label="Faturamento de serviços" value={money(revenue)} icon={<TrendingUp/>}/><Metric label="Saídas" value={money(expenses)} icon={<Banknote/>}/><Metric label="Vendas de produtos" value={money(productRevenue)} icon={<Package/>}/><Metric label="Outras entradas" value={money(extraIncome)} icon={<Banknote/>}/><Metric label="Saldo estimado" value={money(revenue+productRevenue+extraIncome-expenses)} icon={<CircleCheck/>}/><Metric label="Comissões de produtos" value={money(commissions)} icon={<Package/>}/></div><div className="admin-panel"><h3>Movimentações do caixa</h3><form className="inline-form" onSubmit={addExpense}><input placeholder="Descrição (ex.: aluguel)" value={expense.description} onChange={e=>setExpense({...expense,description:e.target.value})} required/><input type="number" min="0.01" step="0.01" placeholder="Valor R$" value={expense.amount} onChange={e=>setExpense({...expense,amount:e.target.value})} required/><select value={expense.type} onChange={e=>setExpense({...expense,type:e.target.value})}><option value="saida">Saída</option><option value="entrada">Entrada</option></select><button className="btn btn-gold"><Plus size={15}/> Lançar</button></form><div className="movement-list">{moves.map(m=><div key={m.id} style={{display:'block',padding:'14px 0'}}>
          {editingMovement?.id===m.id ? <form onSubmit={saveMovement} style={{display:'grid',gap:10,width:'100%'}}>
            <label>Descrição<input aria-label="Descrição da movimentação" required value={editingMovement.description} onChange={e=>setEditingMovement(v=>({...v,description:e.target.value}))}/></label>
            <label>Valor (R$)<input aria-label="Valor da movimentação" type="number" min="0.01" step="0.01" required value={editingMovement.amount} onChange={e=>setEditingMovement(v=>({...v,amount:e.target.value}))}/></label>
            <label>Tipo<select aria-label="Tipo da movimentação" value={editingMovement.type} onChange={e=>setEditingMovement(v=>({...v,type:e.target.value}))}><option value="saida">Saída</option><option value="entrada">Entrada</option></select></label>
            <label>Data<input aria-label="Data da movimentação" type="date" required value={editingMovement.date} onChange={e=>setEditingMovement(v=>({...v,date:e.target.value}))}/></label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button type="submit" className="btn btn-gold btn-small" disabled={adminLoading}><Check size={15}/> Salvar</button><button type="button" className="btn btn-outline btn-small" disabled={adminLoading} onClick={()=>setEditingMovement(null)}>Cancelar</button></div>
          </form> : <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',justifyContent:'space-between'}}>
            <span style={{flex:'1 1 160px',minWidth:0}}><b>{m.description}</b><small>{dateBR(m.date)} {m.payment_method?`· ${m.payment_method}`:''}</small></span>
            <strong className={m.type==='saida'?'negative':'positive'}>{m.type==='saida'?'-':'+'}{money(m.amount)}</strong>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button type="button" className="btn btn-outline btn-small" disabled={adminLoading} onClick={()=>startEditMovement(m)}>Editar</button><button type="button" className="btn btn-outline btn-small" disabled={adminLoading} onClick={()=>deleteMovement(m)} aria-label={`Excluir ${m.description}`} style={{color:'#e9948c'}}>Excluir</button></div>
          </div>}
        </div>)}{!moves.length&&<p className="muted">Ainda não há movimentações registradas.</p>}</div></div></>}
      {adminTab==='produtos'&&<><div className="admin-panel"><h3>Registrar venda de produto</h3><p className="muted">A comissão é calculada apenas sobre a venda do produto.</p><form className="product-form" onSubmit={addProductSale}><label>Produto<input value={productForm.name} onChange={e=>setProductForm({...productForm,name:e.target.value})} placeholder="Ex.: pomada modeladora" required/></label><label>Preço unitário (R$)<input type="number" min="0.01" step="0.01" value={productForm.price} onChange={e=>setProductForm({...productForm,price:e.target.value})} required/></label><label>Quantidade<input type="number" min="1" value={productForm.quantity} onChange={e=>setProductForm({...productForm,quantity:e.target.value})}/></label><label>Comissão (%)<input type="number" min="0" max="100" value={productForm.commission} onChange={e=>setProductForm({...productForm,commission:e.target.value})}/></label><label>Vendedor<select value={productForm.barber} onChange={e=>setProductForm({...productForm,barber:e.target.value})}>{barberList.map(b=><option key={b}>{b}</option>)}</select></label><label>Pagamento<select value={productForm.payment} onChange={e=>setProductForm({...productForm,payment:e.target.value})}><option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartão</option></select></label><button className="btn btn-gold">Registrar venda <Check size={16}/></button></form></div><div className="admin-panel"><h3>Vendas registradas</h3><div className="movement-list">{products.map(p=><div key={p.id}><span><b>{p.name} × {p.quantity}</b><small>{p.barber} · {dateBR(p.date)} · Comissão {p.commissionRate}%</small></span><strong>{money(p.price*p.quantity)}<small className="commission">Comissão: {money(p.price*p.quantity*p.commissionRate/100)}</small></strong></div>)}{!products.length&&<p className="muted">Nenhuma venda registrada.</p>}</div></div></>}
      {adminTab==='clientes'&&<div className="admin-panel"><h3>Clientes cadastrados</h3><div className="table-wrap"><table><thead><tr><th>Nome</th><th>WhatsApp</th><th>Atendimentos</th></tr></thead><tbody>{clients.map(c=><tr key={c.id}><td>{c.name}</td><td>{c.whatsapp}</td><td>{appts.filter(a=>a.clientId===c.id&&a.status==='concluido').length}</td></tr>)}</tbody></table>{!clients.length&&<div className="empty-state">Os clientes aparecerão aqui após os primeiros agendamentos.</div>}</div></div>}
      {adminTab==='bloqueios'&&<><div className="admin-panel"><h3>Bloquear horários</h3><p className="muted">O bloqueio vale para todos os barbeiros ou apenas para o escolhido. Reservas existentes impedem a criação de bloqueios conflitantes.</p><form className="product-form" onSubmit={addBlockedTime}><label>Barbeiro<select value={blockForm.barber} onChange={e=>setBlockForm({...blockForm,barber:e.target.value})}><option value="">Todos</option>{barberList.map(b=><option key={b} value={b}>{b}</option>)}</select></label><label>Data<input type="date" value={blockForm.date} onChange={e=>setBlockForm({...blockForm,date:e.target.value})} required/></label><label>Começo<input type="time" value={blockForm.start} onChange={e=>setBlockForm({...blockForm,start:e.target.value})} required/></label><label>Fim<input type="time" value={blockForm.end} onChange={e=>setBlockForm({...blockForm,end:e.target.value})} required/></label><label>Motivo<input value={blockForm.reason} onChange={e=>setBlockForm({...blockForm,reason:e.target.value})} required/></label><button className="btn btn-gold" disabled={adminLoading}>Criar bloqueio</button></form></div><div className="admin-panel"><h3>Bloqueios registrados</h3><div className="movement-list">{blocks.map(b=><div key={b.id}><span><b>{b.reason || 'Bloqueio'}</b><small>{b.barber_id?dbBarbers.find(x=>x.id===b.barber_id)?.name:'Todos os barbeiros'} · {dateBR(dateKey(b.starts_at))} {hourKey(b.starts_at)}–{hourKey(b.ends_at)}</small></span><button className="btn btn-outline btn-small" disabled={adminLoading} onClick={()=>adminAction(async()=>{const {error}=await supabase.from('blocked_times').delete().eq('id',b.id);if(error)throw error;})}>Remover</button></div>)}{!blocks.length&&<p className="muted">Nenhum bloqueio cadastrado.</p>}</div></div></>}
      {adminTab==='config'&&<><div className="admin-panel"><h3>Serviços</h3><form className="inline-form" onSubmit={addService}><input placeholder="Nome do serviço" required value={newService.name} onChange={e=>setNewService({...newService,name:e.target.value})}/><input placeholder="Preço R$" type="number" min="0.01" step="0.01" required value={newService.price} onChange={e=>setNewService({...newService,price:e.target.value})}/><input placeholder="Duração (min)" type="number" min="1" required value={newService.duration} onChange={e=>setNewService({...newService,duration:e.target.value})}/><button className="btn btn-gold" disabled={adminLoading}>Adicionar serviço</button></form><div className="movement-list">{dbServices.map(s=><div key={s.id}><span><b>{s.name}</b><small>{money(s.price)} · {s.duration_minutes} min</small></span><button className="btn btn-outline btn-small" disabled={adminLoading} onClick={()=>adminAction(async()=>{const {error}=await supabase.from('services').update({active:!s.active}).eq('id',s.id);if(error)throw error;})}>{s.active?'Desativar':'Ativar'}</button></div>)}</div></div><div className="admin-panel"><h3>Barbeiros</h3><form className="inline-form" onSubmit={addBarber}><input placeholder="Nome do barbeiro" required value={newBarber} onChange={e=>setNewBarber(e.target.value)}/><button className="btn btn-gold" disabled={adminLoading}>Adicionar barbeiro</button></form><div className="movement-list">{dbBarbers.map(b=><div key={b.id}><span><b>{b.name}</b></span><button className="btn btn-outline btn-small" disabled={adminLoading} onClick={()=>adminAction(async()=>{const {error}=await supabase.from('barbers').update({active:!b.active}).eq('id',b.id);if(error)throw error;})}>{b.active?'Desativar':'Ativar'}</button></div>)}</div></div></>}
    </div></main>}

    {view==='admin'&&!adminAuthorized&&<main className="page-wrap"><div className="notice">Acesso restrito. Entre pela opção “Acesso do proprietário”.</div><button className="btn btn-gold" onClick={openAdmin}>Entrar</button></main>}
    {completion&&<div className="modal-backdrop" onClick={()=>setCompletion(null)}><form className="login-modal" onClick={e=>e.stopPropagation()} onSubmit={submitCompletion}><button type="button" className="modal-close" onClick={()=>setCompletion(null)}><X size={19}/></button><h2>Concluir atendimento</h2><p className="muted">Informe o valor recebido e a forma de pagamento.</p><label className="field-label">Valor recebido (R$)<input type="number" min="0" step="0.01" value={completion.amount} onChange={e=>setCompletion({...completion,amount:e.target.value})} required/></label><label className="field-label">Forma de pagamento<select value={completion.payment} onChange={e=>setCompletion({...completion,payment:e.target.value})}><option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartão</option></select></label><button className="btn btn-gold full" disabled={adminLoading}>Registrar conclusão</button></form></div>}
    {adminOpen&&<div className="modal-backdrop" onClick={()=>setAdminOpen(false)}><form className="login-modal" onClick={e=>e.stopPropagation()} onSubmit={doLogin}><button type="button" className="modal-close" onClick={()=>setAdminOpen(false)}><X size={19}/></button><span className="success-icon"><LockKeyhole size={28}/></span><p className="kicker">ÁREA RESTRITA</p><h2>Acesso do proprietário</h2><p className="muted">Entre com suas credenciais de administrador.</p><label className="field-label">E-mail<input type="email" value={adminEmail} onChange={e=>setAdminEmail(e.target.value)} required/></label><label className="field-label">Senha<input type="password" value={adminPassword} onChange={e=>setAdminPassword(e.target.value)} placeholder="Sua senha" required/></label>{loginError&&<p className="notice">{loginError}</p>}<button className="btn btn-gold full" disabled={adminLoading}>{adminLoading?'Entrando...':'Entrar no painel'}</button><small className="login-warning">Acesso protegido por Supabase Auth.</small></form></div>}

    <footer className="footer"><div className="brand footer-brand"><span className="brand-mark"><Scissors size={21}/></span><span><b>DOM MOURA</b><small>BARBEARIA</small></span></div><p>Seu estilo, nossa assinatura.</p><span>© {new Date().getFullYear()} Dom Moura. Todos os direitos reservados.</span><button className="admin-entry" onClick={openAdmin}>Acesso do proprietário</button></footer>
  </div>;
}

function ServiceCard({service,onBook}) {
 return <article className="service-card"><div className="service-icon"><Scissors size={21}/></div><h3>{service.name}</h3><p>{service.desc}</p><div className="service-bottom"><strong>{service.price==null?'A combinar':money(service.price)}</strong><span><Clock size={14}/> {service.duration} min*</span></div><button className="service-book" onClick={onBook}>{service.price==null?'Consultar valor':'Agendar'} <ChevronRight size={15}/></button></article>;
}
function Metric({label,value,icon}){return <div className="metric"><span>{icon}</span><small>{label}</small><b>{value}</b></div>;}
export default App;
