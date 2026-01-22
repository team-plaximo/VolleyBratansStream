# Builder Proposal: Plaximo Calculator

## Pragmatische Implementierung

### Schnellster Weg
- **Eine Datei**: `calculator.html` mit eingebettetem CSS/JS
- Sofort lauffähig ohne Build-Tools
- Unter 200 Zeilen Code

### CSS Highlights
```css
.calculator {
  background: linear-gradient(135deg, #0f172a, #1e293b);
  padding: 2rem;
  border-radius: 1rem;
}

.btn-number {
  background: rgba(20, 184, 166, 0.1);
  border: 1px solid rgba(20, 184, 166, 0.3);
  color: #14B8A6;
}

.btn-operator {
  background: #14B8A6;
  color: white;
}
```

### JS Core Logic
```javascript
let currentInput = '0';
let previousInput = '';
let operator = null;

function calculate(a, b, op) {
  switch(op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b !== 0 ? a / b : 'Error';
  }
}
```

### Priorität: Speed to Market

**Vote**: Eingebettete Lösung für schnellstes Deployment.
