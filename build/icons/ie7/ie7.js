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
		'icon-callback': '&#xe900;',
		'icon-stars': '&#xe901;',
		'icon-wa': '&#xe902;',
		'icon-max': '&#xe903;',
		'icon-tg': '&#xe904;',
		'icon-agreement': '&#xe905;',
		'icon-privacy': '&#xe906;',
		'icon-client-services': '&#xe907;',
		'icon-history': '&#xe908;',
		'icon-kuvshin': '&#xe909;',
		'icon-cup': '&#xe90a;',
		'icon-menu-catering': '&#xe90b;',
		'icon-add': '&#xe90c;',
		'icon-share-2': '&#xe90d;',
		'icon-business': '&#xe90e;',
		'icon-ananas': '&#xe90f;',
		'icon-bowl': '&#xe910;',
		'icon-grapefruit': '&#xe911;',
		'icon-butylka': '&#xe912;',
		'icon-bokal': '&#xe913;',
		'icon-language': '&#xe914;',
		'icon-home': '&#xe915;',
		'icon-menu-slang': '&#xe916;',
		'icon-vega': '&#xe917;',
		'icon-chef': '&#xe918;',
		'icon-menu-reviews': '&#xe919;',
		'icon-trash': '&#xe91a;',
		'icon-menu-rassadka': '&#xe91b;',
		'icon-qr': '&#xe91c;',
		'icon-points': '&#xe91d;',
		'icon-search': '&#xe91e;',
		'icon-menu-meatballs': '&#xe91f;',
		'icon-clock': '&#xe920;',
		'icon-menu-personal-offers': '&#xe921;',
		'icon-star': '&#xe922;',
		'icon-menu-user': '&#xe923;',
		'icon-menu-like': '&#xe924;',
		'icon-menu-geo': '&#xe925;',
		'icon-menu-card': '&#xe926;',
		'icon-close': '&#xe927;',
		'icon-user': '&#xe928;',
		'icon-question-mark': '&#xe929;',
		'icon-menu-contacts': '&#xe92a;',
		'icon-menu-loyalty-system': '&#xe92b;',
		'icon-menu-list': '&#xe92c;',
		'icon-menu-microphone': '&#xe92d;',
		'icon-meatballs': '&#xe92e;',
		'icon-login': '&#xe92f;',
		'icon-filter': '&#xe930;',
		'icon-up': '&#xe931;',
		'icon-carbohydrates': '&#xe932;',
		'icon-protein': '&#xe933;',
		'icon-calories': '&#xe934;',
		'icon-fat': '&#xe935;',
		'icon-share': '&#xe936;',
		'icon-hot': '&#xe937;',
		'icon-top': '&#xe938;',
		'icon-star-fill': '&#xe939;',
		'icon-like': '&#xe93a;',
		'icon-chevron-right': '&#xe93b;',
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
