document.addEventListener('DOMContentLoaded', () => {
  const currentDisplay = document.getElementById('calc-current');
  const historyDisplay = document.getElementById('calc-history');
  const buttons = document.querySelectorAll('.calc-btn');
  const btnDeg = document.getElementById('btn-deg');
  const sandbox = document.getElementById('math-sandbox').contentWindow;
  
  let expr = '';
  let isDeg = true;
  let evaluated = false;

  btnDeg.addEventListener('click', (e) => {
    isDeg = !isDeg;
    btnDeg.textContent = isDeg ? 'Deg' : 'Rad';
    sandbox.postMessage({ action: 'setDeg', isDeg: isDeg }, '*');
    e.stopPropagation();
  });

  function updateDisplay() {
    let pretty = expr.replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−');
    currentDisplay.textContent = pretty || '0';
  }

  function handleInput(val) {
    if (evaluated && !isNaN(val)) {
      expr = '';
      evaluated = false;
    } else {
      evaluated = false;
    }
    
    if (val === 'AC') {
      expr = ''; historyDisplay.textContent = '';
    } else if (val === 'C') {
      expr = expr.length > 0 ? expr.slice(0, -1) : '';
    } else if (val === '=') {
      if (expr) {
        let pretty = expr.replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−');
        historyDisplay.textContent = pretty + ' =';
        sandbox.postMessage({ action: 'eval', expr: expr }, '*');
      }
      return; 
    } else {
      expr += val;
    }
    updateDisplay();
  }

  window.addEventListener('message', (event) => {
    if (event.data && event.data.result !== undefined) {
      if (event.data.result !== null) {
        expr = String(Math.round(event.data.result * 10000000000) / 10000000000);
      } else {
        expr = 'Error';
      }
      evaluated = true;
      updateDisplay();
    }
  });

  window.addEventListener('clearCalc', () => {
    expr = '';
    evaluated = false;
    historyDisplay.textContent = '';
    currentDisplay.textContent = '0';
  });

  buttons.forEach(btn => {
    if (btn.id === 'btn-deg' || btn.dataset.val === 'Inv') return;
    btn.addEventListener('click', () => handleInput(btn.dataset.val));
  });

  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('calculator').classList.contains('active')) return;
    
    if ((e.key >= '0' && e.key <= '9') || ['.', '(', ')', '%', '^', '!'].includes(e.key)) {
      handleInput(e.key);
    } else if (['+', '-', '*', '/'].includes(e.key)) {
      handleInput(e.key);
    } else if (e.key === 'Enter' || e.key === '=') {
      handleInput('=');
    } else if (e.key === 'Backspace') {
      handleInput('C');
    } else if (e.key === 'Escape') {
      handleInput('AC');
    }
  });
});
