/**
 * Template Editor Controller using Fabric.js (Offline)
 * Handles visual drag-and-drop field positioning on the certificate background.
 */

const TemplateEditor = (() => {
    let canvas = null;
    let bgWidth = 1920;
    let bgHeight = 1080;
    let displayScale = 1.0;

    const FIELD_PRESETS = {
        name: { label: '[ Recipient Name ]', type: 'name', fontSize: 42, fontFamily: 'Georgia', fontWeight: 'bold', align: 'center', color: '#1e293b' },
        description: { label: '[ Certificate Description ]', type: 'description', fontSize: 18, fontFamily: 'Georgia', fontWeight: 'normal', align: 'center', color: '#334155' },
        date: { label: '[ Date ]', type: 'date', fontSize: 18, fontFamily: 'Arial', fontWeight: 'bold', align: 'center', color: '#1e293b' },
        qr: { label: '[ QR Code ]', type: 'qr', size: 100, color: '#0f172a' },
        verification_id: { label: '[ Verification ID ]', type: 'verification_id', fontSize: 14, fontFamily: 'Arial', fontWeight: 'normal', align: 'center', color: '#64748b' },
        custom: { label: '[ Custom Text ]', type: 'custom', fontSize: 20, fontFamily: 'Arial', fontWeight: 'normal', align: 'center', color: '#0f172a' }
    };

    /**
     * Initialize Fabric Canvas with Background Image
     */
    const init = (canvasId, bgDataUrl, width, height) => {
        bgWidth = width;
        bgHeight = height;

        // Calculate responsive display scaling so editor fits nicely on screen
        const maxDisplayWidth = Math.min(window.innerWidth - 400, 1000);
        displayScale = maxDisplayWidth < bgWidth ? maxDisplayWidth / bgWidth : 1.0;

        const containerWidth = bgWidth * displayScale;
        const containerHeight = bgHeight * displayScale;

        if (canvas) {
            canvas.dispose();
        }

        canvas = new fabric.Canvas(canvasId, {
            width: containerWidth,
            height: containerHeight,
            selection: true
        });

        // Set Background Image
        fabric.Image.fromURL(bgDataUrl, (img) => {
            img.set({
                scaleX: displayScale,
                scaleY: displayScale,
                selectable: false,
                evented: false
            });
            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
        });

        // Selection event listener to update property panel
        canvas.on('selection:created', onObjectSelected);
        canvas.on('selection:updated', onObjectSelected);
        canvas.on('selection:cleared', onObjectSelectionCleared);
        canvas.on('object:moving', onObjectModified);
        canvas.on('object:scaling', onObjectModified);

        return canvas;
    };

    // Add field to canvas
    const addField = (fieldType, customOptions = {}) => {
        if (!canvas) return;

        // Check if field type already exists (except custom)
        if (fieldType !== 'custom') {
            const existing = canvas.getObjects().find(o => o.fieldType === fieldType);
            if (existing) {
                canvas.setActiveObject(existing);
                canvas.renderAll();
                return existing;
            }
        }

        const preset = FIELD_PRESETS[fieldType] || FIELD_PRESETS.custom;
        const options = { ...preset, ...customOptions };

        // Default position centered on canvas
        const defaultX = (bgWidth / 2) * displayScale;
        const defaultY = (bgHeight / 3) * displayScale;

        let obj;

        if (fieldType === 'qr') {
            // Create QR Placeholder box
            const size = (options.size || 100) * displayScale;
            const rect = new fabric.Rect({
                width: size,
                height: size,
                fill: '#ffffff',
                stroke: '#0284c7',
                strokeWidth: 2,
                strokeDashArray: [4, 4],
                rx: 4, ry: 4,
                originX: 'center', originY: 'center'
            });

            const text = new fabric.Text('QR CODE', {
                fontSize: 12 * displayScale,
                fontFamily: 'Arial',
                fill: '#0284c7',
                originX: 'center', originY: 'center'
            });

            obj = new fabric.Group([rect, text], {
                left: options.x ? options.x * displayScale : defaultX,
                top: options.y ? options.y * displayScale : defaultY,
                originX: 'center',
                originY: 'center',
                hasRotatingPoint: false,
                lockRotation: true
            });

            obj.fieldType = 'qr';
            obj.qrSize = options.size || 100;
        } else {
            // Text field
            obj = new fabric.Text(options.label, {
                left: options.x ? options.x * displayScale : defaultX,
                top: options.y ? options.y * displayScale : defaultY,
                fontSize: (options.fontSize || 24) * displayScale,
                fontFamily: options.fontFamily || 'Arial',
                fontWeight: options.fontWeight || 'normal',
                fill: options.color || '#000000',
                originX: options.align || 'center',
                originY: 'center',
                textAlign: options.align || 'center',
                hasRotatingPoint: false,
                lockRotation: true
            });

            obj.fieldType = fieldType;
        }

        canvas.add(obj);
        canvas.setActiveObject(obj);
        canvas.renderAll();
        triggerFieldChangeEvent();
        return obj;
    };

    // Load saved fields array onto canvas
    const loadFields = (fieldsArray = []) => {
        if (!canvas) return;
        
        // Remove existing objects
        const objects = canvas.getObjects();
        while (objects.length > 0) {
            canvas.remove(objects[0]);
        }

        fieldsArray.forEach(field => {
            addField(field.type, field);
        });

        canvas.renderAll();
        triggerFieldChangeEvent();
    };

    // Export configured fields in intrinsic (unscaled) background resolution
    const exportFields = () => {
        if (!canvas) return [];

        const objects = canvas.getObjects();
        return objects.map(obj => {
            const fieldType = obj.fieldType;
            
            // Convert scaled display coordinates back to original image resolution
            const intrinsicX = Math.round(obj.left / displayScale);
            const intrinsicY = Math.round(obj.top / displayScale);

            if (fieldType === 'qr') {
                const currentWidth = (obj.width * obj.scaleX) / displayScale;
                return {
                    type: 'qr',
                    x: intrinsicX,
                    y: intrinsicY,
                    size: Math.round(obj.qrSize || currentWidth || 100)
                };
            } else {
                return {
                    type: fieldType,
                    x: intrinsicX,
                    y: intrinsicY,
                    fontSize: Math.round((obj.fontSize || 24) / displayScale),
                    fontFamily: obj.fontFamily || 'Arial',
                    fontWeight: obj.fontWeight || 'normal',
                    align: obj.originX || 'center',
                    color: obj.fill || '#000000'
                };
            }
        });
    };

    // Event Listeners for UI update
    let onSelectionCallback = null;
    let onFieldChangeCallback = null;

    const setCallbacks = (onSelection, onFieldChange) => {
        onSelectionCallback = onSelection;
        onFieldChangeCallback = onFieldChange;
    };

    const onObjectSelected = (e) => {
        const selected = e.selected ? e.selected[0] : canvas.getActiveObject();
        if (selected && onSelectionCallback) {
            onSelectionCallback(selected, displayScale);
        }
    };

    const onObjectSelectionCleared = () => {
        if (onSelectionCallback) {
            onSelectionCallback(null, displayScale);
        }
    };

    const onObjectModified = () => {
        const active = canvas.getActiveObject();
        if (active && onSelectionCallback) {
            onSelectionCallback(active, displayScale);
        }
        triggerFieldChangeEvent();
    };

    const triggerFieldChangeEvent = () => {
        if (onFieldChangeCallback) {
            onFieldChangeCallback(exportFields());
        }
    };

    // Update properties of active object from UI input controls
    const updateActiveObjectProp = (prop, value) => {
        if (!canvas) return;
        const active = canvas.getActiveObject();
        if (!active) return;

        if (active.fieldType === 'qr') {
            if (prop === 'size') {
                const newSize = parseInt(value, 10) || 100;
                active.qrSize = newSize;
                const scaledSize = newSize * displayScale;
                const rect = active.item(0);
                if (rect) {
                    rect.set({ width: scaledSize, height: scaledSize });
                }
                active.set({ width: scaledSize, height: scaledSize });
                active.addWithUpdate();
            } else if (prop === 'x') {
                active.set('left', parseFloat(value) * displayScale);
            } else if (prop === 'y') {
                active.set('top', parseFloat(value) * displayScale);
            }
        } else {
            // Text object
            if (prop === 'fontSize') {
                active.set('fontSize', parseFloat(value) * displayScale);
            } else if (prop === 'fontFamily') {
                active.set('fontFamily', value);
            } else if (prop === 'fontWeight') {
                active.set('fontWeight', value);
            } else if (prop === 'align') {
                active.set('originX', value);
                active.set('textAlign', value);
            } else if (prop === 'color') {
                active.set('fill', value);
            } else if (prop === 'x') {
                active.set('left', parseFloat(value) * displayScale);
            } else if (prop === 'y') {
                active.set('top', parseFloat(value) * displayScale);
            }
        }

        canvas.renderAll();
        triggerFieldChangeEvent();
    };

    const removeActiveObject = () => {
        if (!canvas) return;
        const active = canvas.getActiveObject();
        if (active) {
            canvas.remove(active);
            canvas.renderAll();
            triggerFieldChangeEvent();
            onObjectSelectionCleared();
        }
    };

    return {
        init,
        addField,
        loadFields,
        exportFields,
        setCallbacks,
        updateActiveObjectProp,
        removeActiveObject
    };
})();
