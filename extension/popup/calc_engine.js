const CALCULATORS = {
  financial: {
    emi: {
      name: "EMI Calculator",
      inputs: [
        { id: "p", label: "Principal Amount ($)", type: "number" },
        { id: "r", label: "Annual Interest Rate (%)", type: "number" },
        { id: "t", label: "Tenure (Years)", type: "number" }
      ],
      calculate: (vals) => {
        const p = parseFloat(vals.p), r = parseFloat(vals.r) / 12 / 100, n = parseFloat(vals.t) * 12;
        if (!p || !r || !n) return 0;
        const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        return `EMI: $${emi.toFixed(2)} / month`;
      }
    },
    loan: {
      name: "Loan Calculator",
      inputs: [
        { id: "p", label: "Loan Amount ($)", type: "number" },
        { id: "r", label: "Annual Interest Rate (%)", type: "number" },
        { id: "t", label: "Term (Years)", type: "number" }
      ],
      calculate: (vals) => {
        const p = parseFloat(vals.p), r = parseFloat(vals.r) / 12 / 100, n = parseFloat(vals.t) * 12;
        if (!p || !r || !n) return 0;
        const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        const total = emi * n;
        return `Total Payment: $${total.toFixed(2)} | Interest: $${(total-p).toFixed(2)}`;
      }
    },
    sip: {
      name: "SIP Calculator",
      inputs: [
        { id: "p", label: "Monthly Investment ($)", type: "number" },
        { id: "r", label: "Expected Return Rate (p.a %)", type: "number" },
        { id: "t", label: "Time Period (Years)", type: "number" }
      ],
      calculate: (vals) => {
        const p = parseFloat(vals.p), r = parseFloat(vals.r) / 12 / 100, n = parseFloat(vals.t) * 12;
        if (!p || !r || !n) return 0;
        const total = p * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
        return `Future Value: $${total.toFixed(2)}`;
      }
    },
    compound_interest: {
      name: "Compound Interest",
      inputs: [
        { id: "p", label: "Principal ($)", type: "number" },
        { id: "r", label: "Rate (%)", type: "number" },
        { id: "t", label: "Time (Years)", type: "number" },
        { id: "n", label: "Compounds per Year", type: "number" }
      ],
      calculate: (vals) => {
        const p = parseFloat(vals.p), r = parseFloat(vals.r)/100, t = parseFloat(vals.t), n = parseFloat(vals.n);
        if (!p || !r || !t || !n) return 0;
        const a = p * Math.pow(1 + (r / n), n * t);
        return `Total: $${a.toFixed(2)} | Interest: $${(a-p).toFixed(2)}`;
      }
    },
    simple_interest: {
      name: "Simple Interest",
      inputs: [
        { id: "p", label: "Principal ($)", type: "number" },
        { id: "r", label: "Rate (%)", type: "number" },
        { id: "t", label: "Time (Years)", type: "number" }
      ],
      calculate: (vals) => {
        const p = parseFloat(vals.p), r = parseFloat(vals.r), t = parseFloat(vals.t);
        if (!p || !r || !t) return 0;
        const si = (p * r * t) / 100;
        return `Total: $${(p+si).toFixed(2)} | Interest: $${si.toFixed(2)}`;
      }
    },
    roi: {
      name: "ROI (Return on Investment)",
      inputs: [
        { id: "inv", label: "Amount Invested ($)", type: "number" },
        { id: "ret", label: "Amount Returned ($)", type: "number" }
      ],
      calculate: (vals) => {
        const i = parseFloat(vals.inv), r = parseFloat(vals.ret);
        if (!i || !r) return 0;
        const roi = ((r - i) / i) * 100;
        return `ROI: ${roi.toFixed(2)}%`;
      }
    },
    profit_margin: {
      name: "Profit Margin",
      inputs: [
        { id: "rev", label: "Total Revenue ($)", type: "number" },
        { id: "cost", label: "Total Cost ($)", type: "number" }
      ],
      calculate: (vals) => {
        const r = parseFloat(vals.rev), c = parseFloat(vals.cost);
        if (!r || !c) return 0;
        const margin = ((r - c) / r) * 100;
        return `Margin: ${margin.toFixed(2)}% | Profit: $${(r-c).toFixed(2)}`;
      }
    },
    savings_goal: {
      name: "Savings Goal",
      inputs: [
        { id: "goal", label: "Goal Amount ($)", type: "number" },
        { id: "months", label: "Months to Save", type: "number" }
      ],
      calculate: (vals) => {
        const g = parseFloat(vals.goal), m = parseFloat(vals.months);
        if (!g || !m) return 0;
        return `Required: $${(g/m).toFixed(2)} / month`;
      }
    }
  },
  student: {
    percentage: {
      name: "Percentage",
      inputs: [
        { id: "val", label: "Value", type: "number" },
        { id: "tot", label: "Total", type: "number" }
      ],
      calculate: (vals) => {
        const v = parseFloat(vals.val), t = parseFloat(vals.tot);
        if (!v || !t) return 0;
        return `${((v/t)*100).toFixed(2)}%`;
      }
    },
    mean: {
      name: "Mean Average",
      inputs: [
        { id: "nums", label: "Numbers (comma separated)", type: "text" }
      ],
      calculate: (vals) => {
        if(!vals.nums) return 0;
        const arr = vals.nums.split(',').map(n => parseFloat(n.trim())).filter(n => !isNaN(n));
        if(arr.length === 0) return 0;
        const sum = arr.reduce((a,b)=>a+b, 0);
        return `Mean: ${(sum/arr.length).toFixed(4)}`;
      }
    },
    median: {
      name: "Median",
      inputs: [
        { id: "nums", label: "Numbers (comma separated)", type: "text" }
      ],
      calculate: (vals) => {
        if(!vals.nums) return 0;
        const arr = vals.nums.split(',').map(n => parseFloat(n.trim())).filter(n => !isNaN(n)).sort((a,b)=>a-b);
        if(arr.length === 0) return 0;
        const mid = Math.floor(arr.length/2);
        const median = arr.length % 2 !== 0 ? arr[mid] : (arr[mid-1] + arr[mid])/2;
        return `Median: ${median}`;
      }
    }
  },
  founder: {
    runway: {
      name: "Runway Calculator",
      inputs: [
        { id: "cash", label: "Total Cash Balance ($)", type: "number" },
        { id: "burn", label: "Monthly Burn Rate ($)", type: "number" }
      ],
      calculate: (vals) => {
        const c = parseFloat(vals.cash), b = parseFloat(vals.burn);
        if (!c || !b) return 0;
        return `${(c / b).toFixed(1)} months`;
      }
    },
    cac: {
      name: "Customer Acquisition Cost (CAC)",
      inputs: [
        { id: "spend", label: "Total Marketing Spend ($)", type: "number" },
        { id: "customers", label: "New Customers Acquired", type: "number" }
      ],
      calculate: (vals) => {
        const s = parseFloat(vals.spend), c = parseFloat(vals.customers);
        if (!s || !c) return 0;
        return `$${(s / c).toFixed(2)} per customer`;
      }
    },
    ltv: {
      name: "Lifetime Value (LTV)",
      inputs: [
        { id: "arpu", label: "Average Revenue Per User ($)", type: "number" },
        { id: "churn", label: "Churn Rate (%)", type: "number" }
      ],
      calculate: (vals) => {
        const a = parseFloat(vals.arpu), c = parseFloat(vals.churn)/100;
        if (!a || !c) return 0;
        return `LTV: $${(a / c).toFixed(2)}`;
      }
    },
    breakeven: {
      name: "Break-Even Point",
      inputs: [
        { id: "fixed", label: "Fixed Costs ($)", type: "number" },
        { id: "price", label: "Price per Unit ($)", type: "number" },
        { id: "var", label: "Variable Cost per Unit ($)", type: "number" }
      ],
      calculate: (vals) => {
        const f = parseFloat(vals.fixed), p = parseFloat(vals.price), v = parseFloat(vals.var);
        if (!f || !p || !v || p <= v) return 0;
        const units = f / (p - v);
        return `Units needed: ${Math.ceil(units)}`;
      }
    }
  },
  misc: {
    discount: {
      name: "Discount Calculator",
      inputs: [
        { id: "price", label: "Original Price ($)", type: "number" },
        { id: "discount", label: "Discount (%)", type: "number" }
      ],
      calculate: (vals) => {
        const p = parseFloat(vals.price), d = parseFloat(vals.discount);
        if (!p || !d) return 0;
        const final = p - (p * (d / 100));
        return `Final: $${final.toFixed(2)} (Saved: $${(p-final).toFixed(2)})`;
      }
    },
    tax: {
      name: "Tax / VAT Calculator",
      inputs: [
        { id: "price", label: "Net Price ($)", type: "number" },
        { id: "tax", label: "Tax Rate (%)", type: "number" }
      ],
      calculate: (vals) => {
        const p = parseFloat(vals.price), t = parseFloat(vals.tax);
        if (!p || !t) return 0;
        const taxAmt = p * (t / 100);
        return `Tax: $${taxAmt.toFixed(2)} | Gross: $${(p+taxAmt).toFixed(2)}`;
      }
    },
    age: {
      name: "Age Calculator",
      inputs: [
        { id: "dob", label: "Birth Year (YYYY)", type: "number" }
      ],
      calculate: (vals) => {
        const y = parseInt(vals.dob);
        if(!y) return 0;
        return `Age: ${new Date().getFullYear() - y} years`;
      }
    },
    tip: {
      name: "Tip Calculator",
      inputs: [
        { id: "bill", label: "Bill Amount ($)", type: "number" },
        { id: "tip", label: "Tip Rate (%)", type: "number" },
        { id: "split", label: "Number of People", type: "number" }
      ],
      calculate: (vals) => {
        const b = parseFloat(vals.bill), t = parseFloat(vals.tip), s = parseFloat(vals.split) || 1;
        if (!b || !t) return 0;
        const tipAmt = b * (t/100);
        const total = b + tipAmt;
        return `Tip: $${tipAmt.toFixed(2)} | Total: $${total.toFixed(2)} | Per Person: $${(total/s).toFixed(2)}`;
      }
    }
  }
};

