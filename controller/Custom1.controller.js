var thatref = null;
var lCtr = 0;
var TabFlg = 0;
var status = "";
var timeFormat = sap.ui.core.format.DateFormat.getTimeInstance({
	pattern: "KK:mm:ss"
});
var TZOffsetMs = new Date(0).getTimezoneOffset() * 60 * 1000;
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	'sap/ui/core/format/DateFormat'
], function(Controller, DateFormat) {

	return Controller.extend("Dealmemoappln.controller.Custom1", {
		getDealMNo: function() {
			var dm = sap.ui.controller('Dealmemoappln.controller.DealMemoView').getDmNo();
			return [dm[0], dm[1]];
		},
		getBudgetDetails: function(that) {
			sap.ui.core.BusyIndicator.show(0);
			thatref = this;
			var dmNo = thatref.getDealMNo();
			var srvUrl = "/sap/opu/odata/IBSCMS/DEALMEMO_SRV/";
			var oModelSav = new sap.ui.model.odata.ODataModel(srvUrl, true, "", "");
			var pValue = "/DmafSet(Tentid='IBS',Dmno='" + dmNo[0] + "')";
			oModelSav.read(pValue, null, null, true, function(oData) {
				sap.ui.core.BusyIndicator.hide();
				var oModel = new sap.ui.model.json.JSONModel(oData);
				that.getView().byId("lblBudgetGet").setModel(oModel);
			}, function() {
				sap.ui.core.BusyIndicator.hide();
			sap.m.MessageBox.show(thatref._oResourceBundle.getText("msgfaildata"), {
						icon: sap.m.MessageBox.Icon.ERROR,
						title: "{i18n>Error}"
					});
			});
		},

		//***********************************************************************************************************
		//----------------comments tab----------------------//
		//***********************************************************************************************************

		getTabList: function(that) {
			thatref = this;
			var dmNo = thatref.getDealMNo();
			//******************************** condition for adding inner tabs in comments tab**********************		
			var TabFlag = that.getView().byId("lblCommentStatus").getText();
			if (TabFlag === "0") //if tabs doesn't exist
			{
				thatref.setTabList(dmNo, that);
			} else {
				if (status == "04" || status == "02") {
					var tabs = that.getView().byId("commentInner").getItems();
					for (var i = 0; i < tabs.length; i++) {
						that.getView().byId("commentInner").getItems()[i].setVisible(true);
					}
				} else {
					var tabs = that.getView().byId("commentInner").getItems();
					for (var i = 2; i < tabs.length; i++) {
						that.getView().byId("commentInner").getItems()[i].setVisible(false);
					}
				}
			} //if (TabFlag === "0")
		},
		getComment: function(that) {
			thatref = this;
			if (that.getView().getModel().oData.Dmst != undefined) {
				status = that.getView().getModel().oData.Dmst;
			} else if (sap.ui.getCore().getModel("modelForDm").oData.Dmst != undefined) {
				status = sap.ui.getCore().getModel("modelForDm").oData.Dmst;
			} else {
				var text = that.getView().byId("objSt").getText();
				if (text == "Approved and Locked" || text== "Genehmigt und gesperrt") {
					status == "04";
				} else if (text == "Waiting For Approval" || text == "Warnmeldung") {
					status == "02";
				}
			}
			var aflag = 0;
			thatref.assignConcept(that, aflag);
			thatref.assignSynopsis(that, aflag);
			//	if(status=="04" || status=="03"){
			thatref.getTabList(that);
			//	}

		},
		tabAftersubmit: function(that) {
			var tabs = that.getView().byId("commentInner").getItems();
			for (var i = 0; i < tabs.length; i++) {
				that.getView().byId("commentInner").getItems()[i].setVisible(true);
			}
		},
		//*****************************************Function For adding inner tabs**********************************
		setTabList: function(dmNo, that) {
			sap.ui.core.BusyIndicator.show(0);
			var DealM = thatref.getDealMNo();
			var intDataModelUrl = "/sap/opu/odata/IBSCMS/DEALMEMO_SRV/";
			var oModelSav = new sap.ui.model.odata.ODataModel(intDataModelUrl, true, "", "");
			var pValue = "/RsmpSet?$filter=Tentid eq'IBS' and  Dmno eq '" + DealM[0] + "' and Dmver eq '" + DealM[1] + "' and Uname eq ''";
			oModelSav.read(pValue, null, null, true, commtabSucc, commtabFail);

			function commtabSucc(oData) {
				sap.ui.core.BusyIndicator.hide();
				if (oData.results.length !== 0) {
					for (var i = 0; i < oData.results.length; i++) {

						var tkey = oData.results[i].Posnid;
						var ttext = oData.results[i].Posnidnm;
						var Listid = tkey + "comment";
						var custId = tkey + "customl";
						var FeedId = tkey + "FeedIp";
						var item = new sap.m.IconTabFilter({
							id: tkey,
							key: tkey,
							text: ttext,
							exapanded: true,
							expandable: true,
							content: [
								new sap.m.FeedInput({
									id: FeedId,
									showIcon: false,
									post: function() {
										thatref.onFeedPost(that);
									}
								}),
								new sap.m.List({
									id: Listid,
									showSeparators: "Inner"

								})
							]
						});
						var itemTemplate = new sap.m.CustomListItem({
							id: custId,
							content: [
								new sap.m.ObjectAttribute({
									title: "{Author}",
									text: "{Date}",
									active: true
								}),
								new sap.m.Text({
									text: "{Text}"
								})

							]
						});
						sap.ui.getCore().getControl(Listid).bindAggregation("items", "/EntryCollection", itemTemplate);
						that.getView().byId("commentInner").addItem(item);
						if (status == "04") {
							//	sap.ui.getCore().getControl(FeedId).setEnabled(false);
						} else {
							//	sap.ui.getCore().getControl(FeedId).setEnabled(true);
						}
						if (status == "01") {
							if (tkey == "INIT") {
								sap.ui.getCore().byId(tkey).setVisible(true);
							} else {
								sap.ui.getCore().byId(tkey).setVisible(false);
							}
						}
					}

				}
				TabFlg = TabFlg + 1;
				var aflag = "0";
				thatref.assignConcept(that, aflag);
				thatref.assignSynopsis(that, aflag);
				that.getView().byId("lblCommentStatus").setText("1");

			}

			function commtabFail(oData, that) {
				sap.ui.core.BusyIndicator.hide();
				var errMsg = JSON.parse(oData.response.body);
				if (errMsg.error.innererror.errordetails[0].message !== undefined) {
					var stext = errMsg.error.innererror.errordetails[0].message;
					sap.m.MessageBox.show(stext, {
						icon: sap.m.MessageBox.Icon.ERROR,
						title: "{i18n>Error}"
					});
				} else {
					sap.m.MessageBox.show(that._oResourceBundle.getText("msg_servfailcomm"), {
						icon: sap.m.MessageBox.Icon.SUCCESS,
						title: "{i18n>Success}"
					});
				}

			}

		},
		//****************************** Assing concept details******************************************
		assignConcept: function(that, aflag) {
			sap.ui.core.BusyIndicator.show(0);
			var DealM = thatref.getDealMNo();
			var intDataModelUrl = "/sap/opu/odata/IBSCMS/DEALMEMO_SRV/";
			var oModelSav = new sap.ui.model.odata.ODataModel(intDataModelUrl, true, "", "");
			var pValue1 = "/DmtxtSet?$filter=Tentid eq'IBS' and  Dmno eq '" + DealM[0] + "' and Dmver eq '" + DealM[1] +
				"' and Txtsuffix eq 'CONCEPT'";
			oModelSav.read(pValue1, null, null, true, conceptSucc, conceptFail);
			function conceptSucc(oData) {
				sap.ui.core.BusyIndicator.hide();
				var length = oData.results.length;
				if (length !== 0) {
					var data = "";
					var head = [];
					head = oData.results[0].Tdline.split("_");
					var year = head[1].substring(0, 4);
					var month = head[1].substring(4, 6);
					var day = head[1].substring(6, 8);
					var date = year + '-' + month + '-' + day;
					for (var i = 1; i < length; i++) {
						if (oData.results[i].Tdformat !== "" && i > 1) {
							data = data + ('\n');
						}
						data = data + oData.results[i].Tdline;
					}
					var oData = {
						EntryCollection: [{
							Author: head[0],
							Type: "Concept",
							date: date,
							Text: data
						}]
					};
					var oModel = new sap.ui.model.json.JSONModel(oData);
					if (aflag === 1) {
						that.getView().byId("conceptTxt").setValue(data);
						that.getView().byId("conceptFeed").setVisible(false);
						that.getView().byId("conceptTxt").setVisible(true);
						that.getView().byId("conceptBtn").setEnabled(false);

					} else {
						that.getView().byId("conceptFeed").setModel(oModel);
						that.getView().byId("conceptFeed").setVisible(true);
						that.getView().byId("conceptTxt").setVisible(false);
						that.getView().byId("conceptBtn").setEnabled(true);
					}

				} else {

					that.getView().byId("conceptBtn").setEnabled(false);
					that.getView().byId("conceptTxt").setVisible(true);
					that.getView().byId("conceptFeed").setVisible(false);
				}
				var inKey = that.getView().byId("commentInner").getSelectedKey();
				if (inKey == "synopsis") {
					var cbtn = that.getView().byId("conceptBtn").getEnabled();
					var sbtn = that.getView().byId("synopsisBtn").getEnabled();

					if (cbtn == true && sbtn == true) {
						that.getView().byId("btnSave").setEnabled(false);
					} else {
						that.getView().byId("btnSave").setEnabled(true);
					}
				}
			}

			function conceptFail(oData) {
				sap.ui.core.BusyIndicator.hide();
				var errMsg = JSON.parse(oData.response.body);
				if (errMsg.error.innererror.errordetails[0] !== undefined) {
					var stext = errMsg.error.innererror.errordetails[0].message;
					sap.m.MessageBox.show(stext, {
						icon: sap.m.MessageBox.Icon.ERROR,
						title: "Error"
					});
				} else {
					sap.m.MessageBox.show(that._oResourceBundle.getText("msg_conceptdetfail"), {
						icon: sap.m.MessageBox.Icon.SUCCESS,
						title: "Success"
					});
				}

			}

		},
		//*****************************************Assing Synopsis details**********************************
		assignSynopsis: function(that, aflag) {
			sap.ui.core.BusyIndicator.show(0);
			var DealM = thatref.getDealMNo();
			var intDataModelUrl = "/sap/opu/odata/IBSCMS/DEALMEMO_SRV/";
			var oModelSav = new sap.ui.model.odata.ODataModel(intDataModelUrl, true, "", "");
			var pValue1 = "/DmtxtSet?$filter=Tentid eq'IBS' and  Dmno eq '" + DealM[0] + "' and Dmver eq '" + DealM[1] +
				"' and Txtsuffix eq 'SYNOPSIS'";
			oModelSav.read(pValue1, null, null, true, synopsisSucc, synopsisFail);

			function synopsisSucc(oData) {
				sap.ui.core.BusyIndicator.hide();
				var length = oData.results.length;
				if (length !== 0) {
					var data = "";
					var head = [];
					head = oData.results[0].Tdline.split("_");
					var year = head[1].substring(0, 4);
					var month = head[1].substring(4, 6);
					var day = head[1].substring(6, 8);
					var date = year + '-' + month + '-' + day;
					for (var i = 1; i < length; i++) {
						if (oData.results[i].Tdformat !== "" && i > 1) {
							data = data + ('\n');
						}
						data = data + oData.results[i].Tdline;
					}
					var oData = {
						EntryCollection: [{
							Author: head[0],
							Type: "Concept",
							date: date,
							Text: data
						}]
					};
					var oModel = new sap.ui.model.json.JSONModel(oData);
					if (aflag === 1) {
						that.getView().byId("synopsisTxt").setValue(data);
						that.getView().byId("synopsisFeed").setVisible(false);
						that.getView().byId("synopsisTxt").setVisible(true);
						that.getView().byId("synopsisBtn").setEnabled(false);
					} else {
						that.getView().byId("synopsisFeed").setModel(oModel);
						that.getView().byId("synopsisFeed").setVisible(true);
						that.getView().byId("synopsisTxt").setVisible(false);
						that.getView().byId("synopsisBtn").setEnabled(true);
					}

				} else {
					that.getView().byId("synopsisBtn").setEnabled(false);
					that.getView().byId("synopsisTxt").setVisible(true);
					that.getView().byId("synopsisFeed").setVisible(false);
				}
				var inKey = that.getView().byId("commentInner").getSelectedKey();
				if (inKey == "synopsis") {
					var cbtn = that.getView().byId("conceptBtn").getEnabled();
					var sbtn = that.getView().byId("synopsisBtn").getEnabled();

					if (cbtn == true && sbtn == true) {
						that.getView().byId("btnSave").setEnabled(false);
					} else {
						that.getView().byId("btnSave").setEnabled(true);
					}
				}

			}

			function synopsisFail(oData) {
				sap.ui.core.BusyIndicator.hide();
				var errMsg = JSON.parse(oData.response.body);
				if (errMsg !== undefined) {
					var stext = errMsg.error.innererror.errordetails[0].message;
					sap.m.MessageBox.show(stext, {
						icon: sap.m.MessageBox.Icon.ERROR,
						title: "Error"
					});
				} else {
					sap.m.MessageBox.show(that._oResourceBundle.getText("msg_conceptdetfail"), {
						icon: sap.m.MessageBox.Icon.SUCCESS,
						title: "Success"
					});
				}
			}

		},

		//*************************************** set comments on inner tabs *******************************************

		setComments: function(that, key) {

			if (key === 'synopsis') {
				var aflag = "0";
				thatref.assignConcept(that, aflag);
				thatref.assignSynopsis(that, aflag);
			} else {
				var id = key + "comment"; //id of Comment List 
				var idL = key + "customl"; //id of CustomListItem
				var DealM = thatref.getDealMNo();

				//-------------------- set model and class for list-------------------------
				var commData = {
					"EntryCollection": [{
							"Author": "",
							"Date": "",
							"Text": ""
						}

					]
				};
				var sModel = new sap.ui.model.json.JSONModel(commData);
				//sModel.loadData("json/comments.json", "", false);
				sap.ui.getCore().getControl(id).setModel(sModel);
				sap.ui.getCore().getControl(id).addStyleClass("sapUiMediumMarginTop , sapUiTinyMarginBottom");
				sap.ui.getCore().getControl(idL).addStyleClass("sapUiSmallMarginTop , sapUiSmallMarginBottom");
				sap.ui.core.BusyIndicator.show(0);
				// service to fetch comments of particular tab
				var intDataModelUrl = "/sap/opu/odata/IBSCMS/DEALMEMO_SRV/";
				var oModelSav = new sap.ui.model.odata.ODataModel(intDataModelUrl, true, "", "");
				var pValue = "/DmtxtSet?$filter=Tentid eq'IBS' and  Dmno eq '" + DealM[0] + "' and Dmver eq '" + DealM[1] + "' and Txtsuffix eq '" +
					key + "'";
				oModelSav.read(pValue, null, null, true, function(oData) {
					sap.ui.core.BusyIndicator.hide();
					var header = [];
					var data = [];
					var i = 0;
					if (oData.results.length !== 0) { //if comments exist
						header[0] = oData.results[0].Tdline; //header for first comment
						for (var j = 1; j < oData.results.length; j++) {
							if (oData.results[j].Tdformat === 'C') // if new comment starts
							{
								i = i + 1;
								header[i] = oData.results[j].Tdline;
							} else {
								if (data[i] === undefined) {
									data[i] = "";
								}
								data[i] = data[i] + oData.results[j].Tdline; //concatenate data
								if (j + 1 !== oData.results.length) {
									if (oData.results[j + 1].Tdformat !== "") {
										data[i] = data[i] + ('\n');
									}
								}

							}
						}
						var oModel = sap.ui.getCore().getControl(id).getModel(); // get list model
						for (var count = 0; count <= i; count++) { // loop for pushing data in model
							var content = thatref.splitHeader(header[count]); // function to get date and name
							var oEntries = {
								Author: content[0],
								Date: content[1],
								Text: data[count]
							};
							/*	oModel.oData.EntryCollection[count].Author= "Alex";
 	 	              	oModel.oData.EntryCollection[count].Text= data[count];*/
							//	var aEntries = oModel.getData().EntryCollection;
							var aEntries = oModel.oData.EntryCollection;
							aEntries.unshift(oEntries);
							oModel.setData({
								EntryCollection: aEntries
							});
						}
						oModel.refresh();
						/*	var sData = oModel.getJSON();
							var yModelData = new sap.ui.model.json.JSONModel();
							yModelData.setJSON(sData);
							sap.ui.getCore().getControl(id).setModel(yModelData);*/
					}

				}, function(oData) {
					sap.ui.core.BusyIndicator.hide();
					var errMsg = JSON.parse(oData.response.body);
					if (errMsg !== undefined) {
						var stext = errMsg.error.innererror.errordetails[0].message;
						sap.m.MessageBox.show(stext, {
							icon: sap.m.MessageBox.Icon.ERROR,
							title: "Error"
						});
					} else {
						sap.m.MessageBox.show(that._oResourceBundle.getText("msg_servfailcomm"), {
							icon: sap.m.MessageBox.Icon.SUCCESS,
							title: "Success"
						});
					}
				});
			}
		},
		//************************************split header into name,date and time***************************************
		splitHeader: function(header) {
			var head = header.split("_");
			var year = head[1].substring(0, 4);
			var month = head[1].substring(4, 6);
			var day = head[1].substring(6, 8);
			var date = year + '-' + month + '-' + day;

			var hour = head[2].substring(0, 2);
			var min = head[2].substring(2, 4);
			var sec = head[2].substring(4, 6);

			var time = hour + ':' + min + ':' + sec;
			return [head[0], date, time];
		},
		//****************************************save comments************************************************************

		saveComments: function(Key, that) {

			if (Key === 'synopsis') {
				var kValue = "";
				var valS = that.getView().byId("synopsisTxt").getValue();
				if (valS !== "") {
					kValue = "SYNOPSIS";
					thatref.saveCommData(that, valS);
					thatref.appendTxt(that, kValue);
					thatref.assignSynopsis(that);
					that.getView().byId("synopsisTxt").setValue("");
				}
				var valC = that.getView().byId("conceptTxt").getValue();
				if (valC !== "") {
					kValue = "CONCEPT";
					thatref.saveCommData(that, valC);
					thatref.appendTxt(that, kValue);
					thatref.assignConcept(that);
					that.getView().byId("conceptTxt").setValue("");
				}
				if (valS == "" && valC == "") {
					sap.m.MessageBox.show(that._oResourceBundle.getText("msg_fillconsyn"), {
						icon: sap.m.MessageBox.Icon.ERROR,
						title: "Error"
					});
				}

			} else {
				var Inpid = Key + "FeedIp";
				var val = sap.ui.getCore().byId(Inpid).getValue();
				if (val !== "") {
					thatref.saveCommData(that, val);
					thatref.appendTxt(that, Key);
					sap.ui.getCore().byId(Inpid).setValue("");
					//	thatref.setComments(that,Key);
				}
			}
			thatref.setComments(that, Key);

		},
		saveCommData: function(that, val) {
			//var jModelData = this.modelDesign(that);
			var aModelData = that.getView().byId("lblComments").getModel();
			var idURL = "http://ibssapserv9.inveniodelhi.com:8060";
			var oRecord = "";
			var extraRow = "";
			var user = "";

			var oModitem = '/DmtxtSet/results';
			aModelData.oData.DmtxtSet.results = [];
			var oModProperty = aModelData.getProperty(oModitem);
			var mainLines = val.split("\n");
			var lenAdj = mainLines.length;
			if (lenAdj === 1) {
				if (mainLines[0] === "") {
					lenAdj = 0;
				}
			}

			var oCtr = 1;

			if (oCtr === 1) {
				for (oCtr = 1; oCtr <= lenAdj; oCtr++) {
					lCtr = oCtr - 1;
					mainLines[lCtr] = mainLines[lCtr].replace(/"/g, "'");
					var childLine = [];
					var tdformat = "";
					if (mainLines[lCtr].length > 132) {
						var int1 = 0;
						var int2 = 0;
						var cLen = mainLines[lCtr].length / 132;
						cLen = Math.ceil(cLen);
						for (var c = 0; c < cLen; c++) {
							int1 = int2;

							if (c === cLen - 1) {
								int2 = mainLines[lCtr].length;
							} else {
								int2 = int2 + 131;
							}
							if (c > 0) {
								tdformat = "";
							} else {
								tdformat = "*";

							}

							childLine[c] = mainLines[lCtr].substring(int1, int2);

							oRecord = '{' + '"__metadata" : {' + '"id" : "' + idURL + '/sap/opu/odata/IBSCMS/DEALMEMO_SRV/DmtxtSet(' + user + ')",' +
								'"uri" : "' + idURL + '/sap/opu/odata/IBSCMS/DEALMEMO_SRV/DmtxtSet(' + user + ')",' + '"type" : "DEALMEMO_SRV.Dmtxt"' + '},' +
								'"Tdformat" : "' + tdformat + '",' + '"Tdline" : "' + childLine[c] + '" ' + '}';
							extraRow = $.parseJSON(oRecord);
							oModProperty.push(extraRow);

						}
					} else {
						oRecord = '{' + '"__metadata" : {' + '"id" : "' + idURL + '/sap/opu/odata/IBSCMS/DEALMEMO_SRV/DmtxtSet(' + user + ')",' +
							'"uri" : "' + idURL + '/sap/opu/odata/IBSCMS/DEALMEMO_SRV/DmtxtSet(' + user + ')",' + '"type" : "DEALMEMO_SRV.Dmtxt"' + '},' +
							'"Tdformat" : "*",' + '"Tdline" : "' + mainLines[lCtr] + '" ' + '}';
						extraRow = $.parseJSON(oRecord);
						oModProperty.push(extraRow);
					}

				}
			}
		},
		getDataForComm: function(that) {
			sap.ui.core.BusyIndicator.show(0);
			var DealM = thatref.getDealMNo();
			var intDataModelUrl = "/sap/opu/odata/IBSCMS/DEALMEMO_SRV/";
			var oModelSav = new sap.ui.model.odata.ODataModel(intDataModelUrl, true, "", "");
			var pValue1 = "/DmHeaderSet(Tentid='IBS',Dmno='" + DealM[0] + "',Dmver='" + DealM[1] + "',Transtp='D')?&$expand=DmtxtSet";
		
			oModelSav.read(pValue1, null, null, true, function(oData) {
				sap.ui.core.BusyIndicator.hide();
				//alert("success");
				var aModelData = new sap.ui.model.json.JSONModel(oData);
				that.getView().byId("lblComments").setModel(aModelData);
			}, function(oData) {
				sap.ui.core.BusyIndicator.hide();
				var errMsg = JSON.parse(oData.response.body);
				if (errMsg !== undefined) {

					var stext = errMsg.error.innererror.errordetails[0].message;
					sap.m.MessageBox.show(stext, {
						icon: sap.m.MessageBox.Icon.ERROR,
						title: "Error"
					});
				}
			});
		},

		modelDesign: function(that, key) {
			var aModelData = that.getView().byId("lblComments").getModel();

			//*********************creation of model for posting comments**************************
			var oFields = {
				Amrtpercost: "0.00",
				Avgepidur: "",
				Bukrs: "",
				Butxt: "",
				Cafrefno: "",
				Chnlid: "",
				Chnlnm: "",
				Cntcat: "",
				Cntcatnm: "",
				Cntgn: "",
				Cntgnnm: "",
				Cntid: "",
				Cntnm: "",
				Cntnt: "",
				Cntntnm: "",
				Cntobj: "",
				Cntobjnm: "",
				Cntsgn: "",
				Cntsgnnm: "",
				Cntstp: "",
				Cntstpnm: "",
				Cnttp: "",
				Cnttpnm: "",
				Dmdt: "null",
				Dmno: "",
				Dmrefno: "",
				Dmst: "",
				Dmstdesc: "",
				Dmver: "",
				Estprgreldt: "null",
				Exchrt: "0.00",
				Noofepi: "",
				Recst: "",
				Tentid: "",
				Txtsuffix: "",
				Waers: "",
				DmtxtSet: [],
				DmEpisodeSet: [],
				DmCostSet: []
			};

			var yModelData = new sap.ui.model.json.JSONModel(oFields);

			/*	yModelData.oData.Dmdt = "2016-12-07T00:00:00";
			yModelData.oData.Estprgreldt = "2017-01-02T00:00:00";*/
			/*	var dmdtLen= yModelData.oData.Dmdt.length;
				yModelData.oData.Dmdt=yModelData.oData.Dmdt.substring(0,dmdtLen-2);*/
			//	var EstdtLen= yModelData.oData.Estprgreldt.length;
			//	yModelData.oData.Estprgreldt=yModelData.oData.Estprgreldt.substring(0,EstdtLen-2);

			//*********passing data in json model**********
			yModelData.oData.Avgepidur = aModelData.oData.Avgepidur;
			yModelData.oData.Amrtpercost = aModelData.oData.Amrtpercost;
			yModelData.oData.Bukrs = aModelData.oData.Bukrs;
			yModelData.oData.Butxt = aModelData.oData.Butxt;
			yModelData.oData.Cntcatnm = aModelData.oData.Cntcatnm;
			yModelData.oData.Cntsgnnm = aModelData.oData.Cntsgnnm;
			yModelData.oData.Chnlnm = aModelData.oData.Chnlnm;
			yModelData.oData.Cntcat = aModelData.oData.Cntcat;
			yModelData.oData.Cntgnnm = aModelData.oData.Cntgnnm;
			yModelData.oData.Cntobjnm = aModelData.oData.Cntobjnm;
			yModelData.oData.Cafrefno = aModelData.oData.Cafrefno;
			yModelData.oData.Cntgn = aModelData.oData.Cntgn;
			yModelData.oData.Cntntnm = aModelData.oData.Cntntnm;
			yModelData.oData.Cntsgn = aModelData.oData.Cntsgn;
			yModelData.oData.Cntnm = aModelData.oData.Cntnm;
			yModelData.oData.Cntobj = aModelData.oData.Cntobj;
			yModelData.oData.Cntstp = aModelData.oData.Cntstp;
			yModelData.oData.Cntstpnm = aModelData.oData.Cntstpnm;
			yModelData.oData.Cnttp = aModelData.oData.Cnttp;
			yModelData.oData.Cntnt = aModelData.oData.Cntnt;
			yModelData.oData.Chnlid = aModelData.oData.Chnlid;
			yModelData.oData.Cntid = aModelData.oData.Cntid;
			yModelData.oData.Dmstdesc = aModelData.oData.Dmstdesc;
			yModelData.oData.Dmver = aModelData.oData.Dmver;
			yModelData.oData.Dmdt = aModelData.oData.Dmdt;
			yModelData.oData.Dmst = aModelData.oData.Dmst;
			yModelData.oData.Dmrefno = aModelData.oData.Dmrefno;
			yModelData.oData.Dmno = aModelData.oData.Dmno;
			yModelData.oData.Exchrt = aModelData.oData.Exchrt;
			yModelData.oData.Estprgreldt = aModelData.oData.Estprgreldt;
			yModelData.oData.Noofepi = aModelData.oData.Noofepi;
			yModelData.oData.Recst = aModelData.oData.Recst;
			yModelData.oData.Txtsuffix = key;
			yModelData.oData.Tentid = aModelData.oData.Tentid;
			yModelData.oData.Waers = aModelData.oData.Waers;
			yModelData.oData.DmCostSet = [];
			yModelData.oData.DmEpisodeSet = [];
			yModelData.oData.DmtxtSet = aModelData.oData.DmtxtSet;
			yModelData.oData.DmtxtSet = yModelData.oData.DmtxtSet.results;
			return yModelData;
		},

		convertDate: function(ydate) {
			ydate = new Date(ydate);
			var year = ydate.getFullYear();
			var mth = ydate.getMonth() + 1;
			if (mth < 10) {
				mth = '0' + mth;
			} else {
				mth = "" + mth;
			}
			var day = ydate.getDate();
			if (day < 10) {
				day = '0' + day;
			} else {
				day = "" + day;
			}

			var h = ydate.getHours();
			var min = ydate.getMinutes();
			var sec = ydate.getSeconds();

			if (h < 10) {
				h = '0' + h;
			} else {
				h = "" + h;
			}

			if (min < 10) {
				min = '0' + min;
			} else {
				min = "" + min;
			}

			if (sec < 10) {
				sec = '0' + sec;
			} else {
				sec = "" + sec;
			}
			var newDt = year + "-" + mth + "-" + day + "T00:00:00";
			return newDt;
		},
		//**************************************************** value of textarea******************************aModelData,dmno
		appendTxt: function(that, key) {
			sap.ui.core.BusyIndicator.show(0);
			var jModelData = this.modelDesign(that, key);
			var intDataModelUrl = "/sap/opu/odata/IBSCMS/DEALMEMO_SRV/";
			var oModelSav = new sap.ui.model.odata.ODataModel(intDataModelUrl, true, "", "");
			oModelSav.setHeaders({
				"Accept": "application/json"
			});
			oModelSav.setHeaders({
				"X-Requested-With": "X"
			});
			var pValue = "/DmHeaderSet";
			oModelSav.create(pValue, jModelData.oData, null, function() {
					sap.ui.core.BusyIndicator.hide();
					/*	sap.m.MessageBox.show("comment created successfully", {
							icon: sap.m.MessageBox.Icon.SUCCESS,
							title: "Success"
						});*/
					sap.m.MessageToast.show(that._oResourceBundle.getText("msg_commsave"));

				},
				function() {
					sap.ui.core.BusyIndicator.hide();
					sap.m.MessageBox.show(that._oResourceBundle.getText("msg_commcreatefail"), {
						icon: sap.m.MessageBox.Icon.ERROR,
						title: "{i18n>Error}"
					});
				});

		},
		onFeedPost: function(that) {
			var Key = that.getView().byId("commentInner").getSelectedKey();
			thatref.saveComments(Key, that);
		},
		//---------------------------------------------------------------------------------------------------
		//************************************************Release Status***************************************
		//---------------------------------------------------------------------------------------------------
		getStatus: function(that) {
			sap.ui.core.BusyIndicator.show(0);
			thatref = this;
			var deal = that.getDmNo();

			var intDataModelUrl = "/sap/opu/odata/IBSCMS/DEALMEMO_SRV/";
			var oModelSav = new sap.ui.model.odata.ODataModel(intDataModelUrl, true, "", "");
			var url = "/DmlgSet?$filter=Tentid eq 'IBS'  and Dmno eq '" + deal[0] + "' and Dmver eq '" + deal[1] + "'";
			oModelSav.read(url, null, null, true, function(oData) {
				sap.ui.core.BusyIndicator.hide();
				//		alert("Status Service Success");
				//var aModelData = new sap.ui.model.json.JSONModel(oData);
				var st = 0;
				st = oData.results.length;
				var oEntry = {
					status: [{
						Author: "",
						Status: "",
						Date: "",
						Text: "",
						icon: "",
						state: "None"
					}],
					grow: st
				};
				var sModel = new sap.ui.model.json.JSONModel(oEntry);
				that.getView().byId("idTimeline").setModel(sModel);
				//		that .getView().byId("idTimeline").setGrowingThreshold(st);
				thatref.timelineSet(oData, that);
			}, function(oData) {
				sap.ui.core.BusyIndicator.hide();
				//		alert("Status Service fail");
				var errMsg = JSON.parse(oData.response.body);
				if (errMsg !== undefined) {
					var stext = errMsg.error.innererror.errordetails[0].message;
					sap.m.MessageBox.show(stext, {
						icon: sap.m.MessageBox.Icon.ERROR,
						title: "{i18n>Error}"
					});
				}
			});

		},
		//---------------------------------------------------------------------------------------------------
		//*****************************function for setting data on release status tab***********************
		//---------------------------------------------------------------------------------------------------
		timelineSet: function(oData, that) {
			var s = "";
			var mModel = that.getView().byId("idTimeline").getModel();

			var aModel = new sap.ui.model.json.JSONModel(mModel.oData);
			aModel.setSizeLimit("999999");

			//	mModel.oData.grow=20;
			for (var i = 0; i < oData.results.length; i++) {
				aModel.oData.status[i].Author = oData.results[i].Usernm;
				aModel.oData.status[i].Status = oData.results[i].Usractiondesc;
				if (oData.results[i].Actdt != null) {
					var date = oData.results[i].Actdt;
					date = new Date(date);
					if (date == "Invalid Date") {
						/*for json format date*/
						var jsonDateString = oData.results[i].Actdt;
						var dt = new Date(parseInt(jsonDateString.replace(/\/+Date\(([\d+-]+)\)\/+/, '$1')));
						oData.results[i].Actdt = dt;
						var time = oData.results[i].Acttm[2] + oData.results[i].Acttm[3] + ":" + oData.results[i].Acttm[5] + oData.results[i].Acttm[6] +
							":" + oData.results[i].Acttm[8] + oData.results[i].Acttm[9];
						oData.results[i].Acttm = new Date(timeFormat.parse(time).getTime() - TZOffsetMs).getTime();
						var DtTime = thatref.getDateInMS(oData.results[i].Actdt, oData.results[i].Acttm);
						aModel.oData.status[i].Date = DtTime;

					} else {
						var DtTime = thatref.getDateInMS(oData.results[i].Actdt, oData.results[i].Acttm.ms);
						aModel.oData.status[i].Date = DtTime;
					}

				}
				if (oData.results[i].Usraction === "S") {
					//	aModel.oData.status[i].icon = "img/initiate.png";
					aModel.oData.status[i].icon = "sap-icon://initiative";
					aModel.oData.status[i].state = "Success";
				} else if (oData.results[i].Usraction === "A") {
					aModel.oData.status[i].icon = "sap-icon://accept";
					aModel.oData.status[i].state = "Success";
				} else if (oData.results[i].Usraction === "R") {
					aModel.oData.status[i].icon = "sap-icon://decline";
					aModel.oData.status[i].state = "Error";
				} else if (oData.results[i].Usraction === "F") {
					aModel.oData.status[i].icon = "sap-icon://forward";
					aModel.oData.status[i].state = "Warning";
				} else if (oData.results[i].Usraction === "I") {
					//		aModel.oData.status[i].icon = "img/Awaiting.png";
					aModel.oData.status[i].icon = "sap-icon://lateness";
					aModel.oData.status[i].state = "Warning";
				} else if (oData.results[i].Usraction === "C") {
					aModel.oData.status[i].icon = "sap-icon://activity-2";
					aModel.oData.status[i].state = "Success";
				} else if (oData.results[i].Usraction === "P") {
					aModel.oData.status[i].icon = "sap-icon://pending";
					aModel.oData.status[i].state = "Warning";
				}
				var l = oData.results.length;
				l = l - 1;
				if (i < l)

				{
					aModel.oData.status.push({
						"Author": s,
						"Status": s,
						"Date": s,
						"Text": s
					});
				}
			}
			that.getView().byId("idTimeline").getModel().refresh();
			/*		that.getView().byId("idTimeline").setGrowingThreshold(oData.results.length);*/

			/*		var sData = aModel.getJSON();
					var yModelData = new sap.ui.model.json.JSONModel();
					yModelData.setJSON(sData);
				
					that.getView().byId("idTimeline").setModel(yModelData);*/
			/*aModel.setSizeLimit("999999");
		aModel.refresh();*/

		},
		getDateInMS: function(date, time) {
			date.setHours(0, 0, 0, 0);
			var Actdt = date.getTime();
			var Time = time;
			var DtTime = Actdt + Time;
			DtTime = "Date(" + DtTime + ")";
			return DtTime;

		}

	});

});