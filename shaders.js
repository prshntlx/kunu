// ==========================================================================
// Kunu.dev - Shader Definitions (WebGL / GLSL ES 100)
// Bypasses CORS limitations for file:/// protocols by utilizing global vars.
// ==========================================================================

window.vertexShaderSource = `
    attribute vec2 a_pos;
    void main() {
        gl_Position = vec4(a_pos, 0.0, 1.0);
    }
`;

window.fragmentShaderSource = `
    precision highp float;

    uniform float u_time;
    uniform vec2  u_mouse;
    uniform float u_scroll;
    uniform vec2  u_res;

    // Card glows (7 cards max)
    uniform vec2  u_p0; uniform float u_h0; uniform float u_t0;
    uniform vec2  u_p1; uniform float u_h1; uniform float u_t1;
    uniform vec2  u_p2; uniform float u_h2; uniform float u_t2;
    uniform vec2  u_p3; uniform float u_h3; uniform float u_t3;
    uniform vec2  u_p4; uniform float u_h4; uniform float u_t4;
    uniform vec2  u_p5; uniform float u_h5; uniform float u_t5;
    uniform vec2  u_p6; uniform float u_h6; uniform float u_t6;

    // Project Card Visual Windows (4 project cards)
    uniform vec2  u_vpos[4];
    uniform vec2  u_vsize[4];
    uniform float u_vhover[4];

    // Pseudo-random noise
    float hash(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 19.19);
        return fract(p.x * p.y);
    }

    // 2D Value Noise
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

    // Fractional Brownian Motion (4 octaves)
    float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        vec2 shift = vec2(100.0);
        mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
        for (int i = 0; i < 4; ++i) {
            v += a * noise(p);
            p = rot * p * 2.0 + shift;
            a *= 0.5;
        }
        return v;
    }

    // Organic segment distance field for node network schematic
    float dfSegment(vec2 p, vec2 a, vec2 b) {
        vec2 pa = p - a, ba = b - a;
        float h = clamp(dot(pa, ba)/dot(ba, ba), 0.0, 1.0);
        return length(pa - ba * h);
    }

    // Organic smoky card glow helper
    vec3 smokyCardGlow(vec2 aUv, vec2 pos, float hov, float type, vec2 smokeDistort, float time, float ar) {
        if (hov < 0.001) return vec3(0.0);
        
        // Warp coordinates with the global smoke distortion to make it look organic
        vec2 warpedUv = aUv + smokeDistort * 0.08;
        
        // Aspect-ratio corrected card position
        vec2 correctedPos = vec2(pos.x * ar, pos.y);
        
        // Calculate distance in aspect-corrected space
        float d = distance(warpedUv, correctedPos);
        
        // Smooth smoke border glow: dynamic radius on hover
        float glowRadius = 0.35 + 0.05 * sin(time * 2.0 + hash(pos) * 6.28);
        float g = smoothstep(glowRadius, 0.0, d) * hov;
        
        // Choose vibrant colors
        vec3 col = vec3(0.0);
        if (type < 0.5) {
            col = mix(vec3(0.0, 0.94, 1.0), vec3(0.0, 0.35, 1.0), sin(time + aUv.x) * 0.5 + 0.5); // Cyan - Blue
        } else if (type < 1.5) {
            col = mix(vec3(1.0, 0.65, 0.0), vec3(1.0, 0.1, 0.0), cos(time * 0.8 + aUv.y) * 0.5 + 0.5); // Gold - Red/Orange
        } else if (type < 2.5) {
            col = mix(vec3(1.0, 0.0, 0.75), vec3(0.45, 0.0, 1.0), sin(time * 1.2) * 0.5 + 0.5); // Magenta - Violet
        } else if (type < 3.5) {
            col = mix(vec3(0.0, 1.0, 0.5), vec3(0.0, 0.6, 1.0), cos(time + aUv.x * 2.0) * 0.5 + 0.5); // Green - Cyan
        } else if (type < 4.5) {
            col = mix(vec3(0.44, 0.0, 1.0), vec3(1.0, 0.0, 0.5), sin(time * 0.9) * 0.5 + 0.5); // Violet - Magenta
        } else {
            col = mix(vec3(0.1, 0.45, 1.0), vec3(0.0, 0.95, 0.8), sin(time) * 0.5 + 0.5); // Blue - Teal
        }
        
        // Return smoky glow
        return col * g * 0.52;
    }

    void main() {
        vec2 uv = gl_FragCoord.xy / u_res.xy;
        float ar = u_res.x / u_res.y;
        vec2 aUv = vec2(uv.x * ar, uv.y);
        vec2 aMouse = vec2(u_mouse.x * ar, u_mouse.y);
        
        float t = u_time * 0.18;
        float vel = clamp(abs(u_scroll) * 0.02, 0.0, 1.5);
        
        // === MOUSE SWIRL DISTORTION ===
        float mouseDistance = distance(aUv, aMouse);
        vec2 mouseForce = vec2(0.0);
        if (mouseDistance < 0.6) {
            float force = smoothstep(0.6, 0.0, mouseDistance);
            vec2 dir = normalize(aUv - aMouse);
            vec2 swirl = vec2(-dir.y, dir.x);
            mouseForce = (dir * 0.25 + swirl * 0.75) * force * 0.08 * (1.0 + vel * 0.5);
        }
        
        vec2 distortedUv = aUv + mouseForce;
        
        // === DOMAIN WARPED SMOKY BACKGROUND (FBM) ===
        vec2 q = vec2(0.0);
        q.x = fbm(distortedUv * 1.5 + vec2(0.0, t * 0.1));
        q.y = fbm(distortedUv * 1.5 + vec2(5.2, t * 0.12));
        
        vec2 r = vec2(0.0);
        r.x = fbm(distortedUv * 2.0 + 3.0 * q + vec2(1.7, t * 0.08));
        r.y = fbm(distortedUv * 2.0 + 3.0 * q + vec2(9.2, t * 0.06));
        
        float f = fbm(distortedUv * 1.2 + 3.0 * r);
        
        vec3 colorBg = vec3(0.02, 0.02, 0.035); // Obsidian space backdrop
        vec3 smokyCol1 = vec3(0.06, 0.01, 0.12); // Deep rich violet
        vec3 smokyCol2 = vec3(0.01, 0.05, 0.10); // Deep rich teal/cyan
        vec3 smokyCol3 = vec3(0.18, 0.0, 0.24);  // Glowing purple smoke
        vec3 smokyCol4 = vec3(0.0, 0.16, 0.20);  // Glowing cyan smoke
        
        vec3 finalBg = mix(colorBg, smokyCol1, f);
        finalBg = mix(finalBg, smokyCol2, dot(q, r) * 1.2);
        
        float backgroundFlare = r.x * (1.0 + vel * 2.5);
        finalBg = mix(finalBg, smokyCol3, backgroundFlare * 0.45);
        finalBg = mix(finalBg, smokyCol4, q.y * 0.35);
        
        vec3 finalCol = finalBg;
        
        // === FLOATING TECH DOT GRID ===
        float gs = 32.0;
        vec2 gUv = aUv * gs - vec2(t * 0.4, 0.0);
        vec2 gId = floor(gUv);
        vec2 gFr = fract(gUv) - 0.5;
        
        float nh = hash(gId);
        vec2 dotOff = vec2(sin(t * 0.5 + nh * 6.28), cos(t * 0.4 + nh * 6.28)) * 0.18;
        float dotDist = length(gFr - dotOff);
        float dotVal = smoothstep(0.04, 0.0, dotDist);
        
        float dotMouseGlow = smoothstep(0.5, 0.0, mouseDistance);
        float dotOpacity = (0.035 + nh * 0.05 + dotMouseGlow * 0.25) * dotVal;
        
        vec3 gridCol = mix(vec3(0.0, 0.94, 1.0), vec3(0.44, 0.0, 1.0), nh);
        finalCol += gridCol * dotOpacity;
        
        // === SMOKY INTERACTIVE MOUSE GLOW ===
        float mouseGlowRadius = 0.5 + vel * 0.25;
        float mouseGlow = smoothstep(mouseGlowRadius, 0.0, mouseDistance);
        vec3 mouseColor = mix(vec3(0.0, 0.94, 1.0), vec3(1.0, 0.0, 0.8), sin(t * 0.5) * 0.5 + 0.5);
        float mouseGlowWarp = noise(aUv * 4.0 + vec2(0.0, t));
        finalCol += mouseColor * mouseGlow * (0.08 + mouseGlowWarp * 0.08);
        
        // === PROJECT VISUAL GRAPHICS (SHARP GLOWING GPU RENDERINGS) ===
        vec3 graphicsCol = vec3(0.0);
        
        // 1. Card 0: Deep Search AI (Radar Sweep)
        vec2 d0 = aUv - u_vpos[0];
        if (abs(d0.x) < u_vsize[0].x && abs(d0.y) < u_vsize[0].y) {
            vec2 localUv = d0 / u_vsize[0];
            float windowAr = u_vsize[0].x / u_vsize[0].y;
            localUv.x *= windowAr;
            
            float d = length(localUv);
            float angle = atan(localUv.y, localUv.x);
            float normAngle = (angle + 3.14159) / 6.28318;
            float sweep = fract(normAngle - u_time * 0.38);
            
            vec3 radarCol = vec3(0.0, 0.94, 1.0) * smoothstep(0.0, 0.9, sweep) * 0.45;
            
            float r1 = smoothstep(0.015, 0.0, abs(d - 0.3));
            float r2 = smoothstep(0.015, 0.0, abs(d - 0.6));
            float r3 = smoothstep(0.015, 0.0, abs(d - 0.9));
            float dashPattern = step(0.0, sin(angle * 12.0));
            radarCol += vec3(0.0, 0.94, 1.0) * (r1 + r2 + r3) * 0.16 * dashPattern;
            
            vec2 dotPos = vec2(cos(u_time * 2.38), sin(u_time * 2.38)) * 0.45;
            float targetGlow = smoothstep(0.08, 0.0, distance(localUv, dotPos));
            radarCol += vec3(0.0, 0.94, 1.0) * targetGlow * 0.8;
            
            float core = smoothstep(0.06, 0.0, d);
            radarCol += vec3(0.0, 0.94, 1.0) * core * 0.4;
            
            graphicsCol += radarCol * (0.35 + 0.65 * u_vhover[0]);
        }
        
        // 2. Card 1: ScriptSketch (Node Network)
        vec2 d1 = aUv - u_vpos[1];
        if (abs(d1.x) < u_vsize[1].x && abs(d1.y) < u_vsize[1].y) {
            vec2 localUv = d1 / u_vsize[1];
            float windowAr = u_vsize[1].x / u_vsize[1].y;
            localUv.x *= windowAr;
            
            vec2 n1 = vec2(-0.7, -0.4);
            vec2 n2 = vec2(0.0, 0.15 + 0.05 * sin(u_time * 2.0));
            vec2 n3 = vec2(0.7, -0.4);
            vec2 n4 = vec2(-0.45, 0.45);
            vec2 n5 = vec2(0.45, 0.45);
            
            float l1 = smoothstep(0.012, 0.0, dfSegment(localUv, n1, n2));
            float l2 = smoothstep(0.012, 0.0, dfSegment(localUv, n2, n3));
            float l3 = smoothstep(0.012, 0.0, dfSegment(localUv, n1, n4));
            float l4 = smoothstep(0.012, 0.0, dfSegment(localUv, n3, n5));
            float l5 = smoothstep(0.012, 0.0, dfSegment(localUv, n4, n5));
            
            float dashedLines = (l1 + l2 + l3 + l4 + l5) * 0.25;
            
            float nodeGlow1 = smoothstep(0.055, 0.0, length(localUv - n1));
            float nodeGlow2 = smoothstep(0.075 + 0.01 * sin(u_time * 5.0), 0.0, length(localUv - n2));
            float nodeGlow3 = smoothstep(0.055, 0.0, length(localUv - n3));
            float nodeGlow4 = smoothstep(0.055, 0.0, length(localUv - n4));
            float nodeGlow5 = smoothstep(0.055, 0.0, length(localUv - n5));
            
            vec3 nodeCol = vec3(1.0, 0.62, 0.0);
            graphicsCol += nodeCol * (dashedLines + nodeGlow1 * 0.7 + nodeGlow2 * 1.2 + nodeGlow3 * 0.7 + nodeGlow4 * 0.7 + nodeGlow5 * 0.7) * (0.35 + 0.65 * u_vhover[1]);
        }
        
        // 3. Card 2: Fake Call AI (Audio Waveform)
        vec2 d2 = aUv - u_vpos[2];
        if (abs(d2.x) < u_vsize[2].x && abs(d2.y) < u_vsize[2].y) {
            vec2 localUv = d2 / u_vsize[2];
            float windowAr = u_vsize[2].x / u_vsize[2].y;
            localUv.x *= windowAr;
            
            float bars = 0.0;
            for (int i = 0; i < 8; ++i) {
                float fi = float(i);
                float barX = -0.7 + fi * 0.2;
                float distH = abs(localUv.x - barX);
                
                float h = 0.15 + 0.4 * (0.5 + 0.5 * sin(u_time * 5.5 + fi * 1.2));
                float distV = abs(localUv.y);
                
                if (distH < 0.04 && distV < h) {
                    float val = smoothstep(0.04, 0.0, distH) * smoothstep(h, h - 0.05, distV);
                    bars += val;
                }
            }
            graphicsCol += vec3(1.0, 0.0, 0.75) * bars * (0.3 + 0.7 * u_vhover[2]);
        }
        
        // 4. Card 3: http_certificate_guard (Security Shield)
        vec2 d3 = aUv - u_vpos[3];
        if (abs(d3.x) < u_vsize[3].x && abs(d3.y) < u_vsize[3].y) {
            vec2 localUv = d3 / u_vsize[3];
            float windowAr = u_vsize[3].x / u_vsize[3].y;
            localUv.x *= windowAr;
            
            float d = length(localUv);
            
            float outer = smoothstep(0.02, 0.0, abs(d - 0.72));
            float outerAngle = atan(localUv.y, localUv.x) + u_time * 1.2;
            if (sin(outerAngle * 4.0) > 0.0) outer *= 1.0; else outer = 0.0;
            
            float inner = smoothstep(0.02, 0.0, abs(d - 0.52));
            float innerAngle = atan(localUv.y, localUv.x) - u_time * 1.8;
            if (sin(innerAngle * 3.0) > 0.0) inner *= 1.0; else inner = 0.0;
            
            float core = smoothstep(0.32, 0.0, d) * (0.35 + 0.08 * sin(u_time * 4.0));
            
            float body = (abs(localUv.x) < 0.11 && abs(localUv.y + 0.05) < 0.08) ? 1.0 : 0.0;
            float shackle = (abs(d - 0.13) < 0.02 && localUv.y > -0.05 && localUv.y < 0.14 && abs(localUv.x) < 0.13) ? 1.0 : 0.0;
            float lock = max(body, shackle);
            
            vec3 shieldCol = vec3(0.0, 1.0, 0.5);
            graphicsCol += shieldCol * (outer + inner + core * 0.4 + lock * 1.1) * (0.35 + 0.65 * u_vhover[3]);
        }
        
        finalCol += graphicsCol;
        
        // === ORGANIC DYNAMIC CARD GLOWS (SMOKY BLOBS) ===
        finalCol += smokyCardGlow(aUv, u_p0, u_h0, u_t0, r, t, ar);
        finalCol += smokyCardGlow(aUv, u_p1, u_h1, u_t1, r, t, ar);
        finalCol += smokyCardGlow(aUv, u_p2, u_h2, u_t2, r, t, ar);
        finalCol += smokyCardGlow(aUv, u_p3, u_h3, u_t3, r, t, ar);
        finalCol += smokyCardGlow(aUv, u_p4, u_h4, u_t4, r, t, ar);
        finalCol += smokyCardGlow(aUv, u_p5, u_h5, u_t5, r, t, ar);
        finalCol += smokyCardGlow(aUv, u_p6, u_h6, u_t6, r, t, ar);
        
        // === VIGNETTE ===
        float vign = smoothstep(1.3, 0.35, length((uv - 0.5) * vec2(1.0, u_res.y/u_res.x)));
        finalCol *= mix(0.78, 1.0, vign);
        
        gl_FragColor = vec4(finalCol, 1.0);
    }
`;
