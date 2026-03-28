// ── CONFIGURAÇÃO DE SEGURANÇA (Injetado pelo Netlify no Build) ──────────────
const SUPABASE_URL = "URL_DO_SUPABASE_AQUI";
const SUPABASE_KEY = "CHAVE_DO_SUPABASE_AQUI";
const SITE_PASSWORD = "MINHA_SENHA_SECRETA"; 

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── CONFIGURAÇÕES DE INTERFACE ──────────────────────────────────────────────
const INCOME_CATS = ['Salário','Freelance','Investimentos','Aluguel','Presente','Outros'];
const EXPENSE_CATS = ['Alimentação','Moradia','Transporte','Saúde','Lazer','Educação','Vestuário','Assinaturas','Outros'];
const CAT_ICONS = {
  'Salário':'💼','Freelance':'💻','Investimentos':'📈','Aluguel':'🏠','Presente':'🎁',
  'Alimentação':'🍽️','Moradia':'🏡','Transporte':'🚌','Saúde':'💊','Lazer':'🎮',
  'Educação':'📚','Vestuário':'👕','Assinaturas':'📱','Outros':'📌'
};
const CAT_COLORS = ['#29d47a','#5b8af5','#f5b642','#f06060','#a78bfa','#2dd4bf','#f472b6','#fb923c','#7a7a95'];

let transactions = []; 
let currentType = 'income';
let selectedMonth = null;
let barChart, donutChart, lineChart, incomeBarChart; // Adicionado os novos aqui

// ── PERSISTÊNCIA DE DADOS (SUPABASE) ────────────────────────────────────────

async function loadData() {
  const { data, error } = await supabaseClient.from('transactions').select('*').order('date', { ascending: true });

  if (error) {
    showToast('Erro ao carregar dados');
  } else {
    transactions = data.map(t => ({ ...t, amount: parseFloat(t.amount) || 0 }));
    refresh(); 
  }
}

async function addTransaction() {
  const desc = document.getElementById('fDesc').value.trim();
  const amount = parseFloat(document.getElementById('fAmount').value);
  const cat = document.getElementById('fCategory').value;
  const date = document.getElementById('fDate').value;
  
  if (!desc || !amount || amount <= 0 || !date) { 
    showToast('Preencha todos os campos'); 
    return; 
  }
  
  const newTx = { type: currentType, desc, cat, amount, date };
  const { error } = await supabaseClient.from('transactions').insert([newTx]);

  if (error) showToast('Erro ao salvar');
  else {
    showToast('Salvo! ✅');
    document.getElementById('fDesc').value = '';
    document.getElementById('fAmount').value = '';
    await loadData(); 
  }
}

async function deleteTransaction(id) {
  if(confirm("Deseja excluir?")) {
    const { error } = await supabaseClient.from('transactions').delete().eq('id', id); 
    if (!error) await loadData();
  }
}

// ── AUXILIARES ──────────────────────────────────────────────────────────────
function fmt(v) { return 'R$ ' + Math.abs(v).toLocaleString('pt-BR', {minimumFractionDigits:2}); }

function getMonths() {
  const set = new Set(transactions.map(t => t.date.slice(0,7)));
  return [...set].sort().reverse();
}

function monthLabel(ym) {
  if(!ym) return "";
  const [y,m] = ym.split('-');
  const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return names[+m-1] + '/' + y.slice(2);
}

function txForMonth(ym) { return transactions.filter(t => t.date.startsWith(ym)); }

function showToast(msg) {
  const t = document.getElementById('toast');
  if(t) { t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2000); }
}

function setType(type) {
  currentType = type;
  document.getElementById('btnIncome').className = 'type-btn' + (type==='income'?' active-income':'');
  document.getElementById('btnExpense').className = 'type-btn' + (type==='expense'?' active-expense':'');
  updateCategorySelect();
}

function updateCategorySelect() {
  const sel = document.getElementById('fCategory');
  const cats = currentType === 'income' ? INCOME_CATS : EXPENSE_CATS;
  sel.innerHTML = cats.map(c => `<option>${c}</option>`).join('');
}

function buildMonthFilter() {
  const months = getMonths();
  if (!selectedMonth || !months.includes(selectedMonth)) selectedMonth = months[0] || null;
  const cont = document.getElementById('monthFilter');
  if(cont) cont.innerHTML = months.map(m => `<button class="month-btn${m===selectedMonth?' active':''}" onclick="selectMonth('${m}')">${monthLabel(m)}</button>`).join('');
}

function selectMonth(m) { selectedMonth = m; refresh(); }

// ── GRÁFICOS (CHART.JS) ──────────────────────────────────────────────────────

