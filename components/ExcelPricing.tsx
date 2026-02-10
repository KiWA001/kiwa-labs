'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// Types
type CellData = {
    value: string;
    formula?: string;
    style?: React.CSSProperties;
    locked?: boolean;
};

type GridData = {
    [key: string]: CellData;
};

const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const ROWS = 25;

const INITIAL_DATA: GridData = {
    'A1': { value: 'Website Type', style: { fontWeight: 'bold', backgroundColor: '#e0e0e0' }, locked: true },
    'B1': { value: 'Min Price', style: { fontWeight: 'bold', backgroundColor: '#e0e0e0', textAlign: 'right' }, locked: true },
    'C1': { value: 'Max Price', style: { fontWeight: 'bold', backgroundColor: '#e0e0e0', textAlign: 'right' }, locked: true },

    'A2': { value: 'Small Personal / Info Website', locked: true },
    'B2': { value: '55000', locked: true, style: { textAlign: 'right' } },
    'C2': { value: '130000', locked: true, style: { textAlign: 'right' } },

    'A3': { value: 'Clean Modern Website (Design Only)', locked: true },
    'B3': { value: '100000', locked: true, style: { textAlign: 'right' } },
    'C3': { value: '280000', locked: true, style: { textAlign: 'right' } },

    'A4': { value: 'Business Website (Contact, Forms, Admin)', locked: true },
    'B4': { value: '180000', locked: true, style: { textAlign: 'right' } },
    'C4': { value: '580000', locked: true, style: { textAlign: 'right' } },

    'A5': { value: 'Custom Website with Login & Features', locked: true },
    'B5': { value: '280000', locked: true, style: { textAlign: 'right' } },
    'C5': { value: '1480000', locked: true, style: { textAlign: 'right' } },

    'A6': { value: 'Online Store (Sell Products)', locked: true },
    'B6': { value: '280000', locked: true, style: { textAlign: 'right' } },
    'C6': { value: '730000', locked: true, style: { textAlign: 'right' } },

    'A7': { value: 'Booking Website (Appointments / Rentals)', locked: true },
    'B7': { value: '280000', locked: true, style: { textAlign: 'right' } },
    'C7': { value: '680000', locked: true, style: { textAlign: 'right' } },

    'A8': { value: 'Admin Dashboard / Staff System', locked: true },
    'B8': { value: '230000', locked: true, style: { textAlign: 'right' } },
    'C8': { value: '580000', locked: true, style: { textAlign: 'right' } },

    'A9': { value: 'Delivery / Dispatch Website (Tracking)', locked: true },
    'B9': { value: '380000', locked: true, style: { textAlign: 'right' } },
    'C9': { value: '1180000', locked: true, style: { textAlign: 'right' } },
};

// Spreadsheet Logic Help
const evaluateFormula = (formula: string, data: GridData): string => {
    try {
        if (!formula.startsWith('=')) return formula;

        // Simple parser: replace cell refs with values
        let expression = formula.substring(1).toUpperCase();

        // Replace cell references (e.g., A1, B2) with their numeric values
        expression = expression.replace(/([A-Z][0-9]+)/g, (match) => {
            const cell = data[match];
            const val = cell ? parseFloat(cell.value.replace(/[^0-9.-]+/g, '')) : 0;
            return isNaN(val) ? '0' : val.toString();
        });

        // Sanitize: only allow digits, operators, parens, decimal
        if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
            return "#ERROR";
        }

        // eslint-disable-next-line no-eval
        const result = eval(expression);
        return isNaN(result) ? "#Num!" : result.toString();

    } catch (e) {
        return "#ERROR";
    }
};

type SelectionRange = {
    startCol: number;
    startRow: number;
    endCol: number;
    endRow: number;
};

