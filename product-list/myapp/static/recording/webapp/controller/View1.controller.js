sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel", "sap/m/MessageBox", 'sap/ui/core/BusyIndicator'
], function (Controller, JSONModel, MessageBox, BusyIndicator) {
	"use strict";

	return Controller.extend("com.ui.ui.controller.View1", {
		onInit: function () {
			var timeRecordingModel = new JSONModel({
				user_id: "",
				calendar_week:this.getWeek().toString(),
				user_name: "",
				eduData: [{
					edu_source: "LearningHub",
					edu_area: "",
					edu_topic: "",
					edu_duration: 10,
					comment: ""
				}],
				team: "",
				certificate_source: "LearningHub",
				certificate_topic: "",
				certificate_area: ""
			});
			this.getView().setModel(timeRecordingModel, "timeRecordingModel");
			var mainModel = new JSONModel({
				current_week: this.getWeek().toString()
			});

			this.getView().setModel(mainModel, "mainModel");

		},

		getWeek: function () {
			var date = new Date();
			date.setHours(0, 0, 0, 0);
			// Thursday in current week decides the year.
			date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
			// January 4 is always in week 1.
			var week1 = new Date(date.getFullYear(), 0, 4);
			// Adjust to Thursday in week 1 and count number of weeks from date to week1.
			return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
		},
		addMoreEntries: function () {
			// this.byId("FormChange354");
			var eduData = this.getView().getModel("timeRecordingModel").getProperty("/eduData");
			var eduLength = eduData.length;
			eduData.push({
				edu_source: "LearningHub",
				edu_area: "good",
				edu_topic: "tetss",
				edu_duration: 10,
				comment: "test Use"
			});

			var formContrianer = new sap.ui.layout.form.FormContainer();
			var sourceElement = new sap.ui.layout.form.FormElement({
				label: "source"
			});
			var topic = new sap.m.Select();

			var bindingInfo = "timeRecordingModel>/eduData/" + eduLength + "/edu_source";

			topic.bindProperty("selectedKey", {
				path: bindingInfo
			});
			var selectItems = new sap.ui.core.Item({
				key: "Learning Hub",
				text: "Learning Hub"
			});
			topic.addItem(selectItems);
			selectItems = new sap.ui.core.Item({
				key: "openSAP",
				text: "openSAP"
			});
			topic.addItem(selectItems);
			sourceElement.addField(topic);
			formContrianer.addFormElement(sourceElement);

			var topicElement = new sap.ui.layout.form.FormElement({
				label: "topic"
			});
			var topicInput = new sap.m.Input();
			bindingInfo = "timeRecordingModel>/eduData/" + eduLength + "/edu_topic";
			topicInput.bindProperty("value", {
				path: bindingInfo
			});
			topicElement.addField(topicInput);
			formContrianer.addFormElement(topicElement);

			var areaElement = new sap.ui.layout.form.FormElement({
				label: "area"
			});
			var areaInput = new sap.m.Input();
			bindingInfo = "timeRecordingModel>/eduData/" + eduLength + "/edu_area";
			areaInput.bindProperty("value", {
				path: bindingInfo
			});
			areaElement.addField(areaInput);
			formContrianer.addFormElement(areaElement);
			var hoursElement = new sap.ui.layout.form.FormElement({
				label: "hours"
			});
			var hoursInput = new sap.m.Input();
			bindingInfo = "timeRecordingModel>/eduData/" + eduLength + "/edu_duration";
			hoursInput.bindProperty("value", {
				path: bindingInfo
			});
			hoursElement.addField(hoursInput);
			formContrianer.addFormElement(hoursElement);

			//comment
			var commentElement = new sap.ui.layout.form.FormElement({
				label: "comment"
			});
			var commentInput = new sap.m.TextArea();
			bindingInfo = "timeRecordingModel>/eduData/" + eduLength + "/comment";
			commentInput.bindProperty("value", {
				path: bindingInfo
			});
			commentElement.addField(commentInput);
			formContrianer.addFormElement(commentElement);

			this.byId("FormChange354").addFormContainer(formContrianer);

			// 			<f:FormContainer>
			// 	<f:formElements>
			// 		<f:FormElement label="Source">
			// 			<f:fields>
			// 				<Select id="source" selectedKey="{timeRecordingModel>/edu_source}">
			// 					<items>
			// 						<core:Item text="Learning Hub" key="LearningHub"/>
			// 						<core:Item text="OpenSAP" key="OpenSAP"/>
			// 						<core:Item text="Knowledge Session" key="Knowledge"/>
			// 					</items>
			// 				</Select>
			// 			</f:fields>
			// 		</f:FormElement>
			// 		<f:FormElement label="Topic">
			// 			<f:fields>
			// 				<Input value="{timeRecordingModel>/edu_topic}"/>
			// 			</f:fields>
			// 		</f:FormElement>
			// 		<f:FormElement label="Area">
			// 			<f:fields>
			// 				<Input value="{timeRecordingModel>/edu_area}"/>
			// 			</f:fields>
			// 		</f:FormElement>
			// 		<f:FormElement label="Hours">
			// 			<f:fields>
			// 				<Input value="{timeRecordingModel>/edu_duration}" type="Number"/>
			// 			</f:fields>
			// 		</f:FormElement>
			// 		<f:FormElement label="Comment">
			// 			<f:fields>
			// 				<TextArea value="{timeRecordingModel>/comment}" rows="5"/>
			// 			</f:fields>
			// 		</f:FormElement>
			// 	</f:formElements>
			// </f:FormContainer>

		},
		submit: function () {
			console.log(this.getView().getModel("timeRecordingModel"));
			var dataObject = this.getView().getModel("timeRecordingModel").getData();
			var oContext = this;
			BusyIndicator.show();
			$.ajax({
				method: "POST",
				data: JSON.stringify(dataObject),
				contentType: "application/json",
				url: "https://educationtime.cfapps.us10.hana.ondemand.com/educationTime",
				dataType: "JSON"
			}).done(function (data) {
				MessageBox.success("Time has been recorded.");
				oContext.onInit();
				BusyIndicator.hide();
			});

		}
	});
});