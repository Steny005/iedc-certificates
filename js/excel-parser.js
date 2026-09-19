/**
 * Offline Excel/CSV Parser using local SheetJS (xlsx.full.min.js)
 */

const ExcelParser = (() => {
    /**
     * Parse an Excel (.xlsx, .xls) or CSV file completely offline
     * @param {File} file 
     * @returns {Promise<Object>} { headers, rows, rowCount }
     */
    const parseFile = (file) => {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('No file provided'));
                return;
            }

            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array', cellDates: true });

                    // Get first worksheet
                    const firstSheetName = workbook.SheetNames[0];
                    if (!firstSheetName) {
                        throw new Error('Spreadsheet contains no sheets.');
                    }

                    const worksheet = workbook.Sheets[firstSheetName];

                    // Extract raw JSON rows (header row as object keys)
                    const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

                    if (jsonRows.length === 0) {
                        throw new Error('Spreadsheet is empty or has no data rows.');
                    }

                    // Extract headers from first row keys
                    const headers = Object.keys(jsonRows[0]).map(h => h.trim());

                    resolve({
                        headers,
                        rows: jsonRows,
                        rowCount: jsonRows.length
                    });
                } catch (err) {
                    console.error('Error parsing spreadsheet:', err);
                    reject(new Error(`Failed to parse file: ${err.message}`));
                }
            };

            reader.onerror = () => {
                reject(new Error('File reading failed.'));
            };

            reader.readAsArrayBuffer(file);
        });
    };

    return {
        parseFile
    };
})();
