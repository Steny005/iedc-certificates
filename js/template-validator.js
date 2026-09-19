/**
 * Offline Rule-Based Template Validator
 * Validates uploaded certificate background images and field configurations without AI/external APIs.
 */

const TemplateValidator = (() => {
    const MIN_WIDTH = 1600;
    const MIN_HEIGHT = 1100;

    const REQUIRED_FIELD_TYPES = [
        { type: 'name', label: 'Recipient Name' },
        { type: 'description', label: 'Certificate Description' },
        { type: 'date', label: 'Date' },
        { type: 'qr', label: 'QR Code' },
        { type: 'verification_id', label: 'Verification ID' }
    ];

    /**
     * Validate an uploaded Image File against offline rules
     * @param {File} file 
     * @returns {Promise<Object>} Validation result
     */
    const validateImageFile = (file) => {
        return new Promise((resolve) => {
            const checks = [];
            const errors = [];

            if (!file) {
                resolve({
                    isValid: false,
                    checks: [{ name: 'File Exists', passed: false, detail: 'No file provided' }],
                    errors: ['No file selected.']
                });
                return;
            }

            // Rule 1: PNG / JPG Format
            const isPngJpg = file.type === 'image/png' || file.type === 'image/jpeg' || 
                             /\.(png|jpe?g)$/i.test(file.name);
            checks.push({
                name: 'PNG/JPG format',
                passed: isPngJpg,
                detail: isPngJpg ? `Format: ${file.type || file.name.split('.').pop()}` : 'Invalid file format. Only PNG and JPG are accepted.'
            });
            if (!isPngJpg) {
                errors.push('Uploaded file must be PNG or JPG format.');
            }

            // Create image object to test loading & dimensions
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                const width = img.naturalWidth;
                const height = img.naturalHeight;

                // Rule 2: Loaded Successfully
                checks.push({
                    name: 'Image loaded successfully',
                    passed: true,
                    detail: 'Image file was successfully parsed'
                });

                // Rule 3: Minimum Resolution (1600 x 1100)
                const meetsRes = width >= MIN_WIDTH && height >= MIN_HEIGHT;
                checks.push({
                    name: `Resolution requirement (${MIN_WIDTH} × ${MIN_HEIGHT})`,
                    passed: meetsRes,
                    detail: `Resolution: ${width} × ${height}`
                });
                if (!meetsRes) {
                    errors.push(`Resolution is ${width} × ${height}. Minimum required resolution is ${MIN_WIDTH} × ${MIN_HEIGHT}.`);
                }

                // Rule 4: Landscape Orientation
                const isLandscape = width > height;
                checks.push({
                    name: 'Landscape orientation',
                    passed: isLandscape,
                    detail: isLandscape ? 'Landscape (Width > Height)' : 'Portrait orientation detected'
                });
                if (!isLandscape) {
                    errors.push('Certificate must be in landscape orientation (width must be greater than height).');
                }

                const isValid = isPngJpg && meetsRes && isLandscape;
                resolve({
                    isValid,
                    width,
                    height,
                    checks,
                    errors,
                    imgElement: img
                });
            };

            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                checks.push({
                    name: 'Image loaded successfully',
                    passed: false,
                    detail: 'Failed to parse or render image file'
                });
                errors.push('Image failed to load or is corrupted.');
                resolve({
                    isValid: false,
                    checks,
                    errors
                });
            };

            img.src = objectUrl;
        });
    };

    /**
     * Validate template fields configuration before saving (All fields are optional, requires at least 1 field)
     * @param {Array} fields List of configured field objects
     * @returns {Object} Validation status
     */
    const validateFieldConfiguration = (fields = []) => {
        const configuredTypes = new Set(fields.map(f => f.type));
        const fieldChecks = [];

        REQUIRED_FIELD_TYPES.forEach(({ type, label }) => {
            const hasField = configuredTypes.has(type);
            fieldChecks.push({
                type,
                label,
                passed: hasField,
                status: hasField ? 'Placed' : 'Optional'
            });
        });

        const isValid = fields.length > 0;

        return {
            isValid,
            checks: fieldChecks,
            missingFields: isValid ? [] : ['At least 1 field must be placed on the certificate template']
        };
    };

    return {
        validateImageFile,
        validateFieldConfiguration,
        REQUIRED_FIELD_TYPES
    };
})();
