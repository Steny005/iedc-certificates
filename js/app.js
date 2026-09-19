/**
 * Main Application Navigation and Shared UI Helper
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize IndexedDB storage
    try {
        await StorageManager.initDB();
        console.log('Certificate System IndexedDB initialized successfully.');
    } catch (err) {
        console.error('Failed to initialize local IndexedDB storage:', err);
    }

    // Highlight active navbar link
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (currentPath.endsWith(href) || (href === 'index.html' && (currentPath.endsWith('/') || currentPath.endsWith('index.html')))) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
});

// Toast notification helper
const AppUI = {
    showToast: (message, type = 'info') => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 24px;
            background: ${type === 'danger' ? '#dc2626' : type === 'success' ? '#16a34a' : '#2563eb'};
            color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-weight: 600;
            z-index: 2000;
            transition: opacity 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
};
