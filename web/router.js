/**
 * Simple Hash-Based Router for VolleyBratans Stream Platform
 * Handles SPA navigation between pages: dashboard, cameras, statistics, overlays
 */

class Router {
    constructor() {
        this.pages = ['dashboard', 'cameras', 'statistics', 'overlays'];
        this.init();
    }

    init() {
        // Handle hash changes
        window.addEventListener('hashchange', () => this.navigate());

        // Handle initial load
        this.navigate();

        // Handle navigation clicks
        document.querySelectorAll('[data-page], [data-navigate]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const page = el.dataset.page || el.dataset.navigate;
                if (page) {
                    window.location.hash = `#${page}`;
                }
            });
        });
    }

    navigate() {
        const hash = window.location.hash.slice(1) || 'dashboard';
        const page = this.pages.includes(hash) ? hash : 'dashboard';

        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        // Show target page
        const targetPage = document.getElementById(`page-${page}`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Update nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === page) {
                link.classList.add('active');
            }
        });

        // Dispatch custom event for other scripts
        document.dispatchEvent(new CustomEvent('pageChanged', {
            detail: { page }
        }));
    }
}

// Initialize router when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.router = new Router();
});
