// sidebar.js - Moneyball-Style Sidebar Controller
(function () {
    const STORAGE_KEY = 'vb_sidebar_collapsed';

    class SidebarController {
        constructor() {
            this.sidebar = document.getElementById('sidebar');
            this.toggleBtn = document.getElementById('sidebarToggle');
            this.mobileToggle = document.getElementById('mobileMenuToggle');
            this.backdrop = document.getElementById('sidebarBackdrop');
            this.isCollapsed = localStorage.getItem(STORAGE_KEY) === 'true';
            this.isMobileOpen = false;

            this.init();
        }

        init() {
            // Apply initial state
            if (this.isCollapsed) {
                this.sidebar?.classList.add('collapsed');
                document.body.classList.add('sidebar-collapsed');
            }

            // Toggle button click (desktop collapse)
            this.toggleBtn?.addEventListener('click', () => this.toggle());

            // Mobile menu toggle
            this.mobileToggle?.addEventListener('click', () => this.toggleMobile());

            // Backdrop click closes mobile sidebar
            this.backdrop?.addEventListener('click', () => this.closeMobile());

            // Keyboard shortcut: [ to toggle
            document.addEventListener('keydown', (e) => {
                if (e.key === '[' && !e.metaKey && !e.ctrlKey && !e.altKey) {
                    const tag = document.activeElement?.tagName;
                    if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
                        e.preventDefault();
                        this.toggle();
                    }
                }
                // ESC closes mobile sidebar
                if (e.key === 'Escape' && this.isMobileOpen) {
                    this.closeMobile();
                }
            });

            // Update active state based on current page/hash
            this.updateActiveItem();
            window.addEventListener('hashchange', () => this.updateActiveItem());
        }

        toggle() {
            this.isCollapsed = !this.isCollapsed;
            this.sidebar?.classList.toggle('collapsed', this.isCollapsed);
            document.body.classList.toggle('sidebar-collapsed', this.isCollapsed);
            localStorage.setItem(STORAGE_KEY, this.isCollapsed);
        }

        toggleMobile() {
            this.isMobileOpen = !this.isMobileOpen;
            this.sidebar?.classList.toggle('mobile-open', this.isMobileOpen);
            this.backdrop?.classList.toggle('visible', this.isMobileOpen);
        }

        closeMobile() {
            this.isMobileOpen = false;
            this.sidebar?.classList.remove('mobile-open');
            this.backdrop?.classList.remove('visible');
        }

        updateActiveItem() {
            const hash = window.location.hash || '#dashboard';
            const page = window.location.pathname;

            document.querySelectorAll('.sidebar-item').forEach(item => {
                const href = item.getAttribute('href');
                const isActive = href === hash ||
                    (href && page.endsWith(href)) ||
                    (href === '#dashboard' && !window.location.hash);
                item.classList.toggle('active', isActive);
            });
        }
    }

    // Initialize when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new SidebarController());
    } else {
        new SidebarController();
    }
})();
