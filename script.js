
// ── DATA ──────────────────────────────────────────────────────────────────────
const INCOME_CATS = ['Salário','Freelance','Investimentos','Aluguel','Presente','Outros'];
const EXPENSE_CATS = ['Alimentação','Moradia','Transporte','Saúde','Lazer','Educação','Vestuário','Assinaturas','Outros'];
const CAT_ICONS = {
  'Salário':'💼','Freelance':'💻','Investimentos':'📈','Aluguel':'🏠','Presente':'🎁',
  'Alimentação':'🍽️','Moradia':'🏡','Transporte':'🚌','Saúde':'💊','Lazer':'🎮',
  'Educação':'📚','Vestuário':'👕','Assinaturas':'📱','Outros':'📌'
};
const CAT_COLORS = ['#29d47a','#5b8af5','#f5b642','#f06060','#a78bfa','#2dd4bf','#f472b6','#fb923c','#7a7a95'];

let currentType = 'income';
let selectedMonth = null;
let barChart, donutChart, lineChart, incomeBarChart;

// ── DATA (LIMPO) ─────────────────────────────────────────────────────────────
let transactions = [];
let nextId = 1;

// ── HELPERS ───────────────────────────────────────────────────────────────────
function fmt(v) {
  return 'R$ ' + Math.abs(v).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
}
function getMonths() {
  const set = new Set(transactions.map(t => t.date.slice(0,7)));
  return [...set].sort().reverse();
}
function monthLabel(ym) {
  const [y,m] = ym.split('-');
  const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return names[+m-1] + '/' + y.slice(2);
}
function txForMonth(ym) {
  return transactions.filter(t => t.date.startsWith(ym));
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ── TYPE / CATEGORY ──────────────────────────────────────────────────────────
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

// ── ADD TRANSACTION ──────────────────────────────────────────────────────────
function addTransaction() {
  const desc = document.getElementById('fDesc').value.trim();
  const amount = parseFloat(document.getElementById('fAmount').value);
  const cat = document.getElementById('fCategory').value;
  const date = document.getElementById('fDate').value;
  if (!desc || !amount || amount <= 0 || !date) { showToast('Preencha todos os campos'); return; }
  transactions.unshift({id: nextId++, type: currentType, desc, cat, amount, date});
  document.getElementById('fDesc').value = '';
  document.getElementById('fAmount').value = '';
  showToast('Lançamento adicionado!');
  refresh();
}
function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  refresh();
}

// ── MONTH FILTER ──────────────────────────────────────────────────────────────
function buildMonthFilter() {
  const months = getMonths();
  if (!selectedMonth || !months.includes(selectedMonth)) selectedMonth = months[0] || null;
  const cont = document.getElementById('monthFilter');
  cont.innerHTML = months.map(m =>
    `<button class="month-btn${m===selectedMonth?' active':''}" onclick="selectMonth('${m}')">${monthLabel(m)}</button>`
  ).join('');
}
function selectMonth(m) { selectedMonth = m; refresh(); }

// ── METRICS ──────────────────────────────────────────────────────────────────
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
  document.getElementById('savingsRate').style.color = rate >= 20 ? 'var(--green)' : rate >= 0 ? 'var(--amber)' : 'var(--red)';

  const inc = txs.filter(t=>t.type==='income').length;
  const exp = txs.filter(t=>t.type==='expense').length;
  document.getElementById('incomeCount').textContent = inc + ' lançamento' + (inc!==1?'s':'');
  document.getElementById('expenseCount').textContent = exp + ' lançamento' + (exp!==1?'s':'');
  document.getElementById('balanceSub').innerHTML = bal>=0
    ? '<span class="delta up">Positivo ✓</span>'
    : '<span class="delta down">Negativo ✗</span>';
  document.getElementById('savingsSub').innerHTML = rate >= 20
    ? '<span class="delta up">Meta atingida ✓</span>'
    : '<span class="delta">Meta: 20%</span>';
}

