/* To avoid CSS expressions while still supporting IE 7 and IE 6, use this script */
/* The script tag referencing this file must be placed before the ending body tag. */

/* Use conditional comments in order to target IE 7 and older:
	<!--[if lt IE 8]><!-->
	<script src="ie7/ie7.js"></script>
	<!--<![endif]-->
*/

(function() {
	function addIcon(el, entity) {
		var html = el.innerHTML;
		el.innerHTML = '<span style="font-family: \'FoodbookIconFont\'">' + entity + '</span>' + html;
	}
	var icons = {
		'icon-callback': '&#xe900;',
		'icon-wa': '&#xe901;',
		'icon-callback-min': '&#xe902;',
		'icon-wa-min': '&#xe903;',
		'icon-tg-min': '&#xe904;',
		'icon-max-min': '&#xe905;',
		'icon-orientation': '&#xe906;',
		'icon-foodbook': '&#xe907;',
		'icon-menu-reviews-2': '&#xe908;',
		'icon-menu-notifications': '&#xe909;',
		'icon-tg': '&#xe90a;',
		'icon-vk': '&#xe90b;',
		'icon-max': '&#xe90c;',
		'icon-menu-telephone': '&#xe90d;',
		'icon-menu-call': '&#xe90e;',
		'icon-menu-platform': '&#xe90f;',
		'icon-stars': '&#xe910;',
		'icon-agreement': '&#xe911;',
		'icon-privacy': '&#xe912;',
		'icon-client-services': '&#xe913;',
		'icon-history': '&#xe914;',
		'icon-kuvshin': '&#xe915;',
		'icon-cup': '&#xe916;',
		'icon-menu-catering': '&#xe917;',
		'icon-add': '&#xe918;',
		'icon-share-2': '&#xe919;',
		'icon-business': '&#xe91a;',
		'icon-ananas': '&#xe91b;',
		'icon-bowl': '&#xe91c;',
		'icon-grapefruit': '&#xe91d;',
		'icon-butylka': '&#xe91e;',
		'icon-bokal': '&#xe91f;',
		'icon-language': '&#xe920;',
		'icon-home': '&#xe921;',
		'icon-menu-slang': '&#xe922;',
		'icon-vega': '&#xe923;',
		'icon-chef': '&#xe924;',
		'icon-menu-reviews': '&#xe925;',
		'icon-trash': '&#xe926;',
		'icon-menu-rassadka': '&#xe927;',
		'icon-qr': '&#xe928;',
		'icon-points': '&#xe929;',
		'icon-search': '&#xe92a;',
		'icon-menu-meatballs': '&#xe92b;',
		'icon-clock': '&#xe92c;',
		'icon-menu-personal-offers': '&#xe92d;',
		'icon-star': '&#xe92e;',
		'icon-menu-user': '&#xe92f;',
		'icon-menu-like': '&#xe930;',
		'icon-menu-geo': '&#xe931;',
		'icon-menu-card': '&#xe932;',
		'icon-close': '&#xe933;',
		'icon-user': '&#xe934;',
		'icon-question-mark': '&#xe935;',
		'icon-menu-contacts': '&#xe936;',
		'icon-menu-loyalty-system': '&#xe937;',
		'icon-menu-list': '&#xe938;',
		'icon-menu-microphone': '&#xe939;',
		'icon-meatballs': '&#xe93a;',
		'icon-login': '&#xe93b;',
		'icon-filter': '&#xe93c;',
		'icon-up': '&#xe93d;',
		'icon-carbohydrates': '&#xe93e;',
		'icon-protein': '&#xe93f;',
		'icon-calories': '&#xe940;',
		'icon-fat': '&#xe941;',
		'icon-share': '&#xe942;',
		'icon-hot': '&#xe943;',
		'icon-top': '&#xe944;',
		'icon-star-fill': '&#xe945;',
		'icon-like': '&#xe946;',
		'icon-chevron-right': '&#xe947;',
		'0': 0
		},
		els = document.getElementsByTagName('*'),
		i, c, el;
	for (i = 0; ; i += 1) {
		el = els[i];
		if(!el) {
			break;
		}
		c = el.className;
		c = c.match(/icon-[^\s'"]+/);
		if (c && icons[c[0]]) {
			addIcon(el, icons[c[0]]);
		}
	}
}());
