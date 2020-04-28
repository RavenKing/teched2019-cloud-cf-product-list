sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel"
], function (Controller) {
	"use strict";

	return Controller.extend("coeLearningDash.coeLearningDash.controller.MasterView", {
		onInit: function (JSONModel) {
			
			var ajaxresult = [];
			var _sources = [];
			var _weeks = [];
			var _topics = [];
			var _teamHours = {};
			var _url = "https://educationtime.cfapps.us10.hana.ondemand.com/educationTime";
			
			var oModel = new sap.ui.model.json.JSONModel("https://educationtime.cfapps.us10.hana.ondemand.com/educationTime");
			this.getView().setModel(oModel);
			//var oModel = new sap.ui.model.odata.ODataModel("https://product-listdemo.cfapps.us10.hana.ondemand.com/dbTest");
			//this.getView().byId("chart1").bindRows("/");
			console.log(oModel);
			const distinct = (value, index, self) => {
				return self.indexOf(value) === index;
			}

			$.ajax({
				method: "GET",
				contentType: "application/json",
				url: "https://educationtime.cfapps.us10.hana.ondemand.com/educationTime",
				dataType: "JSON",
				async: false,
				success: function (data) {
					ajaxresult.push(data);
				}
			});

			console.log(ajaxresult);
			ajaxresult = ajaxresult[0];

		/*	for (var i = 0; i < ajaxresult.length; i++) {
				console.log(ajaxresult[i].edu_topic);
				_sources.push(ajaxresult[i].edu_source.toString());
				_weeks.push(ajaxresult[i].calendar_week.toString());
				_topics.push(ajaxresult[i].edu_topic.toString());
			}*/

			_topics = _topics.map(function (x) {
				return x.toUpperCase()
			}).filter(distinct);
			console.log(_topics);
			_weeks = _weeks.map(function (x) {
				return x.toUpperCase()
			}).filter(distinct);
			console.log(_weeks);
			_sources = _sources.map(function (x) {
				return x.toUpperCase()
			}).filter(distinct);
			console.log(_sources);
			this.createCWChart(_url);
			this.createCWChart2(_url);
			this.createPieChart(_url);
			this.createPieChart2(_url);

			//oLayout.setMax(200);
			//oLayout.destroyBars();
		},
		createCWChart: function () {
			var oModel = this.getView().getModel();
			//new sap.ui.model.json.JSONModel("https://educationtime.cfapps.us10.hana.ondemand.com/educationTime");
			var oVizFrame = this.getView().byId("idStackedChart");
			oVizFrame.setVizProperties({
				plotArea: {
					colorPalette: d3.scale.category20().range(),
					dataLabel: {
						showTotal: true
					}
				},
				tooltip: {
					visible: true
				},
				title: {
					text: "Weekly Learning Durations Per Topic"
				}
			});
			var oDataset = new sap.viz.ui5.data.FlattenedDataset({
				dimensions: [{
					name: "calendar_week",
					value: "{calendar_week}"
				}, {
					name: "edu_topic",
					value: "{edu_topic}"
				}],

				measures: [{
					name: "edu_duration",
					value: "{edu_duration}"
				}],

				data: {
					path: "/"
				}
			});
			oVizFrame.setDataset(oDataset);

			oVizFrame.setModel(oModel);

			var oFeedValueAxis = new sap.viz.ui5.controls.common.feeds.FeedItem({
					"uid": "valueAxis",
					"type": "Measure",
					"values": ["edu_duration"]
				}),
				//oFeedValueAxis1 = new sap.viz.ui5.controls.common.feeds.FeedItem({
				//		"uid": "valueAxis",
				//			"type": "Measure",
				//			"values": ["team"]
				//		}),
				oFeedCategoryAxis = new sap.viz.ui5.controls.common.feeds.FeedItem({
					"uid": "categoryAxis",
					"type": "Dimension",
					"values": ["calendar_week", "edu_topic"]
				});

			oVizFrame.addFeed(oFeedValueAxis);
			//	oVizFrame.addFeed(oFeedValueAxis1);
			oVizFrame.addFeed(oFeedCategoryAxis);
		},
		createCWChart2: function () {
			//
			var oModel = this.getView().getModel();
			//var oModel = new sap.ui.model.json.JSONModel("https://educationtime.cfapps.us10.hana.ondemand.com/educationTime");
			var oVizFrame = this.getView().byId("idStackedChart2");
			oVizFrame.setVizProperties({
				plotArea: {
					colorPalette: d3.scale.category20().range(),
					dataLabel: {
						showTotal: true
					}
				},
				tooltip: {
					visible: true
				},
				title: {
					text: "Cumulative Durations Per Week"
				}
			});
			var oDataset = new sap.viz.ui5.data.FlattenedDataset({
				dimensions: [{
					name: "calendar_week",
					value: "{calendar_week}"
				}],

				measures: [{
					name: "edu_duration",
					value: "{edu_duration}"
				}],

				data: {
					path: "/"
				}
			});
			oVizFrame.setDataset(oDataset);

			oVizFrame.setModel(oModel);

			var oFeedValueAxis = new sap.viz.ui5.controls.common.feeds.FeedItem({
					"uid": "valueAxis",
					"type": "Measure",
					"values": ["edu_duration"]
				}),
				//oFeedValueAxis1 = new sap.viz.ui5.controls.common.feeds.FeedItem({
				//		"uid": "valueAxis",
				//			"type": "Measure",
				//			"values": ["team"]
				//		}),
				oFeedCategoryAxis = new sap.viz.ui5.controls.common.feeds.FeedItem({
					"uid": "categoryAxis",
					"type": "Dimension",
					"values": ["calendar_week"]
				});

			oVizFrame.addFeed(oFeedValueAxis);
			//	oVizFrame.addFeed(oFeedValueAxis1);
			oVizFrame.addFeed(oFeedCategoryAxis);
		},
		createPieChart: function () {
			//var oModel = new sap.ui.model.json.JSONModel("https://educationtime.cfapps.us10.hana.ondemand.com/educationTime");
			var oModel = this.getView().getModel();
			var oVizFrame = this.getView().byId("PieChart");
			oVizFrame.setVizProperties({
				plotArea: {
					colorPalette: d3.scale.category20().range(),
					dataLabel: {
						visible: true,
						type: "value"
					}
				},
				tooltip: {
					visible: true
				},
				title: {
					text: "Weekly Hour Overview "
				}
			});
			var oDataset = new sap.viz.ui5.data.FlattenedDataset({
				dimensions: [{
					name: "calendar_week",
					value: "{calendar_week}"
				}],

				measures: [{
					name: "edu_duration",
					value: "{edu_duration}"
				}],

				data: {
					path: "/"
				}
			});
			oVizFrame.setDataset(oDataset);

			oVizFrame.setModel(oModel);

			var oFeedValueAxis = new sap.viz.ui5.controls.common.feeds.FeedItem({
					"uid": "size",
					"type": "Measure",
					"values": ["edu_duration"]
				}),
				//oFeedValueAxis1 = new sap.viz.ui5.controls.common.feeds.FeedItem({
				//		"uid": "valueAxis",
				//			"type": "Measure",
				//			"values": ["team"]
				//		}),
				oFeedCategoryAxis = new sap.viz.ui5.controls.common.feeds.FeedItem({
					"uid": "color",
					"type": "Dimension",
					"values": ["calendar_week"]
				});

			oVizFrame.addFeed(oFeedValueAxis);
			//	oVizFrame.addFeed(oFeedValueAxis1);
			oVizFrame.addFeed(oFeedCategoryAxis);
		},
		createPieChart2: function () {
			//var oModel = new sap.ui.model.json.JSONModel("https://educationtime.cfapps.us10.hana.ondemand.com/educationTime");
			var oModel = this.getView().getModel();
			var oVizFrame = this.getView().byId("PieChart2");
			oVizFrame.setVizProperties({
				plotArea: {
					colorPalette: d3.scale.category20().range(),
					dataLabel: {
						visible: true,
						type: "value"
					}
				},
				tooltip: {
					visible: true
				},
				title: {
					text: "Team Hour Overview"
				}
			});
			var oDataset = new sap.viz.ui5.data.FlattenedDataset({
				dimensions: [{
					name: "team",
					value: "{team}"
				}],

				measures: [{
					name: "edu_duration",
					value: "{edu_duration}"
				}],

				data: {
					path: "/"
				}
			});
			oVizFrame.setDataset(oDataset);

			oVizFrame.setModel(oModel);

			var oFeedValueAxis = new sap.viz.ui5.controls.common.feeds.FeedItem({
					"uid": "size",
					"type": "Measure",
					"values": ["edu_duration"]
				}),
				//oFeedValueAxis1 = new sap.viz.ui5.controls.common.feeds.FeedItem({
				//		"uid": "valueAxis",
				//			"type": "Measure",
				//			"values": ["team"]
				//		}),
				oFeedCategoryAxis = new sap.viz.ui5.controls.common.feeds.FeedItem({
					"uid": "color",
					"type": "Dimension",
					"values": ["team"]
				});

			oVizFrame.addFeed(oFeedValueAxis);
			//	oVizFrame.addFeed(oFeedValueAxis1);
			oVizFrame.addFeed(oFeedCategoryAxis);
		},
	});
});