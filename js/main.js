document.addEventListener('DOMContentLoaded', () => {

  /**
   * Подключение GSAP
   */
  gsap.registerPlugin(ScrollTrigger);

  /**
   * Попапы
   */
  (() => {
    const BASE_Z = 600;
    const stack = [];
    const overlay = document.getElementById('popup-overlay');
    let scrollY = 0;

    function updatePointerEvents() {
      stack.forEach((p, i) => {
        p.style.pointerEvents = i === stack.length - 1 ? 'all' : 'none';
      });

      // Overlay активен только если есть хотя бы один попап
      if (stack.length) {
        overlay.style.pointerEvents = 'all';
        overlay.style.transition = 'opacity 0.3s ease';
        overlay.style.opacity = '1';
      } else {
        overlay.style.pointerEvents = 'none';
        overlay.style.transition = 'opacity 0.3s ease';
        overlay.style.opacity = '0';
      }
    }

    function lockBodyScroll() {
      if (!document.body.classList.contains('no-scroll')) {
        scrollY = window.scrollY;
        document.body.classList.add('no-scroll');
      }
    }

    function unlockBodyScrollIfNeeded() {
      if (stack.length === 0 && document.body.classList.contains('no-scroll')) {
        document.body.classList.remove('no-scroll');
      }
    }

    function openPopup(popup) {
      if (stack.includes(popup)) return;

      if (stack.length === 0) lockBodyScroll();

      const z = BASE_Z + stack.length + 1;
      popup.style.zIndex = z;

      // Сначала делаем visible без transition
      popup.style.visibility = 'visible';
      popup.style.pointerEvents = 'all';

      // Через RAF включаем transition pop-up и overlay
      requestAnimationFrame(() => {
        const duration = 0.4; // можно настроить
        popup.style.transition = `top ${duration}s ease, opacity ${duration}s ease`;
        popup.style.top = '0';
        popup.style.opacity = '1';

        overlay.style.transition = `opacity ${duration}s ease`;
        overlay.style.opacity = '1';
      });

      stack.push(popup);
      updatePointerEvents();

      history.pushState({ popupId: popup.id }, '', '');
    }

    function closeTopPopup(velocity = 0) {
      const popup = stack.pop();
      if (!popup) return;

      const duration = Math.max(0.2, Math.min(0.6, 0.4 - velocity));

      popup.style.transition = `top ${duration}s ease, opacity ${duration}s ease`;
      popup.style.top = '100%';
      popup.style.opacity = '0';

      overlay.style.transition = `opacity ${duration}s ease`;
      overlay.style.opacity = '0';

      setTimeout(() => {
        popup.style.visibility = 'hidden';
        popup.style.pointerEvents = 'none';
        popup.style.zIndex = '';
        overlay.style.transition = '';
      }, duration * 1000);

      updatePointerEvents();
      unlockBodyScrollIfNeeded();
    }

    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-popup-target]');
      if (!btn) return;

      const popup = document.getElementById(btn.dataset.popupTarget);
      if (popup) openPopup(popup);
    });

    document.addEventListener('touchstart', e => {
      const head = e.target.closest('[data-popup-head]');
      if (!head) return;

      const popup = head.closest('.popup');
      if (!popup || stack.at(-1) !== popup) return;

      const startY = e.touches[0].clientY;
      let lastY = startY;
      let startTime = performance.now();

      function move(ev) {
        const y = ev.touches[0].clientY;
        const delta = Math.max(0, y - startY);
        popup.style.transition = 'none';
        popup.style.top = `${delta}px`;

        // Динамический overlay
        const ratio = 1 - Math.min(delta / popup.offsetHeight, 1);
        overlay.style.opacity = ratio;

        lastY = y;
      }

      function end() {
        const delta = lastY - startY;
        const time = performance.now() - startTime;
        const velocity = delta / time;

        popup.style.transition = '';

        if (delta > 120 || velocity > 0.6) {
          history.back();
        } else {
          const duration = 0.3;
          popup.style.transition = `top ${duration}s ease, opacity ${duration}s ease`;
          popup.style.top = '0';
          overlay.style.transition = `opacity ${duration}s ease`;
          overlay.style.opacity = '1';
        }

        document.removeEventListener('touchmove', move);
        document.removeEventListener('touchend', end);
      }

      document.addEventListener('touchmove', move);
      document.addEventListener('touchend', end);
    });

    window.addEventListener('popstate', () => {
      if (stack.length > 0) closeTopPopup();
    });
  })();

  /**
   * Инициализация swiper
   */
  if (document.querySelector('.swiper')) {

    const swiper = new Swiper(".nav__slider", {
      slidesPerGroup: 1,
      slidesPerView: 'auto',
      spaceBetween: 8,
      grabCursor: true,

      speed: 180,
      touchRatio: 1.6,
      resistanceRatio: 0.65,

      centeredSlides: false,
      centeredSlidesBounds: true,
      centerInsufficientSlides: true,
      slidesOffsetBefore: 0,
      slidesOffsetAfter: 0,
      loop: false,
      simulateTouch: true,
      watchOverflow: true,

      direction: 'horizontal',
      touchStartPreventDefault: true,
      touchMoveStopPropagation: true,
      threshold: 8,
      touchAngle: 25, // ключевой параметр

      freeMode: {
        enabled: true,
        momentum: true,
        momentumRatio: 0.85, // меньше инерции
        momentumVelocityRatio: 1,
        momentumBounce: false, // убрать bounce
        sticky: false // убрать залипание
      },

      mousewheel: {
        forceToAxis: true,
        sensitivity: 1,
        releaseOnEdges: true
      },
    });
  }
});