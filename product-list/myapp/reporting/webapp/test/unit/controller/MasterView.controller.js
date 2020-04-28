/*global QUnit*/

sap.ui.define([
	"coeLearningDash/coeLearningDash/controller/MasterView.controller"
], function (Controller) {
	"use strict";

	QUnit.module("MasterView Controller");

	QUnit.test("I should test the MasterView controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});