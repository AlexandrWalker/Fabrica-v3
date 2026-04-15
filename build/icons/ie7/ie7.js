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
		'icon-stars': '&#xe900;',
		'icon-wa': '&#xe901;',
		'icon-max': '&#xe902;',
		'icon-tg': '&#xe903;',
		'icon-agreement': '&#xe904;',
		'icon-privacy': '&#xe905;',
		'icon-client-services': '&#xe906;',
		'icon-history': '&#xe907;',
		'icon-kuvshin': '&#xe908;',
		'icon-cup': '&#xe909;',
		'icon-menu-catering': '&#xe90a;',
		'icon-add': '&#xe90b;',
		'icon-share-2': '&#xe90c;',
		'icon-business': '&#xe90d;',
		'icon-ananas': '&#xe90e;',
		'icon-bowl': '&#xe90f;',
		'icon-grapefruit': '&#xe910;',
		'icon-butylka': '&#xe911;',
		'icon-bokal': '&#xe912;',
		'icon-language': '&#xe913;',
		'icon-home': '&#xe914;',
		'icon-menu-slang': '&#xe915;',
		'icon-vega': '&#xe916;',
		'icon-chef': '&#xe917;',
		'icon-menu-reviews': '&#xe918;',
		'icon-trash': '&#xe919;',
		'icon-menu-rassadka': '&#xe91a;',
		'icon-qr': '&#xe91b;',
		'icon-points': '&#xe91c;',
		'icon-search': '&#xe91d;',
		'icon-menu-meatballs': '&#xe91e;',
		'icon-clock': '&#xe91f;',
		'icon-menu-personal-offers': '&#xe920;',
		'icon-star': '&#xe921;',
		'icon-menu-user': '&#xe922;',
		'icon-menu-like': '&#xe923;',
		'icon-menu-geo': '&#xe924;',
		'icon-menu-card': '&#xe925;',
		'icon-close': '&#xe926;',
		'icon-user': '&#xe927;',
		'icon-question-mark': '&#xe928;',
		'icon-menu-contacts': '&#xe929;',
		'icon-menu-loyalty-system': '&#xe92a;',
		'icon-menu-list': '&#xe92b;',
		'icon-menu-microphone': '&#xe92c;',
		'icon-meatballs': '&#xe92d;',
		'icon-login': '&#xe92e;',
		'icon-filter': '&#xe92f;',
		'icon-up': '&#xe930;',
		'icon-carbohydrates': '&#xe931;',
		'icon-protein': '&#xe932;',
		'icon-calories': '&#xe933;',
		'icon-fat': '&#xe934;',
		'icon-share': '&#xe935;',
		'icon-hot': '&#xe936;',
		'icon-top': '&#xe937;',
		'icon-star-fill': '&#xe938;',
		'icon-like': '&#xe939;',
		'icon-chevron-right': '&#xe93a;',
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
