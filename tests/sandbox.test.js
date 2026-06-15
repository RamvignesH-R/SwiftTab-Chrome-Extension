const { evaluateMath } = require('../extension/sandbox/sandbox.js');

describe('Calculator Sandbox Evaluator Tests', () => {
  test('Basic Arithmetic', () => {
    expect(evaluateMath('2+3').result).toBe(5);
    expect(evaluateMath('10-4').result).toBe(6);
    expect(evaluateMath('3*4').result).toBe(12);
    expect(evaluateMath('10/2').result).toBe(5);
  });

  test('Factorial', () => {
    expect(evaluateMath('5!').result).toBe(120);
    expect(evaluateMath('0!').result).toBe(1);
  });

  test('Trigonometry (Degree Mode)', () => {
    expect(evaluateMath('sin(90)', true).result).toBeCloseTo(1, 5);
    expect(evaluateMath('cos(180)', true).result).toBeCloseTo(-1, 5);
  });

  test('Trigonometry (Radian Mode)', () => {
    expect(evaluateMath('sin(π/2)', false).result).toBeCloseTo(1, 5);
    expect(evaluateMath('cos(π)', false).result).toBeCloseTo(-1, 5);
  });

  test('Exponents & Logarithms', () => {
    expect(evaluateMath('2^3').result).toBe(8);
    expect(evaluateMath('log(100)').result).toBe(2); // log10
    expect(evaluateMath('ln(e)').result).toBeCloseTo(1, 5);
  });

  test('Constants', () => {
    expect(evaluateMath('π').result).toBe(Math.PI);
    expect(evaluateMath('e').result).toBe(Math.E);
  });

  test('Error Handling (Invalid Math)', () => {
    // 1/0 is Infinity, which our sandbox blocks
    expect(evaluateMath('1/0').error).toBe('Math Error');
    // Malformed expressions
    expect(evaluateMath('2+*3').error).not.toBeNull();
  });
});
