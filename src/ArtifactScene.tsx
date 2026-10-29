import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Artifact } from './shared';

const palette = ['#9ef9ff', '#ffab6b', '#b69cff', '#70ddff'];
export function ArtifactScene({ artifact, transparent = false, portalAt = 0 }: { artifact?: Artifact; transparent?: boolean; portalAt?: number }) {
  const host = useRef<HTMLDivElement>(null); const data = useRef({ artifact, portalAt }); data.current = { artifact, portalAt };
  const [error, setError] = useState('');
  useEffect(() => {
    const container = host.current!; let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' }); }
    catch { setError('3D unavailable. Enable hardware acceleration to view the artifact. Your artifact and controls are safe.'); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.45;
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(38, 1, .1, 100); camera.position.set(0, .15, 9);
    const group = new THREE.Group(); scene.add(group);
    const coreMaterial = new THREE.MeshPhysicalMaterial({ color: '#90dfff', metalness: .85, roughness: .2, clearcoat: 1, emissive: '#236b92', emissiveIntensity: 1.1, flatShading: true });
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(.88, 1), coreMaterial); group.add(core);
    const cage = new THREE.Mesh(new THREE.IcosahedronGeometry(1.13, 1), new THREE.MeshBasicMaterial({ color: '#b1fbff', wireframe: true, transparent: true, opacity: .28, blending: THREE.AdditiveBlending })); group.add(cage);
    const inner = new THREE.Mesh(new THREE.OctahedronGeometry(.6), new THREE.MeshBasicMaterial({ color: '#ecffff', wireframe: true, transparent: true, opacity: .8, blending: THREE.AdditiveBlending })); group.add(inner);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(1.65, 32, 24), new THREE.ShaderMaterial({
      uniforms: { tint: { value: new THREE.Color('#52cfff') } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){vec4 p=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
      fragmentShader: 'varying vec3 vN; varying vec3 vV; uniform vec3 tint; void main(){float f=pow(max(0.,1.-abs(dot(normalize(vN),normalize(vV)))),3.); gl_FragColor=vec4(tint,f*.16);}',
    })); group.add(glow);
    const rings: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>[] = [];
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55 + i * .25, .008 + i * .003, 6, 160, Math.PI * (1.3 + i * .25)), new THREE.MeshBasicMaterial({ color: i === 1 ? '#a994ff' : '#93f4ff', transparent: true, opacity: .55, blending: THREE.AdditiveBlending }));
      ring.rotation.set(.6 + i * .8, i * .65, i * 2); group.add(ring); rings.push(ring);
    }
    const crystalGeo = new THREE.OctahedronGeometry(.15); const crystalMat = new THREE.MeshPhysicalMaterial({ color: '#a5f2ff', metalness: .55, roughness: .1, emissive: '#267ea2', emissiveIntensity: .8, flatShading: true });
    const crystals: THREE.Mesh[] = [];
    for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(crystalGeo, crystalMat); group.add(m); crystals.push(m); }
    let seed = 417; const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const count = transparent ? 440 : 900; const positions = new Float32Array(count * 3); const pSeeds: number[] = [];
    for (let i = 0; i < count; i++) { pSeeds.push(rand(), rand(), rand()); const r = 2.2 + rand() * 3.4; const theta = rand() * Math.PI * 2; positions[i * 3] = Math.cos(theta) * r; positions[i * 3 + 1] = (rand() - .5) * 6; positions[i * 3 + 2] = Math.sin(theta) * r; }
    const particleGeo = new THREE.BufferGeometry(); particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({ color: '#8ad3ed', size: .018, transparent: true, opacity: .6, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(particles);
    const arcs: THREE.Line[] = [];
    for (let i = 0; i < 5; i++) {
      const points: THREE.Vector3[] = []; for (let j = 0; j < 45; j++) { const a = j / 44 * Math.PI * 1.6; const r = 1.22 + rand() * .13; points.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, (rand() - .5) * .2)); }
      const arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: '#bf9bff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending })); arc.rotation.set(i * .9, i * 1.2, i); group.add(arc); arcs.push(arc);
    }
    const portal = new THREE.Group(); scene.add(portal); portal.position.z = -.6;
    const membraneMaterial = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, fade: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec2 vUv; uniform float time; uniform float fade;
        void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float a=atan(p.y,p.x);
        float turbulence=sin(a*9.+time*1.7+sin(a*3.-time)*2.)*.025+sin(a*23.-time*2.)*.012;
        float rim=exp(-abs(r-.79-turbulence)*95.);
        float corona=exp(-abs(r-.79)*19.);
        float streams=pow(max(0.,sin(a*11.+r*22.-time*3.+sin(a*4.+time))),8.);
        float veil=streams*smoothstep(.32,.72,r)*(1.-smoothstep(.76,.98,r));
        float filament=pow(max(0.,sin(r*100.-time*6.+sin(a*7.)*3.)),18.)*corona;
        vec3 cyan=vec3(.23,.8,1.);vec3 violet=vec3(.57,.35,1.);
        vec3 color=mix(cyan,violet,.5+.5*sin(a*2.+time*.3));
        float alpha=(rim*.95+corona*.17+veil*.2+filament*.22)*fade;
        gl_FragColor=vec4(color*(1.+rim),clamp(alpha,0.,1.));}`,
    });
    const membrane = new THREE.Mesh(new THREE.PlaneGeometry(5.25, 5.25), membraneMaterial); portal.add(membrane);
    const portalRings: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>[] = [];
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(2 + i * .035, .012 + (i % 3) * .012, 8, 180, i % 2 ? Math.PI * 1.7 : Math.PI * 2), new THREE.MeshBasicMaterial({ color: i % 3 ? '#74e9ff' : '#b99cff', transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.rotation.z = i; portal.add(m); portalRings.push(m);
    }
    const emberPositions = new Float32Array(160 * 3); const emberGeometry = new THREE.BufferGeometry(); emberGeometry.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));
    const embers = new THREE.Points(emberGeometry, new THREE.PointsMaterial({ color: '#ffae67', size: .035, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false })); group.add(embers);
    scene.add(new THREE.AmbientLight('#b9dfff', 2)); const light = new THREE.PointLight('#8eeeff', 28, 20); light.position.set(2, 3, 4); scene.add(light);
    const violet = new THREE.PointLight('#a180ff', 20, 20); violet.position.set(-3, -1, 1); scene.add(violet);
    const resize = () => { const w = container.clientWidth, h = container.clientHeight; renderer.setSize(w, h); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(container); resize();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)'); let frame = 0; let destroyed = false; const started = performance.now();
    const color = new THREE.Color(); const target = new THREE.Color(); const colors = palette.map(c => new THREE.Color(c));
    function animate() {
      if (destroyed) return; frame = requestAnimationFrame(animate); if (document.hidden) return;
      const t = (performance.now() - started) / 1000; const motion = reduced.matches ? .15 : 1;
      const a = data.current.artifact; const e = a?.energy ?? { light: 0, fire: 0, storm: 0, crystal: 0 }; const total = e.light + e.fire + e.storm + e.crystal;
      target.setRGB(0, 0, 0); const weights = [e.light + 2, e.fire, e.storm, e.crystal]; const denom = total + 2;
      colors.forEach((c, i) => target.add(color.copy(c).multiplyScalar(weights[i] / denom)));
      coreMaterial.color.lerp(target, .03); coreMaterial.emissive.copy(coreMaterial.color).multiplyScalar(.4 + Math.min(1.6, e.light * .22));
      (glow.material as THREE.ShaderMaterial).uniforms.tint.value.copy(coreMaterial.color);
      const size = 1 + Math.min(.38, Math.log2(total + 1) * .045);
      core.scale.set(size * (1 + Math.min(.2, e.fire * .015) * Math.sin(t * 2.2) * motion), size, size);
      core.rotation.set(t * .17 * motion, t * .23 * motion + (a?.seed ?? 0) * .001, Math.sin(t * .2) * .2);
      cage.rotation.set(-t * .08 * motion, t * .11 * motion, .2); cage.scale.setScalar(size);
      inner.rotation.y = -t * .3 * motion; group.position.y = Math.sin(t * .65) * .12 * motion;
      rings.forEach((r, i) => { r.rotation.z += .001 * (i + 1) * motion; r.rotation.y = Math.sin(t * .12 + i) * .6 + i; r.scale.setScalar(size); r.material.opacity = .4 + Math.min(.5, e.light * .12); });
      crystals.forEach((m, i) => { const active = i < Math.min(12, e.crystal); m.visible = active; const ang = i / 12 * Math.PI * 2 + t * .08 * motion; const rad = 1.18 * size;
        m.position.set(Math.cos(ang) * rad, Math.sin(ang) * rad, Math.sin(i * 2) * .45); m.scale.set(.65, 1.3 + Math.min(e.crystal, 16) * .06, .65); m.lookAt(0, 0, 0); });
      arcs.forEach((m, i) => { (m.material as THREE.LineBasicMaterial).opacity = Math.min(.85, e.storm * .27) * (.7 + .3 * Math.sin(t * (2 + i) * motion + i)); m.rotation.z = t * .16 * motion + i; m.scale.setScalar(size); });
      embers.visible = e.fire > 0; const emberCount = Math.min(160, 20 + e.fire * 12); emberGeometry.setDrawRange(0, emberCount);
      for (let i = 0; i < emberCount; i++) { const q = i * 2.39996 + t * (.3 + (i % 5) * .025) * motion; const r = 1.15 + ((i * .618 + t * .15 * motion) % 1) * (.6 + Math.min(1, e.fire * .1)); emberPositions[i * 3] = Math.cos(q) * r; emberPositions[i * 3 + 1] = Math.sin(q) * r * .8; emberPositions[i * 3 + 2] = Math.sin(i * 1.7 + t * .2) * .65; }
      emberGeometry.attributes.position.needsUpdate = true;
      particles.rotation.y = t * .025 * motion; particles.rotation.z = Math.sin(t * .05) * .08;
      const age = data.current.portalAt ? (Date.now() - data.current.portalAt) / 1000 : 99;
      portal.visible = age >= 0 && age < 8;
      if (portal.visible) {
        const opening = Math.min(1, age / 1.3); const closing = Math.min(1, (8 - age) / 2);
        portal.scale.setScalar(Math.max(.01, opening * closing)); portal.rotation.y = Math.sin(age * .35) * .12;
        membraneMaterial.uniforms.time.value = age * motion; membraneMaterial.uniforms.fade.value = Math.min(1, age) * closing;
        portalRings.forEach((r, i) => { r.rotation.z = age * (i % 2 ? .25 : -.25) * motion + i; r.material.opacity = .6 * closing; });
        group.scale.setScalar(Math.max(.01, Math.min(1, (age - .6) / 1.5)));
      } else group.scale.setScalar(1);
      renderer.render(scene, camera);
    }
    const lost = (event: Event) => { event.preventDefault(); setError('3D connection lost. Reload this view to restore the visual.'); };
    renderer.domElement.addEventListener('webglcontextlost', lost); animate();
    return () => {
      destroyed = true; cancelAnimationFrame(frame); observer.disconnect(); renderer.domElement.removeEventListener('webglcontextlost', lost);
      const geometries = new Set<THREE.BufferGeometry>(); const materials = new Set<THREE.Material>();
      scene.traverse(obj => { const mesh = obj as THREE.Mesh; if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => materials.add(m)); });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); renderer.dispose(); renderer.domElement.remove();
    };
  }, [transparent]);
  return <div ref={host} className="artifact-canvas" role="img" aria-label={artifact ? `Living 3D artifact ${artifact.name}` : 'Unforged artifact preview'}>{error && <p className="webgl-error">{error}</p>}</div>;
}
