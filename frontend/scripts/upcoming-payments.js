// ===== Upcoming Payments controller =====
const PAY_KEY = 'mb_upcoming_payments_v2';

const CATEGORIES = [
  { key:'rent',         label:'Rent',         emoji:'🏠' },
  { key:'bills',        label:'Bills',        emoji:'📄' },
  { key:'subscription', label:'Subscription', emoji:'🔄' },
  { key:'groceries',    label:'Groceries',    emoji:'🧺' },
  { key:'utilities',    label:'Utilities',    emoji:'💡' },
  { key:'insurance',    label:'Insurance',    emoji:'🛡️' },
  { key:'loan',         label:'Loan',         emoji:'💳' },
  { key:'education',    label:'Education',    emoji:'📚' }
];

const $ = (s)=>document.querySelector(s);
const read = ()=> JSON.parse(localStorage.getItem(PAY_KEY) || '[]');
const write = (arr)=> localStorage.setItem(PAY_KEY, JSON.stringify(arr));

let selectedCategory = 'bills';

function daysUntil(dateStr){
  const d = new Date(dateStr);
  return Math.ceil((d - new Date())/(1000*60*60*24));
}

function renderCategoryPicker(){
  const wrap = $('#categoryPicker'); wrap.innerHTML='';
  CATEGORIES.forEach(cat=>{
    const div = document.createElement('div');
    div.className = `cat ${cat.key} ${selectedCategory===cat.key?'active':''}`;
    div.innerHTML = `<div class="ico">${cat.emoji}</div><div class="t">${cat.label}</div>`;
    div.onclick = ()=>{ selectedCategory=cat.key; renderCategoryPicker(); };
    wrap.appendChild(div);
  });
}

function render(){
  const filter = $('#filterBy').value;
  const sort = $('#sortBy').value;

  let data = read();

  // summary (use pending only for outstanding)
  const pending = data.filter(p=>p.status!=='paid');
  pending.sort((a,b)=> new Date(a.dueDate) - new Date(b.dueDate));
  const next = pending[0];
  $('#nextDue').textContent = next ? `$${Number(next.amount||0).toFixed(2)} • ${next.dueDate}` : '$0';

  const dueSoonCount = pending.filter(p => {
    const d = daysUntil(p.dueDate);
    return d >= 0 && d <= 7;
  }).length;
  $('#dueSoon').textContent = dueSoonCount;

  const totalOutstanding = pending.reduce((a,p)=>a + Number(p.amount||0),0);
  $('#totalOutstanding').textContent = `$${totalOutstanding.toFixed(2)}`;

  // filter
  if(filter!=='all') data = data.filter(p=>p.status===filter);

  // sort
  data.sort((a,b)=>{
    if(sort==='amount') return Number(b.amount) - Number(a.amount);
    if(sort==='status') return (a.status>b.status) ? 1 : -1;
    if(sort==='description') return (a.description||'').localeCompare(b.description||'');
    return new Date(a.dueDate) - new Date(b.dueDate); // dueDate
  });

  const list = $('#paymentsList');
  list.innerHTML = '';
  if(!data.length){
    list.innerHTML = `<div class="empty">No payments yet. Add one on the left.</div>`;
    return;
  }

  data.forEach(p=>{
    const dLeft = daysUntil(p.dueDate);
    let statusClass='scheduled', statusLabel='Scheduled';
    if(p.status==='paid'){ statusClass='paid'; statusLabel='Paid'; }
    else if(dLeft < 0){ statusClass='overdue'; statusLabel='Overdue'; }
    else if(dLeft <= 3){ statusClass='soon'; statusLabel='Due soon'; }

    const cat = CATEGORIES.find(c=>c.key===p.category) || CATEGORIES[0];

    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `
      <div class="row-left">
        <div class="avatar" title="${cat.label}">${cat.emoji}</div>
        <div>
          <div class="row-title">
            ${p.description}
            <span class="status ${statusClass}">${statusLabel}</span>
            <span style="float:right;color:#475569;font-weight:600">$${Number(p.amount||0).toFixed(2)}</span>
          </div>
          <div class="row-sub">Due ${p.dueDate} • ${cat.label}</div>
        </div>
      </div>
      <div class="row-actions">
        <button class="btn ghost" data-action="toggle">${p.status==='paid'?'Mark Pending':'Mark Paid'}</button>
        <button class="btn ghost" data-action="edit">Edit</button>
        <button class="btn ghost danger" data-action="delete">Delete</button>
      </div>
    `;

    row.querySelector('[data-action="toggle"]').onclick = ()=>{
      const arr = read();
      const i = arr.findIndex(x=>x.id===p.id);
      if(i>=0){ arr[i].status = arr[i].status==='paid'?'pending':'paid'; write(arr); render(); }
    };
    row.querySelector('[data-action="edit"]').onclick = ()=> loadForm(p.id);
    row.querySelector('[data-action="delete"]').onclick = ()=>{
      write(read().filter(x=>x.id!==p.id));
      render();
    };

    list.appendChild(row);
  });
}

function loadForm(id){
  const p = read().find(x=>x.id===id); if(!p) return;
  $('#paymentId').value = p.id;
  $('#description').value = p.description;
  $('#amount').value = p.amount;
  $('#dueDate').value = p.dueDate;
  $('#status').value = p.status || 'pending';
  selectedCategory = p.category || 'bills';
  renderCategoryPicker();
  window.scrollTo({top:0, behavior:'smooth'});
}

function save(e){
  e.preventDefault();
  const id = $('#paymentId').value || crypto.randomUUID();
  const description = $('#description').value.trim();
  const amount = Number($('#amount').value);
  const dueDate = $('#dueDate').value;
  const status = $('#status').value || 'pending';

  if(!description || !(amount>0)) return alert('Enter a description and positive amount.');

  const arr = read();
  const idx = arr.findIndex(x=>x.id===id);
  const item = { id, description, amount, dueDate, status, category: selectedCategory };
  if(idx>=0) arr[idx]=item; else arr.push(item);
  write(arr);

  $('#paymentForm').reset();
  $('#paymentId').value='';
  selectedCategory='bills';
  renderCategoryPicker();
  render();
}

document.addEventListener('DOMContentLoaded', ()=>{
  renderCategoryPicker();
  $('#paymentForm').addEventListener('submit', save);
  $('#resetPaymentForm').addEventListener('click', ()=>{ $('#paymentForm').reset(); $('#paymentId').value=''; selectedCategory='bills'; renderCategoryPicker(); });
  $('#filterBy').addEventListener('change', render);
  $('#sortBy').addEventListener('change', render);
  render();
});
