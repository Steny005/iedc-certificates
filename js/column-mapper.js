/**
 * Dynamic Excel Column Mapper Component
 * Maps custom user spreadsheet columns to standard certificate data fields
 */

const ColumnMapper = (() => {

    const REQUIRED_FIELDS = [

        {
            key: 'student_name',
            label: 'Student Name',
            aliases: [
                'student_name',
                'student name',
                'name',
                'full name',
                'participant name',
                'participant_name'
            ]
        },

        {
            key: 'event_name',
            label: 'Event Name',
            aliases: [
                'event_name',
                'event name',
                'event',
                'workshop',
                'course',
                'event title',
                'event_title'
            ]
        },

        {
            key: 'date',
            label: 'Date',
            aliases: [
                'date',
                'event date',
                'issue date',
                'completion date'
            ]
        },

        {
            key: 'batch',
            label: 'Batch (Optional)',
            aliases: [
                'batch',
                'class',
                'department',
                'semester',
                'branch'
            ],
            optional: true
        },

        {
            key: 'role',
            label: 'Role / Rank (Optional)',
            aliases: [
                'role',
                'rank',
                'position',
                'type'
            ],
            optional: true
        }

    ];


    /**
     * Normalize a header name.
     *
     * Examples:
     *
     * "Event"       → "event"
     * " Event "     → "event"
     * "Event Name"  → "event name"
     * "event_name"  → "event name"
     */
    const normalizeHeader = (header) => {

        return String(header || '')
            .trim()
            .toLowerCase()
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ');
    };


    /**
     * Try auto-mapping spreadsheet headers
     * to standard certificate data fields.
     */
    const autoMapHeaders = (headers = []) => {

        const normalizedHeaders =
            headers.map(header =>
                normalizeHeader(header)
            );

        const mapping = {};

        let isComplete = true;


        REQUIRED_FIELDS.forEach(field => {

            let foundHeader = null;


            // Try every alias
            for (const alias of field.aliases) {

                const normalizedAlias =
                    normalizeHeader(alias);


                const index =
                    normalizedHeaders.indexOf(
                        normalizedAlias
                    );


                if (index !== -1) {

                    foundHeader =
                        headers[index];

                    break;
                }
            }


            /*
             * If an exact alias wasn't found,
             * try partial matching.
             *
             * Example:
             *
             * "Event Name 2026"
             *
             * can still match "event name".
             */
            if (!foundHeader) {

                for (
                    let i = 0;
                    i < normalizedHeaders.length;
                    i++
                ) {

                    const currentHeader =
                        normalizedHeaders[i];


                    for (const alias of field.aliases) {

                        const normalizedAlias =
                            normalizeHeader(alias);


                        if (
                            currentHeader === normalizedAlias ||
                            currentHeader.includes(normalizedAlias)
                        ) {

                            foundHeader =
                                headers[i];

                            break;
                        }
                    }


                    if (foundHeader) {
                        break;
                    }
                }
            }


            if (foundHeader) {

                mapping[field.key] =
                    foundHeader;

            } else {

                mapping[field.key] = '';

                if (!field.optional) {

                    isComplete = false;
                }
            }

        });


        console.log(
            'Excel Headers:',
            headers
        );

        console.log(
            'Auto Column Mapping:',
            mapping
        );


        return {
            mapping,
            isComplete
        };
    };


    /**
     * Map raw spreadsheet rows
     * using the confirmed mapping.
     */
    const normalizeRows = (
        rows,
        mapping
    ) => {

        return rows.map(row => {

            const student_name =
                mapping.student_name
                    ? row[mapping.student_name]
                    : '';


            const event_name =
                mapping.event_name
                    ? row[mapping.event_name]
                    : '';


            const date =
                mapping.date
                    ? row[mapping.date]
                    : '';


            const batch =
                mapping.batch
                    ? row[mapping.batch]
                    : '';


            let role =
                mapping.role
                    ? row[mapping.role]
                    : 'participant';


            /*
             * Default role fallback
             */
            if (
                !role ||
                String(role).trim() === ''
            ) {

                role = 'participant';
            }


            const normalizedParticipant = {

                student_name:
                    String(
                        student_name ?? ''
                    ).trim(),

                event_name:
                    String(
                        event_name ?? ''
                    ).trim(),

                date:
                    String(
                        date ?? ''
                    ).trim(),

                batch:
                    String(
                        batch ?? ''
                    ).trim(),

                role:
                    String(
                        role ?? 'participant'
                    ).trim()

            };


            /*
             * Debugging information.
             * You will see this in F12 → Console.
             */
            console.log(
                'Normalized Participant:',
                normalizedParticipant
            );


            return normalizedParticipant;
        });
    };


    return {

        REQUIRED_FIELDS,

        autoMapHeaders,

        normalizeRows

    };

})();