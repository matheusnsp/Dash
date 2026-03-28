// ── CONFIGURAÇÃO SUPABASE ───────────────────────────────────────────────────
const SUPABASE_URL = 'https://llzzyoddlykhoowanfju.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsenp5b2RkbHlraG9vd2FuZmp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTI4NTksImV4cCI6MjA5MDIyODg1OX0.YmxSIWjPl2xs4Ayt_jhp8HkPZkgW2xCs-D4duJuMQls';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── CONFIGURAÇÃO DE SEGURANÇA ────────────────────────────────────────────────
const SITE_PASSWORD = "1234"; 

// ── DATA ──────────────────────────────────────────────────────────────────────
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
let barChart, donutChart;

// ── DATA PERSISTENCE (Supabase) ──────────────────────────────────────────────

async function loadData() {
  const { data, error } = await supabaseClient
    .from('transactions')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Erro ao buscar dados:', error);
    showToast('Erro ao carregar dados');
  } else {
    transactions = data;
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
  
  // IMPORTANTE: Não enviamos o ID, o Supabase gera sozinho
  const newTx = { 
    type: currentType, 
    desc: desc, 
    cat: cat, 
    amount: amount, 
    date: date 
  };

  const { error } = await supabaseClient.from('transactions').insert([newTx]);

  if (error) {
    console.error('Erro de inserção:', error);
    // Se der erro aqui, verifique se você mudou a Primary Key no Painel do Supabase
    showToast('Erro ao salvar no banco. Verifique o ID!');
  } else {
    showToast('Lançamento salvo! ✅');
    document.getElementById('fDesc').value = '';
    document.getElementById('fAmount').value = '';
    await loadData(); 
  }
}

async function deleteTransaction(id) {
  if(confirm("Deseja excluir permanentemente?")) {
    const { error } = await supabaseClient
      .from('transactions')
      .delete()
      .eq('id', id); // Usa o ID único gerado pelo banco
    
    if (error) {
      showToast('Erro ao deletar');
    } else {
      await loadData();
    }
  }
}

// ── HELPERS / UI ─────────────────────────────────────────────────────────────
function fmt(v) {
  return 'R$ ' + Math.abs(v).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
}

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

function txForMonth(ym) {
  return transactions.filter(t => t.date.startsWith(ym));
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if(t) {
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2200);
  }
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
  cont.innerHTML = months.map(m =>
    `<button class="month-btn${m===selectedMonth?' active':''}" onclick="selectMonth('${m}')">${monthLabel(m)}</button>`
  ).join('');
}

function selectMonth(m) { selectedMonth = m; refresh(); }

function updateMetrics() {
  const txs = selectedMonth ? txForMonth(selectedMonth) : transactions;
  const income = txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expense = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const bal = income - expense;
  const rate = income > 0 ? ((bal/income)*100) : 0;

  document.getElementById('totalIncome').textContent = fmt(income);
  document.getElementById('totalExpense').textContent = fmt(expense);
  document.getElementById('balance').textContent = (bal<0?'-':'')+fmt(bal);
  document.getElementById('balance').style.color = bal >= 0 ? 'var(--green)' : 'var(--red)';
  document.getElementById('savingsRate').textContent = rate.toFixed(1)+'%';
  
  const savingsColor = rate >= 20 ? 'var(--green)' : rate >= 0 ? 'var(--amber)' : 'var(--red)';
  document.getElementById('savingsRate').style.color = savingsColor;

  const inc = txs.filter(t=>t.type==='income').length;
  const exp = txs.filter(t=>t.type==='expense').length;
  document.getElementById('incomeCount').textContent = `${inc} lançamento${inc!==1?'s':''}`;
  document.getElementById('expenseCount').textContent = `${exp} lançamento${exp!==1?'s':''}`;
}

// ── CHARTS ───────────────────────────────────────────────────────────────────
function updateBarChart() {
  const canvas = document.getElementById('barChart');
  if(!canvas) return;
  const months = getMonths().slice(0,6).reverse();
  const incData = months.map(m => txForMonth(m).filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0));
  const expData = months.map(m => txForMonth(m).filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0));
  if (barChart) barChart.destroy();
  barChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: months.map(monthLabel),
      datasets: [
        { label:'Receitas', data:incData, backgroundColor:'rgba(41,212,122,0.7)', borderRadius:5 },
        { label:'Despesas', data:expData, backgroundColor:'rgba(240,96,96,0.7)', borderRadius:5 }
      ]
    },
    options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}} }
  });
}

function updateDonutChart() {
  const canvas = document.getElementById('donutChart');
  if(!canvas) return;
  const txs = selectedMonth ? txForMonth(selectedMonth) : transactions;
  const expenses = txs.filter(t=>t.type==='expense');
  const bycat = {};
  expenses.forEach(t => { bycat[t.cat] = (bycat[t.cat]||0) + t.amount; });
  const labels = Object.keys(bycat);
  const data = labels.map(l=>bycat[l]);

  if (donutChart) donutChart.destroy();
  donutChart = new Chart(canvas, {
    type:'doughnut',
    data:{ labels, datasets:[{ data, backgroundColor:CAT_COLORS }] },
    options:{ responsive:true, maintainAspectRatio:false, cutout:'68%', plugins:{legend:{display:false}} }
  });
}

// ── AUTENTICAÇÃO ─────────────────────────────────────────────────────────────
function checkPassword() {
  const input = document.getElementById("passwordInput").value;
  const error = document.getElementById("errorMsg");

  if (input === SITE_PASSWORD) {
    document.getElementById("lockScreen").style.display = "none";
    localStorage.setItem("auth_financas", "true");
    loadData(); 
  } else {
    error.textContent = "Senha incorreta";
  }
}

// ── REFRESH TOTAL ─────────────────────────────────────────────────────────────
function refresh() {
  buildMonthFilter();
  updateMetrics();
  updateBarChart();
  updateDonutChart();
  renderTransactions();
}

function renderTransactions() {
  const el = document.getElementById('txList');
  if(!el) return;
  let txs = selectedMonth ? txForMonth(selectedMonth) : transactions;
  
  if (txs.length === 0) { 
    el.innerHTML = '<div class="empty">Nenhum lançamento</div>'; 
    return; 
  }
  
  el.innerHTML = txs.map(t => {
    const [y,m,d] = t.date.split('-');
    return `<div class="tx-item">
      <span>${CAT_ICONS[t.cat] || '📌'} ${t.desc} (${d}/${m})</span>
      <span class="${t.type}">${t.type==='income'?'+':'-'} ${fmt(t.amount)}</span>
      <button onclick="deleteTransaction('${t.id}')">×</button>
    </div>`;
  }).join('');
}

// Inicialização
window.onload = async () => {
  if (localStorage.getItem("auth_financas") === "true") {
    document.getElementById("lockScreen").style.display = "none";
    await loadData();
  }
  document.getElementById('fDate').value = new Date().toISOString().slice(0,10);
  updateCategorySelect();
};