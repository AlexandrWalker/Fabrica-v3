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
		el.innerHTML = '<span style="font-family: \'FabricaIconFont\'">' + entity + '</span>' + html;
	}
	var icons = {
		'icon-bron': '&#xe900;',
		'icon-theme': '&#xe901;',
		'icon-callback': '&#xe902;',
		'icon-wa': '&#xe903;',
		'icon-callback-min': '&#xe904;',
		'icon-wa-min': '&#xe905;',
		'icon-tg-min': '&#xe906;',
		'icon-max-min': '&#xe907;',
		'icon-orientation': '&#xe908;',
		'icon-foodbook': '&#xe909;',
		'icon-menu-reviews-2': '&#xe90a;',
		'icon-menu-notifications': '&#xe90b;',
		'icon-tg': '&#xe90c;',
		'icon-vk': '&#xe90d;',
		'icon-max': '&#xe90e;',
		'icon-menu-telephone': '&#xe90f;',
		'icon-menu-call': '&#xe910;',
		'icon-menu-platform': '&#xe911;',
		'icon-call': '&#xe912;',
		'icon-stars': '&#xe913;',
		'icon-agreement': '&#xe914;',
		'icon-privacy': '&#xe915;',
		'icon-client-services': '&#xe916;',
		'icon-history': '&#xe917;',
		'icon-kuvshin': '&#xe918;',
		'icon-cup': '&#xe919;',
		'icon-search-2': '&#xe91a;',
		'icon-menu-catering': '&#xe91b;',
		'icon-add': '&#xe91c;',
		'icon-share-2': '&#xe91d;',
		'icon-business': '&#xe91e;',
		'icon-ananas': '&#xe91f;',
		'icon-bowl': '&#xe920;',
		'icon-grapefruit': '&#xe921;',
		'icon-butylka': '&#xe922;',
		'icon-bokal': '&#xe923;',
		'icon-language': '&#xe924;',
		'icon-home': '&#xe925;',
		'icon-menu-slang': '&#xe926;',
		'icon-vega': '&#xe927;',
		'icon-chef': '&#xe928;',
		'icon-menu-reviews': '&#xe929;',
		'icon-trash': '&#xe92a;',
		'icon-menu-rassadka': '&#xe92b;',
		'icon-qr': '&#xe92c;',
		'icon-points': '&#xe92d;',
		'icon-search': '&#xe92e;',
		'icon-menu-meatballs': '&#xe92f;',
		'icon-clock': '&#xe930;',
		'icon-menu-personal-offers': '&#xe931;',
		'icon-star': '&#xe932;',
		'icon-menu-user': '&#xe933;',
		'icon-menu-like': '&#xe934;',
		'icon-menu-geo': '&#xe935;',
		'icon-menu-card': '&#xe936;',
		'icon-close': '&#xe937;',
		'icon-user': '&#xe938;',
		'icon-question-mark': '&#xe939;',
		'icon-menu-contacts': '&#xe93a;',
		'icon-menu-loyalty-system': '&#xe93b;',
		'icon-menu-list': '&#xe93c;',
		'icon-menu-microphone': '&#xe93d;',
		'icon-meatballs': '&#xe93e;',
		'icon-login': '&#xe93f;',
		'icon-filter': '&#xe940;',
		'icon-up': '&#xe941;',
		'icon-carbohydrates': '&#xe942;',
		'icon-protein': '&#xe943;',
		'icon-calories': '&#xe944;',
		'icon-fat': '&#xe945;',
		'icon-share': '&#xe946;',
		'icon-hot': '&#xe947;',
		'icon-top': '&#xe948;',
		'icon-star-fill': '&#xe949;',
		'icon-like': '&#xe94a;',
		'icon-chevron-right': '&#xe94b;',
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
