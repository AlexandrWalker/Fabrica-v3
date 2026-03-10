document.addEventListener('DOMContentLoaded', () => {

  // Глобальная длительность скролла в миллисекундах
  const SCROLL_DURATION = 1500;

  gsap.registerPlugin(ScrollTrigger);

  /**
   * Попапы
   */
  (function () {
    // ─── КОНФИГУРАЦИЯ ─────────────────────────────────────────────────────────
    // Базовый z-index для попапов. Каждый следующий попап получает +1
    const BASE_Z = 600;

    // Стек открытых попапов. Последний элемент — самый верхний (активный)
    const stack = [];

    // Полупрозрачный оверлей за попапами
    const overlay = document.getElementById('popup-overlay');

    // Запоминаем позицию скролла перед блокировкой страницы
    let scrollY = 0;

    // ─── ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ──────────────────────────────────────────────

    /**
     * Синхронизирует класс popup-open на <html> с состоянием стека.
     * Класс нужен для глобальных CSS-стилей (например, анимация навбара).
     */
    function updateHtmlClasses() {
      const hasPopups = stack.length > 0;
      document.documentElement.classList.toggle('popup-open', hasPopups);
    }

    /**
     * Показывает или скрывает оверлей с анимацией.
     * @param {boolean} visible  - true = показать, false = скрыть
     * @param {number}  duration - длительность перехода в секундах
     */
    function updateOverlay(visible, duration = 0.3) {
      overlay.style.transition = `opacity ${duration}s ease`;
      overlay.style.opacity = visible ? '1' : '0';
      // pointer-events отключаем когда оверлей скрыт, чтобы клики проходили сквозь него
      overlay.style.pointerEvents = visible ? 'all' : 'none';
    }

    /**
     * Обновляет pointer-events для всех попапов в стеке.
     * Только верхний (активный) попап принимает клики.
     * Остальные игнорируют события мыши/тача — они перекрыты активным попапом.
     */
    function updatePointerEvents() {
      stack.forEach((p, i) => {
        p.style.pointerEvents = i === stack.length - 1 ? 'all' : 'none';
      });
    }

    // ─── БЛОКИРОВКА СКРОЛЛА ───────────────────────────────────────────────────

    /**
     * Блокирует скролл страницы при открытии первого попапа.
     * Запоминает текущую позицию скролла для возможного восстановления.
     * Идемпотентна — повторный вызов не даёт эффекта.
     */
    function lockBodyScroll() {
      if (!document.body.classList.contains('no-scroll')) {
        scrollY = window.scrollY;
        document.body.classList.add('no-scroll');
      }
    }

    /**
     * Разблокирует скролл страницы, но только если стек пуст.
     * Вызывается после каждого закрытия попапа.
     */
    function unlockBodyScroll() {
      if (!stack.length) {
        document.body.classList.remove('no-scroll');
      }
    }

    // ─── ОСНОВНАЯ ЛОГИКА ──────────────────────────────────────────────────────

    /**
     * Открывает попап и добавляет его в стек.
     * Если попап уже открыт — ничего не делает.
     * @param {HTMLElement} popup - элемент попапа
     */
    function openPopup(popup) {
      // Защита от повторного открытия одного и того же попапа
      if (stack.includes(popup)) return;

      // Блокируем скролл только при открытии первого попапа
      if (!stack.length) lockBodyScroll();

      // z-index растёт с каждым новым попапом, чтобы верхний всегда был поверх
      popup.style.zIndex = BASE_Z + stack.length + 1;
      popup.style.visibility = 'visible';

      // requestAnimationFrame нужен, чтобы браузер успел применить
      // visibility: visible до начала CSS-перехода (иначе анимация не сработает)
      requestAnimationFrame(() => {
        const d = 0.4;
        popup.style.transition = `top ${d}s ease, opacity ${d}s ease`;
        popup.style.top = '0';       // выезжает снизу в позицию 0
        popup.style.opacity = '1';
        updateOverlay(true, d);
      });

      stack.push(popup);
      popup.classList.add('popup-showed');  // маркер для внешних стилей/скриптов
      updatePointerEvents();
      updateHtmlClasses();

      // Добавляем запись в историю браузера — свайп/кнопка «Назад» закроет попап
      history.pushState({ popupId: popup.id }, '', '');
    }

    /**
     * Закрывает верхний попап из стека с анимацией.
     * @param {number} velocity - скорость свайпа (px/мс). Чем быстрее свайп,
     *                            тем короче анимация закрытия.
     */
    function closeTopPopup(velocity = 0) {
      const popup = stack.pop();
      if (!popup) return;

      // При быстром свайпе сокращаем время анимации (минимум 0.2с, максимум 0.6с)
      const duration = Math.max(0.2, Math.min(0.6, 0.4 - velocity));

      // Уезжает вниз за экран
      popup.style.transition = `top ${duration}s ease, opacity ${duration}s ease`;
      popup.style.top = '100%';
      popup.style.opacity = '0';

      // Оверлей скрываем только если в стеке больше нет попапов
      // (stack.pop() уже выполнен, поэтому stack.length актуален)
      updateOverlay(stack.length > 0, duration);

      // После завершения анимации — полностью убираем попап из потока событий
      setTimeout(() => {
        popup.style.visibility = 'hidden';
        popup.style.pointerEvents = 'none';
        popup.style.zIndex = '';
        overlay.style.transition = '';         // сбрасываем transition оверлея
        popup.classList.remove('popup-showed'); // снимаем маркер
      }, duration * 1000);

      updatePointerEvents();
      unlockBodyScroll();
      updateHtmlClasses();
    }

    /**
     * Закрывает все открытые попапы одновременно.
     * Используется, например, при переходе на другую страницу.
     */
    function closeAllPopups() {
      if (!stack.length) return;

      const duration = 0.4;

      // splice(0) одновременно очищает стек и возвращает его копию —
      // это важно, чтобы updatePointerEvents/updateHtmlClasses
      // видели уже пустой стек
      const toClose = stack.splice(0);

      toClose.forEach(popup => {
        popup.style.transition = `top ${duration}s ease, opacity ${duration}s ease`;
        popup.style.top = '100%';
        popup.style.opacity = '0';

        setTimeout(() => {
          popup.style.visibility = 'hidden';
          popup.style.pointerEvents = 'none';
          popup.style.zIndex = '';
          popup.classList.remove('popup-showed');
        }, duration * 1000);
      });

      updateOverlay(false, duration);

      // Сбрасываем transition оверлея после завершения анимации
      setTimeout(() => {
        overlay.style.transition = '';
      }, duration * 1000);

      updatePointerEvents();
      unlockBodyScroll();
      updateHtmlClasses();
    }

    // ─── ОБРАБОТЧИКИ СОБЫТИЙ ──────────────────────────────────────────────────

    /**
     * Единый обработчик кликов для трёх сценариев:
     * 1. [data-close-all-popups] — закрыть все попапы
     * 2. [data-popup-target]     — открыть попап по id
     * 3. .popup__close           — закрыть текущий попап
     */
    document.addEventListener('click', e => {
      // Сценарий 1: кнопка «закрыть всё»
      if (e.target.closest('[data-close-all-popups]')) {
        closeAllPopups();
        return;
      }

      // Сценарий 2: кнопка открытия попапа
      // data-popup-target содержит id целевого попапа
      const openBtn = e.target.closest('[data-popup-target]');
      if (openBtn) {
        const popup = document.getElementById(openBtn.dataset.popupTarget);
        if (popup) openPopup(popup);
        return;
      }

      // Сценарий 3: крестик внутри попапа
      // Ищем ближайший .popup чтобы закрыть именно его, а не произвольный верхний
      const closeBtn = e.target.closest('.popup__close');
      if (closeBtn) {
        const popup = closeBtn.closest('.popup');
        // Проверяем что попап действительно в стеке (не закрыт повторно)
        if (popup && stack.includes(popup)) closeTopPopup();
      }
    });

    // ─── СВАЙП ВНИЗ ДЛЯ ЗАКРЫТИЯ ─────────────────────────────────────────────

    /**
     * Позволяет закрыть попап свайпом вниз.
     * Во время свайпа попап следует за пальцем, оверлей затемняется пропорционально.
     * При отпускании — либо закрываем (если достаточно далеко/быстро),
     * либо возвращаем на место.
     */
    // document.addEventListener('touchstart', e => {
    //   const popup = e.target.closest('.popup');

    //   // Реагируем только на тач внутри верхнего (активного) попапа
    //   if (!popup || stack.at(-1) !== popup) return;

    //   // Если пользователь скроллит контент внутри попапа — не перехватываем жест
    //   const scrollParent = e.target.closest('[data-popup-scroll]');
    //   if (scrollParent?.scrollTop > 0) return;

    //   const startY = e.touches[0].clientY;
    //   let lastY = startY;
    //   const startTime = performance.now();

    //   // Попап следует за пальцем
    //   function onMove(ev) {
    //     // Math.max(0) запрещает тянуть попап вверх
    //     const delta = Math.max(0, ev.touches[0].clientY - startY);
    //     popup.style.transition = 'none'; // отключаем transition во время тяги
    //     popup.style.top = `${delta}px`;

    //     // Оверлей плавно исчезает по мере смещения попапа
    //     overlay.style.opacity = 1 - Math.min(delta / popup.offsetHeight, 1);
    //     lastY = ev.touches[0].clientY;
    //   }

    //   function onEnd() {
    //     const delta = lastY - startY;
    //     const velocity = delta / (performance.now() - startTime); // px/мс

    //     popup.style.transition = ''; // возвращаем transition

    //     if (delta > 120 || velocity > 0.6) {
    //       // Достаточно далеко или быстро — закрываем через историю браузера
    //       // (history.back вызовет popstate → closeTopPopup)
    //       history.back();
    //     } else {
    //       // Недостаточно — возвращаем попап на место
    //       const d = 0.3;
    //       popup.style.transition = `top ${d}s ease, opacity ${d}s ease`;
    //       popup.style.top = '0';
    //       updateOverlay(true, d);
    //     }

    //     document.removeEventListener('touchmove', onMove);
    //     document.removeEventListener('touchend', onEnd);
    //   }

    //   document.addEventListener('touchmove', onMove, { passive: true });
    //   document.addEventListener('touchend', onEnd);
    // });

    document.addEventListener('touchstart', e => {
      const popup = e.target.closest('.popup');

      if (!popup || stack.at(-1) !== popup) return;

      // ─── Блокируем если тач внутри swiper ────────────────────────────────────
      if (e.target.closest('.swiper')) return;
      // ─────────────────────────────────────────────────────────────────────────

      const scrollParent = e.target.closest('[data-popup-scroll]');
      if (scrollParent?.scrollTop > 0) return;

      const startY = e.touches[0].clientY;
      let lastY = startY;
      const startTime = performance.now();

      function onMove(ev) {
        const delta = Math.max(0, ev.touches[0].clientY - startY);
        popup.style.transition = 'none';
        popup.style.top = `${delta}px`;
        overlay.style.opacity = 1 - Math.min(delta / popup.offsetHeight, 1);
        lastY = ev.touches[0].clientY;
      }

      function onEnd() {
        const delta = lastY - startY;
        const velocity = delta / (performance.now() - startTime);

        popup.style.transition = '';

        if (delta > 120 || velocity > 0.6) {
          history.back();
        } else {
          const d = 0.3;
          popup.style.transition = `top ${d}s ease, opacity ${d}s ease`;
          popup.style.top = '0';
          updateOverlay(true, d);
        }

        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
      }

      document.addEventListener('touchmove', onMove, { passive: true });
      document.addEventListener('touchend', onEnd);
    });

    /**
     * Обработчик кнопки «Назад» браузера / свайпа назад на iOS.
     * popstate срабатывает когда пользователь уходит с состояния pushState.
     */
    window.addEventListener('popstate', () => {
      if (stack.length) closeTopPopup();
    });
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
      const viewportTop = window.scrollY;
      const viewportBottom = window.scrollY + window.innerHeight;

      sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionBottom = sectionTop + section.offsetHeight;
        const isVisible = sectionBottom > viewportTop && sectionTop < viewportBottom;
        if (isVisible) currentSection = section;
      });

      // Даже если currentSection = null — проходим по слайдам и снимаем все is-active
      const targetId = currentSection ? currentSection.id : null;

      slides.forEach((slide) => {
        const isActive = targetId !== null && slide.dataset.id === targetId;
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
            swiper.setTransition(300);
            swiper.setTranslate(targetTranslate);
          }
        }
      });
    };

    window.addEventListener('scroll', updateActiveSlide, { passive: true });
    window.addEventListener('resize', updateActiveSlide);
    updateActiveSlide();
  })();

  /**
   * Свайпер слайдер блюда
   */
  (function () {
    const layoutSwipers = document.querySelectorAll('.layout__head-slider');
    if (layoutSwipers.length > 0) {
      layoutSwipers.forEach(layoutSwiper => {
        const swiper = new Swiper(layoutSwiper, {
          slidesPerGroup: 1,
          slidesPerView: 1,
          spaceBetween: 0,
          grabCursor: true,
          speed: 300,
          touchRatio: 1.6,
          resistance: true,
          resistanceRatio: 0.4,
          centeredSlides: false,
          centeredSlidesBounds: true,
          loop: true,
          simulateTouch: true,
          watchOverflow: true,
          direction: 'horizontal',
          touchStartPreventDefault: true,
          // touchMoveStopPropagation: true,
          touchMoveStopPropagation: false,
          threshold: 8,
          touchAngle: 25,
          freeMode: {
            // enabled: true,
            enabled: false,
            momentum: true,
            momentumRatio: 0.85,
            momentumVelocityRatio: 1,
            momentumBounce: false,
            sticky: true
          },
          mousewheel: {
            forceToAxis: true,
            sensitivity: 1,
            releaseOnEdges: true
          },
          pagination: {
            el: layoutSwiper.querySelector(".swiper-pagination"),
            clickable: true,
          },
        });
      });
    }
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

  /**
   * Навигация layout__nav
   */
  (function () {
    const DEFAULT_OFFSET_REM = 21.8;
    const POPUP_OFFSET_REM = 15.9;
    const SCROLL_DURATION = 500;

    /**
     * Возвращает scroll-контейнер для layout
     */
    function getScrollContainer(layout) {
      const popupScroll = layout.closest('[data-popup-scroll]');
      return popupScroll || window;
    }

    /**
     * Возвращает смещение в px в зависимости от того, обычная страница или popup
     */
    function getOffsetPx(layout) {
      const isPopup = layout.closest('[data-popup-scroll]');
      const offsetRem = isPopup ? POPUP_OFFSET_REM : DEFAULT_OFFSET_REM;
      return offsetRem * parseFloat(getComputedStyle(document.documentElement).fontSize);
    }

    function scrollNavToActiveItem(nav, activeBtn) {
      if (!activeBtn) return;

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

    /**
     * Клик по навигации
     */
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
      const targetCard = Array.from(cards).find(
        c => c.dataset.dish === targetKey
      );
      if (!targetCard) return;

      layout._disableNavUpdate = true;
      layout._activeByClick = true;

      const scrollContainer = getScrollContainer(layout);
      const offsetPx = getOffsetPx(layout);

      if (layout.classList.contains('layout--carousel')) {
        const container = layout.querySelector('.layout__items');
        if (!container) return;

        const scrollTarget =
          targetCard.offsetLeft -
          (container.clientWidth / 2 - targetCard.offsetWidth / 2);

        container.scrollTo({
          left: scrollTarget,
          behavior: 'smooth'
        });

        setTimeout(() => {
          layout._disableNavUpdate = false;
          layout._activeByClick = false;
          scrollNavToActiveItem(nav, navBtn);
        }, SCROLL_DURATION);

      } else {
        const y =
          targetCard.getBoundingClientRect().top +
          (scrollContainer === window ? window.pageYOffset : scrollContainer.scrollTop) -
          offsetPx;

        scrollContainer.scrollTo({
          top: y,
          behavior: 'smooth'
        });

        setTimeout(() => {
          layout._disableNavUpdate = false;
          layout._activeByClick = false;
          scrollNavToActiveItem(nav, navBtn);
        }, SCROLL_DURATION);
      }

      navItems.forEach(btn =>
        btn.classList.toggle('active', btn === navBtn)
      );
    });

    /**
     * Обновление активного пункта при скролле
     */
    const layouts = document.querySelectorAll('.layout');

    layouts.forEach(layout => {
      const nav = layout.querySelector('.layout__nav');
      if (!nav) return;

      const navItems = nav.querySelectorAll('.layout__nav-item');
      const cards = layout.querySelectorAll('.card[data-dish]');
      if (!cards.length) return;

      const isCarousel =
        layout.classList.contains('layout--carousel');

      const scrollContainer = getScrollContainer(layout);
      const offsetPx = getOffsetPx(layout);

      const updateActiveNav = () => {
        if (layout._disableNavUpdate) return;
        if (layout._activeByClick) return;

        let currentCard = null;

        if (isCarousel) {
          const container =
            layout.querySelector('.layout__items');
          if (!container) return;

          const scrollCenter =
            container.scrollLeft + container.clientWidth / 2;

          currentCard = Array.from(cards).reduce(
            (closest, card) => {
              const cardCenter =
                card.offsetLeft + card.offsetWidth / 2;

              if (!closest) return card;

              const closestCenter =
                closest.offsetLeft + closest.offsetWidth / 2;

              return Math.abs(cardCenter - scrollCenter) <
                Math.abs(closestCenter - scrollCenter)
                ? card
                : closest;
            },
            null
          );

        } else {
          let scrollPos;

          if (scrollContainer === window) {
            scrollPos =
              window.scrollY + offsetPx + window.innerHeight * 0.25;
          } else {
            scrollPos =
              scrollContainer.scrollTop + offsetPx + scrollContainer.clientHeight * 0.25;
          }

          cards.forEach(card => {
            const cardTop =
              scrollContainer === window
                ? card.getBoundingClientRect().top + window.pageYOffset
                : card.offsetTop;

            if (scrollPos >= cardTop) {
              currentCard = card;
            }
          });

          if (
            scrollContainer === window &&
            window.scrollY + window.innerHeight >=
            document.documentElement.scrollHeight - 4
          ) {
            currentCard = cards[cards.length - 1];
          }
        }

        if (!currentCard) return;

        const targetKey = currentCard.dataset.dish;

        navItems.forEach(btn => {
          const isActive = btn.dataset.nav === targetKey;
          btn.classList.toggle('active', isActive);

          if (isActive) {
            scrollNavToActiveItem(nav, btn);
          }
        });
      };

      if (isCarousel) {
        const container =
          layout.querySelector('.layout__items');
        if (!container) return;

        container.addEventListener(
          'scroll',
          updateActiveNav,
          { passive: true }
        );
      } else {
        if (scrollContainer === window) {
          window.addEventListener(
            'scroll',
            updateActiveNav,
            { passive: true }
          );
        } else {
          scrollContainer.addEventListener(
            'scroll',
            updateActiveNav,
            { passive: true }
          );
        }
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

  /**
   * Функция для смены иконки в панели при открытии попапа
   */
  (function () {
    const html = document.documentElement;
    const button = document.querySelector('.panel__btn');

    if (!button) return;

    // MutationObserver отслеживает изменение class у html
    const observer = new MutationObserver(() => {
      if (html.classList.contains('popup-open')) {
        button.classList.add('is-flipped');
      } else {
        button.classList.remove('is-flipped');
      }
    });

    observer.observe(html, {
      attributes: true,
      attributeFilter: ['class']
    });
  })();

  /**
   * Функция для рейтинга
   */
  (function () {
    const formRating = document.querySelector('.form-rating');
    const formRatingStars = formRating.querySelectorAll('i');

    formRatingStars.forEach(star => {
      star.addEventListener('click', function () {
        // Получаем рейтинг из data‑атрибута
        const selectedRating = parseInt(this.getAttribute('data-rating'));

        // Проходим по всем иконкам и обновляем классы
        formRatingStars.forEach((star, index) => {
          if (index < selectedRating) {
            star.classList.add('icon-star-fill');
          } else {
            star.classList.remove('icon-star-fill');
          }
        });
      });
    });
  })();

  /**
   * Функция сториса
   */
  (function () {
    // ─── КОНФИГУРАЦИЯ ───────────────────────────────────────────────────────────
    const STORY_DURATION = 5000; // сколько мс показывается один сторис
    const SWIPE_THRESHOLD = 50;   // минимальный сдвиг по X (px) для горизонтального свайпа
    const SWIPE_DOWN_THRESHOLD = 80;   // минимальный сдвиг по Y вниз (px) для закрытия свайпом
    const LONG_TAP_THRESHOLD = 200;  // мс: касание дольше этого = долгое нажатие (пауза)

    // ─── ДАННЫЕ ─────────────────────────────────────────────────────────────────
    const items = Array.from(document.querySelectorAll('.stories-item'));

    // Для каждой карточки берём путь к полноразмерному изображению:
    // приоритет — data-story-img, фоллбэк — src миниатюры внутри карточки
    const stories = items.map((el) => ({
      img: el.dataset.storyImg || el.querySelector('img')?.src || '',
    }));

    // ─── DOM-ЭЛЕМЕНТЫ ───────────────────────────────────────────────────────────
    const overlay = document.getElementById('storiesOverlay');
    const progressEl = document.getElementById('storiesProgress');
    const closeBtn = document.getElementById('storiesClose');
    const navPrev = document.getElementById('storiesNavPrev');
    const navNext = document.getElementById('storiesNavNext');

    // Два <img> для двойного буфера — устраняет моргание при смене фото.
    // Один всегда виден, второй грузит следующее фото за кулисами.
    const imgA = document.getElementById('storiesImgA');
    const imgB = document.getElementById('storiesImgB');

    // ─── СОСТОЯНИЕ ──────────────────────────────────────────────────────────────
    let activeBuffer = 'A';  // какой буфер сейчас показан ('A' или 'B')
    let currentIndex = 0;    // индекс текущего сториса
    let timer = null; // id от setTimeout для автоперехода
    let isPaused = false;// true пока сторис на паузе
    let startTime = null; // Date.now() в момент старта/возобновления таймера
    let elapsed = 0;   // сколько мс уже «сгорело» у текущего сториса
    let scrollY = 0;   // позиция скролла до открытия (iOS-фикс)

    // Флаг: тач уже обработан зоной navNext/navPrev.
    // Нужен потому что на мобильных touchend всплывает до overlay
    // даже после e.stopPropagation() с passive:true.
    // Overlay видит флаг и пропускает обработку.
    let navHandled = false;

    // Время последнего touchend на зонах навигации.
    // Используется чтобы отфильтровать синтетический click,
    // который браузер автоматически генерирует после touchend —
    // без этого goNext() вызывался бы дважды (touchend + click).
    let lastTouchEnd = 0;

    // ─── КООРДИНАТЫ ТАЧА ────────────────────────────────────────────────────────
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    // ─── ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ БУФЕРА ────────────────────────────────────────
    function getActiveImg() { return activeBuffer === 'A' ? imgA : imgB; }
    function getInactiveImg() { return activeBuffer === 'A' ? imgB : imgA; }

    // =========================================================================
    // ПРОГРЕСС-БАРЫ
    // =========================================================================

    // Пересоздаёт полоски прогресса по количеству сторисов.
    // Вызывается при каждом openStories() — чтобы не было мусора от предыдущей сессии.
    function buildProgressBars() {
      progressEl.innerHTML = '';
      stories.forEach(() => {
        const item = document.createElement('div');
        item.className = 'stories-progress-item';
        item.innerHTML = '<div class="stories-progress-fill"></div>';
        progressEl.appendChild(item);
      });
    }

    // Расставляет классы и запускает анимацию нужной полоски:
    //   i < index  → is-done   (пройдено, заполнена полностью)
    //   i === index → is-active (анимируется прямо сейчас)
    //   i > index  → пусто     (ещё не дошли)
    //
    // Длительность анимации задаётся через style напрямую —
    // это позволяет корректно учесть elapsed при возобновлении с паузы.
    function updateProgress(index) {
      const bars = progressEl.querySelectorAll('.stories-progress-item');

      bars.forEach((bar, i) => {
        const fill = bar.querySelector('.stories-progress-fill');

        bar.classList.remove('is-done', 'is-active');
        fill.style.animation = 'none';
        fill.style.width = '0%';

        if (i < index) {
          bar.classList.add('is-done');

        } else if (i === index) {
          bar.classList.add('is-active');

          const remainingSec = (STORY_DURATION - elapsed) / 1000;

          // Форс-reflow: без этого браузер склеивает animation:none
          // с последующим присвоением — анимация не перезапустится (особенно Safari)
          void fill.offsetWidth;

          fill.style.animationDuration = `${remainingSec}s`;
          fill.style.animationName = 'progressFill';
          fill.style.animationTimingFunction = 'linear';
          fill.style.animationFillMode = 'forwards';
          fill.style.animationPlayState = 'running';
        }
      });
    }

    // =========================================================================
    // ПОКАЗ СТОРИСА
    // =========================================================================

    // Переключает на сторис с заданным индексом через двойной буфер:
    // новое фото грузится в скрытый <img>, после загрузки буферы меняются местами
    // через CSS opacity transition — без моргания.
    function showStory(index) {
      if (index < 0 || index >= stories.length) return;

      clearTimer();
      elapsed = 0;
      currentIndex = index;

      const nextImg = getInactiveImg();
      const currentImg = getActiveImg();

      nextImg.classList.remove('is-visible');
      nextImg.src = stories[index].img;

      // Срабатывает и при успешной загрузке, и при ошибке —
      // просмотрщик не зависнет если картинка не найдена
      const onLoaded = () => {
        nextImg.removeEventListener('load', onLoaded);
        nextImg.removeEventListener('error', onLoaded);

        nextImg.classList.add('is-visible');
        currentImg.classList.remove('is-visible');

        activeBuffer = activeBuffer === 'A' ? 'B' : 'A';
      };

      nextImg.addEventListener('load', onLoaded);
      nextImg.addEventListener('error', onLoaded);

      updateProgress(index);
      startTimer();

      // На первом сторисе отключаем зону «назад» — некуда идти
      navPrev.style.pointerEvents = index === 0 ? 'none' : 'auto';
      navNext.style.pointerEvents = 'auto';
    }

    // =========================================================================
    // ТАЙМЕР АВТОПЕРЕХОДА
    // =========================================================================

    // Запускает отсчёт до goNext().
    // Вычитаем elapsed чтобы продолжить с того места где остановились.
    function startTimer() {
      isPaused = false;
      startTime = Date.now();
      timer = setTimeout(goNext, STORY_DURATION - elapsed);
    }

    // Отменяет таймер без сброса elapsed — при возобновлении продолжим с той же точки.
    function clearTimer() {
      clearTimeout(timer);
      timer = null;
    }

    // Пауза: останавливает таймер, замораживает анимацию, накапливает elapsed.
    function pauseTimer() {
      if (isPaused) return;

      isPaused = true;
      elapsed += Date.now() - startTime;
      clearTimer();

      const activeFill = progressEl.querySelector(
        '.stories-progress-item.is-active .stories-progress-fill'
      );
      if (activeFill) activeFill.style.animationPlayState = 'paused';
    }

    // Возобновление: пересчитывает длительность анимации и перезапускает таймер.
    function resumeTimer() {
      if (!isPaused) return;

      const activeBar = progressEl.querySelector('.stories-progress-item.is-active');
      if (activeBar) {
        const fill = activeBar.querySelector('.stories-progress-fill');
        const remainingSec = (STORY_DURATION - elapsed) / 1000;

        // Обновляем длительность — без этого анимация ускорится (посчитает с начала)
        fill.style.animationDuration = `${remainingSec}s`;
        fill.style.animationPlayState = 'running';
      }

      isPaused = false;
      startTime = Date.now();
      timer = setTimeout(goNext, STORY_DURATION - elapsed);
    }

    // =========================================================================
    // НАВИГАЦИЯ
    // =========================================================================

    function goNext() {
      if (currentIndex + 1 >= stories.length) {
        closeStories();
      } else {
        showStory(currentIndex + 1);
      }
    }

    function goPrev() {
      if (currentIndex === 0) {
        resumeTimer();
        return;
      }
      showStory(currentIndex - 1);
    }

    // =========================================================================
    // ОТКРЫТИЕ / ЗАКРЫТИЕ
    // =========================================================================

    function openStories(index) {
      buildProgressBars();

      imgA.classList.remove('is-visible');
      imgB.classList.remove('is-visible');
      imgA.src = '';
      imgB.src = '';
      activeBuffer = 'A';

      overlay.classList.add('is-active');

      // iOS-фикс: фиксируем body чтобы страница не скроллилась под оверлеем
      scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';

      showStory(index);
    }

    function closeStories() {
      clearTimer();
      overlay.classList.remove('is-active');

      // iOS-фикс: снимаем фиксацию и восстанавливаем позицию скролла
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);

      elapsed = 0;
      currentIndex = 0;
    }

    // =========================================================================
    // СОБЫТИЯ
    // =========================================================================

    // Клик по карточке на странице
    items.forEach((el, i) => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => openStories(i));
    });

    // Крестик
    closeBtn.addEventListener('click', closeStories);

    // ── Зоны навигации: мышь ──────────────────────────────────────────────────
    // stopPropagation — чтобы клик не дошёл до overlay и не закрыл просмотрщик.
    // Проверка lastTouchEnd — чтобы отфильтровать синтетический click после touchend:
    // мобильные браузеры генерируют его автоматически, и без фильтра goNext()
    // вызывался бы дважды (сначала из touchend, затем из этого click).
    navNext.addEventListener('click', (e) => {
      e.stopPropagation();
      if (Date.now() - lastTouchEnd < 500) return;
      goNext();
    });

    navPrev.addEventListener('click', (e) => {
      e.stopPropagation();
      if (Date.now() - lastTouchEnd < 500) return;
      if (currentIndex === 0) { resumeTimer(); return; }
      goPrev();
    });

    // ── Зоны навигации: тач ───────────────────────────────────────────────────
    // navHandled = true сообщает обработчику overlay.touchend что тап уже обработан.
    // lastTouchEnd фиксирует время — защита от синтетического click (см. выше).
    // Если палец сдвинулся дальше порога — это свайп, пусть обрабатывает overlay.
    navNext.addEventListener('touchend', (e) => {
      e.stopPropagation();
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(dy) > SWIPE_DOWN_THRESHOLD) return;

      navHandled = true;
      lastTouchEnd = Date.now();
      goNext();
    }, { passive: true });

    navPrev.addEventListener('touchend', (e) => {
      e.stopPropagation();
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(dy) > SWIPE_DOWN_THRESHOLD) return;

      navHandled = true;
      lastTouchEnd = Date.now();
      if (currentIndex === 0) { resumeTimer(); return; }
      goPrev();
    }, { passive: true });

    // ── Оверлей: тач ──────────────────────────────────────────────────────────

    // Любое касание → пауза; возобновим в touchend
    overlay.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
      pauseTimer();
    }, { passive: true });

    overlay.addEventListener('touchend', (e) => {
      // Тап уже обработан зоной навигации — сбрасываем флаг и выходим
      if (navHandled) { navHandled = false; return; }

      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Свайп вниз → закрыть (вертикаль доминирует)
      if (absDy > SWIPE_DOWN_THRESHOLD && dy > 0 && absDy > absDx) {
        closeStories();
        return;
      }

      // Горизонтальный свайп → навигация (горизонталь доминирует)
      if (absDx > SWIPE_THRESHOLD && absDx > absDy) {
        dx < 0 ? goNext() : goPrev();
        return;
      }

      // Обычный тап или отпускание долгого нажатия → возобновить
      resumeTimer();
    }, { passive: true });

    // Тач прерван системой (звонок, уведомление) — не даём сторису зависнуть на паузе
    overlay.addEventListener('touchcancel', resumeTimer);

    // Блокируем нативный скролл страницы пока открыт оверлей.
    // passive: false обязателен чтобы preventDefault() сработал.
    overlay.addEventListener('touchmove', (e) => {
      e.preventDefault();
    }, { passive: false });

    // ── Клавиатура ────────────────────────────────────────────────────────────
    document.addEventListener('keydown', (e) => {
      if (!overlay.classList.contains('is-active')) return;
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'Escape') closeStories();
    });

    // ── Клик по затемнённому фону ─────────────────────────────────────────────
    // e.target === overlay — клик строго по фону, не по картинке или кнопкам
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeStories();
    });

  })();

  /**
   * Функция смены svg у панели при октрытии попапа
   */
  (function () {
    const pathEl = document.getElementById('wavePath');
    const html = document.documentElement;

    function casteljau(p0, p1, p2, p3, t) {
      const lerp = (a, b) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      const p01 = lerp(p0, p1);
      const p12 = lerp(p1, p2);
      const p23 = lerp(p2, p3);
      const p012 = lerp(p01, p12);
      const p123 = lerp(p12, p23);
      const p0123 = lerp(p012, p123);
      return {
        left: [p0, p01, p012, p0123],
        right: [p0123, p123, p23, p3]
      };
    }

    function split3(p0, p1, p2, p3) {
      const s1 = casteljau(p0, p1, p2, p3, 1 / 3);
      const s2 = casteljau(...s1.right, 1 / 2);
      return [s1.left, s2.left, s2.right];
    }

    function split2(p0, p1, p2, p3) {
      const s = casteljau(p0, p1, p2, p3, 0.5);
      return [s.left, s.right];
    }

    const aL1 = [
      [145.796, 0],
      [152.774, 0],
      [158.737, 2.02603],
      [162.89, 7.63478]
    ];
    const aL2 = [
      [162.89, 7.63478],
      [171.416, 19.1506],
      [178.549, 35.3855],
      [201, 35.3855]
    ];
    const [aL2a, aL2b] = split2(...aL2);

    const aR1 = [
      [201, 35.3855],
      [223.491, 35.3855],
      [231.284, 19.092],
      [240.112, 7.57247]
    ];
    const aR2 = [
      [240.112, 7.57247],
      [244.357, 2.03327],
      [250.298, 0],
      [257.276, 0]
    ];
    const [aR1a, aR1b] = split2(...aR1);

    const seg = s => ({
      x1: s[1][0], y1: s[1][1],
      x2: s[2][0], y2: s[2][1],
      ex: s[3][0], ey: s[3][1]
    });

    const stateA = {
      leftH: 145.796,

      c1x1: aL1[1][0], c1y1: aL1[1][1],
      c1x2: aL1[2][0], c1y2: aL1[2][1],
      c1ex: aL1[3][0], c1ey: aL1[3][1],

      c2x1: aL2a[1][0], c2y1: aL2a[1][1],
      c2x2: aL2a[2][0], c2y2: aL2a[2][1],
      c2ex: aL2a[3][0], c2ey: aL2a[3][1],

      c3x1: aL2b[1][0], c3y1: aL2b[1][1],
      c3x2: aL2b[2][0], c3y2: aL2b[2][1],
      c3ex: aL2b[3][0], c3ey: aL2b[3][1],

      c4x1: aR1a[1][0], c4y1: aR1a[1][1],
      c4x2: aR1a[2][0], c4y2: aR1a[2][1],
      c4ex: aR1a[3][0], c4ey: aR1a[3][1],

      c5x1: aR1b[1][0], c5y1: aR1b[1][1],
      c5x2: aR1b[2][0], c5y2: aR1b[2][1],
      c5ex: aR1b[3][0], c5ey: aR1b[3][1],

      c6x1: aR2[1][0], c6y1: aR2[1][1],
      c6x2: aR2[2][0], c6y2: aR2[2][1],
      c6ex: aR2[3][0], c6ey: aR2[3][1],

      rightLx: 380.56,
      rightLy: 0
    };

    const stateB = {
      leftH: 132,

      c1x1: 149.673, c1y1: 0,
      c1x2: 163.247, c1y2: 14.3378,
      c1ex: 163.895, c1ey: 31.999,

      c2x1: 164.06, c2y1: 36.5144,
      c2x2: 164.391, c2y2: 40.6511,
      c2ex: 165, c2ey: 44,

      c3x1: 167, c3y1: 55,
      c3x2: 182, c3y2: 70.5,
      c3ex: 201.5, c3ey: 70.5,

      c4x1: 221, c4y1: 70.5,
      c4x2: 235.643, c4y2: 53.5,
      c4ex: 237, c4ey: 44,

      c5x1: 237.433, c5y1: 40.972,
      c5x2: 237.699, c5y2: 37.0708,
      c5ex: 237.859, c5ey: 32.776,

      c6x1: 238.513, c6y1: 15.2026,
      c6x2: 252.19, c6y2: 0.90046,
      c6ex: 269.776, c6ey: 0.777108,

      rightLx: 380.56,
      rightLy: 0
    };

    const params = { ...stateA };

    function f(v) { return +v.toFixed(4); }

    function buildPath() {
      const p = params;
      return [
        `M0 21.4458 C0 9.60161 9.59902 0 21.44 0`,
        `H${f(p.leftH)}`,
        `C${f(p.c1x1)} ${f(p.c1y1)} ${f(p.c1x2)} ${f(p.c1y2)} ${f(p.c1ex)} ${f(p.c1ey)}`,
        `C${f(p.c2x1)} ${f(p.c2y1)} ${f(p.c2x2)} ${f(p.c2y2)} ${f(p.c2ex)} ${f(p.c2ey)}`,
        `C${f(p.c3x1)} ${f(p.c3y1)} ${f(p.c3x2)} ${f(p.c3y2)} ${f(p.c3ex)} ${f(p.c3ey)}`,
        `C${f(p.c4x1)} ${f(p.c4y1)} ${f(p.c4x2)} ${f(p.c4y2)} ${f(p.c4ex)} ${f(p.c4ey)}`,
        `C${f(p.c5x1)} ${f(p.c5y1)} ${f(p.c5x2)} ${f(p.c5y2)} ${f(p.c5ex)} ${f(p.c5ey)}`,
        `C${f(p.c6x1)} ${f(p.c6y1)} ${f(p.c6x2)} ${f(p.c6y2)} ${f(p.c6ex)} ${f(p.c6ey)}`,
        `L${f(p.rightLx)} ${f(p.rightLy)}`,
        `C392.401 0 402 9.6016 402 21.4458`,
        `V77 H0 Z`
      ].join(' ');
    }

    function applyPath() {
      pathEl.setAttribute('d', buildPath());
    }

    applyPath();

    let tween = null;

    function animateTo(target) {
      if (tween) tween.kill();
      tween = gsap.to(params, {
        ...target,
        duration: 0.65,
        ease: 'power2.inOut',
        onUpdate: applyPath
      });
    }

    new MutationObserver(() => {
      animateTo(html.classList.contains('popup-open') ? stateB : stateA);
    }).observe(html, { attributes: true, attributeFilter: ['class'] });

  })();

  /**
   * Функция анимации обводки
   */
  (function () {

    // ─── Анимации ─────────────────────────────────────────────────────────────────

    function animateBannerIn(banner) {
      // Если уже полностью обведён — ничего не делаем
      if (banner._done) return;
      if (banner._tween) banner._tween.kill();

      const proxy = {
        progress: parseFloat(banner.style.getPropertyValue("--progress")) || 0,
      };

      banner._tween = gsap.to(proxy, {
        progress: 1,
        duration: 0.5,
        ease: "power2.inOut",
        onUpdate() {
          banner.style.setProperty("--progress", proxy.progress);
        },
        onComplete() {
          banner._done = true; // помечаем — больше не трогаем
        },
      });
    }

    // ─── Триггерные элементы ──────────────────────────────────────────────────────

    const banners = document.querySelectorAll(".banner");
    const triggerMap = new WeakMap();

    banners.forEach((banner) => {
      banner._done = false;
      banner.style.setProperty("--progress", "0");

      const trigger = document.createElement("div");

      Object.assign(trigger.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "1px",
        height: "100%",
        pointerEvents: "none",
        visibility: "hidden",
      });

      banner.style.position = "relative";
      banner.appendChild(trigger);
      triggerMap.set(trigger, banner);
    });

    // ─── IntersectionObserver ─────────────────────────────────────────────────────

    function createObserver() {
      // iOS не поддерживает rootMargin в процентах для IntersectionObserver —
      // используем px, вычисленные на момент создания observer.
      const halfWidth = Math.round(window.innerWidth / 2);

      return new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const banner = triggerMap.get(entry.target);
            if (!banner) return;

            // Срабатываем только на вход, выход игнорируем
            if (entry.isIntersecting) {
              animateBannerIn(banner);
            }
          });
        },
        {
          // Обрезаем правую половину экрана → триггер срабатывает
          // когда левый край баннера пересекает середину экрана
          rootMargin: `0px -${halfWidth}px 0px 0px`,
          threshold: 0,
        }
      );
    }

    let observer = createObserver();

    document.querySelectorAll(".banner > div").forEach((trigger) => {
      observer.observe(trigger);
    });

    // ─── Ресайз ───────────────────────────────────────────────────────────────────

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        observer.disconnect();
        observer = createObserver();

        document.querySelectorAll(".banner > div").forEach((trigger) => {
          // Если баннер уже обведён — не наблюдаем за ним повторно
          const banner = triggerMap.get(trigger);
          if (banner && !banner._done) {
            observer.observe(trigger);
          }
        });
      }, 150);
    });

  })();

  /**
   * Кнопка куки
   */
  if (('; ' + document.cookie).split(`; COOKIE_ACCEPT=`).pop().split(';')[0] !== '1') {
    const cookiesNotify = document.getElementById('plate-cookie');

    if (cookiesNotify) {
      cookiesNotify.style.transform = 'translateY(0)';
    }
  }

});

function checkCookies() {
  document.cookie = 'COOKIE_ACCEPT=1;path=\'/\';expires:' + (new Date(new Date().getTime() + 86400e3 * 365).toUTCString());
  document.getElementById('plate-cookie').style.transform = 'translateY(100%)';
  setInterval(() => document.getElementById('plate-cookie').remove(), 5000);
}