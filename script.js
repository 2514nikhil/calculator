/**
 * AuraCalc - Calculator JavaScript Engine
 * Features: safe parser, keyboard listener, history storage, theme toggler
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const expressionDisplay = document.getElementById('expression-display');
    const inputDisplay = document.getElementById('input-display');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const historyToggleBtn = document.getElementById('history-toggle');
    const historyCloseBtn = document.getElementById('history-close');
    const historyDrawer = document.getElementById('history-drawer');
    const historyContent = document.getElementById('history-content');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const emptyHistoryMessage = document.getElementById('empty-history-message');
    const keypad = document.getElementById('calc-keypad');

    // Calculator State
    let currentInput = '0';
    let expressionString = '';
    let isResetOnNextNumber = false;
    let calculationHistory = JSON.parse(localStorage.getItem('auraCalcHistory')) || [];

    // Initialize UI
    updateDisplay();
    renderHistory();
    initializeTheme();

    /* ==========================================================================
       Display Updates and Formatting
       ========================================================================== */

    function updateDisplay() {
        // Format current input for numbers, but keep string intact if it's an error message
        if (currentInput === 'Error' || currentInput === 'Cannot divide by 0') {
            inputDisplay.textContent = currentInput;
            inputDisplay.style.fontSize = '2.2rem'; // Shrink font slightly for error message
        } else {
            inputDisplay.textContent = formatNumberForDisplay(currentInput);
            
            // Dynamic Font Resizing based on length to prevent layout breakage
            const length = inputDisplay.textContent.length;
            if (length > 14) {
                inputDisplay.style.fontSize = '1.7rem';
            } else if (length > 10) {
                inputDisplay.style.fontSize = '2.2rem';
            } else {
                inputDisplay.style.fontSize = '2.85rem';
            }
        }
        
        // Render expression with visual characters
        expressionDisplay.textContent = expressionString
            .replace(/\*/g, ' × ')
            .replace(/\//g, ' ÷ ')
            .replace(/\-/g, ' − ')
            .replace(/\+/g, ' + ');

        // Scroll displays to the right to keep recent input visible
        expressionDisplay.scrollLeft = expressionDisplay.scrollWidth;
        inputDisplay.scrollLeft = inputDisplay.scrollWidth;
    }

    function formatNumberForDisplay(numberStr) {
        if (!numberStr) return '0';
        if (numberStr === '-') return '-';
        
        const parts = numberStr.split('.');
        let integerPart = parts[0];
        const decimalPart = parts.length > 1 ? parts[1] : null;
        
        const isNegative = integerPart.startsWith('-');
        if (isNegative) {
            integerPart = integerPart.slice(1);
        }
        
        let formattedInteger = '0';
        if (integerPart !== '') {
            // Use standard locale string for commas
            formattedInteger = parseInt(integerPart, 10).toLocaleString('en-US');
        } else if (isNegative) {
            formattedInteger = '0';
        }
        
        const sign = isNegative ? '-' : '';
        if (parts.length > 1) {
            return decimalPart !== null ? `${sign}${formattedInteger}.${decimalPart}` : `${sign}${formattedInteger}.`;
        }
        return `${sign}${formattedInteger}`;
    }

    /* ==========================================================================
       Calculator Interaction Logic
       ========================================================================== */

    keypad.addEventListener('click', (e) => {
        const button = e.target.closest('.btn');
        if (!button) return;

        const action = button.dataset.action;
        const value = button.dataset.value;

        handleAction(action, value);
        
        // Visual trigger for active class (helps standardise feel with keyboard triggers)
        button.classList.add('keyboard-active');
        setTimeout(() => button.classList.remove('keyboard-active'), 120);
    });

    function handleAction(action, value) {
        if (value !== undefined) {
            // It's a number or a decimal point
            handleNumber(value);
        } else if (action !== undefined) {
            // It's a special function key
            switch (action) {
                case 'clear':
                    clearAll();
                    break;
                case 'backspace':
                    handleBackspace();
                    break;
                case 'percent':
                    handlePercent();
                    break;
                case 'toggle-sign':
                    handleToggleSign();
                    break;
                case 'add':
                case 'subtract':
                case 'multiply':
                case 'divide':
                    handleOperator(action);
                    break;
                case 'equals':
                    evaluateExpression();
                    break;
            }
        }
        updateDisplay();
    }

    function handleNumber(num) {
        if (isResetOnNextNumber) {
            currentInput = '';
            isResetOnNextNumber = false;
        }

        // Avoid multiple decimal points
        if (num === '.' && currentInput.includes('.')) return;

        // Leading zero handling
        if (currentInput === '0' && num !== '.') {
            currentInput = num;
        } else {
            // Cap entry size to avoid overflow (max 16 digits)
            const digitsOnly = currentInput.replace(/[^0-9]/g, '');
            if (digitsOnly.length >= 16 && num !== '.') return;
            currentInput += num;
        }
    }

    function clearAll() {
        currentInput = '0';
        expressionString = '';
        isResetOnNextNumber = false;
    }

    function handleBackspace() {
        if (isResetOnNextNumber) {
            expressionString = '';
            isResetOnNextNumber = false;
            return;
        }
        
        if (currentInput === 'Error' || currentInput === 'Cannot divide by 0') {
            currentInput = '0';
            return;
        }

        if (currentInput.length > 1) {
            currentInput = currentInput.slice(0, -1);
            if (currentInput === '-') {
                currentInput = '0';
            }
        } else {
            currentInput = '0';
        }
    }

    function handlePercent() {
        if (currentInput === 'Error' || currentInput === 'Cannot divide by 0') return;
        
        const numVal = parseFloat(currentInput);
        if (!isNaN(numVal)) {
            // Direct division by 100
            currentInput = (numVal / 100).toString();
        }
    }

    function handleToggleSign() {
        if (currentInput === '0' || currentInput === 'Error' || currentInput === 'Cannot divide by 0') return;
        
        if (currentInput.startsWith('-')) {
            currentInput = currentInput.slice(1);
        } else {
            currentInput = '-' + currentInput;
        }
    }

    function handleOperator(opType) {
        let opSymbol = '';
        switch (opType) {
            case 'add': opSymbol = '+'; break;
            case 'subtract': opSymbol = '-'; break;
            case 'multiply': opSymbol = '*'; break;
            case 'divide': opSymbol = '/'; break;
        }

        if (currentInput === 'Error' || currentInput === 'Cannot divide by 0') return;

        // If equation just completed, start new equation using the previous result
        if (isResetOnNextNumber) {
            expressionString = currentInput + opSymbol;
            isResetOnNextNumber = false;
            currentInput = '0';
            return;
        }

        // If user typed a number, append it to expression along with the operator
        if (currentInput !== '') {
            // Trim decimal point if it stands alone at the end
            let cleanInput = currentInput;
            if (cleanInput.endsWith('.')) {
                cleanInput = cleanInput.slice(0, -1);
            }
            
            // Format negative numbers in parentheses for clarity in the expression view
            if (parseFloat(cleanInput) < 0) {
                expressionString += `(${cleanInput})${opSymbol}`;
            } else {
                expressionString += `${cleanInput}${opSymbol}`;
            }
            
            currentInput = '0';
        } else if (expressionString !== '') {
            // If user clicks another operator without typing a number, swap the operator
            const lastChar = expressionString.slice(-1);
            if (/[\+\-\*\/]/.test(lastChar)) {
                expressionString = expressionString.slice(0, -1) + opSymbol;
            }
        }
    }

    function evaluateExpression() {
        if (expressionString === '' && isResetOnNextNumber) return; // Already evaluated

        let finalExpr = expressionString;
        
        if (currentInput !== '') {
            let cleanInput = currentInput;
            if (cleanInput.endsWith('.')) {
                cleanInput = cleanInput.slice(0, -1);
            }
            if (parseFloat(cleanInput) < 0) {
                finalExpr += `(${cleanInput})`;
            } else {
                finalExpr += cleanInput;
            }
        } else {
            // If it ends with an operator, strip it
            if (/[\+\-\*\/]$/.test(finalExpr)) {
                finalExpr = finalExpr.slice(0, -1);
            }
        }

        if (finalExpr === '') return;

        try {
            const rawResult = parseAndEvaluate(finalExpr);
            const formattedResult = formatMathResult(rawResult);

            // Save calculation to state displays
            expressionString = finalExpr + ' =';
            currentInput = formattedResult;
            isResetOnNextNumber = true;

            // Log to History
            addHistoryItem(finalExpr, formattedResult);
        } catch (err) {
            currentInput = err.message === 'Divide by Zero' ? 'Cannot divide by 0' : 'Error';
            isResetOnNextNumber = true;
        }
    }

    /* ==========================================================================
       Safe Arithmetic Parser (Non-eval)
       ========================================================================== */

    function parseAndEvaluate(expr) {
        // 1. Clean expression: strip parenthesis around negative numbers for easy tokenizing
        // e.g. "15+(-3)" becomes "15+-3"
        let cleanExpr = expr.replace(/\((-[0-9.]+)\)/g, '$1');
        
        // 2. Tokenize into operators and float values
        const tokens = [];
        let numBuffer = '';

        for (let i = 0; i < cleanExpr.length; i++) {
            const char = cleanExpr[i];

            if (/[0-9.]/.test(char)) {
                numBuffer += char;
            } else if (/[\+\-\*\/]/.test(char)) {
                // Check if '-' is a negative sign.
                // It is a sign if we encounter '-' and our number buffer is empty
                if (char === '-' && numBuffer === '') {
                    numBuffer += char;
                } else {
                    if (numBuffer) {
                        tokens.push(parseFloat(numBuffer));
                        numBuffer = '';
                    }
                    tokens.push(char);
                }
            }
        }

        if (numBuffer) {
            tokens.push(parseFloat(numBuffer));
        }

        if (tokens.length === 0) return 0;

        // 3. Double-Stack Shunting-yard Evaluation
        const values = [];
        const ops = [];
        
        const precedence = {
            '+': 1,
            '-': 1,
            '*': 2,
            '/': 2
        };

        const applyTopOp = () => {
            const op = ops.pop();
            const val2 = values.pop();
            const val1 = values.pop();
            
            if (val1 === undefined || val2 === undefined) {
                throw new Error("Syntax Error");
            }

            switch (op) {
                case '+': values.push(val1 + val2); break;
                case '-': values.push(val1 - val2); break;
                case '*': values.push(val1 * val2); break;
                case '/': 
                    if (val2 === 0) {
                        throw new Error("Divide by Zero");
                    }
                    values.push(val1 / val2); 
                    break;
            }
        };

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];

            if (typeof token === 'number') {
                values.push(token);
            } else {
                while (ops.length > 0 && precedence[ops[ops.length - 1]] >= precedence[token]) {
                    applyTopOp();
                }
                ops.push(token);
            }
        }

        while (ops.length > 0) {
            applyTopOp();
        }

        if (values.length !== 1) {
            throw new Error("Syntax Error");
        }

        return values[0];
    }

    function formatMathResult(value) {
        if (isNaN(value)) return 'Error';
        if (!isFinite(value)) return 'Error';

        // Fix precision issues (e.g. 0.1 + 0.2)
        const rounded = Math.round(value * 1e12) / 1e12;
        
        // Convert to string and manage size
        let str = rounded.toString();
        
        // If it's scientific notation, let it be
        if (str.includes('e')) return str;
        
        // If integer is too long, show scientific notation
        if (Math.abs(rounded) >= 1e15) {
            return rounded.toExponential(10);
        }
        
        return str;
    }

    /* ==========================================================================
       History Logic & Local Storage
       ========================================================================== */

    function addHistoryItem(expr, res) {
        // Prevent adding errors to history
        if (res === 'Error' || res === 'Cannot divide by 0') return;

        // Clean display chars for saving
        const readableExpr = expr
            .replace(/\*/g, ' × ')
            .replace(/\//g, ' ÷ ')
            .replace(/\-/g, ' − ')
            .replace(/\+/g, ' + ');

        calculationHistory.unshift({
            expression: readableExpr,
            result: res
        });

        // Cap history to 50 items
        if (calculationHistory.length > 50) {
            calculationHistory.pop();
        }

        localStorage.setItem('auraCalcHistory', JSON.stringify(calculationHistory));
        renderHistory();
    }

    function renderHistory() {
        // Clear old list
        // Keep header and footer, only remove/re-render the items
        const historyItems = historyContent.querySelectorAll('.history-item');
        historyItems.forEach(el => el.remove());

        if (calculationHistory.length === 0) {
            emptyHistoryMessage.style.display = 'flex';
            clearHistoryBtn.style.display = 'none';
            return;
        }

        emptyHistoryMessage.style.display = 'none';
        clearHistoryBtn.style.display = 'flex';

        calculationHistory.forEach((item, index) => {
            const itemEl = document.createElement('div');
            itemEl.classList.add('history-item');
            itemEl.setAttribute('role', 'button');
            itemEl.setAttribute('tabindex', '0');
            itemEl.dataset.index = index;

            itemEl.innerHTML = `
                <div class="history-item-expression">${item.expression}</div>
                <div class="history-item-result">${formatNumberForDisplay(item.result)}</div>
            `;

            // Load history item back to displays on click
            itemEl.addEventListener('click', () => {
                // Remove '=' if it exists
                let expr = item.expression
                    .replace(/ × /g, '*')
                    .replace(/ ÷ /g, '/')
                    .replace(/ − /g, '-')
                    .replace(/ \+ /g, '+');
                
                expressionString = expr + ' =';
                currentInput = item.result;
                isResetOnNextNumber = true;
                updateDisplay();
                
                // Close history on mobile for better accessibility
                if (window.innerWidth <= 768) {
                    toggleHistory(false);
                }
            });

            // Enter key accessibility
            itemEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    itemEl.click();
                }
            });

            historyContent.appendChild(itemEl);
        });
    }

    clearHistoryBtn.addEventListener('click', () => {
        calculationHistory = [];
        localStorage.removeItem('auraCalcHistory');
        renderHistory();
    });

    /* ==========================================================================
       Drawer & Theme Switches UI
       ========================================================================== */

    function toggleHistory(open) {
        const isOpen = open !== undefined ? open : historyDrawer.getAttribute('aria-hidden') === 'true';
        
        if (isOpen) {
            historyDrawer.setAttribute('aria-hidden', 'false');
            historyToggleBtn.setAttribute('aria-expanded', 'true');
            historyToggleBtn.classList.add('active');
        } else {
            historyDrawer.setAttribute('aria-hidden', 'true');
            historyToggleBtn.setAttribute('aria-expanded', 'false');
            historyToggleBtn.classList.remove('active');
        }
    }

    historyToggleBtn.addEventListener('click', () => toggleHistory());
    historyCloseBtn.addEventListener('click', () => toggleHistory(false));

    // Theme Switch
    function initializeTheme() {
        const savedTheme = localStorage.getItem('auraCalcTheme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('auraCalcTheme', newTheme);
        updateThemeIcon(newTheme);
    }

    function updateThemeIcon(theme) {
        const icon = themeToggleBtn.querySelector('i');
        if (theme === 'dark') {
            icon.className = 'fa-solid fa-sun';
            themeToggleBtn.title = 'Switch to Light Mode';
        } else {
            icon.className = 'fa-solid fa-moon';
            themeToggleBtn.title = 'Switch to Dark Mode';
        }
    }

    themeToggleBtn.addEventListener('click', toggleTheme);

    /* ==========================================================================
       Keyboard Listeners
       ========================================================================== */

    document.addEventListener('keydown', (e) => {
        // Prevent key triggers if active element is an input fields (none currently, but standard practice)
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
            return;
        }

        let key = e.key;
        let btnId = '';

        // Map keys to action
        if (/[0-9]/.test(key)) {
            handleAction(undefined, key);
            btnId = `key-${key}`;
        } else {
            switch (key) {
                case '.':
                case ',':
                    handleAction(undefined, '.');
                    btnId = 'key-decimal';
                    break;
                case '+':
                    handleAction('add');
                    btnId = 'key-add';
                    break;
                case '-':
                    handleAction('subtract');
                    btnId = 'key-subtract';
                    break;
                case '*':
                case 'x':
                case 'X':
                    handleAction('multiply');
                    btnId = 'key-multiply';
                    break;
                case '/':
                    e.preventDefault(); // Prevent opening browser search in some browsers
                    handleAction('divide');
                    btnId = 'key-divide';
                    break;
                case '%':
                    handleAction('percent');
                    btnId = 'key-percent';
                    break;
                case 'Enter':
                case '=':
                    e.preventDefault();
                    handleAction('equals');
                    btnId = 'key-equals';
                    break;
                case 'Backspace':
                    handleAction('backspace');
                    btnId = 'key-backspace';
                    break;
                case 'Escape':
                case 'c':
                case 'C':
                    handleAction('clear');
                    btnId = 'key-clear';
                    break;
                case 's':
                case 'S':
                    handleAction('toggle-sign');
                    btnId = 'key-toggle-sign';
                    break;
                case 'h':
                case 'H':
                    toggleHistory();
                    btnId = 'history-toggle';
                    break;
            }
        }

        // Trigger active UI styling on matching key button
        if (btnId) {
            const btnEl = document.getElementById(btnId);
            if (btnEl) {
                btnEl.classList.add('keyboard-active');
                setTimeout(() => btnEl.classList.remove('keyboard-active'), 120);
            }
        }
    });
});
