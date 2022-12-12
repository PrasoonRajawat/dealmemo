/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"comui/dealmemo_local/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
