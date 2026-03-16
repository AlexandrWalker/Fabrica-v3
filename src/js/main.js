document.addEventListener('DOMContentLoaded', () => {

  const checkEditMode = document.querySelector('.bx-panel-toggle-on') ?? null;

  // Глобальные константы
  // Длительность плавного скролла страницы (мс) - используется в smoothScrollTo
  const SCROLL_DURATION = 1500;

  // Регистрируем плагин ScrollTrigger из библиотеки GSAP.
  // Должен вызываться один раз до создания любых триггеров.
  gsap.registerPlugin(ScrollTrigger);

  // Вспомогательные утилиты

  /**
   * Возвращает текущий размер корневого шрифта в пикселях (1rem -- px).
   * Кешируется через замыкание модуля - не пересчитывается при каждом вызове.
   * При необходимости динамического обновления (ресайз) - сбросить вручную.
   *
   * @returns {number} Размер 1rem в пикселях
   */
  const getRootFontSize = (() => {
    let cached = null;
    return () => {
      // При первом вызове вычисляем и запоминаем
      if (cached === null) {
        cached = parseFloat(getComputedStyle(document.documentElement).fontSize);
      }
      return cached;
    };
  })();

  /**
   * Безопасно добавляет обработчик события.
   * Если элемент не найден (null/undefined) - тихо выходит без ошибки.
   *
   * @param {EventTarget|null} el       - DOM-элемент или null
   * @param {string}           event    - имя события ('click', 'touchend', …)
   * @param {Function}         handler  - функция-обработчик
   * @param {object|boolean}   [opts]   - опции addEventListener (passive, capture…)
   */
  function safeOn(el, event, handler, opts) {
    if (el) el.addEventListener(event, handler, opts);
  }

  /**
   * ПОПАПЫ
   * 
   * Архитектура: стек открытых попапов + единый полупрозрачный
   * оверлей. Каждый новый попап получает z-index на 1 выше.
   * 
   * Поддерживаемые жесты:
   * - свайп вниз - закрыть верхний попап
   * - кнопка "Назад" браузера / iOS swipe-back - закрыть верхний
   */
  (function () {
    // Константы

    // Базовый z-index первого попапа. Каждый следующий получает BASE_Z + n
    const BASE_Z = 600;

    // Длительность анимации открытия/закрытия попапа (секунды)
    const POPUP_ANIM_DURATION = 0.4;

    // Состояние

    // Стек открытых попапов. Последний элемент - самый верхний (активный).
    // Используем массив как стек: push = открыть, pop = закрыть верхний.
    const stack = [];

    // Полупрозрачный оверлей под попапами.
    // Один на все попапы - затемняет страницу позади всего стека.
    const overlay = document.getElementById('popup-overlay');

    // Позиция скролла страницы в момент открытия первого попапа.
    // Нужна для корректного восстановления после снятия класса no-scroll.
    let scrollY = 0;

    // Определение поддержки тач-устройств

    /**
     * Флаг: было ли зафиксировано хотя бы одно касание (touchstart).
     *
     * Используется для различия двух сценариев:
     * - true -- устройство поддерживает touch (смартфон, планшет, тачпад в DevTools)
     * - false -- touch не обнаружен (обычный браузер без тачпада)
     *
     * Флаг устанавливается один раз при первом touchstart и дальше не сбрасывается.
     */
    let hasTouchSupport = false;

    /**
     * Обновляет класс `html-not-touched` на теге <html>.
     *
     * Логика:
     * - Если touch НЕ поддерживается -- добавляем класс `html-not-touched`
     * - Если touch поддерживается -- убираем класс `html-not-touched`
     *
     * Вызывается:
     * 1. При инициализации — чтобы сразу установить корректное состояние
     * 2. При первом touchstart — когда обнаруживаем реальный тач
     * 3. При изменении mediaQuery pointer:coarse — когда среда меняется
     *    (например, пользователь закрыл DevTools с эмуляцией мобильного)
     */
    function updateTouchClass() {
      document.documentElement.classList.toggle('html-not-touched', !hasTouchSupport);
    }

    /**
     * Проверяет поддержку touch через Media Query `pointer: coarse`.
     *
     * `pointer: coarse` означает, что основной указатель — неточный (палец).
     * Это верно для смартфонов, планшетов и DevTools с эмуляцией мобильного.
     * На десктопе без тачпада — `pointer: fine` (мышь).
     *
     * Почему именно это медиавыражение:
     * - `window.ontouchstart` и `navigator.maxTouchPoints` не меняются динамически
     *   при переключении DevTools, поэтому ненадёжны для нашей задачи.
     * - MediaQueryList.addEventListener('change') — единственный способ поймать
     *   момент, когда браузер «теряет» эмуляцию тача (закрытие DevTools).
     */
    const pointerCoarseQuery = window.matchMedia('(pointer: coarse)');

    /**
     * Обработчик изменения медиавыражения `pointer: coarse`.
     *
     * Срабатывает когда:
     * - Пользователь открыл DevTools и включил эмуляцию мобильного (matches = true)
     * - Пользователь закрыл DevTools или выключил эмуляцию (matches = false)
     * - На реальном устройстве — не срабатывает (среда не меняется)
     *
     * @param {MediaQueryListEvent} e - событие изменения медиавыражения
     */
    function onPointerTypeChange(e) {
      // Обновляем флаг в соответствии с текущим состоянием pointer
      hasTouchSupport = e.matches;
      updateTouchClass();
    }

    // Подписываемся на изменения pointer: coarse.
    // Это позволяет реагировать на включение/выключение эмуляции в DevTools.
    pointerCoarseQuery.addEventListener('change', onPointerTypeChange);

    /**
     * Инициализация начального состояния touch-флага.
     *
     * Проверяем сразу два признака:
     * 1. `pointerCoarseQuery.matches` — текущее значение pointer: coarse
     *    (true на смартфонах, планшетах и в DevTools с мобильной эмуляцией)
     * 2. `navigator.maxTouchPoints > 0` — браузер сообщает о наличии точек касания.
     *    Нужен как дополнительная проверка для браузеров, которые не поддерживают
     *    pointer media query (старые версии Safari, некоторые Android-браузеры).
     *
     * Оба условия через || (ИЛИ): достаточно одного совпадения.
     */
    hasTouchSupport = pointerCoarseQuery.matches || navigator.maxTouchPoints > 0;

    /**
     * Страховочный слушатель touchstart на случай, если медиавыражение
     * и maxTouchPoints не дали правильного результата.
     *
     * Некоторые устройства (гибриды ноутбук + тачскрин) могут иметь
     * pointer: fine (мышь как основной указатель), но при этом поддерживать
     * тач. Первый реальный touchstart — неоспоримое доказательство.
     *
     * { once: true } — слушатель автоматически удаляется после первого вызова,
     * так как повторное срабатывание не нужно.
     */
    document.addEventListener('touchstart', () => {
      if (!hasTouchSupport) {
        // Зафиксировали реальный тач — обновляем флаг и класс
        hasTouchSupport = true;
        updateTouchClass();
      }
    }, { once: true, passive: true });

    // Устанавливаем начальное состояние класса сразу при загрузке скрипта
    updateTouchClass();

    // Вспомогательные функции

    /**
     * Добавляет/снимает класс `popup-open` у <html>.
     * Класс сигнализирует CSS и другим модулям (навбар, панель)
     * о том, что хотя бы один попап открыт.
     */
    function updateHtmlClasses() {
      document.documentElement.classList.toggle('popup-open', stack.length > 0);
    }

    /**
     * Плавно показывает или скрывает оверлей через CSS transition.
     *
     * @param {boolean} visible  - true = показать, false = скрыть
     * @param {number}  duration - длительность перехода (секунды, по умолчанию 0.3)
     */
    function updateOverlay(visible, duration = 0.3) {
      overlay.style.transition = `opacity \${duration}s ease`;
      overlay.style.opacity = visible ? '1' : '0';
      // Скрытый оверлей не должен перехватывать клики
      overlay.style.pointerEvents = visible ? 'all' : 'none';
    }

    /**
     * Перебирает все попапы в стеке и разрешает клики только верхнему.
     *
     * Почему это нужно: если открыть попап поверх попапа, нижний частично
     * виден, и без этой функции он мог бы перехватывать события мыши/тача
     * через края или прозрачные области.
     */
    function updatePointerEvents() {
      stack.forEach((p, i) => {
        // Только последний элемент стека (i === stack.length - 1) активен
        p.style.pointerEvents = i === stack.length - 1 ? 'all' : 'none';
      });
    }

    // Блокировка/разблокировка скролла страницы

    /**
     * Блокирует скролл основной страницы при открытии первого попапа.
     *
     * Класс no-scroll предполагает в CSS: body { overflow: hidden }
     */
    function lockBodyScroll() {
      if (!document.body.classList.contains('no-scroll')) {
        scrollY = window.scrollY;
        document.body.classList.add('no-scroll');
      }
    }

    /**
     * Разблокирует скролл страницы.
     * Вызывается после каждого закрытия попапа, но реально снимает
     * блокировку только когда стек полностью опустел.
     */
    function unlockBodyScroll() {
      if (!stack.length) {
        document.body.classList.remove('no-scroll');
      }
    }

    // Открытие попапа

    /**
     * Открывает попап и кладёт его в стек.
     *
     * Анимация: попап "выезжает" снизу (top: 100% -- 0) и появляется (opacity: 0 -- 1).
     * requestAnimationFrame перед стартом transition нужен потому что браузер
     * должен сначала "увидеть" visibility: visible, а уже потом применять переход.
     * Без rAF анимация не сработает - особенно в Chrome.
     *
     * После открытия добавляем запись в history.pushState - это позволяет
     * закрыть попап стандартной кнопкой "Назад" или iOS swipe-back.
     *
     * @param {HTMLElement} popup - DOM-элемент попапа (.popup)
     */
    function openPopup(popup) {
      // Защита от повторного открытия того же самого попапа
      if (stack.includes(popup)) return;

      // Блокируем скролл только при самом первом открытом попапе
      if (!stack.length) lockBodyScroll();

      // z-index растёт, чтобы новый попап всегда был выше предыдущих
      popup.style.zIndex = BASE_Z + stack.length + 1;
      popup.style.visibility = 'visible';

      // rAF гарантирует, что visibility:visible уже применена браузером
      // до начала CSS transition (иначе анимация "съедается" в Safari/FF)
      requestAnimationFrame(() => {
        popup.style.transition = `top \${POPUP_ANIM_DURATION}s ease, opacity \${POPUP_ANIM_DURATION}s ease`;
        popup.style.top = '0';
        popup.style.opacity = '1';
        updateOverlay(true, POPUP_ANIM_DURATION);
      });

      stack.push(popup);

      // Маркер для внешних CSS-стилей и других скриптов
      popup.classList.add('popup-showed');

      updatePointerEvents();
      updateHtmlClasses();

      // Запись в историю: браузерная кнопка "Назад" -- popstate -- closeTopPopup
      history.pushState({ popupId: popup.id }, '');
    }

    // Закрытие верхнего попапа

    /**
     * Закрывает верхний (активный) попап из стека с анимацией.
     *
     * Попап "уезжает" вниз (top -- 100%) и исчезает (opacity -- 0).
     * После завершения анимации элемент полностью убирается из потока событий
     * через visibility: hidden и pointer-events: none.
     *
     * @param {number} [velocity=0] - скорость свайпа в px/мс.
     *   Чем быстрее был свайп, тем короче анимация (диапазон 0.2–0.6с).
     *   При обычном нажатии кнопки velocity=0 -- duration=0.4с.
     */
    function closeTopPopup(velocity = 0) {
      const popup = stack.pop();
      if (!popup) return;

      // Линейная интерполяция времени анимации по скорости свайпа
      const duration = Math.max(0.2, Math.min(0.6, POPUP_ANIM_DURATION - velocity));

      popup.style.transition = `top \${duration}s ease, opacity \${duration}s ease`;
      popup.style.top = '100%';
      popup.style.opacity = '0';

      // Оверлей скрываем только если больше нет открытых попапов
      // (pop() уже выполнен, поэтому stack.length отражает актуальное состояние)
      updateOverlay(stack.length > 0, duration);

      // После завершения CSS transition - убираем попап "в тень"
      setTimeout(() => {
        popup.style.visibility = 'hidden';
        popup.style.pointerEvents = 'none';
        popup.style.zIndex = '';
        overlay.style.transition = ''; // сбрасываем, чтобы следующий open работал чисто
        popup.classList.remove('popup-showed');
      }, duration * 1000);

      updatePointerEvents();
      unlockBodyScroll();
      updateHtmlClasses();
    }

    // Закрытие всех попапов

    /**
     * Закрывает все открытые попапы одновременно.
     *
     * splice(0) атомарно очищает стек и возвращает его копию.
     * Благодаря этому updatePointerEvents/updateHtmlClasses вызываются
     * уже с пустым стеком - состояние корректно.
     *
     * Используется при переходах по страницам или глобальных сбросах.
     */
    function closeAllPopups() {
      if (!stack.length) return;

      // Вырезаем все элементы и получаем их копию за одну операцию
      const toClose = stack.splice(0);

      toClose.forEach(popup => {
        popup.style.transition = `top \${POPUP_ANIM_DURATION}s ease, opacity \${POPUP_ANIM_DURATION}s ease`;
        popup.style.top = '100%';
        popup.style.opacity = '0';

        setTimeout(() => {
          popup.style.visibility = 'hidden';
          popup.style.pointerEvents = 'none';
          popup.style.zIndex = '';
          popup.classList.remove('popup-showed');
        }, POPUP_ANIM_DURATION * 1000);
      });

      updateOverlay(false, POPUP_ANIM_DURATION);

      // Сбрасываем transition оверлея после завершения анимации
      setTimeout(() => {
        overlay.style.transition = '';
      }, POPUP_ANIM_DURATION * 1000);

      updatePointerEvents();
      unlockBodyScroll();
      updateHtmlClasses();
    }

    // Обработчики кликов

    /**
     * Единый делегированный обработчик кликов для трёх сценариев:
     *
     * 1. [data-close-all-popups]  - закрыть все попапы сразу
     * 2. [data-popup-target="id"] - открыть попап с указанным id
     * 3. .popup__close            - закрыть попап, в котором находится кнопка
     *
     * Делегирование на document позволяет работать с динамически
     * добавленными элементами без повторной привязки обработчиков.
     */
    document.addEventListener('click', e => {
      // Сценарий 1: кнопка "закрыть всё"
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

      // Сценарий 3: крестик закрытия внутри попапа.
      // Ищем ближайший .popup по DOM-дереву - это важно при вложенных попапах,
      // чтобы закрыть именно тот попап, которому принадлежит кнопка.
      const closeBtn = e.target.closest('.popup__close');
      if (closeBtn) {
        const popup = closeBtn.closest('.popup');
        // Проверяем что попап в стеке: защита от двойного закрытия
        if (popup && stack.includes(popup)) closeTopPopup();
      }
    });

    // Свайп вниз для закрытия

    /**
     * Закрытие попапа свайпом вниз.
     *
     * Логика:
     * - touchstart - запоминаем стартовую Y-координату пальца
     * - touchmove  - смещаем попап вслед за пальцем, затемняем оверлей пропорционально
     * - touchend   - если смещение > 120px или скорость > 0.6px/мс -- закрываем,
     *                иначе возвращаем на место (пружина)
     *
     * Исключения (не перехватываем жест):
     * - тач внутри .swiper - Swiper обрабатывает его сам
     * - тач на прокручиваемом контенте ([data-popup-scroll]) если уже проскроллен вниз
     *
     * Направление тача намеренно не фильтруется в touchmove (passive: true),
     * поэтому попап следует за пальцем только вниз (Math.max(0, delta)).
     */
    document.addEventListener('touchstart', e => {
      const popup = e.target.closest('.popup');

      // Реагируем только на тач внутри верхнего (активного) попапа
      if (!popup || stack[stack.length - 1] !== popup) return;

      // Swiper управляет своими тачами самостоятельно - не вмешиваемся
      if (e.target.closest('.swiper')) return;

      // Если пользователь уже проскроллил контент вниз - не перехватываем,
      // иначе закрытие будет срабатывать вместо скролла вверх
      const scrollParent = e.target.closest('[data-popup-scroll]');
      if (scrollParent && scrollParent.scrollTop > 0) return;

      const startY = e.touches[0].clientY;
      let lastY = startY;
      const startTime = performance.now();

      /**
       * Обновляет позицию попапа и прозрачность оверлея в реальном времени.
       * Вызывается при каждом движении пальца.
       */
      function onMove(ev) {
        // Math.max(0) запрещает тянуть попап вверх (только вниз)
        const delta = Math.max(0, ev.touches[0].clientY - startY);

        // Отключаем transition во время тяги - попап должен следовать мгновенно
        popup.style.transition = 'none';
        popup.style.top = `\${delta}px`;

        // Оверлей темнеет -- светлеет пропорционально смещению (от 1 до 0)
        overlay.style.opacity = 1 - Math.min(delta / popup.offsetHeight, 1);

        lastY = ev.touches[0].clientY;
      }

      /**
       * Определяет исход свайпа: закрыть попап или вернуть на место.
       */
      function onEnd() {
        const delta = lastY - startY;
        const velocity = delta / (performance.now() - startTime); // px/мс

        // Восстанавливаем transition для плавного возврата или закрытия
        popup.style.transition = '';

        if (delta > 120 || velocity > 0.6) {
          // Достаточно далеко или быстро -- закрываем через историю браузера:
          // history.back() -- popstate -- closeTopPopup(velocity)
          history.back();
        } else {
          // Недостаточный свайп -- пружина: возвращаем попап на место
          const d = 0.3;
          popup.style.transition = `top \${d}s ease, opacity \${d}s ease`;
          popup.style.top = '0';
          updateOverlay(true, d);
        }

        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
      }

      // passive: true - не блокируем нативный скролл (не вызываем preventDefault)
      document.addEventListener('touchmove', onMove, { passive: true });
      document.addEventListener('touchend', onEnd);
    });

    // Интеграция с историей браузера

    /**
     * Срабатывает при нажатии "Назад" в браузере или iOS swipe-back.
     * Каждое openPopup() добавляло pushState, поэтому popstate
     * будет приходить ровно столько раз, сколько попапов открыто.
     */
    window.addEventListener('popstate', () => {
      if (stack.length) closeTopPopup();
    });

  })();

  /**
   * НАВИГАЦИОННЫЙ СЛАЙДЕР (nav__slider)
   * 
   * Горизонтальный Swiper с навигационными кнопками.
   * Автоматически подсвечивает активный слайд на основе
   * видимости секции .layout[id] в viewport.
   */
  (function () {
    const sliderEl = document.querySelector('.nav__slider');
    if (!sliderEl) return; // Слайдер отсутствует на странице - выходим

    const slides = sliderEl.querySelectorAll('.nav__slide');
    const sections = document.querySelectorAll('.layout[id]');

    // Инициализация Swiper с режимом свободного прокручивания (freeMode).
    // slidesPerView: 'auto' - ширина слайда определяется CSS, не Swiper-ом.
    const swiper = new Swiper('.nav__slider', {
      slidesPerGroup: 1,
      slidesPerView: 'auto',
      spaceBetween: 8,
      grabCursor: true,
      speed: 180,
      touchRatio: 1.6,       // коэффициент чувствительности тача
      resistance: true,
      resistanceRatio: 0.4,       // "упругость" при выходе за край
      centeredSlides: false,
      centeredSlidesBounds: true,
      loop: false,
      simulateTouch: true,      // включает перетаскивание мышью
      watchOverflow: true,      // отключает Swiper если контент помещается целиком
      direction: 'horizontal',
      touchStartPreventDefault: true,
      touchMoveStopPropagation: true,
      threshold: 8,         // минимальный сдвиг (px) для начала свайпа
      touchAngle: 25,        // максимальный угол от горизонтали (градусы)
      freeMode: {
        enabled: true,
        momentum: true,
        momentumRatio: 0.85,    // инерция после отпускания
        momentumVelocityRatio: 1,
        momentumBounce: false,   // без отскока на краях
        sticky: false
      },
      mousewheel: {
        forceToAxis: true,          // колесо прокручивает только по оси X
        sensitivity: 1,
        releaseOnEdges: true           // передаёт скролл странице на краях
      },
    });

    /**
     * Определяет последнюю видимую секцию в viewport и подсвечивает
     * соответствующий навигационный слайд классом `is-active`.
     *
     * Алгоритм: берём последнюю секцию, пересекающуюся с viewport
     * (чтобы при скролле вниз активировать "нижнюю" секцию).
     *
     * После установки is-active автоматически прокручиваем nav__slider
     * так, чтобы активный слайд был виден.
     */
    const updateActiveSlide = () => {
      let currentSection = null;
      const viewportTop = window.scrollY;
      const viewportBottom = viewportTop + window.innerHeight;

      sections.forEach(section => {
        const top = section.offsetTop;
        const bottom = top + section.offsetHeight;
        // Секция хотя бы частично видна - запоминаем последнюю такую
        if (bottom > viewportTop && top < viewportBottom) currentSection = section;
      });

      const targetId = currentSection ? currentSection.id : null;

      slides.forEach(slide => {
        const isActive = targetId !== null && slide.dataset.id === targetId;
        slide.classList.toggle('is-active', isActive);

        if (isActive) {
          // Проверяем, виден ли активный слайд в текущем положении слайдера
          const slideLeft = slide.offsetLeft;
          const slideRight = slideLeft + slide.offsetWidth;

          // Текущая позиция прокрутки (translate отрицательный -- инвертируем)
          const visibleLeft = swiper.translate * -1;
          const visibleRight = visibleLeft + swiper.width;

          let targetTranslate = swiper.translate;

          if (slideLeft < visibleLeft) {
            // Слайд левее области видимости -- прокручиваем влево
            targetTranslate = -slideLeft;
          } else if (slideRight > visibleRight) {
            // Слайд правее области видимости -- прокручиваем вправо
            targetTranslate = -(slideRight - swiper.width);
          }

          // Анимируем только если позиция действительно изменилась
          if (targetTranslate !== swiper.translate) {
            swiper.setTransition(300);
            swiper.setTranslate(targetTranslate);
          }
        }
      });
    };

    window.addEventListener('scroll', updateActiveSlide, { passive: true });
    window.addEventListener('resize', updateActiveSlide);
    updateActiveSlide(); // Выполняем при инициализации
  })();

  //

  /**
   * СЛАЙДЕР БЛЮДА (layout__head-slider)
   * 
   * Полноэкранный Swiper с пагинацией для просмотра фото блюда.
   * Может присутствовать несколько экземпляров на странице.
   */
  (function () {
    const layoutSwipers = document.querySelectorAll('.layout__head-slider');
    if (!layoutSwipers.length) return; // Нет слайдеров на странице - выходим

    layoutSwipers.forEach(layoutSwiper => {
      new Swiper(layoutSwiper, {
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
        loop: true,      // бесконечная прокрутка
        simulateTouch: true,
        watchOverflow: true,
        direction: 'horizontal',
        touchStartPreventDefault: true,
        // false - не блокируем propagation, чтобы попап-свайп работал корректно
        touchMoveStopPropagation: false,
        threshold: 8,
        touchAngle: 25,
        freeMode: {
          enabled: false,             // выключен: слайды защёлкиваются на каждом
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
          // Ищем пагинацию внутри конкретного экземпляра слайдера
          el: layoutSwiper.querySelector('.swiper-pagination'),
          clickable: true,           // точки кликабельны
        },
      });
    });
  })();

  //

  /**
   * Плавный программный скролл страницы.
   *
   * Реализует собственную анимацию на requestAnimationFrame
   * с функцией смягчения easeInOutCubic (S-кривая).
   *
   * Используется вместо нативного behavior: 'smooth' потому что:
   * - нативный не поддерживает кастомную длительность
   * - нативный нельзя прервать и возобновить программно
   * - нативный не поддерживает callback по завершении
   *
   * @param {number}   targetY   - целевая позиция скролла (px от верха страницы)
   * @param {number}   [duration=SCROLL_DURATION] - длительность (мс)
   * @param {Function} [callback] - вызывается после завершения анимации
   */
  function smoothScrollTo(targetY, duration = SCROLL_DURATION, callback) {
    const startY = window.scrollY;
    const delta = targetY - startY;
    const startTime = performance.now();

    // Если уже целевая позиция - сразу вызываем callback
    if (delta === 0) {
      if (callback) callback();
      return;
    }

    /**
     * Функция смягчения easeInOutCubic: медленно -- быстро -- медленно.
     * t - прогресс от 0 до 1.
     */
    function easeInOutCubic(t) {
      return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    /**
     * Один кадр анимации. Вычисляет прогресс и обновляет позицию скролла.
     * Рекурсивно вызывает себя через rAF пока прогресс < 1.
     *
     * @param {DOMHighResTimeStamp} now - текущее время (передаётся rAF)
     */
    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      window.scrollTo(0, startY + delta * easeInOutCubic(progress));

      if (progress < 1) {
        requestAnimationFrame(step);
      } else if (callback) {
        callback();
      }
    }

    requestAnimationFrame(step);
  }

  // Перехватываем все ссылки вида href="#id" и заменяем нативный скролл на плавный
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();

      const targetId = link.getAttribute('href').slice(1);
      const targetEl = document.getElementById(targetId);
      if (!targetEl) return;

      // scroll-padding равен высоте фиксированной навигации (в rem)
      const scrollPadding = 16.5 * getRootFontSize();
      const targetY = targetEl.getBoundingClientRect().top + window.scrollY - scrollPadding;

      smoothScrollTo(targetY, SCROLL_DURATION);
    });
  });

  //

  /**
   * LOGIN / LOGOUT
   * 
   * Переключает классы login/logout на <html>.
   * CSS использует эти классы для показа/скрытия элементов UI.
   */
  (function () {
    const loginBtn = document.querySelector('[data-log="login"]');
    const logoutBtn = document.querySelector('[data-log="logout"]');

    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        document.documentElement.classList.replace('logout', 'login') ||
          document.documentElement.classList.add('login');
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        document.documentElement.classList.replace('login', 'logout') ||
          document.documentElement.classList.add('logout');
      });
    }
  })();

  //

  /**
   * РЕГИСТРАЦИОННЫЙ КОД - ПОШАГОВЫЙ ВВОД
   * 
   * Компонент для ввода OTP/PIN-кода по одному символу в ячейке.
   * Автоматически переходит между полями при вводе и удалении.
   */
  (function () {
    const formCodeBodys = document.querySelectorAll('.form-code-body');
    if (!formCodeBodys.length) return;

    formCodeBodys.forEach(formCodeBody => {
      const inputs = formCodeBody.querySelectorAll('.form-code');
      const btn = formCodeBody.querySelector('.btn');
      if (!inputs.length || !btn) return;

      /**
       * Блокирует/разблокирует кнопку подтверждения.
       * Кнопка активна только если все ячейки заполнены.
       */
      const checkInputs = () => {
        btn.disabled = !Array.from(inputs).every(i => i.value.length > 0);
      };

      inputs.forEach((input, idx) => {

        /**
         * При вводе символа:
         * - Оставляем только последний введённый символ (защита от вставки нескольких)
         * - Автоматически переходим к следующей ячейке
         * - После заполнения последней ячейки фокус на кнопку
         */
        input.addEventListener('input', e => {
          // Если вставили несколько символов - оставляем только последний
          if (e.target.value.length > 1) e.target.value = e.target.value.slice(-1);

          if (e.target.value && idx < inputs.length - 1) {
            inputs[idx + 1].focus();       // следующая ячейка
          } else if (idx === inputs.length - 1) {
            btn.focus();                   // последняя ячейка -- кнопка
          }

          checkInputs();
        });

        /**
         * Backspace на пустой ячейке - возврат к предыдущей ячейке.
         * setTimeout(0) нужен чтобы checkInputs видел уже обновлённое состояние input.
         */
        input.addEventListener('keydown', e => {
          if (e.key === 'Backspace' && !e.target.value && idx > 0) {
            inputs[idx - 1].focus();
          }
          setTimeout(checkInputs, 0);
        });

        /**
         * Обработка вставки кода целиком (Ctrl+V / автозаполнение SMS).
         * Распределяет символы по ячейкам и устанавливает фокус.
         */
        input.addEventListener('paste', e => {
          e.preventDefault();
          const data = e.clipboardData.getData('text').trim().slice(0, inputs.length);

          data.split('').forEach((char, i) => {
            if (inputs[i]) inputs[i].value = char;
          });

          // Фокус: либо на кнопку (код введён полностью), либо на следующую пустую ячейку
          if (data.length >= inputs.length) {
            btn.focus();
          } else {
            inputs[data.length].focus();
          }

          checkInputs();
        });
      });

      checkInputs(); // Начальное состояние кнопки
    });
  })();

  //

  /**
   * КЛАСС filled ДЛЯ ТЕКСТОВЫХ ПОЛЕЙ                               
   *    
   * Добавляет класс filled когда поле не пустое.                   
   * Используется для CSS-анимации плавающего label.                
   */
  (function () {
    /**
     * Подписывает элемент на событие input.
     * При каждом изменении переключает класс filled в зависимости
     * от того, есть ли непробельный текст в поле.
     *
     * @param {HTMLInputElement|HTMLTextAreaElement} el
     */
    const addFilledClass = el => {
      el.addEventListener('input', () => {
        el.classList.toggle('filled', el.value.trim().length > 0);
      });
    };

    document.querySelectorAll('.form-input, .form-textarea').forEach(addFilledClass);
  })();

  /**
   * НАВИГАЦИЯ ПО КАТЕГОРИЯМ БЛЮД (layout__nav)
   * 
   * Горизонтальная навигация внутри секции .layout.
   * Работает двумя способами:
   * 1. Клик -- плавный скролл к карточке блюда
   * 2. Скролл -- подсветка пункта nav для видимой карточки
   * 
   * Поддерживает два режима layout:                              
   * - обычный (вертикальный скролл)
   * - layout--carousel (горизонтальный скролл)
   * 
   * Работает как на основной странице (scrollContainer = window)
   * так и внутри попапа (scrollContainer = [data-popup-scroll])
   */
  (function () {

    // Константы

    // Отступ от верха viewport при скролле к карточке (rem).
    // Должен соответствовать высоте фиксированного хедера + nav.
    const DEFAULT_OFFSET_REM = 21.8;

    // Уменьшенный отступ внутри попапа (popup имеет собственный хедер меньшей высоты)
    const POPUP_OFFSET_REM = 15.9;

    // Задержка перед снятием флага блокировки (мс).
    // Должна соответствовать duration у scrollTo({ behavior: 'smooth' }).
    const NAV_SCROLL_DURATION = 500;

    // Утилиты

    /**
     * Возвращает scroll-контейнер для данного layout.
     * Если layout находится внутри попапа с [data-popup-scroll] - скролл там.
     * Иначе скролл на уровне window.
     *
     * @param   {HTMLElement} layout
     * @returns {HTMLElement|Window}
     */
    function getScrollContainer(layout) {
      return layout.closest('[data-popup-scroll]') || window;
    }

    /**
     * Вычисляет отступ в пикселях для данного layout.
     * Попап имеет более короткую навигацию -- меньший отступ.
     *
     * @param   {HTMLElement} layout
     * @returns {number} Отступ в пикселях
     */
    function getOffsetPx(layout) {
      const isPopup = !!layout.closest('[data-popup-scroll]');
      const offsetRem = isPopup ? POPUP_OFFSET_REM : DEFAULT_OFFSET_REM;
      return offsetRem * getRootFontSize();
    }

    /**
     * Прокручивает горизонтальную навигацию так, чтобы активный пункт
     * был виден. Выполняет скролл только если кнопка частично вне зоны видимости.
     *
     * @param {HTMLElement} nav       - элемент .layout__nav
     * @param {HTMLElement} activeBtn - активный .layout__nav-item
     */
    function scrollNavToActiveItem(nav, activeBtn) {
      if (!activeBtn) return;

      const btnLeft = activeBtn.offsetLeft;
      const btnRight = btnLeft + activeBtn.offsetWidth;
      const scrollLeft = nav.scrollLeft;
      const rightEdge = scrollLeft + nav.clientWidth;

      // Кнопка полностью в зоне видимости - ничего не делаем
      if (btnLeft >= scrollLeft && btnRight <= rightEdge) return;

      // Центрируем кнопку в области видимости навигации
      nav.scrollTo({
        left: btnLeft - nav.clientWidth / 2 + activeBtn.offsetWidth / 2,
        behavior: 'smooth'
      });
    }

    // Обработчик клика

    /**
     * Делегированный обработчик кликов по .layout__nav-item.
     *
     * При клике:
     * 1. Находим целевую карточку по data-nav / data-dish
     * 2. Прокручиваем к ней (с учётом типа layout и контейнера скролла)
     * 3. Немедленно обновляем active-класс у nav-кнопок
     * 4. На время анимации блокируем авто-обновление nav при скролле
     *    (флаг _disableNavUpdate), чтобы "прыгающий" скролл не менял активный пункт
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

      // Ищем карточку, соответствующую нажатой кнопке навигации
      const targetKey = navBtn.dataset.nav;
      const targetCard = Array.from(cards).find(c => c.dataset.dish === targetKey);
      if (!targetCard) return;

      // Блокируем авто-обновление на время анимации скролла
      layout._disableNavUpdate = true;
      layout._activeByClick = true;

      const scrollContainer = getScrollContainer(layout);
      const offsetPx = getOffsetPx(layout);

      if (layout.classList.contains('layout--carousel')) {
        // Режим карусели: горизонтальный скролл контейнера
        const container = layout.querySelector('.layout__items');
        if (!container) return;

        // Центрируем карточку в контейнере
        const scrollTarget =
          targetCard.offsetLeft - (container.clientWidth / 2 - targetCard.offsetWidth / 2);

        container.scrollTo({ left: scrollTarget, behavior: 'smooth' });

      } else {
        // Обычный режим: вертикальный скролл
        const cardTopAbsolute =
          scrollContainer === window
            ? targetCard.getBoundingClientRect().top + window.pageYOffset
            : targetCard.offsetTop;

        scrollContainer.scrollTo({
          top: cardTopAbsolute - offsetPx,
          behavior: 'smooth'
        });
      }

      // Снимаем блокировку после завершения анимации скролла
      setTimeout(() => {
        layout._disableNavUpdate = false;
        layout._activeByClick = false;
        scrollNavToActiveItem(nav, navBtn);
      }, NAV_SCROLL_DURATION);

      // Немедленно обновляем классы активности (не ждём скролла)
      navItems.forEach(btn => btn.classList.toggle('active', btn === navBtn));
    });

    // Авто-обновление nav при скролле

    /**
     * Для каждого layout с навигацией подписываемся на scroll-события
     * и обновляем активный пункт меню.
     */
    document.querySelectorAll('.layout').forEach(layout => {
      const nav = layout.querySelector('.layout__nav');
      if (!nav) return;

      const navItems = nav.querySelectorAll('.layout__nav-item');
      const cards = layout.querySelectorAll('.card[data-dish]');
      if (!cards.length) return;

      const isCarousel = layout.classList.contains('layout--carousel');
      const scrollContainer = getScrollContainer(layout);
      const offsetPx = getOffsetPx(layout);

      /**
       * Определяет текущую активную карточку и обновляет nav.
       *
       * Для карусели: ищем карточку ближайшую к центру контейнера.
       * Для обычного layout: ищем последнюю карточку, чей верх выше
       * точки "активации" (viewport top + offset + 25% высоты).
       *
       * Флаги _disableNavUpdate и _activeByClick предотвращают
       * конфликт между ручным кликом и авто-обновлением.
       */
      const updateActiveNav = () => {
        if (layout._disableNavUpdate || layout._activeByClick) return;

        let currentCard = null;

        if (isCarousel) {
          // Карусель: ближайшая к центру карточка
          const container = layout.querySelector('.layout__items');
          if (!container) return;

          const scrollCenter = container.scrollLeft + container.clientWidth / 2;

          currentCard = Array.from(cards).reduce((closest, card) => {
            if (!closest) return card;
            const cardCenter = card.offsetLeft + card.offsetWidth / 2;
            const closestCenter = closest.offsetLeft + closest.offsetWidth / 2;
            return Math.abs(cardCenter - scrollCenter) <
              Math.abs(closestCenter - scrollCenter)
              ? card
              : closest;
          }, null);

        } else {
          // Обычный скролл: карточка выше точки активации
          const scrollPos =
            scrollContainer === window
              ? window.scrollY + offsetPx + window.innerHeight * 0.25
              : scrollContainer.scrollTop + offsetPx + scrollContainer.clientHeight * 0.25;

          cards.forEach(card => {
            const cardTop =
              scrollContainer === window
                ? card.getBoundingClientRect().top + window.pageYOffset
                : card.offsetTop;

            if (scrollPos >= cardTop) currentCard = card;
          });

          // Особый случай: долистали до самого низа -- активируем последнюю карточку
          if (
            scrollContainer === window &&
            window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4
          ) {
            currentCard = cards[cards.length - 1];
          }
        }

        if (!currentCard) return;

        const targetKey = currentCard.dataset.dish;

        navItems.forEach(btn => {
          const isActive = btn.dataset.nav === targetKey;
          btn.classList.toggle('active', isActive);

          if (isActive) scrollNavToActiveItem(nav, btn);
        });
      };

      // Подписываемся на нужный контейнер скролла
      if (isCarousel) {
        const container = layout.querySelector('.layout__items');
        if (container) container.addEventListener('scroll', updateActiveNav, { passive: true });
      } else {
        const target = scrollContainer === window ? window : scrollContainer;
        target.addEventListener('scroll', updateActiveNav, { passive: true });
      }

      updateActiveNav(); // Начальное состояние при загрузке
    });

  })();

  /**
   * ВЫПАДАЮЩИЙ СПИСОК (dropdown--js)
   *    
   * Кастомный select на основе radio-инпутов.
   * Открывается кликом, закрывается кликом вне или выбором опции.
   */
  (function () {
    const dropdowns = document.querySelectorAll('.dropdown--js');
    if (!dropdowns.length) return;

    dropdowns.forEach(dropdown => {
      const selectedJs = dropdown.querySelector('.dropdown__selected--js');
      const selectedInputJs = dropdown.querySelector('.dropdown__selected-input--js');
      const selectedLabelJs = dropdown.querySelector('.dropdown__selected-label--js');
      const dropdownRadios = dropdown.querySelectorAll('.dropdown__radio');
      const dropdownValue = dropdown.querySelector('.dropdown__value');

      if (!selectedJs) return; // Структура дропдауна нарушена - пропускаем

      /**
       * Переключает состояние дропдауна по клику на заголовок.
       * stopPropagation нужен чтобы document.click не закрыл его сразу же.
       */
      selectedJs.addEventListener('click', e => {
        e.stopPropagation();
        dropdown.classList.toggle('is-active');
      });

      /**
       * Закрываем дропдаун при клике в любом месте документа за его пределами.
       * Одна подписка на document работает для всех экземпляров дропдауна.
       */
      document.addEventListener('click', e => {
        if (!dropdown.contains(e.target)) {
          dropdown.classList.remove('is-active');
        }
      });

      /**
       * При смене radio-опции обновляем заголовок и скрытый input,
       * добавляем класс filled (для CSS-стилей) и закрываем список.
       */
      dropdownRadios.forEach(radio => {
        radio.addEventListener('change', () => {
          if (!radio.checked) return;

          if (selectedLabelJs) selectedLabelJs.textContent = radio.value;
          if (selectedInputJs) selectedInputJs.value = radio.value;
          if (dropdownValue) dropdownValue.value = radio.value;

          dropdown.classList.remove('is-active');
          dropdown.classList.add('filled');
        });
      });
    });
  })();

  //

  /**
   * ИКОНКА ПАНЕЛИ ПРИ ОТКРЫТИИ ПОПАПА                              
   *    
   * Добавляет/убирает класс is-flipped у .panel__btn               
   * когда изменяется наличие popup-open у <html>.                  
   */
  (function () {
    const html = document.documentElement;
    const button = document.querySelector('.panel__btn');
    if (!button) return; // Кнопка отсутствует - выходим

    /**
     * MutationObserver слушает изменения атрибута class у <html>.
     * Это надёжнее чем подписываться на произвольные события -
     * отражает реальное состояние DOM независимо от источника изменения.
     */
    new MutationObserver(() => {
      button.classList.toggle('is-flipped', html.classList.contains('popup-open'));
    }).observe(html, {
      attributes: true,
      attributeFilter: ['class']
    });
  })();

  /**
   * РЕЙТИНГ ЗВЁЗДАМИ (form-rating)
   * 
   * При клике на звезду заполняет все звёзды до кликнутой
   * включительно (классом icon-star-fill) и очищает остальные.
   */
  (function () {
    const formRating = document.querySelector('.form-rating');
    if (!formRating) return; // Компонент рейтинга отсутствует на странице

    const stars = formRating.querySelectorAll('i[data-rating]');
    if (!stars.length) return;

    /**
     * Устанавливает визуальный рейтинг: заполняет первые N звёзд,
     * очищает остальные.
     *
     * @param {number} rating - выбранное значение (1–N)
     */
    function setRating(rating) {
      stars.forEach((star, index) => {
        star.classList.toggle('icon-star-fill', index < rating);
      });
    }

    stars.forEach(star => {
      star.addEventListener('click', function () {
        const rating = parseInt(this.dataset.rating, 10);
        if (!isNaN(rating)) setRating(rating);
      });
    });
  })();

  /**
   * СТОРИСЫ                                                        
   *    
   * Полноэкранный просмотрщик историй в стиле Instagram.           
   *    
   * Ключевые возможности:                                           
   * - Двойной буфер изображений - смена без моргания               
   * - Анимированные прогресс-бары                                  
   * - Пауза при долгом нажатии                                     
   * - Горизонтальный свайп - следующий/предыдущий                  
   * - Свайп вниз - закрытие                                        
   * - Управление с клавиатуры (ArrowLeft/Right, Escape)            
   * - iOS-фикс: фиксируем body на время просмотра                  
   */
  (function () {

    const STORY_DURATION = 5000;
    const SWIPE_THRESHOLD = 50;
    const SWIPE_DOWN_THRESHOLD = 80;

    const items = Array.from(document.querySelectorAll('.stories-item'));
    if (!items.length) return;

    const stories = items.map(el => ({
      img: el.dataset.storyImg || el.querySelector('img')?.src || '',
    }));

    const overlay = document.getElementById('storiesOverlay');
    const progressEl = document.getElementById('storiesProgress');
    const closeBtn = document.getElementById('storiesClose');
    const navPrev = document.getElementById('storiesNavPrev');
    const navNext = document.getElementById('storiesNavNext');
    const imgA = document.getElementById('storiesImgA');
    const imgB = document.getElementById('storiesImgB');

    if (!overlay || !progressEl || !closeBtn || !navPrev || !navNext || !imgA || !imgB) return;

    let activeBuffer = 'A';
    let currentIndex = 0;
    let autoTimer = null;  // setTimeout для автоперехода
    let rafId = null;  // requestAnimationFrame для прогресс-бара
    let isPaused = false;
    let startTime = null;  // момент последнего start/resume
    let elapsed = 0;     // накопленное время паузами в мс
    let storiesScrollY = 0;
    let navHandled = false;
    let lastTouchEnd = 0;
    let touchStartX = 0;
    let touchStartY = 0;

    function getActiveImg() { return activeBuffer === 'A' ? imgA : imgB; }
    function getInactiveImg() { return activeBuffer === 'A' ? imgB : imgA; }

    // Строим полоски прогресса заново при каждом открытии
    function buildProgressBars() {
      progressEl.innerHTML = '';
      stories.forEach(() => {
        const item = document.createElement('div');
        item.className = 'stories-progress-item';
        // fill управляется через style.width напрямую из JS - без анимации в CSS
        item.innerHTML = '<div class="stories-progress-fill"></div>';
        progressEl.appendChild(item);
      });
    }

    // Возвращает DOM-элемент fill для конкретного индекса
    function getFill(index) {
      const bar = progressEl.querySelectorAll('.stories-progress-item')[index];
      return bar ? bar.querySelector('.stories-progress-fill') : null;
    }

    // Расставляет начальные ширины всех полосок:
    // пройденные = 100%, текущая = 0%, будущие = 0%
    function resetProgressBars(index) {
      const bars = progressEl.querySelectorAll('.stories-progress-item');
      bars.forEach((bar, i) => {
        const fill = bar.querySelector('.stories-progress-fill');
        if (i < index) {
          fill.style.width = '100%';
        } else {
          fill.style.width = '0%';
        }
      });
    }

    // Останавливает RAF-цикл прогресс-бара
    function stopRaf() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    // Останавливает таймер автоперехода
    function clearAutoTimer() {
      clearTimeout(autoTimer);
      autoTimer = null;
    }

    // Запускает RAF-цикл который каждый кадр обновляет width текущей полоски
    // Использует elapsed чтобы продолжить с нужного места после паузы
    function startProgressRaf(index) {
      stopRaf();

      const fill = getFill(index);
      if (!fill) return;

      // Запоминаем момент старта этого RAF-цикла
      const rafStart = performance.now();

      function tick(now) {
        // Суммарное время = накопленное до паузы + прошедшее с последнего старта
        const total = elapsed + (now - rafStart);
        const progress = Math.min(total / STORY_DURATION, 1);

        fill.style.width = (progress * 100) + '%';

        if (progress < 1) {
          // Ещё не закончили - запрашиваем следующий кадр
          rafId = requestAnimationFrame(tick);
        } else {
          rafId = null;
        }
      }

      rafId = requestAnimationFrame(tick);
    }

    // Ставит на паузу: останавливает RAF и таймер, фиксирует elapsed
    function pauseTimer() {
      if (isPaused) return;
      isPaused = true;

      elapsed += performance.now() - startTime;
      elapsed = Math.min(elapsed, STORY_DURATION);

      stopRaf();
      clearAutoTimer();
    }

    // Возобновляет после паузы: перезапускает RAF и таймер с оставшимся временем
    function resumeTimer() {
      if (!isPaused) return;
      isPaused = false;
      startTime = performance.now();

      startProgressRaf(currentIndex);

      const remaining = Math.max(50, STORY_DURATION - elapsed);
      autoTimer = setTimeout(goNext, remaining);
    }

    // Запускает прогресс и таймер для указанного сториса с нуля
    // (elapsed должен быть уже сброшен до вызова)
    function startTimer(index) {
      stopRaf();
      clearAutoTimer();

      isPaused = false;
      startTime = performance.now();

      startProgressRaf(index);

      autoTimer = setTimeout(goNext, STORY_DURATION);
    }

    // Показывает сторис по индексу
    // Загружает фото в неактивный буфер, после загрузки меняет буферы
    // Прогресс и таймер стартуют только после показа картинки
    function showStory(index) {
      if (index < 0 || index >= stories.length) return;

      stopRaf();
      clearAutoTimer();

      elapsed = 0;
      currentIndex = index;
      isPaused = false;

      resetProgressBars(index);

      const nextImg = getInactiveImg();
      const currentImg = getActiveImg();

      nextImg.classList.remove('is-visible');
      nextImg.src = stories[index].img;

      function onLoaded() {
        nextImg.removeEventListener('load', onLoaded);
        nextImg.removeEventListener('error', onLoaded);

        nextImg.classList.add('is-visible');
        currentImg.classList.remove('is-visible');
        activeBuffer = activeBuffer === 'A' ? 'B' : 'A';

        // Запускаем прогресс и таймер только после того как картинка видна
        startTimer(index);
      }

      nextImg.addEventListener('load', onLoaded);
      nextImg.addEventListener('error', onLoaded);

      // Если картинка уже в кеше - load не сработает, вызываем вручную
      if (nextImg.complete && nextImg.naturalWidth > 0) {
        onLoaded();
      }

      navPrev.style.pointerEvents = index === 0 ? 'none' : 'auto';
      navNext.style.pointerEvents = 'auto';
    }

    function goNext() {
      if (currentIndex + 1 >= stories.length) {
        closeStories();
      } else {
        showStory(currentIndex + 1);
      }
    }

    function goPrev() {
      if (currentIndex === 0) {
        // Первый сторис - начинаем заново
        elapsed = 0;
        isPaused = false;
        resetProgressBars(0);
        startTimer(0);
        return;
      }
      showStory(currentIndex - 1);
    }

    // Открывает оверлей начиная с нужного сториса
    function openStories(index) {
      buildProgressBars();

      imgA.classList.remove('is-visible');
      imgB.classList.remove('is-visible');
      imgA.src = '';
      imgB.src = '';
      activeBuffer = 'A';
      elapsed = 0;
      isPaused = false;

      overlay.classList.add('is-active');

      // iOS-фикс: фиксируем body чтобы страница не скроллилась под оверлеем
      storiesScrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-\${storiesScrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';

      showStory(index);
    }

    // Закрывает оверлей и восстанавливает страницу
    function closeStories() {
      stopRaf();
      clearAutoTimer();

      overlay.classList.remove('is-active');

      // iOS-фикс: снимаем position:fixed и возвращаем позицию скролла
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, storiesScrollY);

      elapsed = 0;
      currentIndex = 0;
      isPaused = false;
    }

    // Клик по карточке на странице
    items.forEach((el, i) => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => openStories(i));
    });

    closeBtn.addEventListener('click', closeStories);

    // Клики мышью по зонам навигации
    // Фильтруем синтетический click после touchend
    navNext.addEventListener('click', e => {
      e.stopPropagation();
      if (Date.now() - lastTouchEnd < 500) return;
      goNext();
    });

    navPrev.addEventListener('click', e => {
      e.stopPropagation();
      if (Date.now() - lastTouchEnd < 500) return;
      goPrev();
    });

    // Тач на зоне «вперёд» - если это тап (не свайп) идём вперёд
    navNext.addEventListener('touchend', e => {
      e.stopPropagation();
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(dy) > SWIPE_DOWN_THRESHOLD) return;

      navHandled = true;
      lastTouchEnd = Date.now();
      goNext();
    }, { passive: true });

    // Тач на зоне «назад»
    navPrev.addEventListener('touchend', e => {
      e.stopPropagation();
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(dy) > SWIPE_DOWN_THRESHOLD) return;

      navHandled = true;
      lastTouchEnd = Date.now();
      goPrev();
    }, { passive: true });

    // Любое касание оверлея - фиксируем координаты и ставим на паузу
    overlay.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      pauseTimer();
    }, { passive: true });

    // Отпускание пальца - определяем жест
    overlay.addEventListener('touchend', e => {
      if (navHandled) { navHandled = false; return; }

      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDy > SWIPE_DOWN_THRESHOLD && dy > 0 && absDy > absDx) {
        // Свайп вниз - закрываем
        closeStories();
        return;
      }

      if (absDx > SWIPE_THRESHOLD && absDx > absDy) {
        // Горизонтальный свайп - навигация
        dx < 0 ? goNext() : goPrev();
        return;
      }

      // Обычный тап - снимаем паузу
      resumeTimer();
    }, { passive: true });

    // Тач прерван системой - снимаем паузу чтобы не зависнуть
    overlay.addEventListener('touchcancel', () => resumeTimer());

    // Блокируем скролл страницы под оверлеем
    overlay.addEventListener('touchmove', e => {
      e.preventDefault();
    }, { passive: false });

    // Клавиатурное управление
    document.addEventListener('keydown', e => {
      if (!overlay.classList.contains('is-active')) return;
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'Escape') closeStories();
    });

    // Клик по фону оверлея (вне контента) - закрыть
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeStories();
    });

  })();

  /**
   * МОРФИНГ SVG МАСКИ ПАНЕЛИ (panel__mask)                         
   *    
   * Анимирует SVG path в .panel__mask при открытии/закрытии попапа.
   * Кривые Безье "расширяются" когда попап открыт (stateB)         
   * и "сжимаются" обратно когда попап закрыт (stateA).             
   *    
   * Для морфинга через GSAP используется числовой объект params -  
   * GSAP интерполирует числа, а buildPath() собирает из них путь.  
   */
  (function () {
    const panelMask = document.querySelector('.panel__mask');
    if (!panelMask) return;

    // Используем querySelector внутри panelMask или обращаемся к document.
    const pathEl = panelMask.querySelector('#wavePath');
    if (!pathEl) return;

    const html = document.documentElement;

    // Утилиты кривых Безье

    /**
     * Алгоритм де Кастельжо - делит кубическую кривую Безье
     * в параметрической точке t на две дочерних кривых.
     *
     * Используется чтобы добавить "узловую точку" без визуального изменения формы -
     * нужно для морфинга: обе формы должны иметь одинаковое число сегментов.
     *
     * @param   {number[]} p0..p3 - контрольные точки [x, y]
     * @param   {number}   t      - параметр деления (0..1)
     * @returns {{ left: number[][], right: number[][] }} - две дочерних кривых
     */
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

    /**
     * Делит кривую на 3 равные части через двойное применение де Кастельжо.
     * @returns {[number[][], number[][], number[][]]} три кривых
     */
    function split3(p0, p1, p2, p3) {
      const s1 = casteljau(p0, p1, p2, p3, 1 / 3);
      const s2 = casteljau(...s1.right, 1 / 2);
      return [s1.left, s2.left, s2.right];
    }

    /**
     * Делит кривую пополам.
     * @returns {[number[][], number[][]]} две кривых
     */
    function split2(p0, p1, p2, p3) {
      const s = casteljau(p0, p1, p2, p3, 0.5);
      return [s.left, s.right];
    }

    // Опорные кривые состояния A (закрыт попап)
    // Кривые описывают форму "углубления" (ниши) для иконки кнопки

    const aL1 = [
      [145.796, 0], [152.774, 0], [158.737, 2.02603], [162.89, 7.63478]
    ];
    const aL2 = [
      [162.89, 7.63478], [171.416, 19.1506], [178.549, 35.3855], [201, 35.3855]
    ];
    const [aL2a, aL2b] = split2(...aL2); // Разбиваем для совместимости числа сегментов

    const aR1 = [
      [201, 35.3855], [223.491, 35.3855], [231.284, 19.092], [240.112, 7.57247]
    ];
    const aR2 = [
      [240.112, 7.57247], [244.357, 2.03327], [250.298, 0], [257.276, 0]
    ];
    const [aR1a, aR1b] = split2(...aR1);

    // Состояния пути

    /**
     * stateA - обычное состояние: маленькая ниша для иконки меню.
     * Координаты получены из SVG через разбивку де Кастельжо.
     */
    const stateA = {
      leftH: 145.796,
      c1x1: aL1[1][0], c1y1: aL1[1][1], c1x2: aL1[2][0], c1y2: aL1[2][1], c1ex: aL1[3][0], c1ey: aL1[3][1],
      c2x1: aL2a[1][0], c2y1: aL2a[1][1], c2x2: aL2a[2][0], c2y2: aL2a[2][1], c2ex: aL2a[3][0], c2ey: aL2a[3][1],
      c3x1: aL2b[1][0], c3y1: aL2b[1][1], c3x2: aL2b[2][0], c3y2: aL2b[2][1], c3ex: aL2b[3][0], c3ey: aL2b[3][1],
      c4x1: aR1a[1][0], c4y1: aR1a[1][1], c4x2: aR1a[2][0], c4y2: aR1a[2][1], c4ex: aR1a[3][0], c4ey: aR1a[3][1],
      c5x1: aR1b[1][0], c5y1: aR1b[1][1], c5x2: aR1b[2][0], c5y2: aR1b[2][1], c5ex: aR1b[3][0], c5ey: aR1b[3][1],
      c6x1: aR2[1][0], c6y1: aR2[1][1], c6x2: aR2[2][0], c6y2: aR2[2][1], c6ex: aR2[3][0], c6ey: aR2[3][1],
      rightLx: 380.56, rightLy: 0
    };

    /**
     * stateB - состояние с открытым попапом: ниша "расплывается" в пузырь.
     * Координаты рассчитаны вручную для нужного визуального эффекта.
     */
    const stateB = {
      leftH: 132,
      c1x1: 149.673, c1y1: 0, c1x2: 163.247, c1y2: 14.3378, c1ex: 163.895, c1ey: 31.999,
      c2x1: 164.06, c2y1: 36.5144, c2x2: 164.391, c2y2: 40.6511, c2ex: 165, c2ey: 44,
      c3x1: 167, c3y1: 55, c3x2: 182, c3y2: 70.5, c3ex: 201.5, c3ey: 70.5,
      c4x1: 221, c4y1: 70.5, c4x2: 235.643, c4y2: 53.5, c4ex: 237, c4ey: 44,
      c5x1: 237.433, c5y1: 40.972, c5x2: 237.699, c5y2: 37.0708, c5ex: 237.859, c5ey: 32.776,
      c6x1: 238.513, c6y1: 15.2026, c6x2: 252.19, c6y2: 0.90046, c6ex: 269.776, c6ey: 0.777108,
      rightLx: 380.56, rightLy: 0
    };

    // Рабочий объект - GSAP анимирует его числа, buildPath читает их
    const params = { ...stateA };

    /**
     * Округляет до 4 знаков после запятой для читаемого SVG d-атрибута.
     * @param   {number} v
     * @returns {number}
     */
    function f(v) { return +v.toFixed(4); }

    /**
     * Собирает строку SVG path из текущих значений params.
     * Вызывается на каждом кадре GSAP-анимации через onUpdate.
     *
     * @returns {string} Полный d-атрибут SVG path
     */
    function buildPath() {
      const p = params;
      return [
        `M0 21.4458 C0 9.60161 9.59902 0 21.44 0`,
        `H\${f(p.leftH)}`,
        `C\${f(p.c1x1)} \${f(p.c1y1)} \${f(p.c1x2)} \${f(p.c1y2)} \${f(p.c1ex)} \${f(p.c1ey)}`,
        `C\${f(p.c2x1)} \${f(p.c2y1)} \${f(p.c2x2)} \${f(p.c2y2)} \${f(p.c2ex)} \${f(p.c2ey)}`,
        `C\${f(p.c3x1)} \${f(p.c3y1)} \${f(p.c3x2)} \${f(p.c3y2)} \${f(p.c3ex)} \${f(p.c3ey)}`,
        `C\${f(p.c4x1)} \${f(p.c4y1)} \${f(p.c4x2)} \${f(p.c4y2)} \${f(p.c4ex)} \${f(p.c4ey)}`,
        `C\${f(p.c5x1)} \${f(p.c5y1)} \${f(p.c5x2)} \${f(p.c5y2)} \${f(p.c5ex)} \${f(p.c5ey)}`,
        `C\${f(p.c6x1)} \${f(p.c6y1)} \${f(p.c6x2)} \${f(p.c6y2)} \${f(p.c6ex)} \${f(p.c6ey)}`,
        `L\${f(p.rightLx)} \${f(p.rightLy)}`,
        `C392.401 0 402 9.6016 402 21.4458`,
        `V77 H0 Z`
      ].join(' ');
    }

    /** Применяет текущий path к DOM-элементу */
    function applyPath() {
      pathEl.setAttribute('d', buildPath());
    }

    // Устанавливаем начальное состояние
    applyPath();

    let tween = null;

    /**
     * Анимирует params от текущих значений до целевого состояния.
     * kill() предыдущего tween предотвращает конфликт анимаций.
     *
     * @param {object} target - stateA или stateB
     */
    function animateTo(target) {
      if (tween) tween.kill();
      tween = gsap.to(params, {
        ...target,
        duration: 0.65,
        ease: 'power2.inOut',
        onUpdate: applyPath
      });
    }

    /**
     * Подписываемся на изменение класса popup-open у <html>.
     * Анимируем морфинг при открытии и закрытии любого попапа.
     */
    new MutationObserver(() => {
      animateTo(html.classList.contains('popup-open') ? stateB : stateA);
    }).observe(html, {
      attributes: true,
      attributeFilter: ['class']
    });

  })();

  /**
   * АНИМАЦИЯ ОБВОДКИ БАННЕРОВ (.banner)
   * 
   * При появлении баннера в viewport анимирует CSS-переменную
   * --progress от 0 до 1 через GSAP.
   * CSS использует --progress для stroke-dashoffset анимации SVG.
   * 
   * После завершения (_done = true) баннер больше не наблюдается.
   */
  (function () {

    const banners = document.querySelectorAll('.banner');
    if (!banners.length) return;

    const triggerMap = new WeakMap();

    function animateBannerIn(banner) {
      if (banner._done) return;
      if (banner._tween) banner._tween.kill();

      const proxy = {
        progress: parseFloat(banner.style.getPropertyValue('--progress')) || 0,
      };

      banner._tween = gsap.to(proxy, {
        progress: 1,
        duration: 0.5,
        ease: 'power2.inOut',
        onUpdate() {
          banner.style.setProperty('--progress', proxy.progress);
        },
        onComplete() {
          banner._done = true;
        },
      });
    }

    // Массив триггеров - чтобы потом переподписывать при ресайзе
    const triggers = [];

    banners.forEach(banner => {
      banner._done = false;
      banner._tween = null;
      banner.style.setProperty('--progress', '0');
      banner.style.position = 'relative';

      const trigger = document.createElement('div');
      Object.assign(trigger.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '1px',
        height: '100%',
        pointerEvents: 'none',
        visibility: 'hidden',
      });

      banner.appendChild(trigger);
      triggerMap.set(trigger, banner);
      triggers.push(trigger);
    });

    function createObserver() {
      const halfWidth = Math.floor(window.innerWidth / 2);

      return new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;

            const banner = triggerMap.get(entry.target);
            if (!banner) return;

            // Проверяем вручную: левый край триггера левее середины экрана
            const rect = entry.target.getBoundingClientRect();
            if (rect.left <= halfWidth) {
              animateBannerIn(banner);
            }
          });
        },
        { threshold: 0 }
      );
    }

    let observer = createObserver();

    triggers.forEach(trigger => observer.observe(trigger));

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        observer.disconnect();
        observer = createObserver();

        triggers.forEach(trigger => {
          const banner = triggerMap.get(trigger);
          if (banner && !banner._done) {
            observer.observe(trigger);
          }
        });
      }, 150);
    });

  })();

  /**
   * ПРИСВОЕНИЕ АКТИВНОГО КЛАССА ДЛЯ LIKE
   * 
   * Присваивает активный класс при клике. При повторном клике снимает класс.
   */
  (function () {
    const cardLikes = document.querySelectorAll('.card__like');

    cardLikes.forEach(item => {
      let isTouched = false;

      const stopBubbling = (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
      };

      item.addEventListener('touchstart', stopBubbling, { passive: false });

      item.addEventListener('touchend', (e) => {
        stopBubbling(e);
        isTouched = true;
        item.classList.toggle('like-is-active');

        // Сбрасываем флаг после задержки синтетического click
        setTimeout(() => { isTouched = false; }, 500);
      }, { passive: false });

      item.addEventListener('click', (e) => {
        stopBubbling(e);
        if (!isTouched) {
          item.classList.toggle('like-is-active');
        }
      });
    });
  })();

  /**
   * Прелоадер
   */
  (function () {
    document.body.classList.add('no-scroll');

    var safetyTimer = setTimeout(function () {
      var preloader = document.querySelector('.preloader');
      if (preloader && preloader.style.display !== 'none') {
        preloader.style.display = 'none';
        restoreScroll();
      }
    }, 8000);

    function restoreScroll() {
      document.body.classList.remove('no-scroll');
    }

    var canvas = document.getElementById('logo-canvas');
    var ctx = canvas.getContext('2d');

    var logoWidth = 185;
    var logoHeight = 179;

    var dpr = window.devicePixelRatio || 1;
    canvas.width = logoWidth * dpr;
    canvas.height = logoHeight * dpr;
    ctx.scale(dpr, dpr);

    var fillHeight = 0;

    var logoWhite = new Image();
    var logoCyan = new Image();
    var loadedImages = 0;

    function onImageLoaded() {
      loadedImages++;
      if (loadedImages === 2) {
        startPreloader();
      }
    }

    logoWhite.onload = onImageLoaded;
    logoCyan.onload = onImageLoaded;
    logoWhite.onerror = onImageLoaded;
    logoCyan.onerror = onImageLoaded;

    logoWhite.src = './images/logo/preloader-logo-white.svg';
    logoCyan.src = './images/logo/preloader-logo-cyan.svg';

    function draw() {
      ctx.clearRect(0, 0, logoWidth, logoHeight);

      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(logoWhite, 0, 0, logoWidth, logoHeight);

      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = '#06A5AA';

      var rectY = logoHeight - fillHeight;
      ctx.fillRect(0, rectY, logoWidth, fillHeight);

      ctx.globalCompositeOperation = 'source-over';
    }

    function startPreloader() {
      draw();

      var progress = { val: 0 };

      gsap.to(progress, {
        val: 30,
        duration: 0.4,
        ease: 'power2.out',
        onUpdate: function () {
          fillHeight = (progress.val / 100) * logoHeight;
          draw();
        }
      });

      gsap.to(progress, {
        val: 85,
        duration: 2.5,
        ease: 'power1.out',
        delay: 0.4,
        onUpdate: function () {
          fillHeight = (progress.val / 100) * logoHeight;
          draw();
        }
      });

      window.addEventListener('load', function () {

        gsap.killTweensOf(progress);

        gsap.to(progress, {
          val: 100,
          duration: 0.4,
          ease: 'power2.out',
          onUpdate: function () {
            fillHeight = (progress.val / 100) * logoHeight;
            draw();
          },
          onComplete: function () {
            setTimeout(hidePreloader, 600);
          }
        });
      });
    }

    function hidePreloader() {
      var preloader = document.querySelector('.preloader');

      gsap.set(canvas, { opacity: 0 });

      gsap.to(preloader, {
        scaleY: 0,
        duration: 0.7,
        ease: 'power2.inOut',
        transformOrigin: 'top center',
        onComplete: function () {
          preloader.style.display = 'none';
          restoreScroll();
        }
      });

      gsap.to(canvas, {
        scaleY: 2,
        duration: 0.7,
        ease: 'power2.inOut',
        transformOrigin: 'bottom center'
      });
    }

  })();

  /**
   * УВЕДОМЛЕНИЕ О COOKIE (.plate-cookie)                           
   *    
   * Показывает плашку если cookie COOKIE_ACCEPT ≠ '1'.            
   * checkCookies() вызывается из HTML при клике на кнопку.         
   */
  const cookieAccepted =
    ('; ' + document.cookie).split(`; COOKIE_ACCEPT=`).pop().split(';')[0] === '1';

  if (!cookieAccepted) {
    const cookiesNotify = document.getElementById('plate-cookie');
    if (cookiesNotify) {
      // Показываем плашку (translateY(100%) -- translateY(0))
      cookiesNotify.style.transform = 'translateY(0)';
    }
  }

});

//
// Вызывается из HTML: onclick="checkCookies()"
//

/**
 * Принимает cookie и скрывает плашку уведомления.
 *
 * Устанавливает COOKIE_ACCEPT=1 сроком на 1 год.
 */
function checkCookies() {
  const expires = new Date(Date.now() + 86400e3 * 365).toUTCString();
  document.cookie = `COOKIE_ACCEPT=1;path=/;expires=\${expires}`;

  const plate = document.getElementById('plate-cookie');
  if (!plate) return;

  // Уезжает вниз с CSS transition
  plate.style.transform = 'translateY(100%)';

  // Полностью удаляем из DOM после завершения анимации (5с)
  setTimeout(() => plate.remove(), 5000);
}