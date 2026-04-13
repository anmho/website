'use client';

import { useEffect, useRef } from 'react';

// ASCII donut — Andy Sloane's donut.c algorithm, rendered to canvas.
// Torus with major radius R2=2, minor radius R1=1, rotated by angles A and B.
const R1 = 1;
const R2 = 2;
const K2 = 5;
const CHARS = '.,-~:;=!*#$@';

export default function AsciiDonut() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    let A = 1; // rotation angle around X-axis
    let B = 0; // rotation angle around Z-axis
    let mouseX = 0;
    let mouseY = 0;

    const onMouse = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouse);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    let animId = 0;
    let prev = -1;

    const frame = (now: number) => {
      animId = requestAnimationFrame(frame);
      if (prev < 0) prev = now;
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;

      A += dt * 0.7 + mouseY * 0.003;
      B += dt * 0.3 + mouseX * 0.003;

      const W = canvas.width;
      const H = canvas.height;
      if (!W || !H) return;

      const isDark = document.documentElement.classList.contains('dark');

      const FONT_SIZE = Math.max(10, Math.round(Math.min(W, H) / 38));
      const CW = FONT_SIZE * 0.56;
      const CH = FONT_SIZE;
      const cols = Math.floor(W / CW);
      const rows = Math.floor(H / CH);

      // K1: chosen so the donut fills roughly the canvas
      const K1 = Math.min(cols, rows) * K2 * 0.9 / (R1 + R2) / 2;

      const cosA = Math.cos(A), sinA = Math.sin(A);
      const cosB = Math.cos(B), sinB = Math.sin(B);

      const output = new Array<string>(cols * rows).fill('');
      const zbuf = new Float32Array(cols * rows).fill(0);
      const lbuf = new Float32Array(cols * rows).fill(0);

      // Step sizes match original donut.c proportions
      for (let theta = 0; theta < 2 * Math.PI; theta += 0.05) {
        const cosTheta = Math.cos(theta), sinTheta = Math.sin(theta);

        for (let phi = 0; phi < 2 * Math.PI; phi += 0.018) {
          const cosPhi = Math.cos(phi), sinPhi = Math.sin(phi);

          // Circle point before rotation
          const circleX = R2 + R1 * cosTheta;
          const circleY = R1 * sinTheta;

          // 3D coords after rotating by A (X-axis) then B (Z-axis)
          const x = circleX * (cosB * cosPhi + sinA * sinB * sinPhi) - circleY * cosA * sinB;
          const y = circleX * (sinB * cosPhi - sinA * cosB * sinPhi) + circleY * cosA * cosB;
          const z = K2 + cosA * circleX * sinPhi + circleY * sinA;
          const ooz = 1 / z;

          const xp = Math.floor(cols / 2 + K1 * ooz * x);
          const yp = Math.floor(rows / 2 - K1 * ooz * y * (CW / CH)); // aspect correction

          if (xp < 0 || xp >= cols || yp < 0 || yp >= rows) continue;

          // Luminance from the original donut.c formula
          const L =
            cosPhi * cosTheta * sinB
            - cosA * cosTheta * sinPhi
            - sinA * sinTheta
            + cosB * (cosA * sinTheta - cosTheta * sinA * sinPhi);

          const idx = yp * cols + xp;
          if (ooz > zbuf[idx]) {
            zbuf[idx] = ooz;
            lbuf[idx] = L;
            const li = Math.max(0, Math.floor(L * CHARS.length));
            output[idx] = L > 0 ? CHARS[Math.min(li, CHARS.length - 1)] : ' ';
          }
        }
      }

      ctx.clearRect(0, 0, W, H);
      ctx.font = `${FONT_SIZE}px 'Courier New', monospace`;
      ctx.textBaseline = 'top';

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const ch = output[idx];
          if (!ch || ch === ' ') continue;

          const L = lbuf[idx];
          const v = isDark
            ? Math.floor(45 + L * 210)
            : Math.floor(180 - L * 160);

          ctx.fillStyle = `rgb(${v},${v},${v})`;
          ctx.fillText(ch, c * CW, r * CH);
        }
      }
    };

    animId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouse);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  );
}
