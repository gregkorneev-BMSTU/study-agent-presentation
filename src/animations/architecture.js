import { gsap } from 'gsap';

export function createArchitectureAnimation(root) {
  const paths = [...root.querySelectorAll('.arch-edge')];
  const packets = [...root.querySelectorAll('.arch-packet')];
  const nodes = [...root.querySelectorAll('[data-stage]')];
  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = { progress: 0 };
  const point = { value: 0 };
  const timeline = gsap.timeline({ paused: true });

  paths.forEach(path => {
    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;
  });
  gsap.set(nodes, { autoAlpha: 0, y: 12, scale: 0.98 });
  gsap.set(packets, { autoAlpha: 0 });

  for (let stage = 1; stage <= 10; stage++) {
    timeline.to(nodes.filter(node => Number(node.dataset.stage) === stage), {
      autoAlpha: 1, y: 0, scale: 1, duration: 0.34, ease: 'power2.out', stagger: 0.04,
    }, stage - 1);
    timeline.to(paths.filter(path => Number(path.dataset.stage) === stage), {
      strokeDashoffset: 0, opacity: 0.9, duration: 0.42, ease: 'power1.out',
    }, stage - 1);
    const packet = packets.find(item => Number(item.dataset.stage) === stage);
    if (packet) {
      const path = root.querySelector(`#${packet.dataset.path}`);
      if (path) {
        const length = path.getTotalLength();
        const travel = { value: 0 };
        timeline.set(packet, { autoAlpha: 1 }, stage - 1);
        timeline.to(travel, {
          value: 1, duration: 0.46, ease: 'none',
          onUpdate: () => {
            const p = path.getPointAtLength(length * travel.value);
            packet.setAttribute('cx', p.x);
            packet.setAttribute('cy', p.y);
          },
        }, stage - 1);
        timeline.set(packet, { autoAlpha: 0 }, stage - 0.52);
      }
    }
    timeline.addLabel(`stage${stage}`, stage);
  }
  timeline.addLabel('complete', 10);

  function setProgress(step, immediate = false) {
    const target = Math.max(0, Math.min(10, Number(step) || 0));
    timeline.pause();
    if (prefersReducedMotion || immediate) {
      timeline.seek(target === 10 ? 'complete' : `stage${target || 1}`, true);
      if (target === 0) timeline.time(0, true);
      state.progress = target;
      return;
    }
    const time = target === 10 ? timeline.labels.complete : target === 0 ? 0 : timeline.labels[`stage${target}`];
    gsap.to(state, {
      progress: time, duration: 0.32, ease: 'power2.out', overwrite: true,
      onUpdate: () => timeline.time(state.progress, true),
      onComplete: () => { state.progress = time; },
    });
  }

  return { setProgress, destroy: () => timeline.kill() };
}
