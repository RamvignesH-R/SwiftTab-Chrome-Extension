let isDeg = true;
let ans = 0;

function fact(n) { return n <= 1 ? 1 : n * fact(n-1); }

function evaluateMath(expr, isDegree = true, currentAns = 0) {
  try {
    expr = expr.replace(/π/g, 'Math.PI')
               .replace(/e(?!x)/g, 'Math.E')
               .replace(/Ans/g, `${currentAns}`);
               
    expr = expr.replace(/sin\(/g, isDegree ? 'Math.sin((Math.PI/180)*' : 'Math.sin(');
    expr = expr.replace(/cos\(/g, isDegree ? 'Math.cos((Math.PI/180)*' : 'Math.cos(');
    expr = expr.replace(/tan\(/g, isDegree ? 'Math.tan((Math.PI/180)*' : 'Math.tan(');
    expr = expr.replace(/log\(/g, 'Math.log10(')
               .replace(/ln\(/g, 'Math.log(')
               .replace(/√\(/g, 'Math.sqrt(')
               .replace(/EXP\(/g, 'Math.exp(');
               
    expr = expr.replace(/(\d+(?:\.\d+)?)!/g, 'fact($1)');
    expr = expr.replace(/\^/g, '**');
    
    if (!expr.trim()) return { result: 0, error: null };
    
    const result = (new Function('fact', `return ${expr}`))(fact);
    if (!isFinite(result) || isNaN(result)) throw new Error("Math Error");
    return { result, error: null };
  } catch (err) {
    return { result: null, error: err.message };
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('message', function(event) {
    if (event.data.action === 'setDeg') {
      isDeg = event.data.isDeg;
      return;
    }
    const out = evaluateMath(event.data.expr, isDeg, ans);
    if (out.result !== null) ans = out.result;
    event.source.postMessage(out, event.origin);
  });
}

if (typeof module !== 'undefined') {
  module.exports = { evaluateMath };
}
