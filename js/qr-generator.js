/**
 * Offline QR Code & Verification ID Generator Wrapper
 * Uses local qrcode.min.js
 */

const QRGenerator = (() => {
    /**
     * Generate unique verification ID (Preserving exact original logic)
     * @param {string} name 
     * @returns {string} Unique Verification Key
     */
    const generateUniqueKey = (name = 'student') => {
        const baseKey = name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15);
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `${baseKey}_${timestamp}_${random}`;
    };

    /**
     * Generate QR Code image as a Data URL completely offline
     * @param {string} text Target text or URL to encode
     * @param {number} size Width & Height in pixels
     * @returns {Promise<string>} Data URL PNG image
     */
    const generateQRDataUrl = (text, size = 100) => {
        return new Promise((resolve) => {
            const container = document.createElement('div');
            container.style.display = 'none';
            document.body.appendChild(container);

            try {
                // Initialize local QRCode instance
                new QRCode(container, {
                    text: text,
                    width: size,
                    height: size,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.H
                });

                // Wait briefly for canvas/image to render
                setTimeout(() => {
                    const canvas = container.querySelector('canvas');
                    const img = container.querySelector('img');

                    let dataUrl = '';
                    if (canvas) {
                        dataUrl = canvas.toDataURL('image/png');
                    } else if (img && img.src) {
                        dataUrl = img.src;
                    }

                    document.body.removeChild(container);
                    resolve(dataUrl);
                }, 50);
            } catch (err) {
                console.error('Error generating QR code offline:', err);
                if (container.parentNode) {
                    document.body.removeChild(container);
                }
                resolve('');
            }
        });
    };

    return {
        generateUniqueKey,
        generateQRDataUrl
    };
})();