export default function ExcelPricing() {
    const [data, setData] = useState<GridData>(INITIAL_DATA);

    // Selection State
    const [selection, setSelection] = useState<SelectionRange>({ startCol: 6, startRow: 24, endCol: 6, endRow: 24 });
    const [isDragging, setIsDragging] = useState(false);

    // Editing State
    const [editingCell, setEditingCell] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    // Column Widths
    const [colWidths, setColWidths] = useState<{ [key: string]: number }>({
        'A': 320, // Increased for long names
        'B': 120,
        'C': 120,
        'D': 100,
        'E': 100,
        'F': 100,
        'G': 100
    });

    const [resizingCol, setResizingCol] = useState<string | null>(null);
    const startResizeXRef = useRef<number>(0);
    const startResizeWidthRef = useRef<number>(0);

    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
    const [clipboard, setClipboard] = useState<string | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Helper to get visual cell ID from coords
    const getCellId = (colIdx: number, rowIdx: number) => `${COLS[colIdx]}${rowIdx + 1}`;

    // Helper to get active cell ID (start of selection)
    const activeCellId = getCellId(selection.startCol, selection.startRow);

    // --- Mouse Handlers for Selection ---
    const handleMouseDown = (colIdx: number, rowIdx: number) => {
        if (editingCell) return;
        setIsDragging(true);
        setSelection({
            startCol: colIdx,
            startRow: rowIdx,
            endCol: colIdx,
            endRow: rowIdx
        });
        setContextMenu(null);
    };

    const handleMouseEnter = (colIdx: number, rowIdx: number) => {
        if (isDragging) {
            setSelection(prev => ({
                ...prev,
                endCol: colIdx,
                endRow: rowIdx
            }));
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        // Release resize capture handles
        if (resizingCol) {
            setResizingCol(null);
            document.body.style.cursor = 'default';
            window.removeEventListener('mousemove', handleResizeMouseMove);
            window.removeEventListener('mouseup', handleResizeMouseUp);
        }
    };

    useEffect(() => {
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, [resizingCol]);

    // --- Double Click to Edit ---
    const handleDoubleClick = () => {
        const cellId = activeCellId;
        const cell = data[cellId];
        if (cell?.locked) return;

        setEditingCell(cellId);
        setEditValue(cell?.formula || cell?.value || '');
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const commitEdit = () => {
        if (!editingCell) return;

        const formula = editValue.startsWith('=') ? editValue : undefined;
        const value = formula ? evaluateFormula(formula, data) : editValue;

        setData(prev => ({
            ...prev,
            [editingCell]: {
                ...prev[editingCell],
                value,
                formula
            }
        }));
        setEditingCell(null);
    };

    // --- Column Resizing ---
    const handleResizeMouseDown = (e: React.MouseEvent, col: string) => {
        e.stopPropagation();
        e.preventDefault();
        setResizingCol(col);
        startResizeXRef.current = e.clientX;
        startResizeWidthRef.current = colWidths[col];

        document.body.style.cursor = 'col-resize';
        window.addEventListener('mousemove', handleResizeMouseMove);
        window.addEventListener('mouseup', handleResizeMouseUp);
    };

    const handleResizeMouseMove = useCallback((e: MouseEvent) => {
        if (!resizingCol) return;
        const diff = e.clientX - startResizeXRef.current;
        const newWidth = Math.max(40, startResizeWidthRef.current + diff);
        setColWidths(prev => ({
            ...prev,
            [resizingCol]: newWidth
        }));
    }, [resizingCol]);

    const handleResizeMouseUp = useCallback(() => {
        setResizingCol(null);
        document.body.style.cursor = 'default';
        window.removeEventListener('mousemove', handleResizeMouseMove);
        window.removeEventListener('mouseup', handleResizeMouseUp);
    }, [handleResizeMouseMove]);


    // Right click
    const handleContextMenu = (e: React.MouseEvent, colIdx: number, rowIdx: number) => {
        e.preventDefault();
        // If right clicking outside current selection, reset selection found
        const inSelection = colIdx >= Math.min(selection.startCol, selection.endCol) &&
            colIdx <= Math.max(selection.startCol, selection.endCol) &&
            rowIdx >= Math.min(selection.startRow, selection.endRow) &&
            rowIdx <= Math.max(selection.startRow, selection.endRow);

        if (!inSelection) {
            setSelection({ startCol: colIdx, startRow: rowIdx, endCol: colIdx, endRow: rowIdx });
        }

        setContextMenu({ x: e.clientX, y: e.clientY });
    };

    // Helper to format currency
    const formatValue = (val: string) => {
        const num = parseFloat(val);
        if (!isNaN(num) && num > 1000) {
            return '₦' + num.toLocaleString();
        }
        return val;
    };

    // Keyboard nav
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (editingCell) {
                if (e.key === 'Enter') commitEdit();
                return;
            }

            const { startCol, startRow } = selection;

            if (e.key === 'ArrowRight' && startCol < COLS.length - 1) {
                setSelection(p => ({ ...p, startCol: p.startCol + 1, endCol: p.startCol + 1, startRow: p.startRow, endRow: p.startRow }));
            }
            else if (e.key === 'ArrowLeft' && startCol > 0) {
                setSelection(p => ({ ...p, startCol: p.startCol - 1, endCol: p.startCol - 1, startRow: p.startRow, endRow: p.startRow }));
            }
            else if (e.key === 'ArrowDown' && startRow < ROWS - 1) {
                setSelection(p => ({ ...p, startRow: p.startRow + 1, endRow: p.startRow + 1, startCol: p.startCol, endCol: p.startCol }));
            }
            else if (e.key === 'ArrowUp' && startRow > 0) {
                setSelection(p => ({ ...p, startRow: p.startRow - 1, endRow: p.startRow - 1, startCol: p.startCol, endCol: p.startCol }));
            }
            else if (e.key === 'Enter') {
                handleDoubleClick();
                e.preventDefault();
            }
            else if (e.key === 'Backspace' || e.key === 'Delete') {
                // Clear all selected editable cells
                const minCol = Math.min(selection.startCol, selection.endCol);
                const maxCol = Math.max(selection.startCol, selection.endCol);
                const minRow = Math.min(selection.startRow, selection.endRow);
                const maxRow = Math.max(selection.startRow, selection.endRow);

                setData(prev => {
                    const newData = { ...prev };
                    for (let c = minCol; c <= maxCol; c++) {
                        for (let r = minRow; r <= maxRow; r++) {
                            const id = getCellId(c, r);
                            if (!prev[id]?.locked) {
                                delete newData[id];
                            }
                        }
                    }
                    return newData;
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selection, editingCell, data, editValue]);

    // --- Render Helpers ---

    // Check if cell is in selection range
    const isCellSelected = (c: number, r: number) => {
        const minCol = Math.min(selection.startCol, selection.endCol);
        const maxCol = Math.max(selection.startCol, selection.endCol);
        const minRow = Math.min(selection.startRow, selection.endRow);
        const maxRow = Math.max(selection.startRow, selection.endRow);
        return c >= minCol && c <= maxCol && r >= minRow && r <= maxRow;
    };

    // Calculate grid template columns string
    const gridTemplateCols = `50px ${COLS.map(c => `${colWidths[c]}px`).join(' ')}`;

    return (
        <div
            ref={containerRef}
            className="excel-container"
            style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '650px',
                backgroundColor: '#fff',
                border: '1px solid #dcdcdc',
                fontFamily: "'Segoe UI', 'Helvetica Neue', sans-serif",
                fontSize: '13px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                userSelect: 'none'
            }}
            onClick={() => setContextMenu(null)}
        >
            {/* 2. Formula Bar (Minimal) */}
            <div style={{
                display: 'flex',
                padding: '6px',
                borderBottom: '1px solid #e1e1e1',
                alignItems: 'center',
                backgroundColor: '#f8f9fa'
            }}>
                <div style={{
                    width: '40px',
                    borderRight: '1px solid #ccc',
                    textAlign: 'center',
                    color: '#666',
                    fontSize: '11px',
                    marginRight: '10px'
                }}>
                    {activeCellId}
                </div>
                <div style={{ padding: '0 8px', color: '#999', fontSize: '12px', fontStyle: 'italic' }}>fx</div>
                <input
                    value={editingCell ? editValue : (data[activeCellId || '']?.formula || data[activeCellId || '']?.value || '')}
                    readOnly={!editingCell}
                    onChange={(e) => setEditValue(e.target.value)}
                    style={{
                        flex: 1,
                        border: '1px solid #e1e1e1',
                        borderRadius: '2px',
                        outline: 'none',
                        fontSize: '13px',
                        padding: '4px 8px',
                        backgroundColor: 'white'
                    }}
                />
            </div>

            {/* 3. Grid Area */}
            <div style={{ flex: 1, overflow: 'auto', position: 'relative', backgroundColor: '#f3f3f3' }}>
                <div style={{ display: 'grid', gridTemplateColumns: gridTemplateCols }}>
                    {/* Corner Header */}
                    <div style={{
                        backgroundColor: '#f8f9fa',
                        borderRight: '1px solid #c7c7c7',
                        borderBottom: '1px solid #c7c7c7',
                        position: 'sticky', top: 0, left: 0, zIndex: 10
                    }} />

                    {/* Column Headers */}
                    {COLS.map((col, idx) => (
                        <div key={col} style={{
                            backgroundColor: '#f8f9fa',
                            textAlign: 'center',
                            borderRight: '1px solid #c7c7c7',
                            borderBottom: '1px solid #c7c7c7',
                            padding: '8px 0',
                            fontWeight: 600,
                            color: '#444',
                            position: 'sticky', top: 0, zIndex: 5,
                            width: colWidths[col],
                            userSelect: 'none'
                        }}>
                            {col}
                            {/* Resize Handle */}
                            <div
                                onMouseDown={(e) => handleResizeMouseDown(e, col)}
                                style={{
                                    position: 'absolute', right: 0, top: 0, bottom: 0, width: '4px',
                                    cursor: 'col-resize', zIndex: 10
                                }}
                            />
                        </div>
                    ))}

                    {/* Rows */}
                    {Array.from({ length: ROWS }).map((_, r) => {
                        const rowNum = r + 1;
                        return (
                            <React.Fragment key={rowNum}>
                                {/* Row Number Header */}
                                <div style={{
                                    backgroundColor: '#f8f9fa',
                                    textAlign: 'center',
                                    borderRight: '1px solid #c7c7c7',
                                    borderBottom: '1px solid #dcdcdc',
                                    padding: '6px 0',
                                    color: '#666',
                                    position: 'sticky', left: 0, zIndex: 5,
                                    userSelect: 'none'
                                }}>
                                    {rowNum}
                                </div>

                                {/* Cells */}
                                {COLS.map((col, colIdx) => {
                                    const cellId = getCellId(colIdx, r);
                                    const cell = data[cellId];
                                    const selected = isCellSelected(colIdx, r);
                                    const isEditing = editingCell === cellId;
                                    const isActive = activeCellId === cellId;

                                    // Define borders based on selection to create the "outline" effect around the range
                                    // This is simplified; true excel draws a border around the whole group
                                    // For valid visual, we highlight background of all, and thick border around active

                                    return (
                                        <div
                                            key={cellId}
                                            onMouseDown={(e) => { e.preventDefault(); handleMouseDown(colIdx, r); }}
                                            onMouseEnter={() => handleMouseEnter(colIdx, r)}
                                            // onDoubleClick handled via keyboard or distinct event if needed
                                            onDoubleClick={handleDoubleClick}
                                            onContextMenu={(e) => handleContextMenu(e, colIdx, r)}
                                            style={{
                                                borderRight: '1px solid #e1e1e1',
                                                borderBottom: '1px solid #e1e1e1',
                                                position: 'relative',
                                                backgroundColor: isEditing ? 'white' : (selected ? 'rgba(33, 115, 70, 0.1)' : (cell?.style?.backgroundColor || 'white')),
                                                ...cell?.style, // Specific styles overrides

                                                // Active cell gets the thick border
                                                outline: isActive ? '2px solid #217346' : 'none',
                                                outlineOffset: '-2px',
                                                zIndex: isActive ? 2 : 1,

                                                cursor: 'cell',
                                                padding: '0 6px',
                                                display: 'flex', alignItems: 'center',
                                                overflow: 'hidden', whiteSpace: 'nowrap',
                                                height: '32px', // fixed row height
                                                color: '#000'
                                            }}
                                        >
                                            {isEditing ? (
                                                <input
                                                    ref={inputRef}
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={commitEdit}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') commitEdit();
                                                    }}
                                                    style={{
                                                        width: '100%', height: '100%',
                                                        border: 'none', outline: 'none',
                                                        background: 'white',
                                                        font: 'inherit', margin: 0, padding: 0
                                                    }}
                                                />
                                            ) : (
                                                <span style={{ width: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {formatValue(cell?.value || '')}
                                                </span>
                                            )}

                                            {/* Fill handle only on active cell if it is also the range end? Simplified: show on active */}
                                            {isActive && !isEditing && (
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: '-4px', right: '-4px',
                                                    width: '7px', height: '7px',
                                                    backgroundColor: '#217346',
                                                    border: '1px solid white',
                                                    cursor: 'crosshair',
                                                    zIndex: 3
                                                }} />
                                            )}
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Sheet Tabs */}
            <div style={{
                backgroundColor: '#f8f9fa',
                borderTop: '1px solid #dcdcdc',
                padding: '0',
                display: 'flex', alignItems: 'center',
                height: '34px'
            }}>
                <div style={{ display: 'flex', height: '100%' }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '0 20px',
                        borderBottom: '3px solid #217346',
                        color: '#217346',
                        fontWeight: 600,
                        fontSize: '13px',
                        display: 'flex', alignItems: 'center',
                        borderRight: '1px solid #e1e1e1'
                    }}>
                        Pricing
                    </div>
                    <div style={{
                        padding: '0 15px', color: '#666', fontSize: '16px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        +
                    </div>
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div style={{
                    position: 'fixed',
                    top: contextMenu.y, left: contextMenu.x,
                    backgroundColor: 'white',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    border: '1px solid #dcdcdc',
                    borderRadius: '4px',
                    zIndex: 1000,
                    display: 'flex', flexDirection: 'column',
                    padding: '6px 0',
                    minWidth: '160px'
                }}>
                    <button
                        onClick={() => {
                            if (activeCellId && data[activeCellId]) setClipboard(data[activeCellId].value);
                            setContextMenu(null);
                        }}
                        style={{ padding: '8px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f1f1'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        Copy
                    </button>
                    <button
                        onClick={() => {
                            if (activeCellId && clipboard && !data[activeCellId]?.locked) {
                                setData(prev => ({
                                    ...prev,
                                    [activeCellId]: { ...prev[activeCellId], value: clipboard }
                                }));
                            }
                            setContextMenu(null);
                        }}
                        style={{
                            padding: '8px 16px', textAlign: 'left', background: 'none', border: 'none',
                            cursor: (!activeCellId || data[activeCellId]?.locked) ? 'not-allowed' : 'pointer',
                            fontSize: '13px',
                            color: (!activeCellId || data[activeCellId]?.locked) ? '#ccc' : 'inherit'
                        }}
                        onMouseEnter={(e) => (!activeCellId || data[activeCellId]?.locked) ? {} : e.currentTarget.style.backgroundColor = '#f1f1f1'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        Paste
                    </button>
                    <div style={{ height: '1px', backgroundColor: '#e1e1e1', margin: '4px 0' }} />
                    <button
                        onClick={() => {
                            // Clear selection
                            const minCol = Math.min(selection.startCol, selection.endCol);
                            const maxCol = Math.max(selection.startCol, selection.endCol);
                            const minRow = Math.min(selection.startRow, selection.endRow);
                            const maxRow = Math.max(selection.startRow, selection.endRow);

                            setData(prev => {
                                const newData = { ...prev };
                                for (let c = minCol; c <= maxCol; c++) {
                                    for (let r = minRow; r <= maxRow; r++) {
                                        const id = getCellId(c, r);
                                        if (!prev[id]?.locked) {
                                            delete newData[id];
                                        }
                                    }
                                }
                                return newData;
                            });
                            setContextMenu(null);
                        }}
                        style={{
                            padding: '8px 16px', textAlign: 'left', background: 'none', border: 'none',
                            cursor: 'pointer',
                            fontSize: '13px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f1f1'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        Clear Contents
                    </button>
                </div>
            )}
        </div>
    );
}
