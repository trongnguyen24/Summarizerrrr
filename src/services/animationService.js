import { animate, createSpring } from 'animejs';

export const animationService = {
  show(element) {
    if (!element) return;
    animate(element, {
      width: ['20rem'],
      duration: 200,
      ease: createSpring({ stiffness: 125, damping: 14 }),
      alternate: false,
    });
  },

  hide(element) {
    if (!element) return;
    animate(element, {
      width: [0],
      duration: 300,
      ease: 'outExpo',
      alternate: false,
    });
  },
};