function updateCharts() {
  const months = getMonths().slice(0,6).reverse();
  const txsCurrent = selectedMonth ? txForMonth(selectedMonth) : transactions;

  // 1. Bar Chart (Receitas vs Despesas)
  const barCtx = document.getElementById('barChart');
  if(barCtx) {
    const incData = months.map(m => txForMonth(m).filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0));
    const expData = months.map(m => txForMonth(m).filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0));
    if (barChart) barChart.destroy();
    barChart = new Chart(barCtx, {
      type: 'bar',
      data: { labels: months.map(monthLabel), datasets: [
        { label:'Receitas', data:incData, backgroundColor:'#29d47a', borderRadius:4 },
        { label:'Despesas', data:expData, backgroundColor:'#f06060', borderRadius:4 }
      ]},
      options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}} }
    });
  }

  // 2. Donut Chart (Despesas por Categoria)
  const donutCtx = document.getElementById('donutChart');
  if(donutCtx) {
    const expTxs = txsCurrent.filter(t => t.type === 'expense');
    const byCat = {};
    expTxs.forEach(t => byCat[t.cat] = (byCat[t.cat] || 0) + t.amount);
    if (donutChart) donutChart.destroy();
    donutChart = new Chart(donutCtx, {
      type: 'doughnut',
      data: { labels: Object.keys(byCat), datasets: [{ data: Object.values(byCat), backgroundColor: CAT_COLORS }] },
      options: { responsive:true, maintainAspectRatio:false, cutout:'70%', plugins:{legend:{display:false}} }
    });
  }

  // 3. Line Chart (Evolução do Saldo) - NOVO!
  const lineCtx = document.getElementById('lineChart');
  if(lineCtx) {
    let cumulative = 0;
    const history = months.map(m => {
      const inc = txForMonth(m).filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
      const exp = txForMonth(m).filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
      cumulative += (inc - exp);
      return cumulative;
    });
    if (lineChart) lineChart.destroy();
    lineChart = new Chart(lineCtx, {
      type: 'line',
      data: { labels: months.map(monthLabel), datasets: [{ label: 'Saldo', data: history, borderColor: '#5b8af5', tension: 0.4, fill: true, backgroundColor: 'rgba(91, 138, 245, 0.1)' }]},
      options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}} }
    });
  }

  // 4. Income Bar Chart (Receitas por Categoria) - NOVO!
  const incBarCtx = document.getElementById('incomeBarChart');
  if(incBarCtx) {
    const incTxs = txsCurrent.filter(t => t.type === 'income');
    const byCatInc = {};
    incTxs.forEach(t => byCatInc[t.cat] = (byCatInc[t.cat] || 0) + t.amount);
    if (incomeBarChart) incomeBarChart.destroy();
    incomeBarChart = new Chart(incBarCtx, {
      type: 'bar',
      data: { labels: Object.keys(byCatInc), datasets: [{ data: Object.values(byCatInc), backgroundColor: '#29d47a', borderRadius: 4 }]},
      options: { indexAxis: 'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}} }
    });
  }
}

// ── INICIALIZAÇÃO ───────────────────────────────────────────────────────────

function refresh() {
  buildMonthFilter();
  updateCharts();
  renderTransactions();
  // Atualiza métricas rápidas
  const txs = selectedMonth ? txForMonth(selectedMonth) : transactions;
  const inc = txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const exp = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  document.getElementById('totalIncome').textContent = fmt(inc);
  document.getElementById('totalExpense').textContent = fmt(exp);
  document.getElementById('balance').textContent = fmt(inc - exp);
  document.getElementById('savingsRate').textContent = inc > 0 ? ((inc-exp)/inc*100).toFixed(1) + '%' : '0%';
}

function renderTransactions() {
  const el = document.getElementById('txList');
  const search = document.getElementById('txSearch').value.toLowerCase();
  let txs = selectedMonth ? txForMonth(selectedMonth) : transactions;
  if(search) txs = txs.filter(t => t.desc.toLowerCase().includes(search) || t.cat.toLowerCase().includes(search));
  
  el.innerHTML = txs.map(t => {
    const [y,m,d] = t.date.split('-');
    return `<div class="tx-item">
      <span>${CAT_ICONS[t.cat] || '📌'} ${t.desc} <small>(${d}/${m})</small></span>
      <span class="${t.type}">${t.type==='income'?'+':'-'} ${fmt(t.amount)}</span>
      <button onclick="deleteTransaction('${t.id}')">×</button>
    </div>`;
  }).join('');
}

function checkPassword() {
  if (document.getElementById("passwordInput").value === SITE_PASSWORD) {
    document.getElementById("lockScreen").style.display = "none";
    localStorage.setItem("auth_financas", "true");
    loadData();
  } else { document.getElementById("errorMsg").textContent = "Senha incorreta"; }
}

window.onload = async () => {
  if (localStorage.getItem("auth_financas") === "true") {
    document.getElementById("lockScreen").style.display = "none";
    await loadData();
  }
  document.getElementById('fDate').value = new Date().toISOString().slice(0,10);
  updateCategorySelect();
};