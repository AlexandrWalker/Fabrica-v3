document.addEventListener('DOMContentLoaded', () => {

  // ====================================================
  // Глобальная длительность скролла в миллисекундах
  const SCROLL_DURATION = 1500;
  // ====================================================

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
      stack.forEach((p, i) => p.style.pointerEvents = i === stack.length - 1 ? 'all' : 'none');

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
      if (!stack.length && document.body.classList.contains('no-scroll')) {
        document.body.classList.remove('no-scroll');
      }
    }

    function addHtmlPopupClass() {
      if (!document.documentElement.classList.contains('popup-open')) {
        document.documentElement.classList.add('popup-open');
      }
    }

    function removeHtmlPopupClassIfNeeded() {
      if (!stack.length && document.documentElement.classList.contains('popup-open')) {
        document.documentElement.classList.remove('popup-open');
      }
    }

    function openPopup(popup) {
      if (stack.includes(popup)) return;

      if (!stack.length) lockBodyScroll();

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
      addHtmlPopupClass();
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
      removeHtmlPopupClassIfNeeded();
    }

    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-popup-target]');
      if (!btn) return;

      const popup = document.getElementById(btn.dataset.popupTarget);
      if (popup) openPopup(popup);
    });

    // Новый обработчик для кнопок закрытия попапов
    document.addEventListener('click', e => {
      const closeBtn = e.target.closest('.popup__close');
      if (!closeBtn) return;

      // Находим ближайший попап к кнопке закрытия
      const popup = closeBtn.closest('.popup');
      if (popup && stack.includes(popup)) {
        closeTopPopup();
      }
    });

    document.addEventListener('touchstart', e => {
      const popup = e.target.closest('.popup');
      if (!popup || stack.at(-1) !== popup) return;

      const scrollParent = e.target.closest('[data-popup-scroll]');
      if (scrollParent && scrollParent.scrollTop > 0) return;

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

        if (delta > 120 || velocity > 0.6) history.back();
        else {
          const duration = 0.3;
          popup.style.transition = `top ${duration}s ease, opacity ${duration}s ease`;
          popup.style.top = '0';
          overlay.style.transition = `opacity ${duration}s ease`;
          overlay.style.opacity = '1';
        }

        document.removeEventListener('touchmove', move);
        document.removeEventListener('touchend', end);
      }

      document.addEventListener('touchmove', move, { passive: true });
      document.addEventListener('touchend', end);
    });

    window.addEventListener('popstate', () => { if (stack.length) closeTopPopup(); });
  })();

  /**
   * Инициализация Swiper + динамический is-active для nav__slide
   */
  (function () {
    const sliderEl = document.querySelector('.nav__slider');
    if (!sliderEl) return;

    const slides = sliderEl.querySelectorAll('.nav__slide');
    const sections = document.querySelectorAll('.layout[id]');

    const swiper = new Swiper(".nav__slider", {
      slidesPerGroup: 1,
      slidesPerView: 'auto',
      spaceBetween: 8,
      grabCursor: true,
      speed: 180,
      touchRatio: 1.6,
      resistance: true,
      resistanceRatio: 0.4,
      centeredSlides: false,
      centeredSlidesBounds: true,
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

    const updateActiveSlide = () => {
      let currentSection = null;
      const scrollPos = window.scrollY + window.innerHeight * 0.25;

      sections.forEach(section => {
        if (scrollPos >= section.offsetTop) currentSection = section;
      });

      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) {
        currentSection = sections[sections.length - 1];
      }

      if (!currentSection) return;
      const targetId = currentSection.id;

      slides.forEach((slide, index) => {
        const isActive = slide.dataset.id === targetId;
        slide.classList.toggle('is-active', isActive);

        if (isActive) {
          const slideLeft = slide.offsetLeft;
          const slideRight = slideLeft + slide.offsetWidth;
          const visibleLeft = swiper.translate * -1;
          const visibleRight = visibleLeft + swiper.width;

          let targetTranslate = swiper.translate;

          if (slideLeft < visibleLeft) {
            targetTranslate = -slideLeft;
          } else if (slideRight > visibleRight) {
            targetTranslate = -(slideRight - swiper.width);
          }

          if (targetTranslate !== swiper.translate) {
            // Добавляем плавность
            swiper.setTransition(300); // скорость анимации в мс
            swiper.setTranslate(targetTranslate);
          }
        }
      });
    };

    window.addEventListener('scroll', updateActiveSlide, { passive: true });
    window.addEventListener('resize', updateActiveSlide);
    updateActiveSlide();
  })();

  function smoothScrollTo(targetY, duration = SCROLL_DURATION, callback) {
    const startY = window.scrollY;
    const delta = targetY - startY;
    const startTime = performance.now();

    function easeInOutCubic(t) {
      return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);

      window.scrollTo(0, startY + delta * eased);

      if (progress < 1) requestAnimationFrame(step);
      else if (callback) callback();
    }

    requestAnimationFrame(step);
  }

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const targetId = link.getAttribute('href').slice(1);
      const targetEl = document.getElementById(targetId);
      if (!targetEl) return;

      const scrollPadding = 16.5 * parseFloat(getComputedStyle(document.documentElement).fontSize);
      const targetY = targetEl.getBoundingClientRect().top + window.scrollY - scrollPadding;

      smoothScrollTo(targetY, SCROLL_DURATION);
    });
  });

  /**
   * Login / Logout
   */
  (function () {
    const loginBtn = document.querySelector('[data-log="login"]');
    const logoutBtn = document.querySelector('[data-log="logout"]');

    if (loginBtn) loginBtn.addEventListener('click', () => {
      document.documentElement.classList.remove('logout');
      document.documentElement.classList.add('login');
    });
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
      document.documentElement.classList.remove('login');
      document.documentElement.classList.add('logout');
    });
  })();

  /**
   * Регистрационный код — шаговое заполнение
   */
  (function () {
    const formCodeBodys = document.querySelectorAll('.form-code-body');
    if (formCodeBodys.length > 0) {
      formCodeBodys.forEach(formCodeBody => {
        const inputs = formCodeBody.querySelectorAll('.form-code');
        const btn = formCodeBody.querySelector('.btn');
        const checkInputs = () => { btn.disabled = !Array.from(inputs).every(i => i.value.length); };
        inputs.forEach((input, idx) => {
          input.addEventListener('input', e => {
            if (e.target.value.length > 1) e.target.value = e.target.value.slice(-1);
            if (e.target.value && idx < inputs.length - 1) inputs[idx + 1].focus();
            else if (idx === inputs.length - 1) btn.focus();
            checkInputs();
          });
          input.addEventListener('keydown', e => { if (e.key === 'Backspace' && !e.target.value && idx > 0) inputs[idx - 1].focus(); setTimeout(checkInputs, 0); });
          input.addEventListener('paste', e => {
            e.preventDefault();
            const data = e.clipboardData.getData('text').trim().slice(0, inputs.length);
            data.split('').forEach((c, i) => { if (inputs[i]) inputs[i].value = c; });
            if (data.length === inputs.length) btn.focus(); else inputs[data.length].focus();
            checkInputs();
          });
        });
        checkInputs();
      });
    }
  })();

  /**
   * Класс filled у инпутов и textarea
   */
  (function () {
    const addFilledClass = el => el.addEventListener('input', () => el.classList.toggle('filled', !!el.value.trim()));
    document.querySelectorAll('.form-input, .form-textarea').forEach(addFilledClass);
  })();

  /* Старая версия след. кода 
  (function () {
    const OFFSET_REM = 21.8;
    const getOffsetPx = () => OFFSET_REM * parseFloat(getComputedStyle(document.documentElement).fontSize);

    document.addEventListener('click', e => {
      const navBtn = e.target.closest('.layout__nav-item');
      if (!navBtn) return;

      const layout = navBtn.closest('.layout');
      if (!layout) return;

      const nav = layout.querySelector('.layout__nav');
      if (!nav) return;

      const navItems = nav.querySelectorAll('.layout__nav-item');
      const cards = layout.querySelectorAll('.card[data-dish]');
      if (!cards.length) return;

      const targetKey = navBtn.dataset.nav;
      const targetCard = Array.from(cards).find(c => c.dataset.dish === targetKey);
      if (!targetCard) return;

      layout._disableNavUpdate = true;

      if (layout.classList.contains('layout--carousel')) {
        const container = layout.querySelector('.layout__items');
        if (!container) return;

        const scrollTarget = targetCard.offsetLeft - (container.clientWidth / 2 - targetCard.offsetWidth / 2);
        container.scrollTo({ left: scrollTarget, behavior: 'smooth' });

        setTimeout(() => { layout._disableNavUpdate = false; }, SCROLL_DURATION);
      } else {
        const y = targetCard.getBoundingClientRect().top + window.pageYOffset - getOffsetPx();
        smoothScrollTo(y, SCROLL_DURATION, () => { layout._disableNavUpdate = false; });
      }

      navItems.forEach(btn => btn.classList.toggle('active', btn === navBtn));
    });

    const layouts = document.querySelectorAll('.layout');
    layouts.forEach(layout => {
      const nav = layout.querySelector('.layout__nav');
      if (!nav) return;
      const navItems = nav.querySelectorAll('.layout__nav-item');
      const cards = layout.querySelectorAll('.card[data-dish]');
      if (!cards.length) return;

      const isCarousel = layout.classList.contains('layout--carousel');

      const updateActiveNav = () => {
        if (layout._disableNavUpdate) return;

        let currentCard = null;
        if (isCarousel) {
          const container = layout.querySelector('.layout__items');
          const scrollCenter = container.scrollLeft + container.clientWidth / 2;
          currentCard = Array.from(cards).reduce((closest, card) => {
            const cardCenter = card.offsetLeft + card.offsetWidth / 2;
            return !closest || Math.abs(cardCenter - scrollCenter) < Math.abs(closest.offsetLeft + closest.offsetWidth / 2 - scrollCenter) ? card : closest;
          }, null);
        } else {
          const offsetPx = getOffsetPx();
          const scrollPos = window.scrollY + offsetPx + window.innerHeight * 0.25;
          cards.forEach(card => { if (scrollPos >= card.getBoundingClientRect().top + window.pageYOffset) currentCard = card; });
          if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) currentCard = cards[cards.length - 1];
        }

        if (!currentCard) return;
        const targetKey = currentCard.dataset.dish;

        navItems.forEach(btn => {
          const isActive = btn.dataset.nav === targetKey;
          btn.classList.toggle('active', isActive);

          if (isActive) {
            const btnLeft = btn.offsetLeft;
            const btnRight = btnLeft + btn.offsetWidth;
            const navScrollLeft = nav.scrollLeft;
            const navRightEdge = navScrollLeft + nav.clientWidth;
            if (btnLeft < navScrollLeft || btnRight > navRightEdge) {
              nav.scrollTo({ left: btnLeft - nav.clientWidth / 2 + btn.offsetWidth / 2, behavior: 'smooth' });
            }
          }
        });
      };

      if (isCarousel) {
        const container = layout.querySelector('.layout__items');
        container.addEventListener('scroll', updateActiveNav, { passive: true });
      } else {
        window.addEventListener('scroll', updateActiveNav, { passive: true });
      }

      updateActiveNav();
    });
  })(); */

  /**
   * Навигация layout__nav
   */
  (function () {
    const OFFSET_REM = 21.8;
    const SCROLL_DURATION = 500; // Гарантия существования константы
    const getOffsetPx = () => OFFSET_REM * parseFloat(getComputedStyle(document.documentElement).fontSize);

    function scrollNavToActiveItem(nav, activeBtn) {
      if (!activeBtn) return; // Защита от null

      const btnLeft = activeBtn.offsetLeft;
      const btnRight = btnLeft + activeBtn.offsetWidth;
      const navScrollLeft = nav.scrollLeft;
      const navRightEdge = navScrollLeft + nav.clientWidth;

      if (btnLeft < navScrollLeft || btnRight > navRightEdge) {
        nav.scrollTo({
          left: btnLeft - nav.clientWidth / 2 + activeBtn.offsetWidth / 2,
          behavior: 'smooth'
        });
      }
    }

    document.addEventListener('click', e => {
      const navBtn = e.target.closest('.layout__nav-item');
      if (!navBtn) return;

      const layout = navBtn.closest('.layout');
      if (!layout) return;

      layout._disableNavUpdate = true; // Однократное присваивание
      layout._activeByClick = true;

      const nav = layout.querySelector('.layout__nav');
      if (!nav) return;

      const navItems = nav.querySelectorAll('.layout__nav-item');
      if (!navItems.length) return; // Проверка на наличие пунктов

      const cards = layout.querySelectorAll('.card[data-dish]');
      if (!cards.length) return;

      const targetKey = navBtn.dataset.nav;
      const targetCard = Array.from(cards).find(c => c.dataset.dish === targetKey);
      if (!targetCard) return;

      if (layout.classList.contains('layout--carousel')) {
        const container = layout.querySelector('.layout__items');
        if (!container) return;

        const scrollTarget = targetCard.offsetLeft - (container.clientWidth / 2 - targetCard.offsetWidth / 2);
        container.scrollTo({ left: scrollTarget, behavior: 'smooth' });

        setTimeout(() => {
          layout._disableNavUpdate = false;
          layout._activeByClick = false;
          scrollNavToActiveItem(nav, navBtn);
        }, SCROLL_DURATION);
      } else {
        const y = targetCard.getBoundingClientRect().top + window.pageYOffset - getOffsetPx();
        smoothScrollTo(y, SCROLL_DURATION, () => {
          layout._disableNavUpdate = false;
          layout._activeByClick = false;
          scrollNavToActiveItem(nav, navBtn); // Вызов после скролла
        });
      }

      navItems.forEach(btn => btn.classList.toggle('active', btn === navBtn));
    });

    const layouts = document.querySelectorAll('.layout');
    layouts.forEach(layout => {
      const nav = layout.querySelector('.layout__nav');
      if (!nav) return;

      const navItems = nav.querySelectorAll('.layout__nav-item');
      const cards = layout.querySelectorAll('.card[data-dish]');
      if (!cards.length) return;

      const isCarousel = layout.classList.contains('layout--carousel');

      const updateActiveNav = () => {
        if (layout._disableNavUpdate) return;
        if (layout._activeByClick) return;

        let currentCard = null;
        if (isCarousel) {
          const container = layout.querySelector('.layout__items');
          const scrollCenter = container.scrollLeft + container.clientWidth / 2;
          currentCard = Array.from(cards).reduce((closest, card) => {
            const cardCenter = card.offsetLeft + card.offsetWidth / 2;
            return !closest || Math.abs(cardCenter - scrollCenter) < Math.abs(closest.offsetLeft + closest.offsetWidth / 2 - scrollCenter) ? card : closest;
          }, null);
        } else {
          const offsetPx = getOffsetPx();
          const scrollPos = window.scrollY + offsetPx + window.innerHeight * 0.25;
          cards.forEach(card => { if (scrollPos >= card.getBoundingClientRect().top + window.pageYOffset) currentCard = card; });
          if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) currentCard = cards[cards.length - 1];
        }

        if (!currentCard) return;
        const targetKey = currentCard.dataset.dish;

        navItems.forEach(btn => {
          const isActive = btn.dataset.nav === targetKey;
          btn.classList.toggle('active', isActive);

          if (isActive) {
            const btnLeft = btn.offsetLeft;
            const btnRight = btnLeft + btn.offsetWidth;
            const navScrollLeft = nav.scrollLeft;
            const navRightEdge = navScrollLeft + nav.clientWidth;
            if (btnLeft < navScrollLeft || btnRight > navRightEdge) {
              nav.scrollTo({ left: btnLeft - nav.clientWidth / 2 + btn.offsetWidth / 2, behavior: 'smooth' });
            }
          }
        });
      };

      if (isCarousel) {
        const container = layout.querySelector('.layout__items');
        container.addEventListener('scroll', updateActiveNav, { passive: true });
      } else {
        window.addEventListener('scroll', updateActiveNav, { passive: true });
      }

      updateActiveNav();
    });
  })();

  /**
   * Выпадашка
   */
  (function () {
    const dropdowns = document.querySelectorAll('.dropdown--js');
    dropdowns.forEach(dropdown => {
      const selectedJs = dropdown.querySelector('.dropdown__selected--js');
      const selectedInputJs = dropdown.querySelector('.dropdown__selected-input--js');
      const selectedLabelJs = dropdown.querySelector('.dropdown__selected-label--js');
      const dropdownRadio = dropdown.querySelectorAll('.dropdown__radio');
      const dropdownValue = dropdown.querySelector('.dropdown__value');

      // Открываем/закрываем при клике на заголовок
      selectedJs.addEventListener('click', (e) => {
        e.stopPropagation(); // Предотвращаем всплытие
        dropdown.classList.toggle('is-active');
      });

      // Закрываем при клике вне dropdown
      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
          dropdown.classList.remove('is-active');
        }
      });

      // Обрабатываем выбор опции
      dropdownRadio.forEach(radio => {
        radio.addEventListener('change', () => {
          // Только если радио включено
          if (radio.checked) {
            // Обновляем текст в заголовке
            selectedLabelJs.textContent = radio.value;
            selectedInputJs.value = radio.value;
            dropdownValue.value = radio.value;
            // Закрываем dropdown
            dropdown.classList.remove('is-active');
            dropdown.classList.add('filled');
          }
        });
      });
    });
  })();
});