// ── BAR CHART ─────────────────────────────────────────────────────────────────
function updateBarChart() {
  const months = getMonths().slice(0,6).reverse();
  const incData = months.map(m => txForMonth(m).filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0));
  const expData = months.map(m => txForMonth(m).filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0));
  if (barChart) barChart.destroy();
  barChart = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: {
      labels: months.map(monthLabel),
      datasets: [
        { label:'Receitas', data:incData, backgroundColor:'rgba(41,212,122,0.7)', borderRadius:5, borderSkipped:false },
        { label:'Despesas', data:expData, backgroundColor:'rgba(240,96,96,0.7)', borderRadius:5, borderSkipped:false }
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{callbacks:{label:c=>'R$ '+c.raw.toLocaleString('pt-BR',{minimumFractionDigits:2})}} },
      scales:{
        x:{ ticks:{color:'#7a7a95',font:{size:11}}, grid:{color:'rgba(255,255,255,0.04)'} },
        y:{ ticks:{color:'#7a7a95',font:{size:11},callback:v=>'R$'+Math.round(v/1000)+'k'}, grid:{color:'rgba(255,255,255,0.06)'} }
      }
    }
  });
}

// ── DONUT CHART ───────────────────────────────────────────────────────────────
function updateDonutChart() {
  const txs = selectedMonth ? txForMonth(selectedMonth) : transactions;
  const expenses = txs.filter(t=>t.type==='expense');
  const bycat = {};
  expenses.forEach(t => { bycat[t.cat] = (bycat[t.cat]||0) + t.amount; });
  const labels = Object.keys(bycat);
  const data = labels.map(l=>bycat[l]);
  const total = data.reduce((s,v)=>s+v,0);

  if (donutChart) donutChart.destroy();
  donutChart = new Chart(document.getElementById('donutChart'), {
    type:'doughnut',
    data:{ labels, datasets:[{ data, backgroundColor:CAT_COLORS, borderWidth:2, borderColor:'#16161f', hoverOffset:4 }] },
    options:{
      responsive:true, maintainAspectRatio:false, cutout:'68%',
      plugins:{
        legend:{display:false},
        tooltip:{callbacks:{label:c=>`${c.label}: R$${c.raw.toLocaleString('pt-BR',{minimumFractionDigits:2})} (${(c.raw/total*100).toFixed(1)}%)`}}
      }
    }
  });

  const leg = document.getElementById('donutLegend');
  if (labels.length === 0) { leg.innerHTML = '<span style="color:var(--muted);font-size:12px">Nenhuma despesa</span>'; return; }
  leg.innerHTML = labels.map((l,i) =>
    `<div class="leg-item"><div class="leg-dot" style="background:${CAT_COLORS[i%CAT_COLORS.length]}"></div>${l}: ${(data[i]/total*100).toFixed(0)}%</div>`
  ).join('');
}

// ── LINE CHART ────────────────────────────────────────────────────────────────
function updateLineChart() {
  const months = getMonths().slice(0,6).reverse();
  let running = 0;
  const balData = months.map(m => {
    const inc = txForMonth(m).filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
    const exp = txForMonth(m).filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
    running += inc - exp;
    return running;
  });
  if (lineChart) lineChart.destroy();
  lineChart = new Chart(document.getElementById('lineChart'), {
    type:'line',
    data:{
      labels: months.map(monthLabel),
      datasets:[{
        label:'Saldo acumulado', data:balData,
        borderColor:'#5b8af5', backgroundColor:'rgba(91,138,245,0.08)',
        borderWidth:2, pointBackgroundColor:'#5b8af5', pointRadius:4, tension:0.35, fill:true
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>'R$'+c.raw.toLocaleString('pt-BR',{minimumFractionDigits:2})}}},
      scales:{
        x:{ticks:{color:'#7a7a95',font:{size:11}}, grid:{color:'rgba(255,255,255,0.04)'}},
        y:{ticks:{color:'#7a7a95',font:{size:11},callback:v=>'R$'+Math.round(v/1000)+'k'}, grid:{color:'rgba(255,255,255,0.06)'}}
      }
    }
  });
}

