// ==========================================================================
// Kunu.dev - Native WebGL2 Engine (Zero Dependencies)
// ==========================================================================

(function () {
    'use strict';

    const state = {
        mouse: { x: 0.5, y: 0.5 },
        targetMouse: { x: 0.5, y: 0.5 },
        scrollVelocity: 0,
        easedVelocity: 0,
        lastScrollY: 0,
        startTime: Date.now()
    };

    window.addEventListener('DOMContentLoaded', () => {
        initWebGL();
        initRevealAnimations();
        initNavbarScroll();
        updateFooterYear();
        animateCodeLines();
    });

    // ========================================================================
    // RAW WEBGL2 — Zero dependencies, always works
    // ========================================================================
    function initWebGL() {
        const canvas = document.getElementById('webgl-canvas');
        if (!canvas) return;

        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) { console.warn('WebGL not supported'); return; }

        const vertSrc = window.vertexShaderSource;
        const fragSrc = window.fragmentShaderSource;

        function compile(type, src) {
            const s = gl.createShader(type);
            gl.shaderSource(s, src); gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
                console.error('Shader error:', gl.getShaderInfoLog(s)); return null;
            }
            return s;
        }

        const vs = compile(gl.VERTEX_SHADER, vertSrc);
        const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
        if (!vs || !fs) return;

        const prog = gl.createProgram();
        gl.attachShader(prog, vs); gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error('Link error:', gl.getProgramInfoLog(prog)); return;
        }
        gl.useProgram(prog);

        // Full-screen quad
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
        const posLoc = gl.getAttribLocation(prog, 'a_pos');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        // Cache uniforms
        const U = {};
        ['u_time','u_mouse','u_scroll','u_res',
         'u_p0','u_h0','u_t0','u_p1','u_h1','u_t1',
         'u_p2','u_h2','u_t2','u_p3','u_h3','u_t3',
         'u_p4','u_h4','u_t4','u_p5','u_h5','u_t5',
         'u_p6','u_h6','u_t6'
        ].forEach(n => U[n] = gl.getUniformLocation(prog, n));

        // Cache project visual uniforms
        const U_vpos = [];
        const U_vsize = [];
        const U_vhover = [];
        for (let i = 0; i < 4; i++) {
            U_vpos.push(gl.getUniformLocation(prog, `u_vpos[${i}]`));
            U_vsize.push(gl.getUniformLocation(prog, `u_vsize[${i}]`));
            U_vhover.push(gl.getUniformLocation(prog, `u_vhover[${i}]`));
        }

        // Define card personas to synchronize CSS glows and WebGL shader colors
        const cardMetadata = {
            'project-deep-search': { type: 0.0, color: '#00F0FF' }, // Cyan
            'project-scriptsketch': { type: 1.0, color: '#FFA500' }, // Gold/Orange
            'project-fake-call': { type: 2.0, color: '#FF00FF' }, // Magenta
            'project-http-guard': { type: 3.0, color: '#00FF88' }, // Emerald Green
            'service-app-dev': { type: 0.0, color: '#00F0FF' }, // Cyan
            'service-ai-eng': { type: 4.0, color: '#7000FF' }, // Violet
            'service-backend': { type: 5.0, color: '#1a75ff' } // Indigo Blue
        };

        // Track cards for WebGL glow
        const cards = [
            ...Array.from(document.querySelectorAll('.project-card')),
            ...Array.from(document.querySelectorAll('.lab-card'))
        ].map(el => {
            const meta = cardMetadata[el.id] || { type: 0.0, color: '#00F0FF' };
            el.style.setProperty('--card-color', meta.color);
            return {
                el,
                type: meta.type,
                hover: 0.0,
                target: 0.0
            };
        }).slice(0, 7);

        cards.forEach(c => {
            c.el.addEventListener('mouseenter', () => {
                c.target = 1.0;
            });
            c.el.addEventListener('mouseleave', () => c.target = 0.0);
        });

        // Layout Cache System - Prevents Layout Thrashing and Jitter Loops
        const layoutCache = {
            cards: [],
            vWindows: []
        };

        function getAbsoluteOffset(el) {
            let top = 0, left = 0;
            const width = el.offsetWidth;
            const height = el.offsetHeight;
            let current = el;
            while (current) {
                top += current.offsetTop || 0;
                left += current.offsetLeft || 0;
                current = current.offsetParent;
            }
            return { top, left, width, height };
        }

        function cacheLayout() {
            // Cache static card boundaries (immune to 3D transforms & reveals)
            layoutCache.cards = cards.map(c => {
                const off = getAbsoluteOffset(c.el);
                return {
                    type: c.type,
                    absTop: off.top,
                    absLeft: off.left,
                    width: off.width,
                    height: off.height
                };
            });

            // Cache visual cutout cutouts
            const projectCards = document.querySelectorAll('.project-card');
            layoutCache.vWindows = Array.from(projectCards).map(el => {
                const win = el.querySelector('.project-visual');
                if (win) {
                    const off = getAbsoluteOffset(win);
                    return {
                        absTop: off.top,
                        absLeft: off.left,
                        width: off.width,
                        height: off.height
                    };
                }
                return { absTop: 0, absLeft: 0, width: 0, height: 0 };
            });
        }

        // Run layout measurements once at boot
        setTimeout(cacheLayout, 200);

        function resize() {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
            gl.viewport(0, 0, canvas.width, canvas.height);
        }
        resize();

        window.addEventListener('resize', () => {
            resize();
            cacheLayout();
        });

        // Mouse
        window.addEventListener('mousemove', e => {
            state.targetMouse.x = e.clientX / window.innerWidth;
            state.targetMouse.y = 1.0 - e.clientY / window.innerHeight;
        });

        // Scroll velocity
        let lastSY = 0, lastST = performance.now();
        window.addEventListener('scroll', () => {
            const now = performance.now();
            const dt  = Math.max(1, now - lastST);
            state.scrollVelocity = (window.scrollY - lastSY) / dt * 16;
            lastSY = window.scrollY;
            lastST = now;
        }, { passive: true });

        function render() {
            // Ease mouse
            state.mouse.x += (state.targetMouse.x - state.mouse.x) * 0.06;
            state.mouse.y += (state.targetMouse.y - state.mouse.y) * 0.06;
            // Ease scroll velocity decay
            state.easedVelocity += (state.scrollVelocity - state.easedVelocity) * 0.12;
            state.scrollVelocity *= 0.88;
            // Ease card hovers
            cards.forEach(c => { c.hover += (c.target - c.hover) * 0.08; });

            const t = (Date.now() - state.startTime) / 1000;
            gl.uniform1f(U.u_time, t);
            gl.uniform2f(U.u_mouse, state.mouse.x, state.mouse.y);
            gl.uniform1f(U.u_scroll, state.easedVelocity);
            gl.uniform2f(U.u_res, canvas.width, canvas.height);

            // Pass card spotlights (calculated relative to scroll via cached layout offsets and hover offsets)
            layoutCache.cards.forEach((c, i) => {
                const hoverOffset = cards[i].hover * 6.0; // matches CSS translateY(-6px) shift
                const viewportLeft = c.absLeft - window.scrollX;
                const viewportTop = c.absTop - window.scrollY - hoverOffset;
                const cx = (viewportLeft + c.width * 0.5) / window.innerWidth;
                const cy = 1.0 - (viewportTop + c.height * 0.5) / window.innerHeight;

                const k = i.toString();
                gl.uniform2f(U[`u_p${k}`], cx, cy);
                gl.uniform1f(U[`u_h${k}`], cards[i].hover);
                gl.uniform1f(U[`u_t${k}`], c.type);
            });

            // Pass project visual cutout window uniforms (adjusting for hover displacement)
            for (let i = 0; i < 4; i++) {
                const win = layoutCache.vWindows[i];
                const c = cards[i];
                if (win && c) {
                    const hoverOffset = c.hover * 6.0; // matches CSS translateY(-6px) shift
                    const viewportLeft = win.absLeft - window.scrollX;
                    const viewportTop = win.absTop - window.scrollY - hoverOffset;
                    const cx = (viewportLeft + win.width * 0.5) / window.innerWidth;
                    const cy = 1.0 - (viewportTop + win.height * 0.5) / window.innerHeight;

                    const ar = window.innerWidth / window.innerHeight;
                    const sx = (win.width * 0.5) / window.innerWidth * ar;
                    const sy = (win.height * 0.5) / window.innerHeight;

                    gl.uniform2f(U_vpos[i], cx * ar, cy);
                    gl.uniform2f(U_vsize[i], sx, sy);
                    gl.uniform1f(U_vhover[i], c.hover);
                } else {
                    gl.uniform2f(U_vpos[i], 0.0, 0.0);
                    gl.uniform2f(U_vsize[i], 0.0, 0.0);
                    gl.uniform1f(U_vhover[i], 0.0);
                }
            }

            gl.drawArrays(gl.TRIANGLES, 0, 6);
            requestAnimationFrame(render);
        }
        render();
        console.log('%c✅ Kunu WebGL Shader Active', 'color:#00F0FF;font-weight:bold;font-size:14px');
    }

    // ========================================================================
    // REVEAL ANIMATIONS — Fixed for Bento Grid elements
    // ========================================================================
    function initRevealAnimations() {
        // Trigger first 3 bento cards (Intro, Code, Stack) immediately on load
        setTimeout(() => {
            ['#bento-intro', '#bento-code', '#bento-stack'].forEach((id, idx) => {
                const el = document.querySelector(id);
                if (el) {
                    setTimeout(() => el.classList.add('visible'), idx * 100);
                }
            });
        }, 80);

        // Scroll-triggered reveals for other bento cards (projects & lab cards)
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });

        // Observe other cards that have anim-up
        document.querySelectorAll('.bento-card.anim-up').forEach(el => {
            if (el.id !== 'bento-intro' && el.id !== 'bento-code' && el.id !== 'bento-stack') {
                observer.observe(el);
            }
        });
    }



    // ========================================================================
    // NAVBAR
    // ========================================================================
    function initNavbarScroll() {
        const nav = document.querySelector('.navbar');
        if (!nav) return;
        window.addEventListener('scroll', () => {
            nav.classList.toggle('scrolled', window.scrollY > 60);
        }, { passive: true });
        // Smooth scroll for nav links
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', e => {
                const target = document.getElementById(link.getAttribute('href').slice(1));
                if (!target) return;
                e.preventDefault();
                window.scrollTo({ top: target.offsetTop - 70, behavior: 'smooth' });
            });
        });
    }

    // ========================================================================
    // CODE TERMINAL REVEAL
    // ========================================================================
    function animateCodeLines() {
        document.querySelectorAll('.code-line').forEach((line, i) => {
            setTimeout(() => line.classList.add('visible'), 500 + i * 160);
        });
    }

    // ========================================================================
    // FOOTER YEAR
    // ========================================================================
    function updateFooterYear() {
        const el = document.getElementById('footer-copyright');
        if (el) el.textContent = `© ${new Date().getFullYear()} Prashanta Kumar Mahanat / Kunu AI Labs.`;
    }

    console.log('%c🚀 Kunu AI Labs', 'color:#00F0FF;font-size:20px;font-weight:bold');
    console.log('%cArchitecting Intelligence.', 'color:#7000FF;font-size:13px');
})();
