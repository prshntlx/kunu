// ========================================
// Kunu AI Labs Portfolio - JavaScript
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
    initSmoothScroll();
    initNavbarScroll();
});

// ========================================
// Scroll-triggered Animations
// ========================================
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    // Observe all fade-in elements
    const fadeElements = document.querySelectorAll('.fade-in');
    fadeElements.forEach(el => observer.observe(el));
}

// ========================================
// Smooth Scroll Navigation
// ========================================
function initSmoothScroll() {
    const navLinks = document.querySelectorAll('.nav-link, .btn[href^="#"]');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');

            // Only smooth scroll for hash links
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);

                if (targetElement) {
                    const navHeight = document.querySelector('.navbar').offsetHeight;
                    const targetPosition = targetElement.offsetTop - navHeight - 20;

                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
}

// ========================================
// Navbar Scroll Effect
// ========================================
function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        // Add background blur when scrolled
        if (currentScroll > 100) {
            navbar.style.background = 'rgba(5, 5, 5, 0.8)';
            navbar.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.3)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.05)';
            navbar.style.boxShadow = 'none';
        }

        lastScroll = currentScroll;
    });
}

// ========================================
// Project Card Glow Effect
// ========================================
document.addEventListener('mousemove', (e) => {
    const projectCards = document.querySelectorAll('.project-card');

    projectCards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Only update if mouse is over the card
        if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
            const glow = card.querySelector('.project-glow');
            if (glow) {
                glow.style.left = `${x}px`;
                glow.style.top = `${y}px`;
            }
        }
    });
});

// ========================================
// Dynamic Year in Footer
// ========================================
const copyrightElement = document.querySelector('.footer-copyright');
if (copyrightElement) {
    const currentYear = new Date().getFullYear();
    copyrightElement.textContent = `© ${currentYear} Prashanta Kumar Mahanat / Kunu AI Labs.`;
}

// ========================================
// Add Hover Sound Effect (Optional Enhancement)
// ========================================
const interactiveElements = document.querySelectorAll('.btn, .project-card, .lab-card, .nav-link');

interactiveElements.forEach(element => {
    element.addEventListener('mouseenter', () => {
        // Add subtle scale effect on hover
        if (!element.style.transform || element.style.transform === 'none') {
            element.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        }
    });
});

// ========================================
// Parallax Effect for Hero Glow
// ========================================
window.addEventListener('scroll', () => {
    const heroGlow = document.querySelector('.hero-glow');
    if (heroGlow) {
        const scrolled = window.pageYOffset;
        const parallaxSpeed = 0.5;
        heroGlow.style.transform = `translate(-50%, calc(-50% + ${scrolled * parallaxSpeed}px))`;
    }
});

// ========================================
// Keyboard Navigation Accessibility
// ========================================
document.addEventListener('keydown', (e) => {
    // Enable keyboard navigation for interactive elements
    if (e.key === 'Tab') {
        document.body.classList.add('keyboard-nav');
    }
});

document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-nav');
});

// ========================================
// Console Easter Egg
// ========================================
console.log('%c🚀 Kunu AI Labs', 'color: #00F0FF; font-size: 24px; font-weight: bold;');
console.log('%cArchitecting Intelligence, one line of code at a time.', 'color: #7000FF; font-size: 14px;');
console.log('%cInterested in working together? Reach out at hello@kunu.dev', 'color: #FFFFFF; font-size: 12px;');
