/**
 * IndexedDB Storage Layer for Offline Certificate System
 * Database Name: CertificateSystemDB
 * Object Store: templates
 */

const StorageManager = (() => {
    const DB_NAME = 'CertificateSystemDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'templates';

    let dbInstance = null;

    // Open/initialize IndexedDB connection
    const initDB = () => {
        return new Promise((resolve, reject) => {
            if (dbInstance) {
                resolve(dbInstance);
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error);
                reject('Failed to open local database.');
            };

            request.onsuccess = async (event) => {
                dbInstance = event.target.result;
                // Auto seed default template if store is empty
                await seedDefaultTemplateIfEmpty();
                resolve(dbInstance);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('name', 'name', { unique: false });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };
        });
    };

    // Helper: Seed default template from background.jpg if database is empty
    const seedDefaultTemplateIfEmpty = async () => {
        try {
            const templates = await getAllTemplates(true);
            if (templates.length === 0) {
                console.log('Seeding default IEDC certificate template...');
                // Load default background.jpg as data URL
                const response = await fetch('background.jpg');
                const blob = await response.blob();
                
                const dataUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });

                const defaultTemplate = {
                    id: 'default_iedc_template',
                    name: 'IEDC Default Certificate',
                    backgroundImage: dataUrl,
                    width: 800,
                    height: 565,
                    fields: [
                        {
                            type: 'name',
                            x: 400,
                            y: 250,
                            fontSize: 36,
                            fontFamily: 'Georgia',
                            fontWeight: 'bold',
                            align: 'center',
                            color: '#333333'
                        },
                        {
                            type: 'description',
                            x: 400,
                            y: 320,
                            fontSize: 16,
                            fontFamily: 'Georgia',
                            fontWeight: 'normal',
                            align: 'center',
                            color: '#3a3420'
                        },
                        {
                            type: 'date',
                            x: 400,
                            y: 420,
                            fontSize: 16,
                            fontFamily: 'Arial',
                            fontWeight: 'bold',
                            align: 'center',
                            color: '#333333'
                        },
                        {
                            type: 'qr',
                            x: 640,
                            y: 20,
                            size: 90
                        },
                        {
                            type: 'verification_id',
                            x: 400,
                            y: 535,
                            fontSize: 12,
                            fontFamily: 'Arial',
                            fontWeight: 'normal',
                            align: 'center',
                            color: '#666666'
                        }
                    ],
                    createdAt: new Date().toISOString()
                };

                await saveTemplate(defaultTemplate);
                console.log('Default template seeded successfully.');
            }
        } catch (err) {
            console.warn('Could not seed default template:', err);
        }
    };

    // Get all saved templates
    const getAllTemplates = async (skipSeedCheck = false) => {
        const db = dbInstance || await initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = (e) => reject(e.target.error);
        });
    };

    // Get template by ID
    const getTemplateById = async (id) => {
        const db = dbInstance || await initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = (e) => reject(e.target.error);
        });
    };

    // Save or update template
    const saveTemplate = async (templateData) => {
        const db = dbInstance || await initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);

            if (!templateData.id) {
                templateData.id = 'tpl_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            }
            if (!templateData.createdAt) {
                templateData.createdAt = new Date().toISOString();
            }

            const request = store.put(templateData);

            request.onsuccess = () => resolve(templateData);
            request.onerror = (e) => reject(e.target.error);
        });
    };

    // Rename existing template
    const renameTemplate = async (id, newName) => {
        const template = await getTemplateById(id);
        if (!template) throw new Error('Template not found');
        template.name = newName;
        return await saveTemplate(template);
    };

    // Delete template by ID
    const deleteTemplate = async (id) => {
        const db = dbInstance || await initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve(true);
            request.onerror = (e) => reject(e.target.error);
        });
    };

    return {
        initDB,
        getAllTemplates,
        getTemplateById,
        saveTemplate,
        renameTemplate,
        deleteTemplate
    };
})();
