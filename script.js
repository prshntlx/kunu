// ==========================================================================
// Kunu.dev - Premium Minimalist Page Snapping Controller & WebGL Card Glows
// Zero dependencies, lightweight and hardware-accelerated
// ==========================================================================

(function () {
    'use strict';

    let currentSectionIndex = 0;
    let isTransitioning = false;
    let lastTransitionTime = 0;
    let sections = [];
    let cards = [];

    // Shared WebGL Renderer state
    let gl, sharedCanvas, shaderProgram;
    let uTimeLoc, uResLoc, uTypeLoc, uC1Loc, uC2Loc;
    const startTime = Date.now();

    window.addEventListener('DOMContentLoaded', () => {
        sections = Array.from(document.querySelectorAll('.section'));
        initScrollJack();
        initNavbarLinks();
        initDigitalClock();
        
        // Initial setup for code terminal typing lines if active on load
        if (currentSectionIndex === 1) {
            animateCodeLines();
        }

        // Initialize Shared WebGL context for card glows
        initSharedWebGL();
        initCardGlows();
    });

    // ========================================================================
    // SMOOTH PAGE TRANSITION
    // ========================================================================
    window.triggerTransitionToSection = function (toIndex) {
        const now = Date.now();
        if (isTransitioning || (now - lastTransitionTime < 950) || toIndex === currentSectionIndex || toIndex < 0 || toIndex >= sections.length) return;
        
        isTransitioning = true;
        lastTransitionTime = now;
        const fromIndex = currentSectionIndex;
        const fromSec = sections[fromIndex];
        const toSec = sections[toIndex];
        
        // Update Navbar Links
        document.querySelectorAll('.navbar .nav-link').forEach(link => {
            const idx = parseInt(link.getAttribute('data-section'), 10);
            link.classList.toggle('active', idx === toIndex);
        });
        
        // Trigger CSS-driven transition
        fromSec.classList.add('exit');
        fromSec.classList.remove('active');
        
        toSec.classList.add('active');
        toSec.scrollTop = 0;
        
        currentSectionIndex = toIndex;
        
        if (toIndex === 1) {
            animateCodeLines();
        }
        
        setTimeout(() => {
            fromSec.classList.remove('exit');
            isTransitioning = false;
        }, 550); // Matches the 0.55s CSS transition
    };

    // ========================================================================
    // SNAPPING SCROLL-JACK CONTROLLER
    // ========================================================================
    function initScrollJack() {
        window.addEventListener('wheel', e => {
            const now = Date.now();
            if (isTransitioning || (now - lastTransitionTime < 950)) {
                e.preventDefault(); return;
            }
            
            const sec = sections[currentSectionIndex];
            if (!sec) return;
            
            const deltaY = e.deltaY;
            if (deltaY > 0) {
                const isAtBottom = Math.ceil(sec.scrollTop + sec.clientHeight) >= sec.scrollHeight - 2;
                if (isAtBottom) {
                    e.preventDefault();
                    triggerSectionTransition(currentSectionIndex + 1);
                }
            } else if (deltaY < 0) {
                const isAtTop = sec.scrollTop <= 2;
                if (isAtTop) {
                    e.preventDefault();
                    triggerSectionTransition(currentSectionIndex - 1);
                }
            }
        }, { passive: false });

        window.addEventListener('keydown', e => {
            const now = Date.now();
            if (isTransitioning || (now - lastTransitionTime < 950)) {
                e.preventDefault(); return;
            }
            
            const sec = sections[currentSectionIndex];
            if (!sec) return;
            
            if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
                const isAtBottom = Math.ceil(sec.scrollTop + sec.clientHeight) >= sec.scrollHeight - 2;
                if (isAtBottom) {
                    e.preventDefault();
                    triggerSectionTransition(currentSectionIndex + 1);
                }
            } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
                const isAtTop = sec.scrollTop <= 2;
                if (isAtTop) {
                    e.preventDefault();
                    triggerSectionTransition(currentSectionIndex - 1);
                }
            }
        });

        let touchStartY = 0;
        window.addEventListener('touchstart', e => {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        window.addEventListener('touchmove', e => {
            const now = Date.now();
            if (isTransitioning || (now - lastTransitionTime < 950)) {
                e.preventDefault(); return;
            }
            
            const sec = sections[currentSectionIndex];
            if (!sec) return;
            
            const touchEndY = e.touches[0].clientY;
            const diffY = touchStartY - touchEndY;
            
            if (Math.abs(diffY) > 55) {
                if (diffY > 0) {
                    const isAtBottom = Math.ceil(sec.scrollTop + sec.clientHeight) >= sec.scrollHeight - 2;
                    if (isAtBottom) {
                        triggerSectionTransition(currentSectionIndex + 1);
                    }
                } else {
                    const isAtTop = sec.scrollTop <= 2;
                    if (isAtTop) {
                        triggerSectionTransition(currentSectionIndex - 1);
                    }
                }
                touchStartY = touchEndY;
            }
        }, { passive: false });
    }

    function triggerSectionTransition(toIdx) {
        if (window.triggerTransitionToSection) {
            window.triggerTransitionToSection(toIdx);
        }
    }

    function initNavbarLinks() {
        document.querySelectorAll('.navbar .nav-link').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const toIdx = parseInt(link.getAttribute('data-section'), 10);
                triggerSectionTransition(toIdx);
            });
        });

        document.querySelectorAll('.nav-trigger').forEach(btn => {
            btn.addEventListener('click', e => {
                e.preventDefault();
                const toIdx = parseInt(btn.getAttribute('data-section'), 10);
                triggerSectionTransition(toIdx);
            });
        });
    }

    function animateCodeLines() {
        const lines = document.querySelectorAll('#about .code-line');
        lines.forEach(l => l.classList.remove('visible'));
        lines.forEach((line, i) => {
            setTimeout(() => {
                if (currentSectionIndex === 1) {
                    line.classList.add('visible');
                }
            }, 300 + i * 160);
        });
    }

    function initDigitalClock() {
        const clockEl = document.getElementById('live-time');
        if (!clockEl) return;
        
        function update() {
            const options = {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            };
            const timeStr = new Intl.DateTimeFormat('en-US', options).format(new Date());
            clockEl.textContent = timeStr;
        }
        
        update();
        setInterval(update, 1000);
    }

    // ========================================================================
    // SHARED WEBGL CARD GLOW RENDERER (NO CONTEXT LIMITS, PERFECT CLIPPING)
    // ========================================================================
    function initSharedWebGL() {
        sharedCanvas = document.createElement('canvas');
        sharedCanvas.width = 200;
        sharedCanvas.height = 200;
        gl = sharedCanvas.getContext('webgl') || sharedCanvas.getContext('experimental-webgl');
        
        if (!gl) {
            console.warn('WebGL not supported for bento hover glows');
            return;
        }

        const vsSource = `
            attribute vec2 a_pos;
            varying vec2 v_uv;
            void main() {
                v_uv = a_pos * 0.5 + 0.5;
                gl_Position = vec4(a_pos, 0.0, 1.0);
            }
        `;

        const fsSource = `
            precision highp float;
            varying vec2 v_uv;
            uniform float u_time;
            uniform vec2 u_res;
            uniform vec3 u_c1;
            uniform vec3 u_c2;
            uniform float u_type;

            // Simple Fractional Brownian Motion Noise
            float hash(vec2 p) {
                p = fract(p * vec2(127.1, 311.7));
                return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
            }
            
            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                float a = hash(i);
                float b = hash(i + vec2(1.0, 0.0));
                float c = hash(i + vec2(0.0, 1.0));
                float d = hash(i + vec2(1.0, 1.0));
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
            }
            
            float fbm(vec2 p) {
                float v = 0.0;
                float a = 0.5;
                for (int i = 0; i < 3; ++i) {
                    v += a * noise(p);
                    p = p * 2.0 + vec2(10.0);
                    a *= 0.5;
                }
                return v;
            }

            void main() {
                vec2 uv = v_uv;
                float ar = u_res.x / u_res.y;
                vec2 p = uv;
                p.x *= ar;
                
                float t = u_time * 0.45;
                
                // Flowing noise offsets
                vec2 q = vec2(0.0);
                q.x = fbm(p + vec2(t * 0.2, t * 0.1));
                q.y = fbm(p + vec2(-t * 0.1, t * 0.3));
                
                vec2 r = vec2(0.0);
                r.x = fbm(p + 3.0 * q + vec2(t * 0.15, t * 0.05));
                r.y = fbm(p + 3.0 * q + vec2(t * -0.1, t * 0.2));
                
                float f = fbm(p + 2.0 * r);
                vec3 col = vec3(0.008, 0.008, 0.012); // Deep card background
                
                if (u_type < 0.5) {
                    // Type 0: Flutter / App Dev: Cyan / Blue / Indigo
                    float d = distance(uv, vec2(0.5, -0.1));
                    float glow = smoothstep(1.1, 0.0, d * 1.1);
                    col = mix(col, u_c1, glow * f * 1.3);
                    col = mix(col, u_c2, smoothstep(0.7, 0.0, d) * 0.8);
                    col += vec3(1.0) * smoothstep(0.4, 0.0, d) * 0.3;
                } 
                else if (u_type < 1.5) {
                    // Type 1: About Main / Dart / ScriptSketch: Orange / Yellow / Red
                    float d = distance(uv, vec2(0.5, -0.2));
                    float glow = smoothstep(1.3, 0.0, d);
                    col = mix(col, u_c1, glow * f * 1.3);
                    col = mix(col, u_c2, smoothstep(0.8, 0.0, distance(uv, vec2(0.8, 0.3))) * 0.7);
                    col += vec3(1.0) * smoothstep(0.5, 0.0, d) * 0.4;
                }
                else if (u_type < 2.5) {
                    // Type 2: Fake Call AI / Pink / Magenta / Blue
                    float d1 = distance(uv, vec2(0.2, 0.2));
                    float d2 = distance(uv, vec2(0.8, 0.8));
                    float glow1 = smoothstep(1.0, 0.0, d1) * f;
                    float glow2 = smoothstep(1.0, 0.0, d2) * (1.0 - f);
                    col = mix(col, u_c1, glow1 * 1.2);
                    col = mix(col, u_c2, glow2 * 1.2);
                    col += vec3(1.0) * smoothstep(0.6, 0.0, d1) * 0.25;
                    col += vec3(1.0) * smoothstep(0.5, 0.0, d2) * 0.25;
                }
                else if (u_type < 3.5) {
                    // Type 3: http_certificate_guard / Green / Teal / Emerald / Star Flare
                    float d = distance(uv, vec2(0.5, 0.5));
                    float glow = smoothstep(0.7, 0.0, d) * f;
                    col = mix(col, u_c1, glow * 1.5);
                    col = mix(col, u_c2, smoothstep(0.4, 0.0, d) * 0.8);
                    
                    // Star flare
                    float star = smoothstep(0.08, 0.0, abs(uv.x - 0.5) + abs(uv.y - 0.5) * 5.0) +
                                 smoothstep(0.08, 0.0, abs(uv.y - 0.5) + abs(uv.x - 0.5) * 5.0);
                    col += vec3(1.0) * star * 0.8;
                }
                else {
                    // Type 4: Purple / Blue / Pink
                    float d = distance(uv, vec2(0.5, 0.0));
                    float glow = smoothstep(1.1, 0.0, d);
                    col = mix(col, u_c1, glow * f * 1.2);
                    col = mix(col, u_c2, smoothstep(0.6, 0.0, d) * 0.9);
                    col += vec3(1.0) * smoothstep(0.3, 0.0, d) * 0.45;
                }
                
                gl_FragColor = vec4(col, 1.0);
            }
        `;

        const vs = compileShader(gl.VERTEX_SHADER, vsSource);
        const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
        if (!vs || !fs) return;

        shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vs);
        gl.attachShader(shaderProgram, fs);
        gl.linkProgram(shaderProgram);
        
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error('Shared shader link error:', gl.getProgramInfoLog(shaderProgram));
            return;
        }

        gl.useProgram(shaderProgram);

        // Quad geometry setup
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
        const posLoc = gl.getAttribLocation(shaderProgram, 'a_pos');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        // Cache uniform references
        uTimeLoc = gl.getUniformLocation(shaderProgram, 'u_time');
        uResLoc = gl.getUniformLocation(shaderProgram, 'u_res');
        uTypeLoc = gl.getUniformLocation(shaderProgram, 'u_type');
        uC1Loc = gl.getUniformLocation(shaderProgram, 'u_c1');
        uC2Loc = gl.getUniformLocation(shaderProgram, 'u_c2');
    }

    function compileShader(type, src) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.error('Shared shader compile error:', gl.getShaderInfoLog(s));
            return null;
        }
        return s;
    }

    function initCardGlows() {
        if (!gl) return;

        cards = Array.from(document.querySelectorAll('.bento-card')).map(cardEl => {
            const canvas = cardEl.querySelector('.card-glow-canvas');
            const ctx = canvas ? canvas.getContext('2d') : null;
            
            // Configuration variables mapped from CSS / Theme requirements
            let type = 4.0;
            let c1 = [0.55, 0.16, 0.96]; // Purple accent
            let c2 = [1.0, 0.0, 0.47];   // Pink accent
            
            if (cardEl.id === 'project-deep-search' || cardEl.id === 'service-app-dev' || cardEl.classList.contains('bento-tech-stack')) {
                type = 0.0;
                c1 = [0.05, 0.65, 0.91]; // Cyan/Sky
                c2 = [0.15, 0.28, 0.95]; // Deep Blue
            } else if (cardEl.id === 'project-scriptsketch' || cardEl.classList.contains('bento-about-main')) {
                type = 1.0;
                c1 = [0.96, 0.35, 0.06]; // Orange/Red
                c2 = [0.98, 0.72, 0.03]; // Gold
            } else if (cardEl.id === 'project-fake-call') {
                type = 2.0;
                c1 = [0.98, 0.02, 0.52]; // Pink
                c2 = [0.44, 0.0, 1.0];   // Violet
            } else if (cardEl.id === 'project-http-guard' || cardEl.id === 'service-backend' || cardEl.classList.contains('bento-status-card')) {
                type = 3.0;
                c1 = [0.06, 0.83, 0.45]; // Emerald
                c2 = [0.05, 0.45, 0.85]; // Teal
            }
            
            const stateObj = {
                el: cardEl,
                canvas,
                ctx,
                type,
                c1,
                c2,
                isHovered: false,
                hoverVal: 0.0
            };

            cardEl.addEventListener('mouseenter', () => {
                stateObj.isHovered = true;
                if (canvas) {
                    canvas.width = cardEl.offsetWidth;
                    canvas.height = cardEl.offsetHeight;
                }
            });

            cardEl.addEventListener('mouseleave', () => {
                stateObj.isHovered = false;
            });

            return stateObj;
        });

        // Start render animation frame loop
        requestAnimationFrame(renderLoop);
    }

    function renderLoop() {
        cards.forEach(c => {
            if (c.isHovered) {
                c.hoverVal += (1.0 - c.hoverVal) * 0.08;
            } else {
                c.hoverVal += (0.0 - c.hoverVal) * 0.08;
            }

            if (c.hoverVal > 0.01 && c.ctx && c.canvas) {
                // Resize shared rendering canvas to match local dimensions
                if (sharedCanvas.width !== c.canvas.width || sharedCanvas.height !== c.canvas.height) {
                    sharedCanvas.width = c.canvas.width;
                    sharedCanvas.height = c.canvas.height;
                    gl.viewport(0, 0, sharedCanvas.width, sharedCanvas.height);
                }

                // Render specific shader style on shared context
                gl.useProgram(shaderProgram);
                gl.uniform1f(uTimeLoc, (Date.now() - startTime) / 1000.0);
                gl.uniform2f(uResLoc, sharedCanvas.width, sharedCanvas.height);
                gl.uniform1f(uTypeLoc, c.type);
                gl.uniform3f(uC1Loc, c.c1[0], c.c1[1], c.c1[2]);
                gl.uniform3f(uC2Loc, c.c2[0], c.c2[1], c.c2[2]);
                
                gl.drawArrays(gl.TRIANGLES, 0, 6);

                // Copy onto card 2D context
                c.ctx.clearRect(0, 0, c.canvas.width, c.canvas.height);
                c.ctx.drawImage(sharedCanvas, 0, 0);
            }
        });

        requestAnimationFrame(renderLoop);
    }

    console.log('%c🚀 Kunu AI Labs Redesigned', 'color:#0ea5e9;font-size:18px;font-weight:bold');
})();
