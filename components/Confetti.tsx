
import React, { useEffect, useRef } from 'react';

const Confetti: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: any[] = [];
    
    // Theme colors
    const colors = ['#06b6d4', '#8b5cf6', '#ec4899', '#fbbf24', '#ffffff'];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    const createParticles = () => {
       particles = [];
       for(let i=0; i<150; i++) {
           particles.push({
               x: Math.random() * canvas.width,
               y: Math.random() * canvas.height - canvas.height, // Start above screen
               vx: (Math.random() - 0.5) * 4,
               vy: Math.random() * 3 + 2,
               color: colors[Math.floor(Math.random() * colors.length)],
               size: Math.random() * 6 + 3,
               rotation: Math.random() * 360,
               rotationSpeed: (Math.random() - 0.5) * 5
           });
       }
    };

    const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(p => {
            p.y += p.vy;
            p.x += p.vx;
            p.rotation += p.rotationSpeed;
            
            // Loop particles
            if(p.y > canvas.height) {
                p.y = -20;
                p.x = Math.random() * canvas.width;
            }

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
            ctx.restore();
        });

        animationFrameId = requestAnimationFrame(draw);
    };

    resize();
    createParticles();
    draw();
    
    window.addEventListener('resize', resize);
    return () => {
        window.removeEventListener('resize', resize);
        cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[100]" />;
};

export default Confetti;
