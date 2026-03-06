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
    document.addEventListener('touchstart', e => {
      const popup = e.target.closest('.popup');

      // Реагируем только на тач внутри верхнего (активного) попапа
      if (!popup || stack.at(-1) !== popup) return;

      // Если пользователь скроллит контент внутри попапа — не перехватываем жест
      const scrollParent = e.target.closest('[data-popup-scroll]');
      if (scrollParent?.scrollTop > 0) return;

      const startY = e.touches[0].clientY;
      let lastY = startY;
      const startTime = performance.now();

      // Попап следует за пальцем
      function onMove(ev) {
        // Math.max(0) запрещает тянуть попап вверх
        const delta = Math.max(0, ev.touches[0].clientY - startY);
        popup.style.transition = 'none'; // отключаем transition во время тяги
        popup.style.top = `${delta}px`;

        // Оверлей плавно исчезает по мере смещения попапа
        overlay.style.opacity = 1 - Math.min(delta / popup.offsetHeight, 1);
        lastY = ev.touches[0].clientY;
      }

      function onEnd() {
        const delta = lastY - startY;
        const velocity = delta / (performance.now() - startTime); // px/мс

        popup.style.transition = ''; // возвращаем transition

        if (delta > 120 || velocity > 0.6) {
          // Достаточно далеко или быстро — закрываем через историю браузера
          // (history.back вызовет popstate → closeTopPopup)
          history.back();
        } else {
          // Недостаточно — возвращаем попап на место
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
          touchMoveStopPropagation: true,
          threshold: 8,
          touchAngle: 25,
          freeMode: {
            enabled: true,
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
    // ─── КОНФИГУРАЦИЯ ─────────────────────────────────────────────────────────
    // Длительность показа одного сториса в миллисекундах
    const STORY_DURATION = 5000;

    // ─── СБОР ЭЛЕМЕНТОВ ───────────────────────────────────────────────────────
    // Все карточки сторисов на странице
    const items = Array.from(document.querySelectorAll('.stories-item'));

    /**
     * Данные каждого сториса.
     * img — приоритет: data-story-img атрибут, затем src тега <img> внутри элемента.
     */
    const stories = items.map((el) => ({
      img: el.dataset.storyImg || el.querySelector('.stories-item img')?.src || '',
    }));

    // ─── DOM-ЭЛЕМЕНТЫ ─────────────────────────────────────────────────────────
    const overlay = document.getElementById('storiesOverlay');   // обёртка всего просмотрщика
    const progressEl = document.getElementById('storiesProgress');  // контейнер полосок прогресса
    const closeBtn = document.getElementById('storiesClose');     // кнопка закрытия
    const imgEl = document.getElementById('storiesImg');       // тег <img> для фото сториса
    const navPrev = document.getElementById('storiesNavPrev');   // зона нажатия «назад»
    const navNext = document.getElementById('storiesNavNext');   // зона нажатия «вперёд»

    // ─── СОСТОЯНИЕ ────────────────────────────────────────────────────────────
    let currentIndex = 0;     // индекс текущего сториса
    let timer = null;  // id setTimeout для авто-перехода
    let isPaused = false; // флаг паузы (долгое нажатие / свайп)
    let startTime = null;  // момент старта/возобновления таймера (Date.now())
    let elapsed = 0;     // уже прошедшее время текущего сториса в мс

    // ─── ПОЛОСЫ ПРОГРЕССА ─────────────────────────────────────────────────────

    /**
     * Пересоздаёт все полосы прогресса по количеству сторисов.
     * Вызывается каждый раз при открытии просмотрщика.
     */
    function buildProgressBars() {
      progressEl.innerHTML = '';
      stories.forEach(() => {
        const item = document.createElement('div');
        item.className = 'stories-progress-item';
        item.innerHTML = '<div class="stories-progress-fill"></div>';
        progressEl.appendChild(item);
      });
    }

    /**
     * Обновляет визуальное состояние полос прогресса для заданного индекса:
     * - пройденные (i < index) → класс is-done (заполнены полностью)
     * - текущий (i === index)  → класс is-active + запуск CSS-анимации заполнения
     * - будущие                → без класса (пустые)
     *
     * CSS-переменная --duration управляет длительностью анимации,
     * что позволяет корректно возобновлять с середины.
     *
     * @param {number} index - индекс текущего сториса
     */
    function updateProgress(index) {
      const bars = progressEl.querySelectorAll('.stories-progress-item');
      bars.forEach((bar, i) => {
        bar.classList.remove('is-done', 'is-active');
        const fill = bar.querySelector('.stories-progress-fill');

        // Сбрасываем анимацию перед изменением состояния
        fill.style.animation = 'none';
        fill.style.width = '0%';

        if (i < index) {
          bar.classList.add('is-done');
        } else if (i === index) {
          bar.classList.add('is-active');

          // Оставшееся время в секундах для CSS-анимации
          bar.style.setProperty('--duration', `${(STORY_DURATION - elapsed) / 1000}s`);

          // Форс-reflow: заставляем браузер применить animation: none
          // перед снятием этого правила, иначе анимация не перезапустится
          void fill.offsetWidth;
          fill.style.animation = '';
        }
      });
    }

    // ─── ПОКАЗ СТОРИСА ────────────────────────────────────────────────────────

    /**
     * Переключает просмотрщик на сторис с заданным индексом.
     * @param {number} index     - индекс сториса в массиве stories
     * @param {string} direction - 'next' или 'prev' (направление анимации)
     */
    function showStory(index, direction = 'next') {
      if (index < 0 || index >= stories.length) return;

      clearTimer();
      elapsed = 0;
      currentIndex = index;

      const story = stories[index];

      // ── Анимация смены картинки ──────────────────────────────────────────────
      // Сначала убираем все классы анимации и is-loading
      imgEl.classList.remove('anim-next', 'anim-prev', 'is-loading');

      // Форс-reflow чтобы классы точно удалились до добавления новых
      void imgEl.offsetWidth;

      // Добавляем класс анимации только если overlay уже открыт (is-active).
      // При первом открытии overlay ещё не имеет is-active —
      // картинка появится без анимации slide, сразу на месте.
      if (overlay.classList.contains('is-active')) {
        imgEl.classList.add(direction === 'next' ? 'anim-next' : 'anim-prev');
      }

      // Показываем спиннер загрузки пока картинка не загрузилась
      imgEl.classList.add('is-loading');
      imgEl.onload = () => imgEl.classList.remove('is-loading');
      imgEl.src = story.img;

      updateProgress(index);
      startTimer();

      // На первом сторисе прячем зону «назад» (визуально она всегда прозрачна,
      // но pointer-events отключаем чтобы случайный тап не вызвал goPrev)
      navPrev.style.pointerEvents = index === 0 ? 'none' : 'auto';
      navPrev.style.opacity = '0';
    }

    // ─── ТАЙМЕР ───────────────────────────────────────────────────────────────

    /**
     * Запускает таймер авто-перехода на следующий сторис.
     * Учитывает уже прошедшее время (elapsed), чтобы корректно
     * возобновляться после паузы.
     */
    function startTimer() {
      isPaused = false;
      startTime = Date.now();

      timer = setTimeout(() => {
        goNext();
      }, STORY_DURATION - elapsed);
    }

    /** Останавливает таймер без сброса elapsed. */
    function clearTimer() {
      clearTimeout(timer);
      timer = null;
    }

    /**
     * Ставит сторис на паузу:
     * - останавливает JS-таймер
     * - замораживает CSS-анимацию полосы прогресса
     * - накапливает elapsed для корректного возобновления
     */
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

    /**
     * Возобновляет сторис после паузы:
     * - пересчитывает --duration с учётом elapsed
     * - размораживает CSS-анимацию
     * - перезапускает JS-таймер
     */
    function resumeTimer() {
      if (!isPaused) return;

      const activeBar = progressEl.querySelector('.stories-progress-item.is-active');
      if (activeBar) {
        const remaining = (STORY_DURATION - elapsed) / 1000;
        activeBar.style.setProperty('--duration', `${remaining}s`);

        const fill = activeBar.querySelector('.stories-progress-fill');
        if (fill) fill.style.animationPlayState = 'running';
      }

      isPaused = false;
      startTime = Date.now();

      timer = setTimeout(() => {
        goNext();
      }, STORY_DURATION - elapsed);
    }

    // ─── НАВИГАЦИЯ ────────────────────────────────────────────────────────────

    /**
     * Переход к следующему сторису.
     * Если текущий последний — закрываем просмотрщик.
     */
    function goNext() {
      if (currentIndex + 1 >= stories.length) {
        closeStories();
      } else {
        showStory(currentIndex + 1, 'next');
      }
    }

    /**
     * Переход к предыдущему сторису.
     * На первом сторисе ничего не делает.
     */
    function goPrev() {
      if (currentIndex === 0) return;
      showStory(currentIndex - 1, 'prev');
    }

    // ─── ОТКРЫТИЕ / ЗАКРЫТИЕ ──────────────────────────────────────────────────

    /**
     * Открывает просмотрщик сторисов с заданного индекса.
     * Порядок важен: сначала строим прогресс-бары, потом добавляем is-active
     * (чтобы showStory знал что overlay ещё закрыт и не добавлял анимацию),
     * затем показываем сторис и только потом открываем overlay.
     * @param {number} index - с какого сториса начать
     */
    function openStories(index) {
      buildProgressBars();

      // showStory вызываем ДО добавления is-active —
      // внутри showStory проверяется overlay.classList.contains('is-active'),
      // и при первом открытии анимация slide не добавляется
      showStory(index, 'next');

      // Теперь открываем overlay
      overlay.classList.add('is-active');
      document.body.style.overflow = 'hidden';
    }

    /**
     * Закрывает просмотрщик и сбрасывает состояние.
     */
    function closeStories() {
      clearTimer();
      overlay.classList.remove('is-active');
      document.body.style.overflow = '';
      elapsed = 0;
    }

    // ─── КЛИКИ ПО КАРТОЧКАМ ───────────────────────────────────────────────────
    items.forEach((el, i) => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => openStories(i));
    });

    // ─── КНОПКА ЗАКРЫТИЯ ──────────────────────────────────────────────────────
    closeBtn.addEventListener('click', closeStories);

    // ─── ЗОНЫ НАВИГАЦИИ ───────────────────────────────────────────────────────
    navNext.addEventListener('click', goNext);
    navPrev.addEventListener('click', goPrev);

    // ─── СВАЙПЫ И ТАПЫ ────────────────────────────────────────────────────────
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    const SWIPE_THRESHOLD = 50;  // минимальный горизонтальный сдвиг для навигации (px)
    const SWIPE_DOWN_THRESHOLD = 80;  // минимальный вертикальный сдвиг вниз для закрытия (px)
    const LONG_TAP_THRESHOLD = 200; // мс: дольше = долгое нажатие (пауза), короче = тап

    overlay.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();

      // Любое касание сразу ставит на паузу — возобновим в touchend
      pauseTimer();
    }, { passive: true });

    overlay.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const dt = Date.now() - touchStartTime;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Приоритет 1: свайп вниз — закрыть просмотрщик
      if (absDy > SWIPE_DOWN_THRESHOLD && dy > 0 && absDy > absDx) {
        closeStories();
        return;
      }

      // Приоритет 2: горизонтальный свайп — навигация
      if (absDx > SWIPE_THRESHOLD && absDx > absDy) {
        dx < 0 ? goNext() : goPrev();
        return;
      }

      // Приоритет 3: короткий тап — просто возобновить (пользователь «пробуждает»)
      // Приоритет 4: долгое нажатие отпущено — тоже возобновить
      // В обоих случаях действие одинаковое
      resumeTimer();
    }, { passive: true });

    // touchcancel срабатывает, например, при входящем звонке —
    // возобновляем чтобы сторис не завис навсегда
    overlay.addEventListener('touchcancel', resumeTimer);

    // ─── КЛАВИАТУРА ───────────────────────────────────────────────────────────
    document.addEventListener('keydown', (e) => {
      // Реагируем только когда просмотрщик открыт
      if (!overlay.classList.contains('is-active')) return;
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'Escape') closeStories();
    });

    // ─── КЛИК ПО ФОНУ ─────────────────────────────────────────────────────────
    // Закрываем если клик пришёл напрямую по оверлею (не по дочернему элементу)
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
   * Функция обводки
   */
  (function () {

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