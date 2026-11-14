import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { TemperatureDataPoint, GlobeProjection } from '../types';
import { useAccessibility } from '../context/AccessibilityContext';
import { RotateCcw, Layers, ZoomIn, ZoomOut, Sparkles } from 'lucide-react';

interface GlobeVisualizationProps {
  currentData: TemperatureDataPoint;
  projection: GlobeProjection;
  onToggleProjection: () => void;
  isPlaying?: boolean;
}

function getExactYear(year: number): number {
  return Math.max(1880, Math.min(2025, Math.round(year)));
}

export const GlobeVisualization: React.FC<GlobeVisualizationProps> = ({
  currentData,
  projection,
  onToggleProjection,
  isPlaying = false,
}) => {
  const { settings, announceToScreenReader } = useAccessibility();
  const [zoom, setZoom] = useState<number>(3.2);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Three.js Core References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sphereMeshRef = useRef<THREE.Mesh | null>(null);
  const atmosphereMeshRef = useRef<THREE.Mesh | null>(null);
  const reqAnimFrameRef = useRef<number | null>(null);
  const textureCacheRef = useRef<Map<number, THREE.Texture>>(new Map());
  const textureLoaderRef = useRef<THREE.TextureLoader | null>(null);

  // Interaction Drag Rotation with smooth inertia
  const isDraggingRef = useRef<boolean>(false);
  const pointerStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // Natural orbital tilt showing Europe, Africa, the Atlantic, and the Arctic warming cap
  const rotationRef = useRef<{ x: number; y: number }>({ x: 0.35, y: -0.55 });
  const velocityRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const anomaly = currentData.anomaly;
  const exactYear = getExactYear(currentData.year);

  // Dynamic atmospheric rim glow color based on temperature anomaly
  const atmoColorHex = settings.highContrast
    ? 0xffe600
    : anomaly > 0.8
    ? 0xff3b30
    : anomaly > 0.3
    ? 0xff9500
    : anomaly < -0.2
    ? 0x00d4ff
    : 0x06b6d4;

  // 1. Initialize Three.js 3D NASA Earth Globe
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    textureLoaderRef.current = new THREE.TextureLoader();

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = canvas.parentElement?.clientWidth || 480;
    const height = canvas.parentElement?.clientHeight || 480;

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 0, zoom);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // Load initial NASA Science On a Sphere texture
    const initialYear = exactYear;
    const texture = textureLoaderRef.current.load(`/data/nasa_spheres/sphere_${initialYear}.jpg`, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      if (sphereMeshRef.current) {
        (sphereMeshRef.current.material as THREE.MeshBasicMaterial).map = tex;
        (sphereMeshRef.current.material as THREE.MeshBasicMaterial).needsUpdate = true;
      }
    });
    texture.colorSpace = THREE.SRGBColorSpace;
    textureCacheRef.current.set(initialYear, texture);

    // High-Resolution Smooth Earth Sphere Geometry (Radius 1.0, 128x128 segments)
    const geometry = new THREE.SphereGeometry(1.0, 128, 128);

    // MeshBasicMaterial renders 100% faithful, saturated NASA heat map colors with zero dark side
    const material = new THREE.MeshBasicMaterial({
      map: texture,
    });

    const sphereMesh = new THREE.Mesh(geometry, material);
    sphereMesh.rotation.x = rotationRef.current.x;
    sphereMesh.rotation.y = rotationRef.current.y;
    scene.add(sphereMesh);
    sphereMeshRef.current = sphereMesh;

    // Atmospheric Glow Halo (Smooth back-facing rim)
    const atmoGeo = new THREE.SphereGeometry(1.025, 64, 64);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: atmoColorHex,
      transparent: true,
      opacity: settings.highContrast ? 0.35 : 0.22,
      side: THREE.BackSide,
    });
    const atmosphereMesh = new THREE.Mesh(atmoGeo, atmoMat);
    scene.add(atmosphereMesh);
    atmosphereMeshRef.current = atmosphereMesh;

    // Preload key milestone years (every 5-10 years) in background
    const keyYears = [1880, 1890, 1900, 1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2016, 2020, 2023, 2024, 2025];
    keyYears.forEach((y) => {
      if (y !== initialYear) {
        textureLoaderRef.current?.load(`/data/nasa_spheres/sphere_${y}.jpg`, (loadedTex) => {
          loadedTex.colorSpace = THREE.SRGBColorSpace;
          loadedTex.minFilter = THREE.LinearFilter;
          loadedTex.magFilter = THREE.LinearFilter;
          textureCacheRef.current.set(y, loadedTex);
        });
      }
    });

    // Animation Render Loop with natural inertia
    const animate = () => {
      reqAnimFrameRef.current = requestAnimationFrame(animate);

      if (isDraggingRef.current) {
        // Dragging
      } else {
        // Inertia damping
        rotationRef.current.y += velocityRef.current.y;
        rotationRef.current.x += velocityRef.current.x;
        velocityRef.current.y *= 0.92;
        velocityRef.current.x *= 0.92;

        // Gentle cinematic orbital rotation when idle and reduced motion is off
        if (!settings.reducedMotion && projection === '3d-orthographic') {
          rotationRef.current.y += 0.0012;
        }
      }

      if (sphereMeshRef.current) {
        sphereMeshRef.current.rotation.x = rotationRef.current.x;
        sphereMeshRef.current.rotation.y = rotationRef.current.y;
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    const handleResize = () => {
      if (!canvas || !cameraRef.current || !rendererRef.current) return;
      const w = canvas.parentElement?.clientWidth || canvas.clientWidth;
      const h = canvas.parentElement?.clientHeight || canvas.clientHeight;
      if (w === 0 || h === 0) return;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h, false);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (reqAnimFrameRef.current) cancelAnimationFrame(reqAnimFrameRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      atmoGeo.dispose();
      atmoMat.dispose();
    };
  }, []);

  // Update camera zoom
  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.position.z = zoom;
      cameraRef.current.updateProjectionMatrix();
    }
  }, [zoom]);

  // Update texture when year changes
  useEffect(() => {
    if (!sphereMeshRef.current || !textureLoaderRef.current) return;

    const targetYear = exactYear;
    let targetTexture = textureCacheRef.current.get(targetYear);

    const applyTexture = (tex: THREE.Texture) => {
      if (!sphereMeshRef.current) return;
      const mat = sphereMeshRef.current.material as THREE.MeshBasicMaterial;
      mat.map = tex;
      if (settings.highContrast) {
        mat.color.setHex(0xffe600);
      } else {
        mat.color.setHex(0xffffff);
      }
      mat.needsUpdate = true;
    };

    if (targetTexture) {
      applyTexture(targetTexture);
    } else {
      targetTexture = textureLoaderRef.current.load(
        `/data/nasa_spheres/sphere_${targetYear}.jpg`,
        (loadedTex) => {
          loadedTex.colorSpace = THREE.SRGBColorSpace;
          loadedTex.minFilter = THREE.LinearFilter;
          loadedTex.magFilter = THREE.LinearFilter;
          textureCacheRef.current.set(targetYear, loadedTex);
          applyTexture(loadedTex);
        }
      );
    }

    // Preload next and previous years for instant scrubbing
    const neighbors = [targetYear - 1, targetYear + 1, targetYear + 2];
    neighbors.forEach((ny) => {
      if (ny >= 1880 && ny <= 2025 && !textureCacheRef.current.has(ny)) {
        textureLoaderRef.current?.load(`/data/nasa_spheres/sphere_${ny}.jpg`, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          textureCacheRef.current.set(ny, tex);
        });
      }
    });
  }, [exactYear, settings.highContrast]);

  // Update atmosphere color on anomaly or high contrast change
  useEffect(() => {
    if (atmosphereMeshRef.current) {
      const mat = atmosphereMeshRef.current.material as THREE.MeshBasicMaterial;
      mat.color.setHex(atmoColorHex);
      mat.opacity = settings.highContrast ? 0.35 : 0.22;
      mat.needsUpdate = true;
    }
  }, [atmoColorHex, settings.highContrast]);

  // Pointer drag to orbit the 3D globe
  const handlePointerDown = (e: React.PointerEvent) => {
    if (projection !== '3d-orthographic') return;
    isDraggingRef.current = true;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    velocityRef.current = { x: 0, y: 0 };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;

    const rotDeltaY = dx * 0.006;
    const rotDeltaX = dy * 0.005;

    rotationRef.current.y += rotDeltaY;
    rotationRef.current.x = Math.max(-1.15, Math.min(1.15, rotationRef.current.x + rotDeltaX));

    velocityRef.current = { x: rotDeltaX * 0.4, y: rotDeltaY * 0.4 };
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleReset = () => {
    rotationRef.current = { x: 0.35, y: -0.55 };
    velocityRef.current = { x: 0, y: 0 };
    setZoom(3.2);
    announceToScreenReader('Reset Earth globe view to Europe and Atlantic.');
  };

  const handleZoomIn = () => setZoom((z) => Math.max(2.2, z - 0.25));
  const handleZoomOut = () => setZoom((z) => Math.min(4.5, z + 0.25));

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className={`relative w-full aspect-square max-w-[540px] mx-auto rounded-full select-none flex items-center justify-center transition-all ${
        projection === '3d-orthographic' ? 'cursor-grab active:cursor-grabbing touch-none' : 'cursor-default'
      }`}
      aria-label={`Authentic NASA SVS Earth globe for year ${currentData.year}, anomaly ${anomaly > 0 ? '+' : ''}${anomaly.toFixed(2)}°C.`}
    >
      {/* Outer Cyan Orbital Glow Halo Ring (Matching Reference Image) */}
      <div
        className={`absolute inset-0 rounded-full pointer-events-none transition-all duration-500 ${
          settings.highContrast
            ? 'border-2 border-[#ffe600] shadow-[0_0_30px_#ffe600]'
            : anomaly > 0.8
            ? 'border border-red-500/50 shadow-[0_0_45px_rgba(239,68,68,0.35)]'
            : anomaly > 0.3
            ? 'border border-amber-500/50 shadow-[0_0_40px_rgba(245,158,11,0.3)]'
            : 'border border-cyan-400/50 shadow-[0_0_45px_rgba(6,182,212,0.38)]'
        }`}
      />

      {/* Subtle Orbital Outer Ring with Orbit Marks */}
      <div
        className={`absolute -inset-1.5 sm:-inset-3 rounded-full pointer-events-none border transition-all duration-500 ${
          settings.highContrast
            ? 'border-[#ffe600]/30'
            : 'border-cyan-500/20 shadow-[inset_0_0_20px_rgba(6,182,212,0.15)]'
        }`}
      />

      {/* Top Floating Glass Controls (Discreet) */}
      <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 pointer-events-auto">
        <button
          onClick={onToggleProjection}
          className={`p-1.5 rounded-lg text-xs font-mono border backdrop-blur-md transition-colors ${
            settings.highContrast
              ? 'bg-black text-[#ffe600] border-[#ffe600]'
              : 'bg-slate-950/70 text-cyan-300 border-cyan-800/60 hover:bg-slate-900'
          }`}
          title="Toggle 3D Globe / 2D Map"
          aria-label="Toggle projection"
        >
          <Layers className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleReset}
          className={`p-1.5 rounded-lg text-xs font-mono border backdrop-blur-md transition-colors ${
            settings.highContrast
              ? 'bg-black text-[#ffe600] border-[#ffe600]'
              : 'bg-slate-950/70 text-slate-300 border-cyan-800/60 hover:text-white hover:bg-slate-900'
          }`}
          title="Reset View Orientation"
          aria-label="Reset globe orientation"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleZoomIn}
          className={`p-1.5 rounded-lg text-xs font-mono border backdrop-blur-md transition-colors ${
            settings.highContrast
              ? 'bg-black text-[#ffe600] border-[#ffe600]'
              : 'bg-slate-950/70 text-slate-300 border-cyan-800/60 hover:text-white hover:bg-slate-900'
          }`}
          title="Zoom In"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleZoomOut}
          className={`p-1.5 rounded-lg text-xs font-mono border backdrop-blur-md transition-colors ${
            settings.highContrast
              ? 'bg-black text-[#ffe600] border-[#ffe600]'
              : 'bg-slate-950/70 text-slate-300 border-cyan-800/60 hover:text-white hover:bg-slate-900'
          }`}
          title="Zoom Out"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3D Canvas OR 2D Map Stage */}
      {projection === '3d-orthographic' ? (
        <canvas
          ref={canvasRef}
          className="w-full h-full rounded-full overflow-hidden"
        />
      ) : (
        <div className="w-full h-full rounded-full overflow-hidden border border-cyan-500/40 relative bg-black">
          <img
            src={`/data/nasa_spheres/sphere_${exactYear}.jpg`}
            alt={`NASA SVS #5603 Flat Projection — Year ${currentData.year}`}
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
};
