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
		'icon-docs': '&#xe900;',
		'icon-bron': '&#xe901;',
		'icon-theme': '&#xe902;',
		'icon-callback': '&#xe903;',
		'icon-wa': '&#xe904;',
		'icon-callback-min': '&#xe905;',
		'icon-wa-min': '&#xe906;',
		'icon-tg-min': '&#xe907;',
		'icon-max-min': '&#xe908;',
		'icon-orientation': '&#xe909;',
		'icon-foodbook': '&#xe90a;',
		'icon-menu-reviews-2': '&#xe90b;',
		'icon-menu-notifications': '&#xe90c;',
		'icon-tg': '&#xe90d;',
		'icon-vk': '&#xe90e;',
		'icon-max': '&#xe90f;',
		'icon-menu-telephone': '&#xe910;',
		'icon-menu-call': '&#xe911;',
		'icon-menu-platform': '&#xe912;',
		'icon-call': '&#xe913;',
		'icon-stars': '&#xe914;',
		'icon-agreement': '&#xe915;',
		'icon-privacy': '&#xe916;',
		'icon-client-services': '&#xe917;',
		'icon-history': '&#xe918;',
		'icon-kuvshin': '&#xe919;',
		'icon-cup': '&#xe91a;',
		'icon-search-2': '&#xe91b;',
		'icon-menu-catering': '&#xe91c;',
		'icon-add': '&#xe91d;',
		'icon-share-2': '&#xe91e;',
		'icon-business': '&#xe91f;',
		'icon-ananas': '&#xe920;',
		'icon-bowl': '&#xe921;',
		'icon-grapefruit': '&#xe922;',
		'icon-butylka': '&#xe923;',
		'icon-bokal': '&#xe924;',
		'icon-language': '&#xe925;',
		'icon-home': '&#xe926;',
		'icon-menu-slang': '&#xe927;',
		'icon-vega': '&#xe928;',
		'icon-chef': '&#xe929;',
		'icon-menu-reviews': '&#xe92a;',
		'icon-trash': '&#xe92b;',
		'icon-menu-rassadka': '&#xe92c;',
		'icon-qr': '&#xe92d;',
		'icon-points': '&#xe92e;',
		'icon-search': '&#xe92f;',
		'icon-menu-meatballs': '&#xe930;',
		'icon-clock': '&#xe931;',
		'icon-menu-personal-offers': '&#xe932;',
		'icon-star': '&#xe933;',
		'icon-menu-user': '&#xe934;',
		'icon-menu-like': '&#xe935;',
		'icon-menu-geo': '&#xe936;',
		'icon-menu-card': '&#xe937;',
		'icon-close': '&#xe938;',
		'icon-user': '&#xe939;',
		'icon-question-mark': '&#xe93a;',
		'icon-menu-contacts': '&#xe93b;',
		'icon-menu-loyalty-system': '&#xe93c;',
		'icon-menu-list': '&#xe93d;',
		'icon-menu-microphone': '&#xe93e;',
		'icon-meatballs': '&#xe93f;',
		'icon-login': '&#xe940;',
		'icon-filter': '&#xe941;',
		'icon-up': '&#xe942;',
		'icon-carbohydrates': '&#xe943;',
		'icon-protein': '&#xe944;',
		'icon-calories': '&#xe945;',
		'icon-fat': '&#xe946;',
		'icon-share': '&#xe947;',
		'icon-hot': '&#xe948;',
		'icon-top': '&#xe949;',
		'icon-star-fill': '&#xe94a;',
		'icon-like': '&#xe94b;',
		'icon-chevron-right': '&#xe94c;',
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