// ── INCOME BAR ────────────────────────────────────────────────────────────────
function updateIncomeBar() {
  const txs = selectedMonth ? txForMonth(selectedMonth) : transactions;
  const incomes = txs.filter(t=>t.type==='income');
  const bycat = {};
  incomes.forEach(t => { bycat[t.cat] = (bycat[t.cat]||0) + t.amount; });
  const labels = Object.keys(bycat);
  const data = labels.map(l=>bycat[l]);
  if (incomeBarChart) incomeBarChart.destroy();
  incomeBarChart = new Chart(document.getElementById('incomeBarChart'), {
    type:'bar',
    data:{
      labels,
      datasets:[{ data, backgroundColor:labels.map((_,i)=>CAT_COLORS[i%CAT_COLORS.length]), borderRadius:5, borderSkipped:false }]
    },
    options:{
      responsive:true, maintainAspectRatio:false, indexAxis:'y',
      plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>'R$'+c.raw.toLocaleString('pt-BR',{minimumFractionDigits:2})}}},
      scales:{
        x:{ticks:{color:'#7a7a95',font:{size:11},callback:v=>'R$'+Math.round(v/1000)+'k'}, grid:{color:'rgba(255,255,255,0.06)'}},
        y:{ticks:{color:'#7a7a95',font:{size:11}}, grid:{display:false}}
      }
    }
  });
}

// ── TRANSACTIONS ──────────────────────────────────────────────────────────────
function renderTransactions() {
  const q = document.getElementById('txSearch').value.toLowerCase();
  let txs = selectedMonth ? txForMonth(selectedMonth) : transactions;
  if (q) txs = txs.filter(t => t.desc.toLowerCase().includes(q) || t.cat.toLowerCase().includes(q));
  txs = [...txs].sort((a,b) => b.date.localeCompare(a.date));
  const el = document.getElementById('txList');
  if (txs.length === 0) { el.innerHTML = '<div class="empty">Nenhum lançamento encontrado</div>'; return; }
  el.innerHTML = txs.map(t => {
    const icon = CAT_ICONS[t.cat] || '📌';
    const bg = t.type==='income' ? 'var(--green-dim)' : 'var(--red-dim)';
    const [y,m,d] = t.date.split('-');
    return `<div class="tx-item">
      <div class="tx-left">
        <div class="tx-icon" style="background:${bg}">${icon}</div>
        <div>
          <div class="tx-desc">${t.desc}</div>
          <div class="tx-meta">${t.cat} · ${d}/${m}/${y}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center">
        <div class="tx-amount ${t.type==='income'?'pos':'neg'}">${t.type==='income'?'+':'-'}${fmt(t.amount)}</div>
        <button class="tx-del" onclick="deleteTransaction(${t.id})" title="Excluir">×</button>
      </div>
    </div>`;
  }).join('');
}

const SITE_PASSWORD = "1234"; // MUDA AQUI

function checkPassword() {
  const input = document.getElementById("passwordInput").value;
  const error = document.getElementById("errorMsg");

  if (input === SITE_PASSWORD) {
    document.getElementById("lockScreen").style.display = "none";
    localStorage.setItem("auth", "true");
  } else {
    error.textContent = "Senha incorreta";
  }
}

// manter logado
window.onload = () => {
  if (localStorage.getItem("auth") === "true") {
    document.getElementById("lockScreen").style.display = "none";
  }
};

// ── REFRESH ───────────────────────────────────────────────────────────────────
function refresh() {
  buildMonthFilter();
  updateMetrics();
  updateBarChart();
  updateDonutChart();
  updateLineChart();
  updateIncomeBar();
  renderTransactions();
}

// ── INIT ──────────────────────────────────────────────────────────────────────
document.getElementById('fDate').value = new Date().toISOString().slice(0,10);
updateCategorySelect();
refresh();

