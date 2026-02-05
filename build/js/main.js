document.addEventListener('DOMContentLoaded', () => {

  /**
   * Подключение GSAP
   */
  gsap.registerPlugin(ScrollTrigger);

  /**
   * Попапы
   */
  (function () {
    const BASE_Z = 600;
    const stack = [];
    const overlay = document.getElementById('popup-overlay');
    let scrollY = 0;

    function updatePointerEvents() {
      stack.forEach((p, i) => {
        p.style.pointerEvents = i === stack.length - 1 ? 'all' : 'none';
      });

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
      popup.style.visibility = 'visible';
      popup.style.pointerEvents = 'all';

      requestAnimationFrame(() => {
        const duration = 0.4;
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
      touchAngle: 25,

      freeMode: {
        enabled: true,
        momentum: true,
        momentumRatio: 0.85,
        momentumVelocityRatio: 1,
        momentumBounce: false,
        sticky: false
      },

      mousewheel: {
        forceToAxis: true,
        sensitivity: 1,
        releaseOnEdges: true
      },
    });
  }

  /**
   * Управляет поведением хедера (появление/скрытие при скролле)
   */
  (function headerFunc() {
    const html = document.documentElement;
    const firstSection = document.querySelector('section');
    let lastScrollTop = 1;
    const scrollPosition = () => window.pageYOffset || document.documentElement.scrollTop;

    window.addEventListener('scroll', () => {
      if (scrollPosition() > lastScrollTop && scrollPosition() > firstSection.offsetHeight) {
        html.classList.add('header-out');
      } else {
        html.classList.remove('header-out');
      }
      lastScrollTop = scrollPosition();
    })
  })();

  /**
   * Меняет класс у тега html на login
   */
  (function () {
    const loginBtn = document.querySelector('[data-log="login"]');
    const logoutBtn = document.querySelector('[data-log="logout"]');

    if (loginBtn || logoutBtn) {
      loginBtn.addEventListener('click', () => {
        document.documentElement.classList.remove('logout');
        document.documentElement.classList.add(loginBtn.dataset.log);
      })
      logoutBtn.addEventListener('click', () => {
        document.documentElement.classList.remove('login');
        document.documentElement.classList.add(logoutBtn.dataset.log);
      })
    }
  })();

  /**
   * Шагово меняем фокус у инпута при вводе кода при регистрации
   */
  (function () {
    const regCode = document.getElementById('regCode');
    if (!regCode) return;

    const inputs = regCode.querySelectorAll('.form-code');
    const btn = regCode.querySelector('.btn');

    const checkInputs = () => {
      const allFilled = Array.from(inputs).every(input => input.value.length > 0);
      btn.disabled = !allFilled;
    };

    inputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        if (e.target.value.length > 1) {
          e.target.value = e.target.value.slice(-1);
        }
        if (e.target.value && index < inputs.length - 1) {
          inputs[index + 1].focus();
        } else if (index === inputs.length - 1) {
          btn.focus();
        }
        checkInputs();
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
          inputs[index - 1].focus();
        }
        setTimeout(checkInputs, 0);
      });

      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const data = e.clipboardData.getData('text').trim().slice(0, inputs.length);
        data.split('').forEach((char, i) => {
          if (inputs[i]) inputs[i].value = char;
        });
        if (data.length === inputs.length) btn.focus();
        else inputs[data.length].focus();
        checkInputs();
      });
    });

    checkInputs();
  })();

  /**
   * Присваиваем класс у заполненного инпута
   */
  (function () {
    const inputElements = document.querySelectorAll('.form-input');
    const textareaElements = document.querySelectorAll('.form-textarea');

    if (inputElements.length || textareaElements.length) {
      const className = 'filled';

      inputElements.forEach(element => {
        element.addEventListener('input', function () {
          this.value.trim() ? element.classList.add(className) : element.classList.remove(className);
        });
      });

      textareaElements.forEach(element => {
        element.addEventListener('input', function () {
          this.value.trim() ? element.classList.add(className) : element.classList.remove(className);
        });
      });
    }
  })();
});
