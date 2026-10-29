import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Artifact } from './shared';

// Four contribution colors share the Aurora design system. Facets are authored geometry,
// with simulated luminous reflections; no ray tracing or costly transmission pass.
const aurora = { violet: '#8054ff', pink: '#ff609e', teal: '#37dcd0', gold: '#ffbc69', white: '#f7f5ff', storm: '#62cfff', deep: '#261254' };
const palette = [aurora.gold, aurora.pink, aurora.storm, aurora.violet];
function prismGeometry() {
  const vertices: number[] = [], colors: number[] = [];
  const rings = [
    { y: -1.75, r: 0 },
    { y: -1.05, r: .46 },
    { y: -.45, r: .92 },
    { y: .12, r: 1.08 },
    { y: .68, r: .76 },
    { y: 1.22, r: .38 },
    { y: 1.78, r: 0 }
  ];
  const ringColors = [
    new THREE.Color('#31106e'),
    new THREE.Color('#7838ff'),
    new THREE.Color('#00d2c4'),
    new THREE.Color('#ff3e8f'),
    new THREE.Color('#00c8ff'),
    new THREE.Color('#a855f7'),
    new THREE.Color('#38bdf8')
  ];
  const point = (ring: number, i: number) => {
    const a = i / 12 * Math.PI * 2 + (ring % 2 ? .13 : 0);
    const radius = rings[ring].r * (1 + .05 * Math.sin(i * 2.3 + ring));
    return new THREE.Vector3(Math.cos(a) * radius, rings[ring].y, Math.sin(a) * radius);
  };
  const triangle = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, ringA: number, ringB: number, facetIdx: number) => {
    const facetShimmer = 1 + ((facetIdx * 7) % 5) * .035;
    for (const [p, r] of [[a, ringA], [b, ringB], [c, ringB]] as const) {
      vertices.push(p.x, p.y, p.z);
      const col = ringColors[r].clone().multiplyScalar(facetShimmer);
      colors.push(col.r, col.g, col.b);
    }
  };
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < 12; i++) {
      triangle(point(r, i), point(r + 1, i), point(r + 1, (i + 1) % 12), r, r + 1, i + r * 3);
      triangle(point(r, i), point(r + 1, (i + 1) % 12), point(r, (i + 1) % 12), r, r + 1, i + r * 3 + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}
export function ArtifactScene({ artifact, transparent = false, portalAt = 0 }: { artifact?: Artifact; transparent?: boolean; portalAt?: number }) {
  const host = useRef<HTMLDivElement>(null); const data = useRef({ artifact, portalAt }); data.current = { artifact, portalAt };
  const [error, setError] = useState('');
  useEffect(() => {
    const container = host.current!; let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' }); }
    catch { setError('3D unavailable. Enable hardware acceleration to view the artifact. Your artifact and controls are safe.'); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(38, 1, .1, 100); camera.position.set(0, .65, 9); camera.lookAt(0,-.1,0);
    const group = new THREE.Group(); scene.add(group);
    const prism = prismGeometry();
    const coreMaterial = new THREE.ShaderMaterial({ vertexColors: true, side: THREE.DoubleSide, uniforms: { tint: { value: new THREE.Color(aurora.teal) }, power: { value: 0 }, time: { value: 0 } },
      vertexShader: 'varying vec3 vColor; varying vec3 vN; varying vec3 vView; varying vec3 vPos; void main(){vColor=color;vN=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.);vView=normalize(-p.xyz);vPos=position;gl_Position=projectionMatrix*p;}',
      fragmentShader: `varying vec3 vColor;varying vec3 vN;varying vec3 vView;varying vec3 vPos;uniform vec3 tint;uniform float power;uniform float time;
      void main(){
        vec3 n=normalize(vN);vec3 v=normalize(vView);
        vec3 keyL=normalize(vec3(-.35,.85,.9));vec3 fillL=normalize(vec3(.6,-.4,.7));vec3 rimL=normalize(vec3(0.,.9,-.8));
        float diffKey=abs(dot(n,keyL));float diffFill=abs(dot(n,fillL))*.35;
        float specKey=pow(abs(dot(reflect(-keyL,n),v)),40.);float specFill=pow(abs(dot(reflect(-fillL,n),v)),70.);float glint=pow(abs(dot(reflect(-rimL,n),v)),90.);
        float fresnel=pow(1.-abs(dot(n,v)),2.6);
        vec3 dispersion=vec3(pow(1.-abs(dot(n,v)),2.2),pow(1.-abs(dot(n,v)),2.6),pow(1.-abs(dot(n,v)),3.0));
        float dist=length(vPos);float coreGlow=clamp(1.3-dist*.7,0.,1.);
        vec3 innerLight=vec3(1.,.75,.28)*pow(coreGlow,2.2)*.65;
        vec3 crystalColor=mix(vColor,tint,.3)*(.5+diffKey*.4+diffFill);
        vec3 finalColor=crystalColor+innerLight+dispersion*mix(vec3(.2,.8,1.),vec3(1.,.3,.75),sin(vPos.y*2.5+time*.6)*.5+.5)*.45+specKey*vec3(.9,1.,1.)*.6+specFill*vec3(1.,.7,.9)*.4+glint*vec3(1.,1.,.9)*.45+power*tint*.3;
        gl_FragColor=vec4(finalColor,.92);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
    });
    const core = new THREE.Mesh(prism, coreMaterial); group.add(core);
    const cage = new THREE.LineSegments(new THREE.EdgesGeometry(prism, 15), new THREE.LineBasicMaterial({ color: '#c4d8ff', transparent: true, opacity: .18, blending: THREE.AdditiveBlending })); group.add(cage);
    const inner = new THREE.Group(); group.add(inner);
    const starGeo = new THREE.OctahedronGeometry(.52, 0);
    const star1 = new THREE.Mesh(starGeo, new THREE.MeshBasicMaterial({ color: '#fff5c4', transparent: true, opacity: .92, blending: THREE.AdditiveBlending })); star1.scale.set(.6, 1.6, .6); inner.add(star1);
    const star2 = new THREE.Mesh(starGeo, new THREE.MeshBasicMaterial({ color: '#ffaa3b', transparent: true, opacity: .75, blending: THREE.AdditiveBlending })); star2.scale.set(.5, 1.2, .5); star2.rotation.y = Math.PI / 4; inner.add(star2);
    const coreGlowSphere = new THREE.Mesh(new THREE.SphereGeometry(.28, 16, 16), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .95, blending: THREE.AdditiveBlending })); inner.add(coreGlowSphere);
    const innerLight = new THREE.PointLight('#ffe699', 14, 8); group.add(innerLight);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(2.35, 32, 24), new THREE.ShaderMaterial({
      uniforms: { tint: { value: new THREE.Color('#38bdf8') } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){vec4 p=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
      fragmentShader: 'varying vec3 vN; varying vec3 vV; uniform vec3 tint; void main(){float f=pow(max(0.,1.-abs(dot(normalize(vN),normalize(vV)))),4.5); gl_FragColor=vec4(tint,f*.12);}',
    })); group.add(glow);
    const rings: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>[] = [];
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55 + i * .25, .014 + i * .003, 6, 128, Math.PI * (1.5 + i * .23)), new THREE.MeshBasicMaterial({ color: [aurora.gold, aurora.teal, aurora.pink][i], transparent: true, opacity: .75, blending: THREE.AdditiveBlending }));
      ring.rotation.set(1.1 + i * .3, i * .35, i * 1.2); group.add(ring); rings.push(ring);
      const haze=new THREE.Mesh(new THREE.TorusGeometry(1.55+i*.25,.06,6,128),new THREE.MeshBasicMaterial({color:ring.material.color,transparent:true,opacity:.09,depthWrite:false,blending:THREE.AdditiveBlending}));ring.add(haze);
      const spark=new THREE.Mesh(new THREE.SphereGeometry(.045,8,8),new THREE.MeshBasicMaterial({color:aurora.white}));spark.position.x=1.55+i*.25;ring.add(spark);
      const halo=new THREE.Mesh(new THREE.PlaneGeometry(.55,.55),new THREE.ShaderMaterial({uniforms:{tint:{value:ring.material.color}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform vec3 tint;void main(){float r=length(vUv-.5)*2.;float g=exp(-r*r*10.);gl_FragColor=vec4(tint,g*.8);}' }));spark.add(halo);
    }
    const crystalGeo = new THREE.OctahedronGeometry(.16, 0); crystalGeo.scale(.65, 1.7, .65);
    const crystalMat = new THREE.MeshPhysicalMaterial({ color: aurora.teal, metalness: .3, roughness: .14, emissive: aurora.violet, emissiveIntensity: .6, flatShading: true });
    const crystals: THREE.Mesh[] = [];
    for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(crystalGeo, crystalMat); group.add(m); crystals.push(m); }
    let seed = 417; const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const count = transparent ? 240 : 520; const positions = new Float32Array(count * 3); const pSeeds: number[] = [];
    for (let i = 0; i < count; i++) { pSeeds.push(rand(), rand(), rand()); const r = 2.2 + rand() * 3.4; const theta = rand() * Math.PI * 2; positions[i * 3] = Math.cos(theta) * r; positions[i * 3 + 1] = (rand() - .5) * 6; positions[i * 3 + 2] = Math.sin(theta) * r; }
    const particleGeo = new THREE.BufferGeometry(); particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({ color: aurora.storm, size: .018, transparent: true, opacity: .6, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(particles);
    // A radiant tiered plinth belongs to the dashboard only, never the OBS layer.
    const plinth = new THREE.Group(); plinth.visible = !transparent; scene.add(plinth); plinth.position.y = -2.1;
    const plinthColors = [aurora.gold, aurora.teal, aurora.violet, aurora.pink];
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.28 + i * .26, .016, 6, 128), new THREE.MeshBasicMaterial({ color: plinthColors[i], transparent: true, opacity: .75 - i * .1, blending: THREE.AdditiveBlending }));
      ring.rotation.x = Math.PI / 2; ring.position.y = i * .055; plinth.add(ring);
    }
    const diskUpper = new THREE.Mesh(new THREE.CylinderGeometry(1.48, 1.55, .1, 64), new THREE.MeshPhysicalMaterial({ color: '#1a1b38', metalness: .8, roughness: .25, emissive: aurora.violet, emissiveIntensity: .18 })); diskUpper.position.y = .05; plinth.add(diskUpper);
    const diskLower = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.95, .1, 64), new THREE.MeshPhysicalMaterial({ color: '#111228', metalness: .85, roughness: .3, emissive: aurora.deep, emissiveIntensity: .2 })); diskLower.position.y = -.05; plinth.add(diskLower);
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
    scene.add(new THREE.AmbientLight('#8fb8ff', 1.1)); const light = new THREE.PointLight('#7ee5ff', 16, 20); light.position.set(2.5, 3.2, 4.5); scene.add(light);
    const violet = new THREE.PointLight('#9d4edd', 14, 20); violet.position.set(-3, -1.2, 1.5); scene.add(violet);
    const resize = () => { const w = container.clientWidth, h = container.clientHeight; renderer.setSize(w, h); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(container); resize();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)'); let frame = 0; let destroyed = false; const started = performance.now(); let inView=true; let previousFrame=0; let previousTotal=0; let evolvedAt=-99;
    const intersection=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;});intersection.observe(container);
    const color = new THREE.Color(); const target = new THREE.Color(); const colors = palette.map(c => new THREE.Color(c));
    function animate() {
      if (destroyed) return; frame = requestAnimationFrame(animate); const now=performance.now(); if (document.hidden || !inView || now-previousFrame < (reduced.matches ? 100 : 1000/45)) return; previousFrame=now;
      const t = (performance.now() - started) / 1000; const motion = reduced.matches ? 0 : 1;
      const a = data.current.artifact; const e = a?.energy ?? { light: 0, fire: 0, storm: 0, crystal: 0 }; const total = e.light + e.fire + e.storm + e.crystal;
      if(total!==previousTotal){previousTotal=total;evolvedAt=t;} const pulse=reduced.matches?0:Math.max(0,1-(t-evolvedAt)/1.6)*Math.sin(Math.min(1,(t-evolvedAt)/1.6)*Math.PI);
      target.setRGB(0, 0, 0); const weights = [e.light + 1, e.fire+1, e.storm+2, e.crystal+2]; const denom = total + 6;
      colors.forEach((c, i) => target.add(color.copy(c).multiplyScalar(weights[i] / denom)));
      coreMaterial.uniforms.tint.value.lerp(target,.08);coreMaterial.uniforms.power.value=Math.min(1,e.light*.12)+pulse;coreMaterial.uniforms.time.value=t*motion;
      (glow.material as THREE.ShaderMaterial).uniforms.tint.value.copy(target);
      const size = 1 + Math.min(.38, Math.log2(total + 1) * .045);
      core.scale.set(size * (1 + Math.min(.2, e.fire * .015) * Math.sin(t * 2.2) * motion), size, size);
      core.rotation.set(.06*Math.sin(t*.3)*motion, t * .17 * motion + (a?.seed ?? 0) * .001, Math.sin(t * .2) * .07*motion);
      cage.rotation.copy(core.rotation); cage.scale.copy(core.scale).multiplyScalar(1.004);
      inner.rotation.y = -t * .3 * motion; group.position.y = Math.sin(t * .65) * .12 * motion;
      rings.forEach((r, i) => { r.rotation.z = i*1.2+t*.07*(i%2?1:-1)*motion; r.rotation.y = Math.sin(t * .12 + i) * .2; r.scale.setScalar(size+pulse*.16); r.material.opacity = .5 + Math.min(.4, e.light * .08); });
      crystals.forEach((m, i) => { const active = i < Math.min(12, 4+e.crystal*2); m.visible = active; const ang = i / 12 * Math.PI * 2 + t * .08 * motion; const rad = (1.7+(i%3)*.12) * size;
        m.position.set(Math.cos(ang) * rad, Math.sin(ang) * rad, Math.sin(i * 2) * .55); m.scale.set(.65, 1.6 + Math.min(e.crystal, 16) * .09, .65); m.rotation.set(i,t*.3*motion,i*.4); });
      arcs.forEach((m, i) => { (m.material as THREE.LineBasicMaterial).opacity = Math.min(.85, e.storm * .27) * (.7 + .3 * Math.sin(t * (2 + i) * motion + i)); m.rotation.z = t * .16 * motion + i; m.scale.setScalar(size); });
      embers.visible = e.fire > 0; const emberCount = Math.min(160, 20 + e.fire * 12); emberGeometry.setDrawRange(0, emberCount);
      for (let i = 0; i < emberCount; i++) { const q = i * 2.39996 + t * (.3 + (i % 5) * .025) * motion; const r = 1.15 + ((i * .618 + t * .15 * motion) % 1) * (.6 + Math.min(1, e.fire * .1)); emberPositions[i * 3] = Math.cos(q) * r; emberPositions[i * 3 + 1] = Math.sin(q) * r * .8; emberPositions[i * 3 + 2] = Math.sin(i * 1.7 + t * .2 * motion) * .65; }
      emberGeometry.attributes.position.needsUpdate = true;
      particles.rotation.y = t * .025 * motion; particles.rotation.z = Math.sin(t * .05) * .08;
      const age = data.current.portalAt ? (Date.now() - data.current.portalAt) / 1000 : 99;
      portal.visible = age >= 0 && age < 8;
      if (portal.visible) {
        const opening = Math.min(1, age / 1.3); const closing = Math.min(1, (8 - age) / 2);
        portal.scale.setScalar(reduced.matches ? 1 : Math.max(.01, opening * closing)); portal.rotation.y = Math.sin(age * .35) * .12;
        membraneMaterial.uniforms.time.value = age * motion; membraneMaterial.uniforms.fade.value = Math.min(1, age) * closing;
        portalRings.forEach((r, i) => { r.rotation.z = age * (i % 2 ? .25 : -.25) * motion + i; r.material.opacity = .6 * closing; });
        group.scale.setScalar(reduced.matches ? 1 : Math.max(.01, Math.min(1, (age - .6) / 1.5)));
      } else group.scale.setScalar(1);
      renderer.render(scene, camera);
    }
    const lost = (event: Event) => { event.preventDefault(); setError('3D connection lost. Reload this view to restore the visual.'); };
    renderer.domElement.addEventListener('webglcontextlost', lost); animate();
    return () => {
      destroyed = true; cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect(); renderer.domElement.removeEventListener('webglcontextlost', lost);
      const geometries = new Set<THREE.BufferGeometry>(); const materials = new Set<THREE.Material>();
      scene.traverse(obj => { const mesh = obj as THREE.Mesh; if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => materials.add(m)); });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); renderer.dispose(); renderer.domElement.remove();
    };
  }, [transparent]);
  return <div ref={host} className="artifact-canvas" role="img" aria-label={artifact ? `Living 3D artifact ${artifact.name}` : 'Unforged artifact preview'}>{error && <p className="webgl-error">{error}</p>}</div>;
}
