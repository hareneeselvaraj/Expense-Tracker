import { useState, useRef } from 'react';
import { FiCalculate, FiX, FiRotateCcw } from 'react-icons/fi';

export default function FloatingCalculator() {
    const [isOpen, setIsOpen] = useState(false);
    const [display, setDisplay] = useState('0');
    const [previousValue, setPreviousValue] = useState(null);
    const [operation, setOperation] = useState(null);
    const [waitingForNewValue, setWaitingForNewValue] = useState(false);
    const [position, setPosition] = useState({ x: 20, y: 80 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const floatingBtnRef = useRef(null);

    const handleMouseDown = (e) => {
        if (e.target.closest('button') || e.target.closest('[role="button"]')) return;
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragOffset.x,
            y: e.clientY - dragOffset.y,
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleNumber = (num) => {
        if (waitingForNewValue) {
            setDisplay(String(num));
            setWaitingForNewValue(false);
        } else {
            setDisplay(display === '0' ? String(num) : display + num);
        }
    };

    const handleDecimal = () => {
        if (waitingForNewValue) {
            setDisplay('0.');
            setWaitingForNewValue(false);
        } else if (!display.includes('.')) {
            setDisplay(display + '.');
        }
    };

    const handleOperation = (op) => {
        const inputValue = parseFloat(display);

        if (previousValue === null) {
            setPreviousValue(inputValue);
        } else if (operation) {
            const result = performCalculation(previousValue, inputValue, operation);
            setDisplay(String(result));
            setPreviousValue(result);
        }

        setOperation(op);
        setWaitingForNewValue(true);
    };

    const performCalculation = (prev, current, op) => {
        switch (op) {
            case '+':
                return prev + current;
            case '-':
                return prev - current;
            case '*':
                return prev * current;
            case '/':
                return current === 0 ? 0 : prev / current;
            case '%':
                return prev % current;
            default:
                return current;
        }
    };

    const handleEquals = () => {
        if (operation && previousValue !== null) {
            const inputValue = parseFloat(display);
            const result = performCalculation(previousValue, inputValue, operation);
            setDisplay(String(result));
            setPreviousValue(null);
            setOperation(null);
            setWaitingForNewValue(true);
        }
    };

    const handleClear = () => {
        setDisplay('0');
        setPreviousValue(null);
        setOperation(null);
        setWaitingForNewValue(false);
    };

    const handleBackspace = () => {
        if (display.length === 1) {
            setDisplay('0');
        } else {
            setDisplay(display.slice(0, -1));
        }
    };

    const buttons = [
        ['7', '8', '9', '/'],
        ['4', '5', '6', '*'],
        ['1', '2', '3', '-'],
        ['0', '.', '=', '+'],
    ];

    return (
        <div
            ref={floatingBtnRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
                position: 'fixed',
                left: `${position.x}px`,
                top: `${position.y}px`,
                zIndex: 9999,
                cursor: isDragging ? 'grabbing' : 'grab',
            }}
        >
            {!isOpen ? (
                <button
                    className="floating-calc-btn"
                    onClick={() => setIsOpen(true)}
                    onMouseDown={handleMouseDown}
                    title="Open Calculator"
                >
                    <FiCalculate size={24} />
                </button>
            ) : (
                <div className="floating-calc-panel" onMouseDown={handleMouseDown}>
                    <div className="calc-header">
                        <h4>Calculator</h4>
                        <button
                            className="calc-close-btn"
                            onClick={() => setIsOpen(false)}
                            title="Close"
                        >
                            <FiX size={18} />
                        </button>
                    </div>

                    <div className="calc-display">{display}</div>

                    <div className="calc-buttons">
                        {buttons.map((row, i) => (
                            <div key={i} className="calc-row">
                                {row.map((btn) => (
                                    <button
                                        key={btn}
                                        className={`calc-btn ${
                                            btn === '='
                                                ? 'calc-equals'
                                                : '+-*/%'.includes(btn)
                                                ? 'calc-operator'
                                                : ''
                                        }`}
                                        onClick={() => {
                                            if (btn === '=') handleEquals();
                                            else if ('+-*/%'.includes(btn)) handleOperation(btn);
                                            else if (btn === '.') handleDecimal();
                                            else handleNumber(btn);
                                        }}
                                    >
                                        {btn}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>

                    <div className="calc-footer">
                        <button
                            className="calc-btn-small"
                            onClick={handleBackspace}
                            title="Backspace"
                        >
                            DEL
                        </button>
                        <button
                            className="calc-btn-small"
                            onClick={handleClear}
                            title="Clear"
                        >
                            <FiRotateCcw size={16} /> C
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
