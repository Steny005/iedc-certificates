/**
 * Dynamic Excel Column Mapper Component
 * Maps custom user spreadsheet columns to standard certificate data fields
 */

const ColumnMapper = (() => {
    const REQUIRED_FIELDS = [
        { key: 'student_name', label: 'Student Name', aliases: ['student_name', 'student name', 'name', 'full name', 'participant name'] },
        { key: 'event_name', label: 'Event Name', aliases: ['event_name', 'event name', 'event', 'workshop', 'course'] },
        { key: 'date', label: 'Date', aliases: ['date', 'event date', 'issue date', 'completion date'] },
        { key: 'batch', label: 'Batch (Optional)', aliases: ['batch', 'class', 'department', 'semester', 'branch'], optional: true },
        { key: 'role', label: 'Role / Rank (Optional)', aliases: ['role', 'rank', 'position', 'type'], optional: true }
    ];

    /**
     * Try auto-mapping spreadsheet headers to standard fields
     * @param {Array<string>} headers 
     * @returns {Object} { mapping, isComplete }
     */
    const autoMapHeaders = (headers = []) => {
        const lowerHeaders = headers.map(h => h.trim().toLowerCase());
        const mapping = {};
        let isComplete = true;

        REQUIRED_FIELDS.forEach(field => {
            let foundHeader = null;

            // Try exact and alias matches
            for (const alias of field.aliases) {
                const idx = lowerHeaders.indexOf(alias);
                if (idx !== -1) {
                    foundHeader = headers[idx];
                    break;
                }
            }

            if (foundHeader) {
                mapping[field.key] = foundHeader;
            } else if (!field.optional) {
                isComplete = false;
                mapping[field.key] = '';
            } else {
                mapping[field.key] = '';
            }
        });

        return { mapping, isComplete };
    };

    /**
     * Map raw spreadsheet row objects using confirmed mapping dictionary
     * @param {Array<Object>} rows 
     * @param {Object} mapping 
     * @returns {Array<Object>} Normalized row objects
     */
    const normalizeRows = (rows, mapping) => {
        return rows.map(row => {
            const student_name = row[mapping.student_name] || '';
            const event_name = row[mapping.event_name] || '';
            const date = row[mapping.date] || '';
            const batch = row[mapping.batch] || '';
            let role = row[mapping.role] || 'participant';

            // Default role fallback if empty
            if (!role || role.trim() === '') {
                role = 'participant';
            }

            return {
                student_name: String(student_name).trim(),
                event_name: String(event_name).trim(),
                date: String(date).trim(),
                batch: String(batch).trim(),
                role: String(role).trim()
            };
        });
    };

    return {
        REQUIRED_FIELDS,
        autoMapHeaders,
        normalizeRows
    };
})();
