document.addEventListener('DOMContentLoaded', () => {

  // Глобальная длительность скролла в миллисекундах
  const SCROLL_DURATION = 1500;

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

    function closeAllPopups() {
      if (!stack.length) return;

      const duration = 0.4;

      // Копируем стек, чтобы корректно обработать все элементы
      const popupsToClose = [...stack];
      stack.length = 0;

      popupsToClose.forEach(popup => {
        popup.style.transition = `top ${duration}s ease, opacity ${duration}s ease`;
        popup.style.top = '100%';
        popup.style.opacity = '0';

        setTimeout(() => {
          popup.style.visibility = 'hidden';
          popup.style.pointerEvents = 'none';
          popup.style.zIndex = '';
        }, duration * 1000);
      });

      overlay.style.transition = `opacity ${duration}s ease`;
      overlay.style.opacity = '0';

      updatePointerEvents();
      unlockBodyScrollIfNeeded();
      removeHtmlPopupClassIfNeeded();
    }

    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-close-all-popups]');
      if (!btn) return;

      closeAllPopups();
    });

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
    // ─── CONFIG ───────────────────────────────────────────────────────────────
    const STORY_DURATION = 5000; // мс на один сторис

    // ─── COLLECT ITEMS ────────────────────────────────────────────────────────
    const items = Array.from(document.querySelectorAll('.stories-item'));

    // Собираем данные из каждого элемента
    const stories = items.map((el) => ({
      img: el.dataset.storyImg || el.querySelector('.stories-item img')?.src || '',
      // date: el.querySelector('.afisha__item-date')?.textContent.trim() || '',
    }));

    // ─── DOM ──────────────────────────────────────────────────────────────────
    const overlay = document.getElementById('storiesOverlay');
    const progressEl = document.getElementById('storiesProgress');
    const closeBtn = document.getElementById('storiesClose');
    const imgEl = document.getElementById('storiesImg');
    // const dateEl = document.getElementById('storiesDate');
    const navPrev = document.getElementById('storiesNavPrev');
    const navNext = document.getElementById('storiesNavNext');

    // ─── STATE ────────────────────────────────────────────────────────────────
    let currentIndex = 0;
    let timer = null;
    let isPaused = false;
    let startTime = null;
    let elapsed = 0;

    // ─── BUILD PROGRESS BARS ──────────────────────────────────────────────────
    function buildProgressBars() {
      progressEl.innerHTML = '';
      stories.forEach((_, i) => {
        const item = document.createElement('div');
        item.className = 'stories-progress-item';
        item.innerHTML = '<div class="stories-progress-fill"></div>';
        progressEl.appendChild(item);
      });
    }

    // ─── UPDATE PROGRESS ──────────────────────────────────────────────────────
    function updateProgress(index) {
      const bars = progressEl.querySelectorAll('.stories-progress-item');
      bars.forEach((bar, i) => {
        bar.classList.remove('is-done', 'is-active');
        const fill = bar.querySelector('.stories-progress-fill');
        fill.style.animation = 'none';
        fill.style.width = '0%';

        if (i < index) {
          bar.classList.add('is-done');
        } else if (i === index) {
          bar.classList.add('is-active');
          // CSS-переменная для длительности
          bar.style.setProperty('--duration', `${(STORY_DURATION - elapsed) / 1000}s`);
          // Форс reflow чтобы анимация перезапустилась
          void fill.offsetWidth;
          fill.style.animation = '';
        }
      });
    }

    // ─── SHOW STORY ───────────────────────────────────────────────────────────
    function showStory(index, direction = 'next') {
      if (index < 0 || index >= stories.length) return;

      clearTimer();
      elapsed = 0;
      currentIndex = index;

      const story = stories[index];

      // Анимация
      imgEl.classList.remove('anim-next', 'anim-prev', 'is-loading');
      void imgEl.offsetWidth;
      imgEl.classList.add(direction === 'next' ? 'anim-next' : 'anim-prev');

      imgEl.classList.add('is-loading');
      imgEl.onload = () => imgEl.classList.remove('is-loading');
      imgEl.src = story.img;
      // dateEl.textContent = story.date;

      updateProgress(index);
      startTimer();

      // Скрыть стрелку назад на первом
      navPrev.style.pointerEvents = index === 0 ? 'none' : 'auto';
      navPrev.style.opacity = '0'; // зоны всегда невидимы
    }

    // ─── TIMER ────────────────────────────────────────────────────────────────
    function startTimer() {
      isPaused = false;
      startTime = Date.now();

      timer = setTimeout(() => {
        goNext();
      }, STORY_DURATION - elapsed);
    }

    function clearTimer() {
      clearTimeout(timer);
      timer = null;
    }

    function pauseTimer() {
      if (isPaused) return;
      isPaused = true;
      elapsed += Date.now() - startTime;
      clearTimer();

      // Пауза CSS-анимации
      const activeFill = progressEl.querySelector('.stories-progress-item.is-active .stories-progress-fill');
      if (activeFill) activeFill.style.animationPlayState = 'paused';
    }

    function resumeTimer() {
      if (!isPaused) return;

      // Возобновить CSS-анимацию
      const activeBar = progressEl.querySelector('.stories-progress-item.is-active');
      if (activeBar) {
        const remaining = (STORY_DURATION - elapsed) / 1000;
        activeBar.style.setProperty('--duration', `${remaining}s`);
        const fill = activeBar.querySelector('.stories-progress-fill');
        fill.style.animationPlayState = 'running';
      }

      isPaused = false;
      startTime = Date.now();
      timer = setTimeout(() => {
        goNext();
      }, STORY_DURATION - elapsed);
    }

    // ─── NAVIGATION ───────────────────────────────────────────────────────────
    function goNext() {
      if (currentIndex + 1 >= stories.length) {
        closeStories();
      } else {
        showStory(currentIndex + 1, 'next');
      }
    }

    function goPrev() {
      if (currentIndex === 0) return;
      showStory(currentIndex - 1, 'prev');
    }

    // ─── OPEN / CLOSE ─────────────────────────────────────────────────────────
    function openStories(index) {
      buildProgressBars();
      overlay.classList.add('is-active');
      document.body.style.overflow = 'hidden';
      showStory(index, 'next');
    }

    function closeStories() {
      clearTimer();
      overlay.classList.remove('is-active');
      document.body.style.overflow = '';
      elapsed = 0;
    }

    // ─── CLICK ON AFISHA ITEMS ────────────────────────────────────────────────
    items.forEach((el, i) => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => openStories(i));
    });

    // ─── CLOSE BUTTON ─────────────────────────────────────────────────────────
    closeBtn.addEventListener('click', closeStories);

    // ─── NAV ZONES ────────────────────────────────────────────────────────────
    navNext.addEventListener('click', goNext);
    navPrev.addEventListener('click', goPrev);

    // ─── SWIPE ────────────────────────────────────────────────────────────────
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    const SWIPE_THRESHOLD = 50;  // px для горизонтального свайпа
    const SWIPE_DOWN_THRESHOLD = 80; // px для закрытия свайпом вниз
    const LONG_TAP_THRESHOLD = 200; // мс — долгое нажатие = пауза

    overlay.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
      pauseTimer();
    }, { passive: true });

    overlay.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const duration = Date.now() - touchStartTime;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Свайп вниз — закрыть
      if (absDy > SWIPE_DOWN_THRESHOLD && dy > 0 && absDy > absDx) {
        closeStories();
        return;
      }

      // Горизонтальный свайп
      if (absDx > SWIPE_THRESHOLD && absDx > absDy) {
        if (dx < 0) {
          goNext();
        } else {
          goPrev();
        }
        return;
      }

      // Короткий тап — просто возобновить таймер
      if (duration < LONG_TAP_THRESHOLD) {
        resumeTimer();
        return;
      }

      // Долгое нажатие отпущено — возобновить
      resumeTimer();
    }, { passive: true });

    // Долгий тап (удержание) — пауза уже вызвана в touchstart
    // touchcancel — возобновить
    overlay.addEventListener('touchcancel', resumeTimer);

    // ─── KEYBOARD ─────────────────────────────────────────────────────────────
    document.addEventListener('keydown', (e) => {
      if (!overlay.classList.contains('is-active')) return;
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'Escape') closeStories();
    });

    // ─── CLICK OUTSIDE ────────────────────────────────────────────────────────
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeStories();
    });

  })();

  // (function () {

  //   // ─── КОНФИГУРАЦИЯ ─────────────────────────────────────────────────────────
  //   const STORY_DURATION = 5000; // длительность одного сториса в миллисекундах
  //   const SWIPE_THRESHOLD = 50;   // минимальное смещение по X для горизонтального свайпа (px)
  //   const SWIPE_DOWN_THRESHOLD = 80;   // минимальное смещение по Y для закрытия свайпом вниз (px)
  //   const LONG_TAP_THRESHOLD = 200;  // порог долгого нажатия для паузы (мс)

  //   // ─── СБОР ДАННЫХ ИЗ DOM ───────────────────────────────────────────────────
  //   // Находим все элементы-сторисы на странице
  //   const items = Array.from(document.querySelectorAll('.stories-item'));

  //   // Формируем массив объектов с данными каждого сториса
  //   // data-story-img — путь к полноразмерному баннеру (указывается в HTML)
  //   // если data-story-img не задан — берём src миниатюры как фоллбэк
  //   const stories = items.map((el) => ({
  //     img: el.dataset.storyImg || el.querySelector('img')?.src || '',
  //   }));
  //   console.log('[Stories] найдено сторисов:', stories.length, stories);

  //   // ─── ЭЛЕМЕНТЫ DOM ─────────────────────────────────────────────────────────
  //   const overlay = document.getElementById('storiesOverlay');    // затемнённый оверлей
  //   const progressEl = document.getElementById('storiesProgress');   // контейнер прогресс-баров
  //   const closeBtn = document.getElementById('storiesClose');      // кнопка закрытия (крестик)
  //   const imgEl = document.getElementById('storiesImg');        // тег <img> внутри сториса
  //   const navPrev = document.getElementById('storiesNavPrev');    // зона нажатия «назад»
  //   const navNext = document.getElementById('storiesNavNext');    // зона нажатия «вперёд»

  //   // ─── СОСТОЯНИЕ ────────────────────────────────────────────────────────────
  //   let currentIndex = 0;     // индекс текущего сториса
  //   let timer = null;  // ссылка на setTimeout для автоперехода
  //   let isPaused = false; // флаг паузы
  //   let startTime = null;  // момент последнего старта/возобновления таймера
  //   let elapsed = 0;     // сколько мс уже прошло для текущего сториса
  //   let scrollY = 0;     // запомненная позиция скролла страницы (для iOS-фикса)
  //   let navHandled = false;     // Флаг: навигационная зона уже обработала этот тач

  //   // ─── ПЕРЕМЕННЫЕ ДЛЯ СВАЙПА ────────────────────────────────────────────────
  //   let touchStartX = 0;
  //   let touchStartY = 0;
  //   let touchStartTime = 0;

  //   // =========================================================================
  //   // ПРОГРЕСС-БАРЫ
  //   // =========================================================================

  //   // Создаём нужное количество прогресс-баров по количеству сторисов
  //   function buildProgressBars() {
  //     progressEl.innerHTML = '';
  //     stories.forEach(() => {
  //       const item = document.createElement('div');
  //       item.className = 'stories-progress-item';
  //       item.innerHTML = '<div class="stories-progress-fill"></div>';
  //       progressEl.appendChild(item);
  //     });
  //   }

  //   // Обновляем состояние всех прогресс-баров при переходе к сторису index
  //   function updateProgress(index) {
  //     const bars = progressEl.querySelectorAll('.stories-progress-item');

  //     bars.forEach((bar, i) => {
  //       const fill = bar.querySelector('.stories-progress-fill');

  //       // Сначала полностью сбрасываем все классы и стили
  //       bar.classList.remove('is-done', 'is-active');

  //       // Останавливаем любую текущую анимацию
  //       fill.style.animation = 'none';
  //       fill.style.width = '0%';

  //       if (i < index) {
  //         // Прошедшие сторисы — заполнены полностью
  //         bar.classList.add('is-done');

  //       } else if (i === index) {
  //         // Текущий сторис — запускаем анимацию заполнения
  //         bar.classList.add('is-active');

  //         // Вычисляем оставшееся время (elapsed уже сброшен в 0 перед вызовом)
  //         const remainingSec = (STORY_DURATION - elapsed) / 1000;

  //         // Форсируем reflow чтобы браузер увидел сброс анимации
  //         // и корректно запустил её заново (важно для Safari)
  //         void fill.offsetWidth;

  //         // Устанавливаем длительность напрямую через style (надёжнее CSS-переменных в Safari)
  //         fill.style.animationDuration = `${remainingSec}s`;
  //         fill.style.animationName = 'progressFill';
  //         fill.style.animationTimingFunction = 'linear';
  //         fill.style.animationFillMode = 'forwards';
  //         fill.style.animationPlayState = 'running';
  //       }
  //       // Будущие сторисы остаются пустыми (width: 0%, no animation)
  //     });
  //   }

  //   // =========================================================================
  //   // ПОКАЗ СТОРИСА
  //   // =========================================================================

  //   function showStory(index, direction = 'next') {
  //     // Защита от выхода за границы массива
  //     if (index < 0 || index >= stories.length) return;

  //     // Останавливаем предыдущий таймер и сбрасываем elapsed
  //     clearTimer();
  //     elapsed = 0;
  //     currentIndex = index;

  //     const story = stories[index];

  //     // ── Анимация смены изображения ──
  //     // Убираем предыдущие классы анимации
  //     imgEl.classList.remove('anim-next', 'anim-prev', 'is-loading');
  //     // Форс reflow для перезапуска анимации
  //     void imgEl.offsetWidth;
  //     // Добавляем нужное направление
  //     imgEl.classList.add(direction === 'next' ? 'anim-next' : 'anim-prev');

  //     // ── Загрузка изображения ──
  //     // Скрываем пока грузится (класс is-loading делает opacity: 0)
  //     imgEl.classList.add('is-loading');
  //     imgEl.onload = () => imgEl.classList.remove('is-loading');
  //     imgEl.onerror = () => imgEl.classList.remove('is-loading'); // не застрянем при ошибке
  //     imgEl.src = story.img;

  //     // ── Прогресс-бары ──
  //     updateProgress(index);

  //     // ── Таймер автоперехода ──
  //     startTimer();

  //     // ── Зона «назад» ──
  //     // На первом сторисе отключаем «назад», на последнем — «вперёд»
  //     navPrev.style.pointerEvents = index === 0 ? 'none' : 'auto';
  //     navNext.style.pointerEvents = index === stories.length - 1 ? 'none' : 'auto';
  //   }

  //   // =========================================================================
  //   // ТАЙМЕР
  //   // =========================================================================

  //   // Запускаем таймер автоперехода
  //   function startTimer() {
  //     isPaused = false;
  //     startTime = Date.now();

  //     timer = setTimeout(() => {
  //       goNext();
  //     }, STORY_DURATION - elapsed);
  //   }

  //   // Останавливаем таймер
  //   function clearTimer() {
  //     clearTimeout(timer);
  //     timer = null;
  //   }

  //   // Ставим сторис на паузу (долгое нажатие / touchstart)
  //   function pauseTimer() {
  //     // Если уже на паузе — ничего не делаем
  //     if (isPaused) return;

  //     isPaused = true;
  //     // Фиксируем сколько времени уже прошло
  //     elapsed += Date.now() - startTime;
  //     clearTimer();

  //     // Ставим CSS-анимацию прогресс-бара на паузу
  //     const activeFill = progressEl.querySelector(
  //       '.stories-progress-item.is-active .stories-progress-fill'
  //     );
  //     if (activeFill) {
  //       activeFill.style.animationPlayState = 'paused';
  //     }
  //   }

  //   // Возобновляем сторис после паузы
  //   function resumeTimer() {
  //     // Если не на паузе — ничего не делаем
  //     if (!isPaused) return;

  //     const activeBar = progressEl.querySelector('.stories-progress-item.is-active');
  //     if (activeBar) {
  //       const fill = activeBar.querySelector('.stories-progress-fill');
  //       const remainingSec = (STORY_DURATION - elapsed) / 1000;

  //       // Обновляем длительность оставшейся анимации и возобновляем её
  //       fill.style.animationDuration = `${remainingSec}s`;
  //       fill.style.animationPlayState = 'running';
  //     }

  //     isPaused = false;
  //     startTime = Date.now();

  //     // Перезапускаем JS-таймер на оставшееся время
  //     timer = setTimeout(() => {
  //       goNext();
  //     }, STORY_DURATION - elapsed);
  //   }

  //   // =========================================================================
  //   // НАВИГАЦИЯ
  //   // =========================================================================

  //   // Переход к следующему сторису
  //   // Если это был последний — закрываем оверлей
  //   function goNext() {
  //     console.log('[Stories] goNext: currentIndex =', currentIndex, '/ total =', stories.length);
  //     if (currentIndex + 1 >= stories.length) {
  //       closeStories();
  //     } else {
  //       showStory(currentIndex + 1, 'next');
  //     }
  //   }

  //   // Переход к предыдущему сторису
  //   // Если мы на первом — просто возобновляем таймер (никуда не уходим)
  //   function goPrev() {
  //     if (currentIndex === 0) {
  //       resumeTimer();
  //       return;
  //     }
  //     showStory(currentIndex - 1, 'prev');
  //   }

  //   // =========================================================================
  //   // ОТКРЫТИЕ / ЗАКРЫТИЕ
  //   // =========================================================================

  //   function openStories(index) {
  //     buildProgressBars();
  //     overlay.classList.add('is-active');

  //     // ── iOS-фикс: фиксируем body чтобы страница не скроллилась под оверлеем ──
  //     scrollY = window.scrollY;
  //     document.body.style.position = 'fixed';
  //     document.body.style.top = `-${scrollY}px`;
  //     document.body.style.left = '0';
  //     document.body.style.right = '0';
  //     document.body.style.overflow = 'hidden';

  //     showStory(index, 'next');
  //   }

  //   function closeStories() {
  //     clearTimer();
  //     overlay.classList.remove('is-active');

  //     // ── iOS-фикс: возвращаем скролл на место ──
  //     document.body.style.position = '';
  //     document.body.style.top = '';
  //     document.body.style.left = '';
  //     document.body.style.right = '';
  //     document.body.style.overflow = '';
  //     window.scrollTo(0, scrollY);

  //     // Сбрасываем состояние
  //     elapsed = 0;
  //     currentIndex = 0;
  //   }

  //   // =========================================================================
  //   // ОБРАБОТЧИКИ СОБЫТИЙ
  //   // =========================================================================

  //   // ── Клик по элементу афиши — открываем нужный сторис ──
  //   items.forEach((el, i) => {
  //     el.style.cursor = 'pointer';
  //     el.addEventListener('click', () => openStories(i));
  //   });

  //   // ── Крестик закрытия ──
  //   closeBtn.addEventListener('click', closeStories);

  //   // ── Зоны навигации (десктоп, клик мышью) ──
  //   navNext.addEventListener('click', (e) => {
  //     e.stopPropagation(); // не даём событию дойти до overlay
  //     goNext();
  //   });

  //   navPrev.addEventListener('click', (e) => {
  //     e.stopPropagation(); // не даём событию дойти до overlay
  //     if (currentIndex === 0) {
  //       resumeTimer(); // на первом сторисе просто возобновляем таймер
  //       return;
  //     }
  //     goPrev();
  //   });

  //   // ── Зоны навигации (тач) ──
  //   // Обрабатываем touchend на зонах отдельно, чтобы избежать
  //   // конфликта с общим обработчиком на overlay
  //   navPrev.addEventListener('touchend', (e) => {
  //     e.stopPropagation();
  //     const dx = e.changedTouches[0].clientX - touchStartX;
  //     const dy = e.changedTouches[0].clientY - touchStartY;

  //     if (Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(dy) > SWIPE_DOWN_THRESHOLD) return;

  //     navHandled = true;
  //     if (currentIndex === 0) {
  //       resumeTimer();
  //       return;
  //     }
  //     goPrev();
  //   }, { passive: true });

  //   navNext.addEventListener('touchend', (e) => {
  //     e.stopPropagation();
  //     const dx = e.changedTouches[0].clientX - touchStartX;
  //     const dy = e.changedTouches[0].clientY - touchStartY;

  //     if (Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(dy) > SWIPE_DOWN_THRESHOLD) return;

  //     navHandled = true;
  //     goNext();
  //   }, { passive: true });

  //   // ── Свайпы по оверлею ──
  //   overlay.addEventListener('touchstart', (e) => {
  //     touchStartX = e.touches[0].clientX;
  //     touchStartY = e.touches[0].clientY;
  //     touchStartTime = Date.now();
  //     pauseTimer(); // при касании ставим на паузу
  //   }, { passive: true });

  //   overlay.addEventListener('touchend', (e) => {
  //     // Если навигационная зона уже обработала этот тач — сбрасываем флаг и выходим
  //     if (navHandled) {
  //       navHandled = false;
  //       return;
  //     }

  //     const dx = e.changedTouches[0].clientX - touchStartX;
  //     const dy = e.changedTouches[0].clientY - touchStartY;
  //     const duration = Date.now() - touchStartTime;
  //     const absDx = Math.abs(dx);
  //     const absDy = Math.abs(dy);

  //     // Свайп вниз — закрыть оверлей
  //     if (absDy > SWIPE_DOWN_THRESHOLD && dy > 0 && absDy > absDx) {
  //       closeStories();
  //       return;
  //     }

  //     // Горизонтальный свайп — навигация
  //     if (absDx > SWIPE_THRESHOLD && absDx > absDy) {
  //       if (dx < 0) {
  //         goNext();
  //       } else {
  //         goPrev();
  //       }
  //       return;
  //     }

  //     // Короткий тап или отпускание долгого нажатия — возобновляем
  //     resumeTimer();
  //   }, { passive: true });

  //   // Если тач прерван системой (звонок, уведомление и т.д.) — возобновляем
  //   overlay.addEventListener('touchcancel', () => resumeTimer());

  //   // Блокируем нативный скролл страницы пока открыт оверлей (важно для iOS)
  //   overlay.addEventListener('touchmove', (e) => {
  //     e.preventDefault();
  //   }, { passive: false });

  //   // ── Клавиатура (десктоп) ──
  //   document.addEventListener('keydown', (e) => {
  //     if (!overlay.classList.contains('is-active')) return;
  //     if (e.key === 'ArrowRight') goNext();
  //     if (e.key === 'ArrowLeft') goPrev();
  //     if (e.key === 'Escape') closeStories();
  //   });

  //   // ── Клик по затемнённой области вокруг контейнера — закрыть ──
  //   overlay.addEventListener('click', (e) => {
  //     if (e.target === overlay) closeStories();
  //   });

  // })();

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