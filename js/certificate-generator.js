/**
 * Core Batch Certificate Generator Engine
 * Combines Saved Template + Existing Wording Logic + Participant Data + Verification QR
 */

const CertificateGenerator = (() => {
    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // Date formatting helper (Preserving exact original logic)
    const getDaySuffix = (day) => {
        const d = parseInt(day, 10);
        if (d > 3 && d < 21) return 'th';
        switch (d % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    };

    const formatCertificateDate = (dateString) => {
        if (!dateString) return '';

        let day, monthIndex, year;
        const ddMMyyyy = dateString.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
        const yyyyMMdd = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);

        if (ddMMyyyy) {
            day = ddMMyyyy[1];
            monthIndex = parseInt(ddMMyyyy[2], 10) - 1;
            year = ddMMyyyy[3];
        } else if (yyyyMMdd) {
            day = yyyyMMdd[3];
            monthIndex = parseInt(yyyyMMdd[2], 10) - 1;
            year = yyyyMMdd[1];
        } else {
            return dateString;
        }

        if (monthIndex < 0 || monthIndex > 11) return dateString;
        return `${parseInt(day)}${getDaySuffix(day)} ${MONTH_NAMES[monthIndex]}, ${year}`;
    };

    /**
     * Generate Certificate Wording Description
     * Supports both preset types and custom editable wording templates with placeholders {event}, {date}, {role}, {name}
     */
    const generateCertificateDescription = (certType, role, eventName, dateString, studentName = '', customWordingTemplate = '') => {
        const certDateFormatted = formatCertificateDate(dateString);

        if (customWordingTemplate && customWordingTemplate.trim() !== '') {
            return customWordingTemplate
                .replace(/\{event\}/gi, eventName || '[event]')
                .replace(/\{date\}/gi, certDateFormatted || '[date]')
                .replace(/\{role\}/gi, role || '[role]')
                .replace(/\{name\}/gi, studentName || '[name]');
        }

        const eventText = `in ${eventName} held on ${certDateFormatted} organized by IEDC@SAINTGITS.`;
        const effectiveType = (certType || role || 'participation').toLowerCase();

        if (effectiveType === 'firstprize' || effectiveType === 'first' || certType === 'First Prize') {
            return `for securing First Prize ${eventText}`;
        } else if (effectiveType === 'secondprize' || effectiveType === 'second' || certType === 'Second Prize') {
            return `for securing Second Prize ${eventText}`;
        } else if (effectiveType === 'participation' || effectiveType === 'participant' || certType === 'Participation') {
            return `has actively participated ${eventText}`;
        } else if (effectiveType === 'contribution' || certType === 'Contribution') {
            return `for valuable contribution as a ${role || 'Contributor'} ${eventText}`;
        } else {
            return `for valuable contribution as a ${role || certType} ${eventText}`;
        }
    };

    /**
     * Render a single certificate onto an HTML5 Canvas using a template configuration
     * @param {Object} template Saved template object
     * @param {string} certType Selected certificate type
     * @param {Object} participant Normalized participant record
     * @param {string} customWordingTemplate Custom editable wording string
     * @returns {Promise<HTMLCanvasElement>} Rendered Canvas element
     */
    const renderSingleCertificateCanvas = async (template, certType, participant, customWordingTemplate = '') => {
        return new Promise(async (resolve, reject) => {
            const canvas = document.createElement('canvas');
            canvas.width = template.width;
            canvas.height = template.height;
            const ctx = canvas.getContext('2d');

            // Load template background image
            const bgImage = new Image();
            bgImage.crossOrigin = 'anonymous';

            bgImage.onload = async () => {
                // Draw background
                ctx.drawImage(bgImage, 0, 0, template.width, template.height);

                // Generate Verification Key & QR Code
                const verificationKey = QRGenerator.generateUniqueKey(participant.student_name);
                const descriptionText = generateCertificateDescription(certType, participant.role, participant.event_name, participant.date, participant.student_name, customWordingTemplate);
                const formattedDate = formatCertificateDate(participant.date);

                // Draw each configured template field
                for (const field of template.fields) {
                    if (field.type === 'qr') {
                        // Generate QR Data URL
                        const qrDataUrl = await QRGenerator.generateQRDataUrl(verificationKey, field.size || 100);
                        if (qrDataUrl) {
                            await new Promise((res) => {
                                const qrImg = new Image();
                                qrImg.onload = () => {
                                    const size = field.size || 100;
                                    // Field X, Y is centered
                                    const qrX = field.x - size / 2;
                                    const qrY = field.y - size / 2;
                                    
                                    // Draw white background card for QR
                                    ctx.fillStyle = '#ffffff';
                                    ctx.fillRect(qrX - 5, qrY - 5, size + 10, size + 10);
                                    ctx.drawImage(qrImg, qrX, qrY, size, size);
                                    res();
                                };
                                qrImg.src = qrDataUrl;
                            });
                        }
                    } else {
                        // Draw Text field
                        let textContent = '';

                        if (field.type === 'name') {
                            textContent = participant.student_name;
                        } else if (field.type === 'description') {
                            textContent = descriptionText;
                        } else if (field.type === 'date') {
                            textContent = formattedDate;
                        } else if (field.type === 'verification_id') {
                            textContent = `Verification ID: ${verificationKey}`;
                        } else if (field.type === 'custom') {
                            textContent = field.label || 'Custom Text';
                        }

                        if (!textContent) continue;

                        ctx.save();
                        ctx.font = `${field.fontWeight || 'normal'} ${field.fontSize || 24}px ${field.fontFamily || 'Arial'}, sans-serif`;
                        ctx.fillStyle = field.color || '#000000';
                        ctx.textAlign = field.align || 'center';
                        ctx.textBaseline = 'middle';

                        // Check description multi-line wrapping if description is long
                        if (field.type === 'description') {
                            const maxWidth = template.width * 0.75;
                            wrapText(ctx, textContent, field.x, field.y, maxWidth, (field.fontSize || 24) * 1.4);
                        } else {
                            ctx.fillText(textContent, field.x, field.y);
                        }
                        ctx.restore();
                    }
                }

                resolve({
                    canvas,
                    verificationKey,
                    participant
                });
            };

            bgImage.onerror = () => {
                reject(new Error('Failed to load template background image.'));
            };

            bgImage.src = template.backgroundImage;
        });
    };

    // Helper: Wrap text cleanly on Canvas for multi-line description
    const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
        const words = text.split(' ');
        let line = '';
        const lines = [];

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);

        // Center lines vertically around y
        const startY = y - ((lines.length - 1) * lineHeight) / 2;
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i].trim(), x, startY + (i * lineHeight));
        }
    };

    /**
     * Batch generate all certificates and return results
     * @param {Object} template Saved template
     * @param {string} certType Certificate Type
     * @param {Array<Object>} participants Array of normalized participant objects
     * @param {Function} onProgress Progress callback (current, total)
     * @param {string} customWordingTemplate Custom wording template string
     * @returns {Promise<Array<Object>>} Array of generated certificate results
     */
    const batchGenerate = async (template, certType, participants = [], onProgress = null, customWordingTemplate = '') => {
        const results = [];
        const total = participants.length;

        for (let i = 0; i < total; i++) {
            const participant = participants[i];
            const rendered = await renderSingleCertificateCanvas(template, certType, participant, customWordingTemplate);
            results.push(rendered);

            if (onProgress) {
                onProgress(i + 1, total);
            }

            // Yield briefly to keep UI responsive
            await new Promise(r => setTimeout(r, 20));
        }

        return results;
    };

    /**
     * Download all generated certificates as a single ZIP file (Offline using JSZip)
     */
    const downloadAllAsZip = async (generatedResults, zipFilename = 'Certificates.zip') => {
        if (!generatedResults || generatedResults.length === 0) {
            alert('No generated certificates to download.');
            return;
        }

        const zip = new JSZip();
        const folder = zip.folder('Certificates');

        for (const item of generatedResults) {
            const nameSanitized = item.participant.student_name.replace(/[^a-zA-Z0-9]/g, '_');
            const dataUrl = item.canvas.toDataURL('image/png');
            const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');

            folder.file(`Certificate_${nameSanitized}_${item.verificationKey.slice(-6)}.png`, base64Data, { base64: true });
        }

        const zipContent = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipContent);
        link.download = zipFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    };

    /**
     * Download a single certificate as PNG
     */
    const downloadSinglePNG = (canvas, studentName) => {
        const nameSanitized = studentName.replace(/[^a-zA-Z0-9]/g, '_');
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `Certificate_${nameSanitized}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    /**
     * Download a single certificate as PDF (Offline using jsPDF)
     */
    const downloadSinglePDF = (canvas, studentName) => {
        const { jsPDF } = window.jspdf;
        const width = canvas.width;
        const height = canvas.height;
        const orientation = width > height ? 'landscape' : 'portrait';

        const pdf = new jsPDF({
            orientation: orientation,
            unit: 'px',
            format: [width, height]
        });

        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, width, height);

        const nameSanitized = studentName.replace(/[^a-zA-Z0-9]/g, '_');
        pdf.save(`Certificate_${nameSanitized}.pdf`);
    };

    return {
        formatCertificateDate,
        generateCertificateDescription,
        renderSingleCertificateCanvas,
        batchGenerate,
        downloadAllAsZip,
        downloadSinglePNG,
        downloadSinglePDF
    };
})();