if (typeof module !== 'undefined') {
  module.exports = { CALCULATORS };
} else {
  document.addEventListener('DOMContentLoaded', () => {
    const catBtns = document.querySelectorAll('.calc-cat-btn');
    const sciView = document.getElementById('calc-scientific');
    const dynView = document.getElementById('calc-dynamic');
    const dynSelect = document.getElementById('dynamic-calc-select');
    const dynForm = document.getElementById('dynamic-calc-form');
    const dynResult = document.getElementById('dynamic-calc-result');

    if (!sciView) return;

    let currentCategory = 'scientific';

    catBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        catBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.cat;

        if (currentCategory === 'scientific') {
          sciView.classList.add('active');
          dynView.classList.remove('active');
          window.dispatchEvent(new CustomEvent('clearCalc'));
        } else {
          sciView.classList.remove('active');
          dynView.classList.add('active');
          loadCategory(currentCategory);
        }
      });
    });

    function loadCategory(catKey) {
      dynSelect.innerHTML = '';
      const calcs = CALCULATORS[catKey];
      if (!calcs) return;

      Object.keys(calcs).forEach((key) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = calcs[key].name;
        dynSelect.appendChild(opt);
      });

      dynSelect.onchange = () => renderForm(calcs[dynSelect.value]);
      if(Object.keys(calcs).length > 0) renderForm(calcs[Object.keys(calcs)[0]]);
    }

    function renderForm(calcDef) {
      dynForm.innerHTML = '';
      dynResult.textContent = '';
      
      calcDef.inputs.forEach(inp => {
        const row = document.createElement('div');
        row.style.marginBottom = '10px';
        
        const lbl = document.createElement('label');
        lbl.textContent = inp.label;
        lbl.style.display = 'block';
        lbl.style.fontSize = '12px';
        lbl.style.color = 'var(--text-secondary)';
        lbl.style.marginBottom = '4px';

        const input = document.createElement('input');
        input.type = inp.type || 'number';
        input.className = 'search-input';
        input.dataset.id = inp.id;
        input.style.marginBottom = '0';

        input.addEventListener('input', () => evaluateDynamic(calcDef));

        row.appendChild(lbl);
        row.appendChild(input);
        dynForm.appendChild(row);
      });
    }

    function evaluateDynamic(calcDef) {
      const inputs = Array.from(dynForm.querySelectorAll('input'));
      const vals = {};
      inputs.forEach(i => vals[i.dataset.id] = i.value);
      
      try {
        const res = calcDef.calculate(vals);
        dynResult.textContent = res ? res : '';
      } catch (e) {
        dynResult.textContent = 'Error';
      }
    }

    const calcMenuToggle = document.getElementById('calc-menu-toggle');
    if (calcMenuToggle) {
      calcMenuToggle.addEventListener('click', () => {
        const sidebar = document.getElementById('calc-sidebar');
        const texts = document.querySelectorAll('.calc-cat-text');
        if (sidebar.style.width === '45px') {
          sidebar.style.width = '140px';
          texts.forEach(t => t.style.display = 'inline');
        } else {
          sidebar.style.width = '45px';
          texts.forEach(t => t.style.display = 'none');
        }
      });
    }
  });
}
