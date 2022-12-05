sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"com/ui/dealmemolocal/model/formatter",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/ui/core/Fragment",
	"sap/ui/core/routing/History"
],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 */
	function (Controller, Filter, FilterOperator, Formatter, MessageBox, MessageToast, Fragment, History) {
		"use strict";

		return Controller.extend("com.ui.dealmemolocal.controller.ArtistContract", {
			Formatter: Formatter,

			onInit: function () {

				this.getOwnerComponent().getRouter().attachRouteMatched(this.onRouteMatchedArtistContract, this);
			},

			onRouteMatchedArtistContract: function (oEvent) {
				var oName = oEvent.getParameter("name");
				if (oName === "ArtistContract") {
					var oModel = new sap.ui.model.json.JSONModel();
					this.getView().setModel(oModel, "artistContractModel");
					oModel.setSizeLimit(999999);
					var oContxtFrom = oEvent.getParameter("arguments");
					oModel.setProperty("/Dmno", oContxtFrom.Dmno);
					oModel.setProperty("/Dmver", oContxtFrom.Dmver);
					oModel.setProperty("/Contno", oContxtFrom.Contno);
					oModel.setProperty("/Contver", oContxtFrom.Contver);
					oModel.setProperty("/App", oContxtFrom.App); // added by dhiraj on 20/05/2022 for submit butn.

					oModel.refresh(true);
					if (!this.newContractCreated) {
						this.newContractCreated = false;
					}
					this.getView().byId("idACTabBar").setSelectedKey("acEpiData");
					this.loadDealMemoDetails();
					this.loadInitialDataFromMaster();

					this.loadEpisodes();
					this.loadPayTerms();

				}
			},
			checkForUnsavedData: function () {
				var oTab = this.getView().byId("idACTabBar").getSelectedKey();
				var oTableData = [];
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				var unsavedFlag = false;
				if (artistContractDetailInfo.epiTabData) {
					oTableData = artistContractDetailInfo.epiTabData;
					if (oTableData.length > 0) {
						oTableData.map(function (oTabObj) {
							if (oTabObj.flag === "Cr" || oTabObj.flag === "Ch") {
								unsavedFlag = true;
							}
						})
					}
				}
				if (artistContractDetailInfo.acPaymentData) {
					oTableData = artistContractDetailInfo.acPaymentData;
					if (oTableData.length > 0) {
						oTableData.map(function (oTabObj) {
							if (oTabObj.flag === "Cr" || oTabObj.flag === "Ch") {
								unsavedFlag = true;
							}
						})
					}
				}

				if (unsavedFlag) {
					return false;
				} else {
					return true;
				}
			},
			onNavBackFromArtistContract: function () {
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				var responseFlag = this.checkForUnsavedData();
				if (responseFlag) {
					if (artistContractDetailInfo.App == "App") {
						this.navToContApp();
					} else {
						this.navToDealMemo();
					}
				} else {
					var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.confirm(oSourceBundle.getText("msgUnsaveDataWar"), {
						actions: [oSourceBundle.getText("lblYes"), oSourceBundle.getText("lblNo")],
						emphasizedAction: "Yes",
						onClose: function (sAction) {
							if (sAction === oSourceBundle.getText("lblYes")) {
								if (artistContractDetailInfo.App == "App") {
									this.navToContApp();
								} else {
									this.navToDealMemo();
								}
							} else if (sAction === oSourceBundle.getText("lblNo")) {

							}
						}.bind(this)
					});
				}
			},
			navToContApp: function () {
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();

				var dmno = artistContractDetailInfo.Dmno;
				var dmver = artistContractDetailInfo.Dmver;
				var conttp = "02";
				var host = window.location.origin;
				var path = window.location.pathname;

				var finalURL = host + path + "#ZVendorContract-display&/main/" + dmno + "/" + dmver + "/" + conttp;
				sap.m.URLHelper.redirect(finalURL, false);
			},

			navToDealMemo: function () {
				if (this.newContractCreated) {
					this.newContractCreated = false;
					window.history.go(-2);
				} else {
					window.history.go(-1);
				}
			},
			getFilterArray: function (arr) {
				var filterArr = [];
				arr.map(function (obj) {
					filterArr.push(
						new Filter(obj.key, "EQ", obj.val)
					);
				});
				return filterArr;

			},
			loadDealMemoDetails: function () {
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				var odetailEntityPath = "/DmHeaderSet(Tentid='IBS',Dmno='" + artistContractDetailInfo.Dmno + "',Dmver='" + artistContractDetailInfo
					.Dmver + "',Transtp='D')";
				var oModel = this.getView().getModel();

				sap.ui.core.BusyIndicator.show(0);
				oModel.read(odetailEntityPath, {
					urlParameters: {
						"$expand": "DmCostSet,DmCoSet"
					},
					success: function (oData) {
						Object.assign(artistContractDetailInfo, oData);
						artistContractModel.refresh(true);
						this.loadTaxCodes();
						this.loadCostCodes();
						if (artistContractDetailInfo.Contno === "new") {
							this.createContract();
						} else {
							this.displayContract();
						}
						sap.ui.core.BusyIndicator.hide();
					}.bind(this),
					error: function () {
						sap.ui.core.BusyIndicator.hide();
					}
				});
			},

			createContract: function () {
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				var oPath = "/DmCoSet(Tentid='IBS',Dmno='" + artistContractDetailInfo.Dmno + "',Dmver='" + artistContractDetailInfo.Dmver +
					"',Contno='',Contver='',Conttp='02')";
				var oModel = this.getView().getModel();

				oModel.read(oPath, {
					success: function (oData) {
						artistContractModel.setProperty("/Avlartbud", oData.Avlartbud);
						artistContractModel.setProperty("/Totartbud", oData.Totartbud);
						artistContractModel.setProperty("/Othartamt", oData.Othartamt);
						artistContractModel.setProperty("/Ebeln", oData.Ebeln);
						artistContractModel.setProperty("/epiDeleteEnable", false);
						artistContractModel.setProperty("/saveVisible", true);
						if (oData.Contstat === "01" || oData.Contstat === "03"  || oData.Contstat === "10") { // added by dhiraj on 20/05/2022 for submit butn.
							artistContractModel.setProperty("/submitVisible", true);
						} else {
							artistContractModel.setProperty("/submitVisible", false);
						}
						if (artistContractDetailInfo.Contno !== "new") {
							artistContractModel.setProperty("/releaseTabVisible", true);
						} else {
							artistContractModel.setProperty("/releaseTabVisible", false);
						}
						if (oData.Contstat === "04") {
							artistContractModel.setProperty("/changeVisible", true);
						} else {
							artistContractModel.setProperty("/changeVisible", false);
						}
						artistContractModel.setProperty("/contractMode", "Cr");
						artistContractModel.setProperty("/ContDate", Formatter.formatDateVal(new Date()));
						artistContractModel.setProperty("/Totcost", "0.00");
						artistContractModel.setProperty("/acTabEnable", false);
						artistContractModel.setProperty("/EpiDataColor", "Critical");
						artistContractModel.setProperty("/paymentDataColor", "Critical");
						artistContractModel.setProperty("/EpiNonCostCdDataColor", "Critical");
						artistContractModel.setProperty("/enableEpiNonCostCdTab", false);

						artistContractModel.refresh(true);
						this.getView().byId("btnEditAC").setVisible(false);
						this.getView().byId("idSubIconTabBarac").setSelectedKey("acSubEpiData");
						// if(artistContractDetailInfo.Dmst !== "04"){
						this.loadVendors();
						// }
					}.bind(this),
					error: function (oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg, {
							actions: [MessageBox.Action.CLOSE],
							emphasizedAction: MessageBox.Action.CLOSE,
							onClose: function (sAction) {
								this.navToDealMemo();
							}.bind(this)
						});

					}.bind(this)
				});

			},
			validateSubmit: function () {
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				var statusFlag = true;
				if (!artistContractDetailInfo.DmCeSet.results.length) {
					statusFlag = false;
					MessageBox.error(oSourceBundle.getText("msgrequiredTabs"));
				} else if (!artistContractDetailInfo.DmCmSet.results.length) {
					statusFlag = false;
					MessageBox.error(oSourceBundle.getText("msgrequiredTabs"));
				} else {
					statusFlag = true;
				}
				return statusFlag;
			},
			onSubmitAC: function () {

				// var validKey = this.validateSubmit();
				// if (validKey) {
					sap.ui.core.BusyIndicator.show(0);
					var oModel = this.getView().getModel();
					var artistContractModel = this.getView().getModel("artistContractModel");
					var artistContractDetailInfo = artistContractModel.getData();
					var paramObj = {
						"IV_TENTID": "IBS",
						"IV_DMNO": artistContractDetailInfo.Dmno,
						"IV_DMVER": artistContractDetailInfo.Dmver,
						"IV_CONTNO": artistContractDetailInfo.Contno,
						"IV_CONTVER": artistContractDetailInfo.Contver,
						"IV_CONTTP": artistContractDetailInfo.Conttp

					};
					oModel.callFunction("/SubmitCont", {
						method: "GET",
						urlParameters: paramObj,
						success: function (oData, response) {
							sap.ui.core.BusyIndicator.hide();
							// dealMemoDetailModel.setProperty("/costCodes", oData.results);
							artistContractModel.refresh(true);
							this.loadDealMemoDetails();

						}.bind(this),
						error: function (oError) {
							sap.ui.core.BusyIndicator.hide();
							var oErrorResponse = JSON.parse(oError.responseText);
							var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
							MessageBox.error(oMsg);
						}
					});
				// }
			},
			displayContract: function () {
				var artistContractModel = this.getView().getModel("artistContractModel");
				artistContractModel.setProperty("/contractMode", "Ch");
				this.createParamModel();
				artistContractModel.refresh(true);
				this.displayContractFlag = true;
				this.reloadArtistContractTabs();
			},

			storeMasterCodeInfo: function (oData) {
				var artistContractModel = this.getView().getModel("artistContractModel");
				artistContractModel.setProperty("/vendorRoleList", oData.results.filter(function (item) {
					return item.Mstpcd === "09";
				}));
				artistContractModel.setProperty("/mileStoneList", oData.results.filter(function (item) {
					return item.Mstpcd === "08";
				}));
				artistContractModel.setProperty("/skipRfpDropDown", oData.results.filter(function (item) {
					return item.Mstpcd === "26";
				}));

				artistContractModel.setProperty("/retentionDropDown", oData.results.filter(function (item) {
					return item.Mstpcd === "27";
				}));
			},
			loadInitialDataFromMaster: function () {

				var filteArr = [

					{
						"key": "Tentid",
						"val": "IBS"
					}, {
						"key": "Spras",
						"val": "EN-US"
					}, {
						"key": "Mstpcd",
						"val": "09"
					}, {
						"key": "Mstpcd",
						"val": "08"
					}, {
						"key": "Mstpcd",
						"val": "26"
					}, {
						"key": "Mstpcd",
						"val": "27"
					}

				];
				var aFilters = this.getFilterArray(filteArr);
				var oModel = this.getView().getModel();

				oModel.read("/DDMastCdSet", {
					filters: aFilters,
					success: function (oData) {
						this.storeMasterCodeInfo(oData);
					}.bind(this),
					error: function () {

					}
				});
			},
			loadVendors: function () {
				var oModel = this.getView().getModel();
				sap.ui.core.BusyIndicator.show();
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				sap.ui.core.BusyIndicator.show(0);
				var oPath = "/F4LFB1Set?$filter=Bukrs eq '" + artistContractDetailInfo.Bukrs + "'";
				oModel.read(oPath, {
					success: function (oData) {
						//                    	var sortedList = oData.results.sort(function(a,b){
						//                    	    return a.Lifnr - b.Lifnr;
						//                    	    }
						//                    	);
						var sortedList = oData.results.sort((a, b) => (a.Lifnr > b.Lifnr) ? 1 : ((b.Lifnr > a.Lifnr) ? -1 : 0));
						//var filterNonBlank = sortedList.filter(function(obj){return obj.Mcod1 !== ""});
						artistContractModel.setProperty("/vendorsList", sortedList);
						artistContractModel.refresh(true);
						sap.ui.core.BusyIndicator.hide();
						if (artistContractModel.oData.contractMode != "Ch") {
							this.onVendorSelection();
						}

					}.bind(this),
					error: function () {

					}
				});
			},
			loadVendorsondeal: function () {
				var oModel = this.getView().getModel();
				sap.ui.core.BusyIndicator.show();
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				sap.ui.core.BusyIndicator.show(0);
				var oPath = "/F4LFB1Set?$filter=Bukrs eq '" + artistContractDetailInfo.Bukrs + "'";
				oModel.read(oPath, {
					success: function (oData) {
						//                    	var sortedList = oData.results.sort(function(a,b){
						//                    	    return a.Lifnr - b.Lifnr;
						//                    	    }
						//                    	);
						var sortedList = oData.results.sort((a, b) => (a.Lifnr > b.Lifnr) ? 1 : ((b.Lifnr > a.Lifnr) ? -1 : 0));
						//var filterNonBlank = sortedList.filter(function(obj){return obj.Mcod1 !== ""});
						artistContractModel.setProperty("/vendorsList", sortedList);
						artistContractModel.refresh(true);
						sap.ui.core.BusyIndicator.hide();

					}.bind(this),
					error: function () {

					}
				});
			},
			onVendorSelection: function () {
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				this.oValueHelpSelectionParams = {
					"bindPathName": "artistContractModel>/vendorsList",
					"bindPropName": "artistContractModel>Mcod1",
					"propName": "Mcod1",
					"keyName": "Lifnr",
					"bindPropDescName": "artistContractModel>Lifnr",
					"keyPath": "/vendorKey",
					"valuePath": "/vendorName",
					"valueModel": "artistContractModel",
					"dialogTitle": oSourceBundle.getText("titleVendor"),
					"callBackFunction": this.loadVendorRoles
				};
				this.openSelectionDialog();
			},
			loadVendorRoles: function (oRef) {
				var oSourceBundle = oRef.getView().getModel("i18n").getResourceBundle();
				oRef.oValueHelpSelectionParams = {
					"bindPathName": "artistContractModel>/vendorRoleList",
					"bindPropName": "artistContractModel>Mstcdnm",
					"propName": "Mstcdnm",
					"keyName": "Mstcd",
					"bindPropDescName": "artistContractModel>Mstcd",
					"keyPath": "/vendorRoleKey",
					"valuePath": "/vendorRoleName",
					"valueModel": "artistContractModel",
					"dialogTitle": oSourceBundle.getText("titleVendorRole"),
					"callBackFunction": oRef.editDepartment
				};
				oRef.openSelectionDialog();
			},
			//Added by dhiraj on 31/05/2022
			editDepartment: function (oRef) {
				this.editDepartment = true;
				oRef.loadDepartment();
			},

			loadDepartment: function () { // added by dhiraj on 24/05/2022
				var artistContractModel = this.getView().getModel("artistContractModel");
				artistContractModel.setProperty("/Iniquoamt", "0.00");
				artistContractModel.setProperty("/R1quoamt", "0.00");
				artistContractModel.setProperty("/R2quoamt", "0.00");
				artistContractModel.setProperty("/Finalquoamt", "0.00");
				artistContractModel.setProperty("/Skiprfpreason", "");
				artistContractModel.setProperty("/Retenaplty", "");

				artistContractModel.refresh(true);
				Fragment.load({
					name: "com.ui.dealmemolocal.fragments.SelectDepartmentDialogAC",
					controller: this
				}).then(function name(oFragment) {
					this._oCreateParamDialog = oFragment; //sap.ui.xmlfragment("com.ui.dealmemolocal.fragments.CreateParameterDialog", this);
					this.createParamModel();
					this.getView().addDependent(this._oCreateParamDialog);
					this._oCreateParamDialog.setModel(this.getView().getModel("artistContractModel"));
					this._oCreateParamDialog.open();

				}.bind(this));
			},
			onCreateParamCancel: function () { // added by dhiraj on 24/05/2022
				this._oCreateParamDialog.destroy();

				this.createContract();

			},
			validateBeforeCreate: function () {
				var artistContractModel = this.getView().getModel("artistContractModel");
				var createParamsData = artistContractModel.getData().createParams;
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				var statusFlag = true;
				if (createParamsData.Zltext === "" || createParamsData.Prreq === "" || createParamsData.Depthd === "" || createParamsData.Grsescr ===
					"") {
					statusFlag = false;
					MessageBox.error(oSourceBundle.getText("msgrequiredFieds"));
				}
				return statusFlag;
			},
			onChangeRFPatt: function (oEvent) {
				var artistContractModel = this.getView().getModel("artistContractModel");
				artistContractModel.refresh(true);
			},

			onCreateParamOk: function () {
				var oVaildFlag = this.validateBeforeCreate();
				if (oVaildFlag) {
					var artistContractModel = this.getView().getModel("artistContractModel");
					var artistContractDetailInfo = artistContractModel.getData();
					if (artistContractDetailInfo.Skiprfpreason != "") {
						artistContractDetailInfo.Skiprfpresnm = sap.ui.getCore().byId(artistContractDetailInfo.skipRfpDropDownId).getText();
					}
					if (artistContractDetailInfo.Retenaplty != "") {
						artistContractDetailInfo.Retappnm = sap.ui.getCore().byId(artistContractDetailInfo.retentionDropId).getText();
					}
					artistContractModel.refresh(true);
					this._oCreateParamDialog.destroy();
				}

			},
			createParamModel: function () { // added by dhiraj on 24/05/2022
				var artistContractModel = this.getView().getModel("artistContractModel");
				artistContractModel.setProperty("/createParams", {
					"Zstext": artistContractModel.oData.Abtnr != "" ? artistContractModel.oData.Abtnr : "",
					"Zltext": artistContractModel.oData.Zltext != "" ? artistContractModel.oData.Zltext : "",
					"Prreq": artistContractModel.oData.Prreq != "" ? artistContractModel.oData.Prreq : "",
					"Depthd": artistContractModel.oData.Depthd != "" ? artistContractModel.oData.Depthd : "",
					"Dept": artistContractModel.oData.Abtnr != "" ? artistContractModel.oData.Abtnr : "",
					"Grsescr": artistContractModel.oData.Grsescr != "" ? artistContractModel.oData.Grsescr : "",
					// "Zstext": "",
					// "Zltext": "",
					// "Prreq": "",
					// "Depthd": "",
					// "Dept": "",
					// "Grsescr": "",
					"Recont": false
				});
				if (artistContractModel.oData.contractMode === "Ch") {
					artistContractModel.oData.createParams.Zstext = artistContractModel.oData.DmCoSet.results.find(d => d.Contno ===
						artistContractModel.oData.Contno && d.Contver === artistContractModel.oData.Contver).Dept
					artistContractModel.oData.createParams.Prreq = artistContractModel.oData.DmCoSet.results.find(d => d.Contno ===
						artistContractModel.oData.Contno && d.Contver === artistContractModel.oData.Contver).Prreq
					artistContractModel.oData.createParams.Depthd = artistContractModel.oData.DmCoSet.results.find(d => d.Contno ===
						artistContractModel.oData.Contno && d.Contver === artistContractModel.oData.Contver).Depthd
					artistContractModel.oData.createParams.Grsescr = artistContractModel.oData.DmCoSet.results.find(d => d.Contno ===
						artistContractModel.oData.Contno && d.Contver === artistContractModel.oData.Contver).Grsescr
				}
				//added by dhiraj on 52/05/2022
				this.loadDepartmentValue();
				artistContractModel.refresh(true);
				this.loadDeptHeadValue();
				this.loadGrCreaterValue();
				this.loadPrRequestorValue();
				this.loadVendorsondeal();
				this.loadHsnCode();
				//----------------------------
			},

			loadHsnCode: function () {
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				var srvUrl = "/sap/opu/odata/IBSCMS/DEALMEMO_SRV";
				var oModelSav = new sap.ui.model.odata.ODataModel(srvUrl, true, "", "");
				var oPath = "/F4HsnCodeSet?$filter=Spras eq 'EN'";
				var oModel = this.getView().getModel();
				oModelSav.read(oPath, null, null, true, function (oData) {
					var oModel = new sap.ui.model.json.JSONModel(oData);
					oModel.setSizeLimit("999999");

					artistContractModel.setProperty("/hsnCodeList", oData.results);
					artistContractModel.refresh(true);
				}, function (value) {
					sap.ui.core.BusyIndicator.hide();
					console.log(value);
					//alert("fail");
				});
			},

			onValueHelpHsnCode: function (oEvent) {
				var oPath = oEvent.getSource().getBindingContext("artistContractModel").sPath;

				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				this.oValueHelpSelectionParams = {
					"bindPathName": "artistContractModel>/hsnCodeList",
					"bindPropName": "artistContractModel>Text1",
					"bindPropDescName": "artistContractModel>Steuc",
					"propName": "Text1",
					"keyName": "Steuc",
					"valuePath": oPath + "/Hsncdnm",
					"keyPath": oPath + "/Hsncd",
					"valueModel": "artistContractModel",
					"dialogTitle": oSourceBundle.getText("lblHsnCd")
				};
				this.openSelectionDialog();
			},


			loadDepartmentValue: function () { // added by dhiraj on 24/05/2022
				var oModel = this.getView().getModel();
				sap.ui.core.BusyIndicator.show();
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				sap.ui.core.BusyIndicator.show(0);
				var oPath = "/DmDeptF4Set";
				oModel.read(oPath, {
					success: function (oData) {
						var sortedList = oData.results.sort((a, b) => (a.Abtnr > b.Abtnr) ? 1 : ((b.Abtnr > a.Abtnr) ? -1 : 0));

						artistContractModel.setProperty("/departmentList", sortedList);
						if (artistContractModel.oData.contractMode === "Ch") {
							artistContractModel.oData.createParams.Zltext = artistContractModel.oData.departmentList.find(a => a.Abtnr ===
								artistContractModel.oData.createParams.Zstext).Zltext;
						}
						artistContractModel.refresh(true);
						sap.ui.core.BusyIndicator.hide();
					}.bind(this),
					error: function () {

					}
				});

			},
			onValueHelpDept: function () { // added by dhiraj on 24/05/2022
				var artistContractModel = this.getView().getModel("artistContractModel");
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				this.oValueHelpSelectionParams = {
					"bindPathName": "artistContractModel>/departmentList",
					"bindPropName": "artistContractModel>Zltext",
					"propName": "Zltext",
					"keyName": "Zstext",
					"bindPropDescName": "artistContractModel>Abtnr",
					"valuePath": "/createParams/Zltext",
					"keyPath": "/createParams/Zstext",
					"valueModel": "artistContractModel",
					"dialogTitle": "Select Department",
					"callBackFunction": this.paramsEmpty
				};
				this.openSelectionDialog();

			},
			paramsEmpty: function (oRef) {
				var artistContractModel = oRef.oView.getModel("artistContractModel");
				artistContractModel.oData.createParams.Prreq = "";
				artistContractModel.oData.createParams.Depthd = "";
				artistContractModel.oData.createParams.Grsescr = "";
				oRef.emptyParamsID();
			},
			emptyParamsID: function () {
				sap.ui.getCore().byId("Prreq").setValue("");
				sap.ui.getCore().byId("Depthd").setValue("");
				sap.ui.getCore().byId("Grsescr").setValue("");
			},
			loadPrRequestorValue: function () { // added by dhiraj on 24/05/2022
				var oModel = this.getView().getModel();
				sap.ui.core.BusyIndicator.show();
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				sap.ui.core.BusyIndicator.show(0);
				var oPath = "/DmPrReqF4Set";
				oModel.read(oPath, {
					success: function (oData) {
						var sortedList = oData.results.sort((a, b) => (a.Bukrs > b.Bukrs) ? 1 : ((b.Bukrs > a.Bukrs) ? -1 : 0));

						artistContractModel.setProperty("/prRequestorList", sortedList);
						artistContractModel.refresh(true);
						sap.ui.core.BusyIndicator.hide();
					}.bind(this),
					error: function () {

					}
				});

			},
			onValueHelpPrRequestor: function () { // added by dhiraj on 24/05/2022
				var artistContractModel = this.getView().getModel("artistContractModel");
				var list = artistContractModel.oData.prRequestorList.filter(function (obj) {
					return obj.Dept === artistContractModel.oData.createParams.Dept
				}.bind(this))
				artistContractModel.setProperty("/prRequestorListS", list);
				artistContractModel.refresh(true);
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				this.oValueHelpSelectionParams = {
					"bindPathName": "artistContractModel>/prRequestorListS",
					"bindPropName": "artistContractModel>SpocList",
					"propName": "SpocList",
					"valuePath": "/createParams/Prreq",
					"valueModel": "artistContractModel",
					"dialogTitle": "Select PR Requestor"
				};
				if (artistContractModel.oData.createParams.Zltext !== "") {
					this.openSelectionDialog();
				} else {
					var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.information(oSourceBundle.getText("msgDeptCheck"));
				}
			},
			loadDeptHeadValue: function () { // added by dhiraj on 24/05/2022 
				var oModel = this.getView().getModel();
				sap.ui.core.BusyIndicator.show();
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				sap.ui.core.BusyIndicator.show(0);
				var oPath = "/DmDeptHeadF4Set";
				oModel.read(oPath, {
					success: function (oData) {
						var sortedList = oData.results.sort((a, b) => (a.Bukrs > b.Bukrs) ? 1 : ((b.Bukrs > a.Bukrs) ? -1 : 0));

						artistContractModel.setProperty("/deptHeadList", sortedList);
						artistContractModel.refresh(true);
						sap.ui.core.BusyIndicator.hide();
					}.bind(this),
					error: function () {

					}
				});

			},
			onValueHelpDeptHead: function () { // added by dhiraj on 24/05/2022
				var artistContractModel = this.getView().getModel("artistContractModel");
				var list = artistContractModel.oData.deptHeadList.filter(function (obj) {
					return obj.Dept === artistContractModel.oData.createParams.Dept
				}.bind(this))
				artistContractModel.setProperty("/deptHeadListS", list);
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				this.oValueHelpSelectionParams = {
					"bindPathName": "artistContractModel>/deptHeadListS",
					"bindPropName": "artistContractModel>SpocList",
					"propName": "SpocList",
					"valuePath": "/createParams/Depthd",
					"valueModel": "artistContractModel",
					"dialogTitle": "Select Department Head"
				};
				if (artistContractModel.oData.createParams.Zltext !== "") {
					this.openSelectionDialog();
				} else {
					var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.information(oSourceBundle.getText("msgDeptCheck"));
				}
			},
			loadGrCreaterValue: function () { // added by dhiraj on 24/05/2022
				var oModel = this.getView().getModel();
				sap.ui.core.BusyIndicator.show();
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				sap.ui.core.BusyIndicator.show(0);
				var oPath = "/DmGrCreteF4Set";
				oModel.read(oPath, {
					success: function (oData) {
						var sortedList = oData.results.sort((a, b) => (a.Bukrs > b.Bukrs) ? 1 : ((b.Bukrs > a.Bukrs) ? -1 : 0));

						artistContractModel.setProperty("/grCreaterList", sortedList);
						artistContractModel.refresh(true);
						sap.ui.core.BusyIndicator.hide();
					}.bind(this),
					error: function () {

					}
				});

			},
			onValueHelpGrCreater: function () { // added by dhiraj on 24/05/2022
				var artistContractModel = this.getView().getModel("artistContractModel");
				var list = artistContractModel.oData.grCreaterList.filter(function (obj) {
					return obj.Dept === artistContractModel.oData.createParams.Dept
				}.bind(this))
				artistContractModel.setProperty("/grCreaterListS", list);

				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				this.oValueHelpSelectionParams = {
					"bindPathName": "artistContractModel>/grCreaterListS",
					"bindPropName": "artistContractModel>SpocList",
					"propName": "SpocList",
					"valuePath": "/createParams/Grsescr",
					"valueModel": "artistContractModel",
					"dialogTitle": "Select GR SES Creator"
				};
				if (artistContractModel.oData.createParams.Zltext !== "") {
					this.openSelectionDialog();
				} else {
					var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.information(oSourceBundle.getText("msgDeptCheck"));
				}
			},
			onActionCB: function () { // FOr replacement Checkbox.
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				if (sap.ui.getCore().byId("recont").getSelected() === true) {
					artistContractModel.setProperty("/createParams/Recont", true);
				} else {
					artistContractModel.setProperty("/createParams/Recont", false);
				}
			},
			onSelectionDialogClose: function () {
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				if (this.oValueHelpSelectionParams.dialogTitle === oSourceBundle.getText("titleVendor")) {
					this.navToDealMemo();
				} else if (this.oValueHelpSelectionParams.dialogTitle === oSourceBundle.getText("titleVendorRole")) {
					this.onVendorSelection();
				}

			},
			loadTaxCodes: function () {
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				var oModel = this.getView().getModel();
				sap.ui.core.BusyIndicator.show();
				var artistContractModel = this.getView().getModel("artistContractModel");

				var oFilters = [{
					"key": "Bukrs",
					"val": artistContractDetailInfo.Bukrs

				}];

				var aFilters = this.getFilterArray(oFilters);
				oModel.read("/F4TaxCodeSet", {
					filters: aFilters,
					success: function (oData) {
						// var filteredList = oData.results.filter(function(obj) {
						// 	return obj.Mwskz.includes("V")
						// });
						// artistContractModel.setProperty("/taxCodeList", filteredList);
						artistContractModel.setProperty("/taxCodeList", oData.results);
						artistContractModel.refresh(true);
						sap.ui.core.BusyIndicator.hide();

					}.bind(this),
					error: function () {

					}
				});
			},
			loadCostCodes: function () {
				var oModel = this.getView().getModel();
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				var paramObj = {
					"IV_TENTID": "IBS",
					"IV_DMNO": artistContractDetailInfo.Dmno,
					"IV_DMVER": artistContractDetailInfo.Dmver,
					"IV_CONTTP": "02"

				};
				oModel.callFunction("/GetContractCostCode", {
					method: "GET",
					urlParameters: paramObj,
					success: function (oData, response) {
						oData.results.map(function (obj) {
							obj.costValueEditable = false;
							obj.costCodeValue = "0.00"
						});

						artistContractModel.setProperty("/costCodeList", oData.results);
						artistContractModel.refresh(true);
						//   						if(artistContractDetailInfo.Contno === "new"){
						//   							this.calculateAvailableBudget();
						//   						}

					}.bind(this),
					error: function (oError) { }
				})

			},
			calculateAvailableBudget: function () {
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				var budgetData = artistContractDetailInfo.DmCostSet.results.filter(function (DmBudObj) {
					return DmBudObj.Epiid === "00000"
				});
				var totalBudget = 0;
				artistContractDetailInfo.costCodes.map(function (costCodeObj) {
					var costCodeArr = budgetData.filter(function (budObj) {
						return budObj.Scostcd === costCodeObj.Costcode;
					});
					if (costCodeArr.legth) {
						totalBudget += parseFloat(costCodeArr[0].Totcostamt);
					}
				});

				artistContractDetailInfo.Totartbud = totalBudget.toString();
				artistContractDetailInfo.Avlartbud = totalBudget.toString();
				artistContractModel.refresh(true);
			},
			loadEpisodes: function () {
				var oModel = this.getView().getModel();
				sap.ui.core.BusyIndicator.show();
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				var oFilters = [{
					"key": "Tentid",
					"val": "IBS"
				}, {
					"key": "Spras",
					"val": "EN-US"
				}, {
					"key": "Dmno",
					"val": artistContractDetailInfo.Dmno
				}, {
					"key": "Conttp",
					"val": "02"
				}

				];

				var aFilters = this.getFilterArray(oFilters);
				oModel.read("/F4EpiIDSet", {
					filters: aFilters,
					success: function (oData) {
						sap.ui.core.BusyIndicator.hide();
						//	var filteredEpisodes = oData.results.filter(function(epObj){return epObj.Vcflag === "";});
						artistContractModel.setProperty("/episodeList", oData.results);
						artistContractModel.refresh(true);
					}.bind(this),
					error: function (oError) {
						sap.ui.core.BusyIndicator.hide();
					}
				});
			},
			loadPayTerms: function () {
				var oModel = this.getView().getModel();
				var artistContractModel = this.getView().getModel("artistContractModel");
				oModel.read("/F4PayTermSet", {
					success: function (oData) {
						artistContractModel.setProperty("/payTermList", oData.results);
						artistContractModel.refresh(true);
						sap.ui.core.BusyIndicator.hide();

					}.bind(this),
					error: function () {

					}
				});
			},
			onSelectEpisodeMode: function () {
				var oSelModeIndex = this.byId(sap.ui.core.Fragment.createId("acEpisodeDialog", "rbEpisideMode")).getSelectedIndex();
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				if (oSelModeIndex === 1) {
					artistContractDetailInfo.episodeRangeVisible = true;
				} else {
					artistContractDetailInfo.episodeRangeVisible = false;
				}
				artistContractModel.refresh(true);
			},
			onSelectionACostCodes: function (oEvent) {
				var oParams = oEvent.getParameters();
				var oSelected = oParams['selected'];
				var artistContractModel = this.getView().getModel("artistContractModel");
				var oSelItemObj = oParams['listItem'].getBindingContext("artistContractModel").getObject();
				oSelItemObj.costValueEditable = oSelected;
				if (!oSelected) {
					oSelItemObj.costCodeValue = "0.00";
				}
				artistContractModel.refresh(true);

			},
			onvaluHelpTaxcode: function () {
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				this.oValueHelpSelectionParams = {
					"bindPathName": "artistContractModel>/taxCodeList",
					"bindPropName": "artistContractModel>Mwstx",
					"propName": "Mwstx",
					"keyName": "Mwskz",
					"bindPropDescName": "artistContractModel>Mwskz",
					"keyPath": "/taxCodeKey",
					"valuePath": "/taxCodeName",
					"valueModel": "artistContractModel",
					"dialogTitle": oSourceBundle.getText("titleTaxCode")
					//"callBackFunction":	oRef.createVendorContract
				};
				this.openSelectionDialog();
			},
			openSelectionDialog: function () {
				Fragment.load({
					id: this.createId("acTaxCodeSelectionDialog"),
					name: "com.ui.dealmemolocal.fragments.SelectionDialog",
					controller: this
				}).then(function name(oFragment) {
					this._oSelectionDialog = oFragment; //sap.ui.xmlfragment("com.ui.dealmemolocal.fragments.SelectionDialog", this);
					this.getView().addDependent(this._oSelectionDialog);
					this._oSelectionDialog.setTitle(this.oValueHelpSelectionParams.dialogTitle);
					var oItem = new sap.m.StandardListItem({
						title: "{" + this.oValueHelpSelectionParams.bindPropName + "}"
					});
					if (this.oValueHelpSelectionParams.bindPropDescName) {
						oItem.bindProperty("description", this.oValueHelpSelectionParams.bindPropDescName);
					}
					this._oSelectionDialog.bindAggregation("items", this.oValueHelpSelectionParams.bindPathName, oItem);
					this._oSelectionDialog.open();
				}.bind(this));
			},
			onConfirmSelection: function (oEvent) {
				var selectedItemObj = oEvent.getParameters()['selectedItem'].getBindingContext("artistContractModel").getObject();
				var oValuePath = this.oValueHelpSelectionParams.valuePath;
				var oKeyPath = this.oValueHelpSelectionParams.keyPath;
				var oProp = this.oValueHelpSelectionParams.propName;
				var oKey = this.oValueHelpSelectionParams.keyName;
				var oValueModelAlias = this.oValueHelpSelectionParams.valueModel;
				var artistContractModel = this.getView().getModel(oValueModelAlias);
				artistContractModel.setProperty(oValuePath, selectedItemObj[oProp]);
				artistContractModel.setProperty(oKeyPath, selectedItemObj[oKey]);
				if (oEvent.oSource.mProperties.title == 'Select Department') {
					artistContractModel.setProperty("/createParams/Dept", selectedItemObj["Abtnr"]);
				}
				artistContractModel.refresh(true);
				if (this.oValueHelpSelectionParams.callBackFunction) {
					this.oValueHelpSelectionParams.callBackFunction(this);
				}
			},
			onSelectEpisodeAC: function () {
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				artistContractDetailInfo.episodeRangeVisible = false;
				artistContractDetailInfo.episodeMode = 0;
				artistContractDetailInfo.epiFromId = "";
				artistContractDetailInfo.epiToId = "";
				if (vendorContractDetailInfo.Mwskz != "") {
				artistContractDetailInfo.taxCodeName = artistContractDetailInfo.taxCodeList.find(a => a.Mwskz == artistContractDetailInfo.Mwskz).Mwstx == "" ? "" : artistContractDetailInfo.taxCodeList.find(a => a.Mwskz == artistContractDetailInfo.Mwskz).Mwstx
				}
				artistContractDetailInfo.taxCodeKey = artistContractDetailInfo.Mwskz == "" ? "" : artistContractDetailInfo.Mwskz;
				artistContractDetailInfo.costCodes = $.extend(true, [], artistContractDetailInfo.costCodeList);
				artistContractDetailInfo.costValueEditable = false;
				artistContractDetailInfo.acEpiDataMsgVisible = false;
				artistContractDetailInfo.acEpiDataErrorMsg = "";
				artistContractDetailInfo.retEpi = false;
				if (artistContractDetailInfo.Retenaplty == "01") {
					artistContractDetailInfo.retEpi = true;
					}

				artistContractModel.refresh(true);
				if (!this._oSelectEpisodeDialog) {
					Fragment.load({
						id: this.createId("acEpisodeDialog"),
						name: "com.ui.dealmemolocal.fragments.ACSelectEpisodeDialog",
						controller: this
					}).then(function name(oFragment) {
						this._oSelectEpisodeDialog = oFragment; //sap.ui.xmlfragment("com.ui.dealmemolocal.fragments.SelectPaymentDialog", this);
						this.getView().addDependent(this._oSelectEpisodeDialog);
						this.byId(sap.ui.core.Fragment.createId("acEpisodeDialog", "list_costCodes")).removeSelections();
						this._oSelectEpisodeDialog.open();
					}.bind(this));

				} else {
					this.byId(sap.ui.core.Fragment.createId("acEpisodeDialog", "list_costCodes")).removeSelections();
					this._oSelectEpisodeDialog.open();
				}

			},
			validateBeforePush: function () {
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				var oselIndex = artistContractDetailInfo.episodeMode;
				var selectedCostCodeContexts = this.byId(sap.ui.core.Fragment.createId("acEpisodeDialog", "list_costCodes")).getSelectedContexts()

				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				if (oselIndex == 1) {
					if (artistContractDetailInfo.epiFromId === "" || artistContractDetailInfo.epiFromId === undefined || artistContractDetailInfo.epiToId ===
						"" || artistContractDetailInfo.epiToId === undefined) {
						//MessageBox.error(oSourceBundle.getText("msgSelectEpisode"));
						artistContractDetailInfo.acEpiDataMsgVisible = true;
						artistContractDetailInfo.acEpiDataErrorMsg = oSourceBundle.getText("msgSelectEpisode" + artistContractDetailInfo.Cnttp);
						artistContractModel.refresh(true);
						return false;
					}
				}
				if (artistContractDetailInfo.taxCodeKey === "" || artistContractDetailInfo.taxCodeKey === undefined) {
					//MessageBox.error(oSourceBundle.getText("msgSelectTaxCode"));
					artistContractDetailInfo.acEpiDataMsgVisible = true;
					artistContractDetailInfo.acEpiDataErrorMsg = oSourceBundle.getText("msgSelectTaxCode");
					artistContractModel.refresh(true);
					return false;
				}
				if (selectedCostCodeContexts.length === 0) {
					//	MessageBox.error(oSourceBundle.getText("msgSelectCostCode"));
					artistContractDetailInfo.acEpiDataMsgVisible = true;
					artistContractDetailInfo.acEpiDataErrorMsg = oSourceBundle.getText("msgSelectCostCode");
					artistContractModel.refresh(true);
					return false;
				}
				for (var oInd = 0; oInd < selectedCostCodeContexts.length; oInd++) {
					var oCostObj = selectedCostCodeContexts[oInd].getObject();

					if (parseInt(oCostObj.costCodeValue) <= 0) {
						//MessageBox.error(oSourceBundle.getText("msgtotCostCodeCostNonZero"));
						artistContractDetailInfo.acEpiDataMsgVisible = true;
						artistContractDetailInfo.acEpiDataErrorMsg = oSourceBundle.getText("msgtotCostCodeCostNonZero");
						artistContractModel.refresh(true);
						return false;
						break;
					}
				}
				return true;
			},
			validateMilestoneAchievementDate: function () {
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				var allowedEpisodes = [];
				var response = {};
				response.allowedEpisodes = [];
				if (artistContractDetailInfo.epiPaymentFromId == "" && artistContractDetailInfo.epiPaymentToId == "") { //All Episodes
					var episodeList = [];
					artistContractDetailInfo.DmCmSet.results.map(function (obj) {
						episodeList.push(obj.Epiid)
					});
					if (episodeList.length > 0) {
						for (let i = 0; i <= episodeList.length - 1; i++) {
							if (artistContractDetailInfo.DmCmSet.results.findIndex(v => v.Epiid == episodeList[i] && v.Mscompdt && artistContractDetailInfo.mileStonesForEpi
								.findIndex(obj => obj.Mstcd != v.Msid) == -1) == -1) {
								response.allowedEpisodes.push(episodeList[i]);
							} else {
								response.warningMessage = true;
							}
						}

					};
				} else if (artistContractDetailInfo.epiPaymentFromId != "" && artistContractDetailInfo.epiPaymentToId != "") { // Range of Episodes
					for (let i = artistContractDetailInfo.epiPaymentFromId; i <= artistContractDetailInfo.epiPaymentToId; i++) {
						if (artistContractDetailInfo.DmCmSet.results.findIndex(v => v.Mscompdt && v.Epiid == i && artistContractDetailInfo.mileStonesForEpi
							.findIndex(obj => obj.Mstcd != v.Msid) == -1) == -1) {
							response.allowedEpisodes.push(i);
						} else {
							response.warningMessage = true;
						}
					};

				}

				return response;

			},

			processPaymentData: function () {
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				var selectedEpisodeList = [];
				var oselIndex = artistContractDetailInfo.episodeMode;
				if (oselIndex == 0) {
					selectedEpisodeList = artistContractDetailInfo.episodeList;
				} else {
					selectedEpisodeList = [];
					artistContractDetailInfo.episodeList.map(function (epObj) {
						if (epObj.Epiid >= artistContractDetailInfo.epiFromId && epObj.Epiid <= artistContractDetailInfo.epiToId) {
							selectedEpisodeList.push(epObj);
						}

					});
				}

				selectedEpisodeList.map(function (retEpi) {
					if (retEpi.Epiid >= artistContractDetailInfo.retepiFromId && retEpi.Epiid <= artistContractDetailInfo.retepiToId) {
						retEpi.Retepi = "X";
					}
				});

				var Noofepi = selectedEpisodeList.length;
				var EpiTabData = [];
				var selectedCostCodeContexts = this.byId(sap.ui.core.Fragment.createId("acEpisodeDialog", "list_costCodes")).getSelectedContexts()
				selectedEpisodeList.map(function (epObj, i) {
					if (selectedEpisodeList.length === i + 1) {
						selectedCostCodeContexts.map(function (selCostCodeContext) {
							var selectedCostCodeObj = selCostCodeContext.getObject();
							if (selectedCostCodeObj.costCodeValue !== 0) {
								var totalCost = selectedCostCodeObj.costCodeValue;
								if (totalCost != 0) {
									var remainCost = totalCost - (parseFloat(selectedCostCodeObj.costCodeValue / Noofepi).toFixed(2) * Noofepi);
								} else {
									remainCost = 0;
								}
								var lastEpiCost = (parseFloat(selectedCostCodeObj.costCodeValue / Noofepi)) + remainCost;


								var oEpiDataObj = {
									Tentid: "IBS",
									Dmno: artistContractDetailInfo.Dmno,
									Dmver: artistContractDetailInfo.Dmver,
									Contno: "",
									Contver: "",
									Epiid: epObj.Epiid,
									Epinm: epObj.Epinm,
									Conttp: "02",
									Baseamt: "00.0",
									Totepiamt: lastEpiCost.toString(),
									Wmwst: "00.0",
									Mwskz: artistContractDetailInfo.taxCodeKey,
									Coepiamt: lastEpiCost.toString(),
									Costcd: selectedCostCodeObj.Costcode,
									Costdesc: selectedCostCodeObj.Costdesc,
									Retepi: ""

								};
								if (artistContractDetailInfo.contractMode === "Ch") {
									oEpiDataObj.Contno = artistContractDetailInfo.Contno;
									oEpiDataObj.Contver = artistContractDetailInfo.Contver;
								}
								if (oEpiDataObj.Epiid >= artistContractDetailInfo.retepiFromId && oEpiDataObj.Epiid <= artistContractDetailInfo.retepiToId) {
									oEpiDataObj.Retepi = "X";
								}

								EpiTabData.push(oEpiDataObj)
							}

						})
					} else {
						selectedCostCodeContexts.map(function (selCostCodeContext) {

							var selectedCostCodeObj = selCostCodeContext.getObject();
							if (selectedCostCodeObj.costCodeValue !== 0) {
								var perEpiValue = parseFloat(selectedCostCodeObj.costCodeValue / Noofepi).toFixed(2);

								var oEpiDataObj = {
									Tentid: "IBS",
									Dmno: artistContractDetailInfo.Dmno,
									Dmver: artistContractDetailInfo.Dmver,
									Contno: "",
									Contver: "",
									Epiid: epObj.Epiid,
									Epinm: epObj.Epinm,
									Conttp: "02",
									Baseamt: "00.0",
									Totepiamt: perEpiValue.toString(),
									Wmwst: "00.0",
									Mwskz: artistContractDetailInfo.taxCodeKey,
									Coepiamt: perEpiValue.toString(),
									Costcd: selectedCostCodeObj.Costcode,
									Costdesc: selectedCostCodeObj.Costdesc,
									Retepi: ""

								};
								if (artistContractDetailInfo.contractMode === "Ch") {
									oEpiDataObj.Contno = artistContractDetailInfo.Contno;
									oEpiDataObj.Contver = artistContractDetailInfo.Contver;
								}
								if (oEpiDataObj.Epiid >= artistContractDetailInfo.retepiFromId && oEpiDataObj.Epiid <= artistContractDetailInfo.retepiToId) {
									oEpiDataObj.Retepi = "X";
								}

								EpiTabData.push(oEpiDataObj)
							}

						})
					}
				}.bind(this));

				this.displayEpisodeTabData(EpiTabData);

				this._oSelectEpisodeDialog.close();
			},
			onPushEpiDataTab: function () {
				var validationFlag = this.validateBeforePush();
				if (validationFlag) {
					this.processPaymentData();
				}

			},
			onCancelSelectEpisode: function () {
				this._oSelectEpisodeDialog.close();
			},
			displayEpisodeTabData: function (EpiTabData) {
				sap.ui.core.BusyIndicator.show(0);
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				var oPayLoad = {};
				oPayLoad.DmCeSet = EpiTabData;
				oPayLoad.Tentid = "IBS";
				oPayLoad.Dmno = artistContractDetailInfo.Dmno;
				oPayLoad.Dmver = artistContractDetailInfo.Dmver;
				oPayLoad.Contno = "";
				oPayLoad.Conttp = "02";

				var oModel = this.getView().getModel();
				oModel.setUseBatch(false);
				oModel.create("/DmCoSet", oPayLoad, {
					success: function (oData) {
						if (artistContractDetailInfo.contractMode === "Cr" && artistContractDetailInfo.epiTabData === undefined ||
							artistContractDetailInfo.epiTabData.length === 0) {
							artistContractDetailInfo.epiTabData = [];
							oData.DmCeSet.results.map(function (obj) {
								obj.flag = "Cr";
							});
							artistContractDetailInfo.epiTabData = artistContractDetailInfo.epiTabData.concat(oData.DmCeSet.results);
						} else {
							var artistEpiData = artistContractDetailInfo.epiTabData;
							oData.DmCeSet.results.map(function (obj) {
								var flagNewEntry = true;
								obj.flag = "Cr";
								for (var oInd = 0; oInd < artistEpiData.length; oInd++) {
									var acEpiObj = artistEpiData[oInd];
									if (acEpiObj.Epiid === obj.Epiid && acEpiObj.Costcd === obj.Costcd && acEpiObj.Contver === obj.Contver) {
										flagNewEntry = false;
										break;
									}
								}
								if (flagNewEntry) {
									artistEpiData.push(obj);
								} else {
									if (artistEpiData[oInd].episodeSaveFlag) {
										obj.flag = "Ch";
									}
									artistEpiData[oInd] = obj;
								}
							});

						}

						artistContractModel.refresh(true);
						sap.ui.core.BusyIndicator.hide();
					}.bind(this),
					error: function (oError) {
						sap.ui.core.BusyIndicator.hide();
						console.log(oError);
					}
				});
			},
			createContractPayload: function () {
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				var oPayload = {
					"Tentid": "IBS",
					"Dmno": artistContractDetailInfo.Dmno,
					"Dmver": artistContractDetailInfo.Dmver,
					"Lifnr": artistContractDetailInfo.vendorKey,
					"Contdt": Formatter.formatDateValForBackend(new Date()),
					"Totcost": "0.0",
					"Tottaxamt": "0.0",
					"Cntnm": artistContractDetailInfo.Cntnm,
					"Chnlnm": artistContractDetailInfo.Chnlnm,
					"Contno": "",
					"Conttp": "02",
					"Contver": "",
					"Artp": artistContractDetailInfo.vendorRoleKey,
					"Artpnm": artistContractDetailInfo.vendorRoleName,
					"Dept": artistContractDetailInfo.createParams.Dept,
					"Prreq": artistContractDetailInfo.createParams.Prreq,
					"Depthd": artistContractDetailInfo.createParams.Depthd,
					"Grsescr": artistContractDetailInfo.createParams.Grsescr,
					"Iniquoamt": artistContractDetailInfo.Iniquoamt.toString(),
					"R1quoamt": artistContractDetailInfo.R1quoamt.toString(),
					"R2quoamt": artistContractDetailInfo.R2quoamt.toString(),
					"Finalquoamt": artistContractDetailInfo.Finalquoamt.toString(),
					"Skiprfpreason": artistContractDetailInfo.Skiprfpreason,
					"Retenaplty": artistContractDetailInfo.Retenaplty
				};
				return oPayload;

			},
			createEpiData: function () {
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				var epiTabData = artistContractDetailInfo.epiTabData;
				var alreadySavedflag = true;
				var oModel = this.getView().getModel();
				oModel.setUseBatch(true);
				oModel.setDeferredGroups(oModel.getDeferredGroups().concat(["epiACChanges"]));
				var mParameters = {
					groupId: "epiACChanges",
					success: function (odata, resp) {
						var oResponse = odata.__batchResponses[0];
						if (oResponse.__changeResponses && oResponse.__changeResponses.length) {
							//if(oResponse.__changeResponses[0].statusCode === "204"){
							var oContractResponse = oResponse.__changeResponses[0].data;
							artistContractModel.setProperty("/Contno", oContractResponse.Contno);
							artistContractModel.setProperty("/Contver", oContractResponse.Contver);
							artistContractModel.refresh(true);
							var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
							MessageToast.show(oSourceBundle.getText("msgArtistContractSave", artistContractDetailInfo.Contno));
							this.newContractCreated = true;
							var oRouter = this.getOwnerComponent().getRouter();
							oRouter.navTo("ArtistContract", {
								"Dmno": artistContractDetailInfo.Dmno,
								"Dmver": artistContractDetailInfo.Dmver,
								"Contno": artistContractDetailInfo.Contno,
								"Contver": artistContractDetailInfo.Contver
							});
							//	}
						} else {
							var oError = JSON.parse(oResponse.response.body);
							var oMsg = oError.error.innererror.errordetails[0].message;
							MessageBox.error(oMsg);
						}

						//			   			var oData = data.__batchResponses[0].__changeResponses;
						//			   			if(oData.length){
						//			   				//DmCoSet response 
						//			   				var oContractResponse = oData[0].data;
						//			   				artistContractModel.setProperty("/Contno",oContractResponse.Contno);
						//			   				artistContractModel.setProperty("/Contver",oContractResponse.Contver);
						//			   			}
						//			   			artistContractModel.refresh(true);
						//	    				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
						//	    				MessageToast.show(oSourceBundle.getText("epiACSave"));
						//	    				var oRouter = this.getOwnerComponent().getRouter();
						//	    	        	oRouter.navTo("ArtistContract",{
						//	    	  					"Dmno":artistContractDetailInfo.Dmno,
						//	    	  					"Dmver":artistContractDetailInfo.Dmver,
						//	    	  					"Contno":artistContractDetailInfo.Contno,
						//	    	  					"Contver":artistContractDetailInfo.Contver
						//	    	  				});	
						//	    				this.reloadArtistContractTabs();
						//	    				this.loadEpisodes();

					}.bind(this),
					error: function (oError) {

						var oMsg = oError.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				};
				if (epiTabData !== undefined && epiTabData.length) {
					var oPayLoad = this.createContractPayload();
					oModel.create("/DmCoSet", oPayLoad, {
						groupId: "epiACChanges"
					});

					epiTabData.map(function (epiObj) {
						if (epiObj.flag === "Cr") {
							alreadySavedflag = false;
							var payloadEpiObj = $.extend(true, {}, epiObj);
							payloadEpiObj.Coepiamt = payloadEpiObj.Coepiamt.toString();
							delete payloadEpiObj.flag;
							delete payloadEpiObj.Diff;
							delete payloadEpiObj.epiCostEditFlag;
							oModel.create("/DmCeSet", payloadEpiObj, {
								groupId: "epiACChanges"
							});
						}
					});
				}

				if (alreadySavedflag) {
					var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.information(oSourceBundle.getText("msgAlreadysave"));
				} else {
					oModel.submitChanges(mParameters);
				}

			},
			updateEpiData: function () {
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				var epiTabData = artistContractDetailInfo.epiTabData;
				var alreadySavedflag = true;
				var oModel = this.getView().getModel();
				oModel.setUseBatch(true);
				oModel.sDefaultUpdateMethod = "PUT";
				oModel.setDeferredGroups(oModel.getDeferredGroups().concat(["epiACUpdateChanges"]));
				var mParameters = {
					groupId: "epiACUpdateChanges",
					success: function (odata, resp) {
						var oResponse = odata.__batchResponses[0];
						if (oResponse.response && oResponse.response.statusCode === "400") {
							var oError = JSON.parse(oResponse.response.body);
							var oMsg = oError.error.innererror.errordetails[0].message;
							MessageBox.error(oMsg);
						} else {
							var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
							MessageToast.show(oSourceBundle.getText("msgArtistContractSave", artistContractDetailInfo.Contno));
							this.reloadArtistContractTabs();
							this.loadEpisodes();
						}

					}.bind(this),
					error: function (odata, resp) {
						console.log(resp);
					}
				};
				epiTabData.map(function (oEpiObj) {
					var epiObj = $.extend(true, {}, oEpiObj);
					epiObj.Coepiamt = epiObj.Coepiamt.toString();
					delete epiObj.Diff;
					delete epiObj.epiCostEditFlag;
					if (epiObj.flag === "Cr") {
						alreadySavedflag = false;
						delete epiObj.flag;
						oModel.create("/DmCeSet", epiObj, {
							groupId: "epiACUpdateChanges"
						});
					} else if (epiObj.flag === "Ch") {
						alreadySavedflag = false;
						delete epiObj.flag;
						epiObj.Coepiamt = epiObj.Coepiamt.toString();
						var oPath = "/DmCeSet(Tentid='IBS',Dmno='" + artistContractDetailInfo.Dmno + "',Dmver='" + artistContractDetailInfo.Dmver +
							"',Conttp='02',Contno='" + artistContractDetailInfo.Contno +
							"',Contver='" + artistContractDetailInfo.Contver + "',Epiid='" + epiObj.Epiid + "')";
						oModel.update(oPath, epiObj, {
							groupId: "epiACUpdateChanges"
						});
					}
				});
				if (alreadySavedflag) {
					var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.information(oSourceBundle.getText("msgAlreadysave"));
				} else {
					oModel.submitChanges(mParameters);
				}
			},
			createEpiTab: function () {
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				if (artistContractDetailInfo.contractMode === "Cr") {
					this.createEpiData();
				} else if (artistContractDetailInfo.contractMode === "Ch") {
					this.updateEpiData();
				}

			},
			onSaveArtistContract: function () {
				this.getView().byId("btnSaveAC").setEnabled(false);
				sap.ui.core.BusyIndicator.show(0);
				var oTab = this.getView().byId("idACTabBar").getSelectedKey();
				if (oTab === "acEpiData") {
					this.createEpiTab();
				} else if (oTab === "acPaymentData") {
					this.savePaymentTab();
				}
				sap.ui.core.BusyIndicator.hide();
			},
			reloadArtistContractTabs: function () {

				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				var oPath = "/DmCoSet(Tentid='IBS',Dmno='" + artistContractDetailInfo.Dmno + "',Dmver='" + artistContractDetailInfo.Dmver +
					"',Contno='" + artistContractDetailInfo.Contno + "',Contver='" + artistContractDetailInfo.Contver +
					"',Conttp='02')";
				var oModel = this.getView().getModel();
				oModel.read(oPath, {
					urlParameters: {
						"$expand": "DmCeSet,DmCmSet,DmCeBalAmtSet"
					},
					success: function (oData) {
						sap.ui.core.BusyIndicator.show(0);
						oData.DmCeSet.results.map(function (obj) {
							obj.Diff = (parseFloat(obj.Coepiamt) - (parseFloat(obj.Baseamt) + parseFloat(obj.Wmwst))).toFixed(2);
							obj.epiCostEditFlag = false;
							obj.episodeSaveFlag = true;
						});

						artistContractDetailInfo.epiTabData = oData.DmCeSet.results;
						artistContractDetailInfo.EpiDataColor = "Critical";
						artistContractDetailInfo.epiDeleteEnable = false;
						if (oData.DmCeSet.results.length) {
							artistContractDetailInfo.EpiDataColor = "Positive";
						}
						oData.retEpi = false;
						if (oData.Retenaplty == "01") {
							oData.retEpi = true;
						}
						oData.DmCeBalAmtSet.results.map(function (obj) {
							obj.episodeSaveFlag = true;
							//	obj.Diff = ((parseFloat(obj.Coepiamt) + parseFloat(obj.Wmwst)) - (obj.Baseamt)).toFixed(2);
						});
						artistContractDetailInfo.EpiNonCostCdDataColor = "Critical";
						artistContractDetailInfo.enableEpiNonCostCdTab = false;
						if (oData.DmCeBalAmtSet.results.length) {
							artistContractDetailInfo.EpiNonCostCdDataColor = "Positive";
							artistContractDetailInfo.enableEpiNonCostCdTab = true;
						}

						artistContractDetailInfo.epiNonCostCodeTabData = $.extend(true, [], oData.DmCeBalAmtSet.results);

						oData.DmCmSet.results.map(function (obj) {
							obj.episodeSaveFlag = true;
						});
						artistContractDetailInfo.acPaymentData = oData.DmCmSet.results;
						artistContractDetailInfo.paymentDataColor = "Critical";
						if (oData.DmCmSet.results.length) {
							artistContractDetailInfo.paymentDataColor = "Positive";
						}
						artistContractDetailInfo.vendorName = oData.Name1;
						artistContractDetailInfo.vendorKey = oData.Lifnr;
						artistContractDetailInfo.vendorRoleName = oData.Artpnm;
						artistContractDetailInfo.vendorRoleKey = oData.Artp;
						artistContractDetailInfo.ContDate = Formatter.formatDateVal(oData.Contdt),
							oData.Cntnm = artistContractDetailInfo.Cntnm;
						artistContractDetailInfo.saveVisible = true;
						if (oData.Contstat === "01" || oData.Contstat === "03"  || oData.Contstat === "10") { // added by dhiraj on 20/05/2022 for submit butn.
							artistContractModel.setProperty("/submitVisible", true);
						} else {
							artistContractModel.setProperty("/submitVisible", false);
						}
						if (artistContractDetailInfo.Contno !== "new") {
							artistContractModel.setProperty("/releaseTabVisible", true);
						} else {
							artistContractModel.setProperty("/releaseTabVisible", false);
						}
						if (oData.Contstat === "04") {
							artistContractModel.setProperty("/changeVisible", true);
						} else {
							artistContractModel.setProperty("/changeVisible", false);
						}
						artistContractDetailInfo.acTabEnable = true;
						if (artistContractDetailInfo.epiTabData.length === 0) {
							artistContractDetailInfo.acTabEnable = false;
						}
						artistContractModel.setProperty("/DmCoSet", oData);
						Object.assign(artistContractDetailInfo, oData);
						artistContractDetailInfo.attachmentTabColor = "Critical";

						artistContractDetailInfo.attachURL = oModel.sServiceUrl + "/AttachmentSet(Tentid='IBS',Dmno='',Dmver='',Contno='" + artistContractDetailInfo.Contno + "',Contver='" + artistContractDetailInfo.Contver +
							"',Instanceid='')/AttachmentMedSet";
						artistContractDetailInfo.fileTypeList = ["jpg", "doc", "xls", "pdf", "xlsx", "docx"];

						if (this.displayContractFlag) {

							this.displayContractFlag = false;
							if (!this.newContractCreated) {
								artistContractDetailInfo.saveVisible = false;
								this.getView().byId("btnEditAC").setVisible(Formatter.formatEditableContStatus(artistContractDetailInfo.Contstat));
							}
						}
						artistContractModel.refresh(true);
						this.calculateEpisode();
						this.loadAttachments();
						this.getView().byId("idSubIconTabBarac").setSelectedKey("acSubEpiDataNoCostCd");
						sap.ui.core.BusyIndicator.hide();
					}.bind(this),
					error: function (oError) {
						sap.ui.core.BusyIndicator.hide();
					}
				})
			},
			onSeletEpiTbl: function () {
				var artistContractModel = this.getView().getModel("artistContractModel");
				var oContexts = this.byId(sap.ui.core.Fragment.createId("acEpiTab", "oTbl_acepiData")).getSelectedContexts();
				if (oContexts.length) {
					artistContractModel.setProperty("/epiDeleteEnable", true);
				} else {
					artistContractModel.setProperty("/epiDeleteEnable", false);
				}
				artistContractModel.refresh(true);
			},
			onDeleteEpi: function () {
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				MessageBox.confirm(oSourceBundle.getText("msgdeleteConfirmContractEpi" + artistContractDetailInfo.Cnttp), {
					actions: [oSourceBundle.getText("lblYes"), oSourceBundle.getText("lblNo")],
					emphasizedAction: "Yes",
					onClose: function (sAction) {
						if (sAction === oSourceBundle.getText("lblYes")) {
							this.deleteEpiData();
						} else if (sAction === oSourceBundle.getText("lblNo")) {

						}
					}.bind(this)
				});
			},
			deleteEpiData: function () {
				sap.ui.core.BusyIndicator.show(0);
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				var oTable = this.byId(sap.ui.core.Fragment.createId("acEpiTab", "oTbl_acepiData"));
				var oContexts = oTable.getSelectedContexts();
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				var oModel = this.getView().getModel();
				oModel.setUseBatch(true);
				oModel.setDeferredGroups(oModel.getDeferredGroups().concat(["epiACDeleteChanges"]));
				var mParameters = {
					groupId: "epiACDeleteChanges",
					success: function (data, resp) {
						sap.ui.core.BusyIndicator.hide();
						oTable.removeSelections();
						MessageToast.show(oSourceBundle.getText("msgSuccEpiDeleteSave" + artistContractDetailInfo.Cnttp));
						this.reloadArtistContractTabs();
						//jQuery.sap.intervalCall(500, this, "reloadArtistContractTabs", [this]);

					}.bind(this),
					error: function (odata, resp) {
						sap.ui.core.BusyIndicator.hide();
						console.log(resp);
					}
				};

				oContexts.map(function (oContext) {
					var oEpiObj = oContext.getObject()
					var oPath = "/DmCeSet(Tentid='IBS',Dmno='" + artistContractDetailInfo.Dmno + "',Dmver='" + artistContractDetailInfo.Dmver +
						"',Conttp='02',Contno='" + artistContractDetailInfo.Contno + "',Contver='" + artistContractDetailInfo.Contver + "',Epiid='" +
						oEpiObj.Epiid + "')";
					oModel.remove(oPath, {
						groupId: "epiACDeleteChanges"
					});

				}.bind(this));

				oModel.submitChanges(mParameters);

			},

			//Payment Tab

			onEnterPayment: function () {
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				artistContractDetailInfo.epiPaymentFromId = "";
				artistContractDetailInfo.epiPaymentToId = "";
				artistContractModel.setProperty("/episodeRangeVisiblePayment", false);
				artistContractModel.setProperty("/episodeModePayment", 0);
				artistContractModel.setProperty("/mileStonesForEpi", []);
				artistContractModel.setProperty("/selContextsData", []);
				artistContractDetailInfo.acPaymentDataMsgVisible = false;
				artistContractDetailInfo.acPaymentDataErrorMsg = "";
				artistContractDetailInfo.pushBtnEnable = false;
				artistContractDetailInfo.colPercAmntLabel = "Amount";
				artistContractDetailInfo.payee = artistContractDetailInfo.vendorName;
				artistContractDetailInfo.payeeKey = artistContractDetailInfo.vendorKey;
				artistContractDetailInfo.ZtermKey = artistContractDetailInfo.Zterm;
				if (artistContractDetailInfo.payTermList.find(tt => tt.Zterm === artistContractDetailInfo.Zterm) != undefined ) {
				artistContractDetailInfo.ZtermT = artistContractDetailInfo.Zterm != "" ? artistContractDetailInfo.payTermList.find(tt => tt.Zterm === artistContractDetailInfo.Zterm).ZtermT : "";
				} else {
					artistContractDetailInfo.ZtermKey = "";
				}
				artistContractDetailInfo.Hsncode = ""
				artistContractDetailInfo.payEnable = true;
				artistContractDetailInfo.termEnable = true;

				var DmCmSetData = artistContractDetailInfo.DmCoSet.DmCmSet.results;
				if (DmCmSetData.length > 0) {
					artistContractDetailInfo.ZtermKey = DmCmSetData[0].Zterm;
					artistContractDetailInfo.ZtermT = DmCmSetData[0].Ztermt;
					artistContractDetailInfo.payee = DmCmSetData[0].Empfk != "" ? artistContractDetailInfo.vendorsList.find(t => t.Lifnr == DmCmSetData[0].Empfk).Mcod1 : "";
					artistContractDetailInfo.payeeKey = DmCmSetData[0].Empfk;
					artistContractDetailInfo.Hsncode = DmCmSetData[0].Hsncd
					// if (parseInt(artistContractDetailInfo.Contver) > 1) {
					// 	if(artistContractDetailInfo.payeeKey !=  "") {
					// 		artistContractDetailInfo.payEnable = false;
					// 		}
					// 		if(artistContractDetailInfo.ZtermKey !=  "") {
					// 		artistContractDetailInfo.termEnable = false;
					// 		}
					// }
				}

				var DmCmSetEpIds = DmCmSetData.map(function (dmcmobj) {
					return dmcmobj.Epiid;
				});
				var epIds = [];
				var distEpisodes = [];
				artistContractDetailInfo.epiTabData.map(function (obj) {
					if (epIds.indexOf(obj.Epiid) === -1) {

						epIds.push(obj.Epiid);
						distEpisodes.push(obj);

					}
				});
				artistContractModel.setProperty("/epPaymentList", distEpisodes);
				artistContractModel.refresh(true);

				if (!this._oSelectPaymentDialogAC) {
					Fragment.load({
						id: this.createId("acPaymentDialog"),
						name: "com.ui.dealmemolocal.fragments.SelectPaymentACDialog",
						controller: this
					}).then(function name(oFragment) {
						this._oSelectPaymentDialogAC = oFragment; //sap.ui.xmlfragment("com.ui.dealmemolocal.fragments.SelectPaymentDialog", this);
						this.getView().addDependent(this._oSelectPaymentDialogAC);
						this.byId(sap.ui.core.Fragment.createId("acPaymentDialog", "list_mlListAC")).removeSelections();
						this.byId(sap.ui.core.Fragment.createId("acPaymentDialog", "list_mlListAC")).getBinding("items").filter([]);
						this.byId(sap.ui.core.Fragment.createId("acPaymentDialog", "searchFieldMaster")).setValue("")
						this.byId(sap.ui.core.Fragment.createId("acPaymentDialog", "rbAmntTypeAC")).setSelectedIndex(1);
						this.byId(sap.ui.core.Fragment.createId("acPaymentDialog", "rbAmtPerc")).setEditable(artistContractDetailInfo.Contver == 1);
						this._oSelectPaymentDialogAC.open();
					}.bind(this));

				} else {
					this.byId(sap.ui.core.Fragment.createId("acPaymentDialog", "list_mlListAC")).removeSelections();
					this.byId(sap.ui.core.Fragment.createId("acPaymentDialog", "list_mlListAC")).getBinding("items").filter([]);
					this.byId(sap.ui.core.Fragment.createId("acPaymentDialog", "searchFieldMaster")).setValue("")
					this.byId(sap.ui.core.Fragment.createId("acPaymentDialog", "rbAmntTypeAC")).setSelectedIndex(1);
					this.byId(sap.ui.core.Fragment.createId("acPaymentDialog", "rbAmtPerc")).setEditable(artistContractDetailInfo.Contver == 1);
					this._oSelectPaymentDialogAC.open();
				}
			},
			handleSearch: function (oEvent) {
				var srchValue = oEvent.getSource().getValue();
				var modelBind = this.byId(sap.ui.core.Fragment.createId("acPaymentDialog", "list_mlListAC"));
				var multipleFilter =
					new sap.ui.model.Filter([
						new sap.ui.model.Filter("Mstcd", sap.ui.model.FilterOperator.Contains, srchValue),
						new sap.ui.model.Filter("Mstcdnm", sap.ui.model.FilterOperator.Contains, srchValue)
					],
						false);
				var binding = modelBind.getBinding("items");
				binding.filter([multipleFilter]);
			},
			onSelectAmntType: function (oEvent) {
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				if (oEvent.getSource().getSelectedIndex() === 0) {
					artistContractDetailInfo.colPercAmntLabel = "Percentage";
				} else if (oEvent.getSource().getSelectedIndex() === 1) {
					artistContractDetailInfo.colPercAmntLabel = "Amount";
				}
				artistContractModel.refresh(true);
			},
			onSelectEpisodeModePayment: function () {
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				artistContractDetailInfo.mileStonesForEpi = [];
				artistContractDetailInfo.episodeRangeVisiblePayment = false;
				if (artistContractDetailInfo.episodeModePayment === 1) {
					artistContractDetailInfo.episodeRangeVisiblePayment = true;
				}
				artistContractModel.refresh(true);
			},
			termPayeeCheck: function () {
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				var statusFlag = true;
				var oMsg = "";
				if (artistContractDetailInfo.ZtermKey == "" || artistContractDetailInfo.ZtermKey == undefined || artistContractDetailInfo.ZtermT == "" || artistContractDetailInfo.ZtermT == undefined) {
					statusFlag = false;
					oMsg = "msgEnterPayee";
				} else if (artistContractDetailInfo.payeeKey == "" || artistContractDetailInfo.payeeKey == undefined || artistContractDetailInfo.payee == "" || artistContractDetailInfo.payee == undefined) {
					statusFlag = false;
					oMsg = "msgEnterAltPayee";
				}
				if (oMsg !== "") {
					var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
					//				MessageBox.error(oSourceBundle.getText(oMsg));
					artistContractDetailInfo.acPaymentDataMsgVisible = true;
					artistContractDetailInfo.acPaymentDataErrorMsg = oSourceBundle.getText(oMsg);
					artistContractModel.refresh(true);
				} else {
					artistContractDetailInfo.vcPaymentDataMsgVisible = false;
					artistContractDetailInfo.vcPaymentDataErrorMsg = "";
					artistContractModel.refresh(true);
				}
				return statusFlag;
			},
			onMileStoneSelectionToDetail: function () {
				var validFlag = this.termPayeeCheck()
				if (validFlag) {
					var artistContractModel = this.getView().getModel("artistContractModel");
					var artistContractDetailInfo = artistContractModel.getData();

					artistContractDetailInfo.mileStonesForEpi = [];
					var oMLList = this.byId(sap.ui.core.Fragment.createId("acPaymentDialog", "list_mlListAC"));
					oMLList.getBinding("items").filter([]);
					var selectedMLCntxts = oMLList.getSelectedContexts();
					selectedMLCntxts.map(function (oCntext, i) {

						var oMLObj = oCntext.getObject();
						artistContractDetailInfo.mileStonesForEpi.push({
							"Mstcd": oMLObj.Mstcd,
							"Mstcdnm": oMLObj.Mstcdnm,
							"payee": artistContractDetailInfo.payee,
							"payeeKey": artistContractDetailInfo.payeeKey,
							"Zterm": artistContractDetailInfo.ZtermKey,
							"Dueamt": "0",
							"estDate": null,
							"Retepi": false,
							"Hsncd": artistContractDetailInfo.Hsncode,
							"retMileEnable": false

						});
						if (artistContractDetailInfo.Retenaplty == "02") {
							artistContractDetailInfo.mileStonesForEpi[i].retMileEnable = true;
						}
						if (artistContractDetailInfo.DmCoSet.DmCmSet.results.length > 0) {
							var payList = artistContractDetailInfo.DmCoSet.DmCmSet.results;
							if (payList.find(t => t.Msid == oMLObj.Mstcd) != undefined) {
								artistContractDetailInfo.mileStonesForEpi[i].Hsncd = payList.find(t => t.Msid == oMLObj.Mstcd).Hsncd;
							}
						}

					});
					if (selectedMLCntxts.length) {
						artistContractDetailInfo.pushBtnEnable = true;
					}
					//oMLList.removeSelections();
					artistContractModel.refresh(true);
				}
			},
			onCancelPayment: function () {
				this._oSelectPaymentDialogAC.close();
			},
			onValueHelpPayterm: function (oEvent) {
				// var oPath = oEvent.getSource().getBindingContext("artistContractModel").sPath;

				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				this.oValueHelpSelectionParams = {
					"bindPathName": "artistContractModel>/payTermList",
					"bindPropName": "artistContractModel>ZtermT",
					"bindPropDescName": "artistContractModel>Zterm",
					"propName": "ZtermT",
					"keyName": "Zterm",
					"valuePath": "/ZtermT",
					"keyPath": "/ZtermKey",
					"valueModel": "artistContractModel",
					"dialogTitle": oSourceBundle.getText("titlePayTerm")
				};
				this.openSelectionDialog();
			},

			onValueHelpAlternatePayee: function (oEvent) {
				// var oPath = oEvent.getSource().getBindingContext("artistContractModel").sPath;

				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				this.oValueHelpSelectionParams = {
					"bindPathName": "artistContractModel>/vendorsList",
					"bindPropName": "artistContractModel>Mcod1",
					"bindPropDescName": "artistContractModel>Lifnr",
					"propName": "Mcod1",
					"keyName": "Lifnr",
					"valuePath": "/payee",
					"keyPath": "/payeeKey",
					"valueModel": "artistContractModel",
					"dialogTitle": oSourceBundle.getText("lblAltPayee")
				};
				this.openSelectionDialog();
			},

			preparePaymentpayload: function () {
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				var selectedEpisodeList = [];
				var oselIndex = artistContractDetailInfo.episodeModePayment;
				var paymentPayloadArr = [];
				if (oselIndex == 0) {
					selectedEpisodeList = artistContractDetailInfo.epPaymentList;
				} else {
					selectedEpisodeList = [];
					artistContractDetailInfo.epPaymentList.map(function (epACObj) {
						if (epACObj.Epiid >= artistContractDetailInfo.epiPaymentFromId && epACObj.Epiid <= artistContractDetailInfo.epiPaymentToId) {
							selectedEpisodeList.push(epACObj);
						}

					});
				}

				selectedEpisodeList.map(function (selEpObj) {
					paymentPayloadArr.push({
						Contno: artistContractDetailInfo.Contno,
						Conttp: "02",
						Contver: artistContractDetailInfo.Contver,
						Dmno: artistContractDetailInfo.Dmno,
						Dmver: artistContractDetailInfo.Dmver,
						Dueamt: "00.0",
						Empfk: "",
						Epiid: selEpObj.Epiid,
						Invdocno: "",
						Invdocyr: "",
						Mscompdt: null,
						Msid: "",
						Prodocno: "",
						Provdocyr: "",
						Tentid: "IBS",
						Updkz: "I",
						Zterm: "",
						Retepi: "",
						Hsncd: ""
					});
				}.bind(this));
				if (artistContractDetailInfo.acPaymentData.length > 0) {
					artistContractDetailInfo.acPaymentData.map(function (selEpObj) {
						paymentPayloadArr.push({
							Amtper: selEpObj.Amtper,
							Tentid: selEpObj.Tentid,
							Dmno: selEpObj.Dmno,
							Dmver: selEpObj.Dmver,
							Contno: selEpObj.Contno,
							Conttp: selEpObj.Conttp,
							Contver: selEpObj.Contver,
							Costperamt: selEpObj.Costperamt,
							Dueamt: selEpObj.Dueamt,
							Epiid: selEpObj.Epiid, //Episode ID
							Epinm: selEpObj.Epinm,
							Msid: selEpObj.Msid,
							Empfk: selEpObj.Empfk,
							Zterm: selEpObj.Zterm,
							Ztermt: selEpObj.Ztermt,
							Mestdt: selEpObj.Mestdt,
							Msidnm: selEpObj.Msidnm,
							Mscompdt: selEpObj.Mscompdt !== null ? Formatter.formatDateValForBackend(new Date(selEpObj.Mscompdt)) : null,
							Prodocno: selEpObj.Prodocno,
							Provdocyr: selEpObj.Provdocyr,
							Invdocno: selEpObj.Invdocno,
							Invdocyr: selEpObj.Invdocyr,
							Updkz: "U",
							Seqnr: selEpObj.Seqnr,
							Retepi: selEpObj.Retepi,
							Hsncd: selEpObj.Hsncd
						});
					}.bind(this));
				}
				return paymentPayloadArr;
			},

			prepareMileStonePayload: function () {
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				var milestones = artistContractDetailInfo.mileStonesForEpi;
				var mileStonePayload = [];
				var oAmtType = this.byId(sap.ui.core.Fragment.createId("acPaymentDialog", "rbAmntTypeAC")).getSelectedIndex();
				milestones.map(function (mlObj) {

					mileStonePayload.push({
						Amtper: oAmtType === 0 ? mlObj.Dueamt : "0.00",
						Contno: artistContractDetailInfo.Contno,
						Conttp: "02",
						Contver: artistContractDetailInfo.Contver,
						Costperamt: oAmtType === 1 ? "A" : "P",
						Dmno: artistContractDetailInfo.Dmno,
						Dmver: artistContractDetailInfo.Dmver,
						Dueamt: oAmtType === 1 ? mlObj.Dueamt : "0.00",
						Empfk: artistContractDetailInfo.payeeKey,
						Mestdt: Formatter.formatDateValForBackend(mlObj.estDate),
						Msid: mlObj.Mstcd,
						Msidnm: mlObj.Mstcdnm,
						Tentid: "IBS",
						Zterm: artistContractDetailInfo.ZtermKey,
						Ztermt: artistContractDetailInfo.ZtermT,
						Retepi: mlObj.Retepi == true ? "X" : "",
						Hsncd: mlObj.Hsncd
					});
				}.bind(this));
				return mileStonePayload;
			},

			validateMileStoneData: function () {
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				var milestones = artistContractDetailInfo.mileStonesForEpi;
				var oAmtType = this.byId(sap.ui.core.Fragment.createId("acPaymentDialog", "rbAmntTypeAC")).getSelectedIndex();
				var oselIndex = artistContractDetailInfo.episodeModePayment;
				var mileStonePayload = [];
				var statusFlag = true;
				var oMsg = "";
				var totPerc = 0;
				if (oselIndex == 1) {
					if (artistContractDetailInfo.epiPaymentFromId === "" || artistContractDetailInfo.epiPaymentFromId === undefined ||
						artistContractDetailInfo.epiPaymentToId === "" || artistContractDetailInfo.epiPaymentToId === undefined) {
						//MessageBox.error(oSourceBundle.getText("msgSelectEpisode"));
						statusFlag = false;
						oMsg = "msgSelectEpisode" + artistContractDetailInfo.Cnttp;
					}
				}
				if (statusFlag) {

					for (var oIndex = 0; oIndex < milestones.length; oIndex++) {
						var mlObj = milestones[oIndex];
						var ZtermKey = milestones[0].Zterm;
						if (mlObj.Zterm === "") {
							statusFlag = false;
							oMsg = "msgEnterPayee";
							break;
						} else if (mlObj.Dueamt === "" || mlObj.Dueamt === "0") {
							statusFlag = false;
							if (oAmtType === 0) {
								oMsg = "msgPercentangeNonzero";
							} else {
								oMsg = "msgAmountNonzero";
							}
							break;
						} else if (mlObj.estDate === "" || mlObj.estDate === null) {
							statusFlag = false;
							oMsg = "msgEnterEstDate";
							break;
						} else {
							totPerc += parseInt(mlObj.Dueamt);
						}
					}
					if (statusFlag) {
						if (totPerc !== 100 && oAmtType === 0) {
							statusFlag = false;
							oMsg = "msgtotPerc100";
						}
					}
					if (statusFlag) {
						if (mlObj.Zterm != ZtermKey) {
							statusFlag = false;
							oMsg = "msgTermNotSame";
						}
					}
				}
				if (oMsg !== "") {
					var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
					//MessageBox.error(oSourceBundle.getText(oMsg));
					artistContractDetailInfo.acPaymentDataMsgVisible = true;
					artistContractDetailInfo.acPaymentDataErrorMsg = oSourceBundle.getText(oMsg);
					artistContractModel.refresh(true);
				}
				return statusFlag;
			},
			processMilestoneData: function () {
				sap.ui.core.BusyIndicator.show(0);
				var artistContractModel = this.getView().getModel("artistContractModel");
				var artistContractDetailInfo = artistContractModel.getData();
				var oPayLoad = {};
				var epiTabData = $.extend(true, [], artistContractDetailInfo.epiTabData);
				epiTabData.map(function (epitabObj) {
					delete epitabObj.flag;
					delete epitabObj.Diff;
					delete epitabObj.epiCostEditFlag;
					delete epitabObj.episodeSaveFlag;
				});
				oPayLoad.DmCeSet = epiTabData;
				oPayLoad.DmCmSet = this.preparePaymentpayload();
				oPayLoad.DmMilestoneSet = this.prepareMileStonePayload();
				oPayLoad.Tentid = "IBS";
				oPayLoad.Dmno = artistContractDetailInfo.Dmno;
				oPayLoad.Dmver = artistContractDetailInfo.Dmver;
				oPayLoad.Contno = artistContractDetailInfo.Contno;
				oPayLoad.Conttp = "02";

				var oModel = this.getView().getModel();
				oModel.setUseBatch(false);
				oModel.create("/DmCoSet", oPayLoad, {
					success: function (oData) {
						sap.ui.core.BusyIndicator.hide();
						if (artistContractDetailInfo.acPaymentData === undefined || artistContractDetailInfo.acPaymentData.length === 0) {
							artistContractDetailInfo.acPaymentData = [];
							oData.DmCmSet.results.map(function (obj) {
								obj.flag = "Cr";
							});
							artistContractDetailInfo.acPaymentData = artistContractDetailInfo.acPaymentData.concat(oData.DmCmSet.results);
						} else {

							oData.DmCmSet.results.map(function (obj) {
								var flagNewEntry = true;
								obj.flag = "Cr";
								for (var oInd = 0; oInd < artistContractDetailInfo.acPaymentData.length; oInd++) {
									var vcEpiObj = artistContractDetailInfo.acPaymentData[oInd];
									if (vcEpiObj.Epiid === obj.Epiid && vcEpiObj.Msid === obj.Msid && vcEpiObj.Contver === obj.Contver ) {
										if (obj.Updkz == "I" ) {
											obj.flag = "Ch";
											obj.Updkz = "U";
											break;
										} 
										// else {
										// 	break;
										// }
										flagNewEntry = false;
										break;
									}
								}
								if (flagNewEntry) {
									artistContractDetailInfo.acPaymentData.push(obj);
								} else {
									if (artistContractDetailInfo.acPaymentData[oInd].episodeSaveFlag) {
										obj.flag = "Ch";
										obj.Updkz = "U";
									}
									artistContractDetailInfo.acPaymentData[oInd] = obj;
								}
							});

						}
						artistContractModel.refresh(true);
						this._oSelectPaymentDialogAC.close();
					}.bind(this),

					error: function (oError) {
						sap.ui.core.BusyIndicator.hide();
						var oBody = JSON.parse(oError.responseText);
						var oMsg = oBody.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);

					}
				});
			},
		onPushPayment: function () {
			var artistContractModel = this.getView().getModel("artistContractModel");
			var artistContractDetailInfo = artistContractModel.getData();
			var validateBeforePush = this.validateMileStoneData();
			var validationResponse = this.validateMilestoneAchievementDate();
			validationResponse.warningMessage = false; // As sugested by sourabh
			if (validationResponse.warningMessage) {
				if (validationResponse.allowedEpisodes.length == 0) {
					MessageBox.error("Milestone has already been achieved, no changes can be made.");
					return;
				}
				MessageBox.warning("Milestone has been achieved for some episodes. Do you want to make changes to other episodes?", {
					actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
					emphasizedAction: MessageBox.Action.OK,
					onClose: function (sAction) {
						switch (sAction) {
							case MessageBox.Action.OK:
								if (validateBeforePush) {
									this.processMilestoneData();
								}
								break;
							case MessageBox.Action.CANCEL:
								break;
							default:
								break;
						}
					}.bind(this)
				});
			} else {
				if (validateBeforePush) {
					this.processMilestoneData();
				}
			}
		},

		savePaymentTab: function () {
			sap.ui.core.BusyIndicator.show(0);
			var artistContractModel = this.getView().getModel("artistContractModel");
			var artistContractDetailInfo = artistContractModel.getData();
			var epiPaymentabData = artistContractDetailInfo.acPaymentData;
			var alreadySavedflag = true;
			var oModel = this.getView().getModel();
			oModel.setUseBatch(true);
			oModel.sDefaultUpdateMethod = "PUT";
			oModel.setDeferredGroups(oModel.getDeferredGroups().concat(["epiPaymentACChanges"]));
			var mParameters = {
				groupId: "epiPaymentACChanges",
				success: function (data, resp) {
					sap.ui.core.BusyIndicator.hide();
					var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageToast.show(oSourceBundle.getText("msgArtistContractSave", artistContractDetailInfo.Contno));
					this.reloadArtistContractTabs();

				}.bind(this),
				error: function (odata, resp) {
					sap.ui.core.BusyIndicator.hide();
					console.log(resp);
				}

			};

			epiPaymentabData.map(function (oEpiPaymentObj) {
				var epiPaymentObj = $.extend(true, {}, oEpiPaymentObj);
				if (epiPaymentObj.flag === "Cr") {
					alreadySavedflag = false;
					delete epiPaymentObj.flag;
					if (epiPaymentObj.Seqnr == "000") {
						oModel.create("/DmCmSet", epiPaymentObj, {
							groupId: "epiPaymentACChanges"
						});
					} else {
						var oPath = "/DmCmSet(Tentid='IBS',Dmno='" + artistContractDetailInfo.Dmno + "',Dmver='" + artistContractDetailInfo.Dmver +
							"',Conttp='02',Contno='" + artistContractDetailInfo.Contno + "',Contver='" + artistContractDetailInfo.Contver + "',Epiid='" +
							epiPaymentObj.Epiid + "',Seqnr='" + epiPaymentObj.Seqnr +
							"',Msid='";

						oModel.update(oPath, epiPaymentObj, {
							groupId: "epiPaymentACChanges"
						});

					}
				} else if (epiPaymentObj.flag === "Ch") {
					alreadySavedflag = false;
					delete epiPaymentObj.flag;
					var oPath = "/DmCmSet(Tentid='IBS',Dmno='" + artistContractDetailInfo.Dmno + "',Dmver='" + artistContractDetailInfo.Dmver +
						"',Conttp='02',Contno='" + artistContractDetailInfo.Contno + "',Contver='" + artistContractDetailInfo.Contver + "',Epiid='" +
						epiPaymentObj.Epiid + "',Seqnr='" + epiPaymentObj.Seqnr +
						"',Msid='" + epiPaymentObj.Msid + "')";

					oModel.update(oPath, epiPaymentObj, {
						groupId: "epiPaymentACChanges"
					});
				}
			}.bind(this));
			if (alreadySavedflag) {
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				MessageBox.information(oSourceBundle.getText("msgAlreadysave"));
			} else {
				oModel.submitChanges(mParameters);
			}
			sap.ui.core.BusyIndicator.hide();
		},
		//--------delete--episode--from--contracts------//
		onDeleteEpisodeDialog: function(episodeData,paramList) {
			var artistContractModel = this.getView().getModel("artistContractModel");
			var artistContractDetailInfo = artistContractModel.getData();
			artistContractModel.setProperty("/episodeRangeVisibleDelivery", false);
			artistContractModel.setProperty("/episodeModeDelivery", 0);
			artistContractModel.setProperty("/epiDelFromId", "");
			artistContractModel.setProperty("/epiDelToId", "");
			artistContractModel.setProperty("/paramKey", "");
			// var dmedSetData = episodeData;
			
			artistContractDetailInfo.SetDataEpi = $.extend(true, [], episodeData);
			artistContractDetailInfo.paramList = paramList;
			artistContractModel.refresh(true);
			if (!this._oEpiDeleteDialog) {
				Fragment.load({
					id: this.createId("deleteEpiDialog"),
					name: "com.ui.dealmemolocal.fragments.AcEpisodeDeleteDialog",
					controller: this
				}).then(function name(oFragment) {
					this._oEpiDeleteDialog = oFragment; //sap.ui.xmlfragment("com.ui.dealmemolocal.fragments.SelectPaymentDialog", this);
					this.getView().addDependent(this._oEpiDeleteDialog);
					this._oEpiDeleteDialog.open();
				}.bind(this));

			} else {
				this._oEpiDeleteDialog.open();
			}
		},
		onCancelEpisodeSelectionDelete: function() {
			this._oEpiDeleteDialog.close();
		},
		onSelectEpisodeModeDelivery: function (oEvent) {
			var oselIndex = oEvent.getSource().getSelectedIndex();
			var artistContractModel = this.getView().getModel("artistContractModel");
			var artistContractDetailInfo = artistContractModel.getData();
			if (oselIndex == 0) {
				artistContractDetailInfo.episodeRangeVisibleDelivery = false;
			} else {
				artistContractDetailInfo.episodeRangeVisibleDelivery = true;

			}
			artistContractModel.refresh(true);
		},
		
		checkDlete: function(selectedEpisodeList) {
				
			var check = true;
			var artistContractModel = this.getView().getModel("artistContractModel");
			var artistContractDetailInfo = artistContractModel.getData();
			var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
			if (artistContractDetailInfo.episodeModeDelivery === 1) {
				if (artistContractDetailInfo.epiDelFromId === "" || artistContractDetailInfo.epiDelToId === "") {
					var Msg = oSourceBundle.getText("msgSelectEpisode" + artistContractDetailInfo.Cnttp);
					check = false
				}
			} else if (artistContractDetailInfo.paramKey == "" ) {
			
				var Msg = "Select one  Milestone"
			
				check = false
			}
			if (!check) {
			MessageBox.error(Msg)
			}
			return check;
		},
		confirmToDelete: function() {
			var artistContractModel = this.getView().getModel("artistContractModel");
			var artistContractDetailInfo = artistContractModel.getData();
			var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
			var oselIndex = artistContractDetailInfo.episodeModeDelivery;
			var selectedEpisodeList = [];
			if (oselIndex == 0) {
				selectedEpisodeList = artistContractDetailInfo.SetDataEpi;
			} else {
				selectedEpisodeList = [];
				artistContractDetailInfo.SetDataEpi.map(function(epVCObj) {
					if (epVCObj.Epiid >= artistContractDetailInfo.epiDelFromId && epVCObj.Epiid <= artistContractDetailInfo.epiDelToId) {
						selectedEpisodeList.push(epVCObj);
					}
				});
			}
			if (selectedEpisodeList.length > 0) {
				if(this.checkDlete()) {
					this._oEpiDeleteDialog.close();
					MessageBox.confirm(oSourceBundle.getText("msgdeleteEpiConfirm" + artistContractDetailInfo.Cnttp), {
						actions: [oSourceBundle.getText("lblYes"), oSourceBundle.getText("lblNo")],
						emphasizedAction: "Yes",
						onClose: function(sAction) {
							if (sAction === oSourceBundle.getText("lblYes")) {
								
									this.onDeleteMileViaDialog(selectedEpisodeList);
								
								
							} else if (sAction === oSourceBundle.getText("lblNo")) {

							}
						}.bind(this)
					});
				}
			} else {
				this._oEpiDeleteDialog.close();
				MessageBox.error(oSourceBundle.getText("msgSelectAtleastOneEpi" + artistContractDetailInfo.Cnttp));
			}
		},
		deleteEpisodeData: function () {
			var artistContractModel = this.getView().getModel("artistContractModel");
			var artistContractDetailInfo = artistContractModel.getData();
			var epIds = [];
				var distEpisodes = [];
				artistContractDetailInfo.epiTabData.map(function (obj) {
					if (epIds.indexOf(obj.Epiid) === -1) {
						epIds.push(obj.Epiid);
						distEpisodes.push(obj);
					}
				});
				artistContractDetailInfo.paramName = "Select Milestone"
					this.onDeleteEpisodeDialog(distEpisodes,artistContractDetailInfo.mileStoneList);
		},
		onDeleteMileViaDialog: function (selectedEpisodeList) {
			sap.ui.core.BusyIndicator.show(0);
			var artistContractModel = this.getView().getModel("artistContractModel");
			var artistContractDetailInfo = artistContractModel.getData();
			var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
			var oModel = this.getView().getModel();
			oModel.setUseBatch(true);
			oModel.setDeferredGroups(oModel.getDeferredGroups().concat(["epiMileVCDeleteChanges"]));
			var mParameters = {
				groupId: "epiMileVCDeleteChanges",
				success: function (data, resp) {
					if (data.__batchResponses.length > 0) {
						sap.ui.core.BusyIndicator.hide();
						if (data.__batchResponses[0].response != undefined) {
							if (data.__batchResponses[0].response.statusCode == "400") {
								var oErrorResponse = JSON.parse(data.__batchResponses[0].response.body);
								var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
								if (oMsg.includes("")) {
									MessageBox.error(oMsg);
									this.reloadArtistContractTabs();
								}
							}
						} else {
							sap.ui.core.BusyIndicator.hide();
							MessageToast.show(oSourceBundle.getText("msgSuccEpiDeleteSave" + artistContractDetailInfo.Cnttp));
							this.reloadArtistContractTabs();
						}
					}
				}.bind(this),
				error: function (oError) {
					sap.ui.core.BusyIndicator.hide();
					var oErrorResponse = JSON.parse(oError.responseText);
					var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
					MessageBox.error(oMsg);
				}
			};

			selectedEpisodeList.map(function (oCntxt) {
				
				var oPath = "/DmCmSet(Tentid='IBS',Dmno='" + artistContractDetailInfo.Dmno + "',Dmver='" + artistContractDetailInfo.Dmver +
					"',Conttp='02',Contno='" + artistContractDetailInfo.Contno + "',Contver='" + artistContractDetailInfo.Contver +
					"',Epiid='" + oCntxt.Epiid + "',Msid='" + artistContractDetailInfo.paramKey + "',Seqnr='000')";
				oModel.remove(oPath, {
					groupId: "epiMileVCDeleteChanges"
				});
			}.bind(this));

			oModel.submitChanges(mParameters);
			sap.ui.core.BusyIndicator.hide();
		},
		//--------delete--episode--from--contracts------//
		onEditArtistContract: function () {
			var artistContractModel = this.getView().getModel("artistContractModel");
			var artistContractDetailInfo = artistContractModel.getData();
			artistContractDetailInfo.saveVisible = true;
			this.getView().byId("btnEditAC").setVisible(false);
			artistContractModel.refresh(true);
		},
		onEpisodeCostChange: function (oEvent) {
			var oEpiObj = oEvent.getSource().getBindingContext("artistContractModel").getObject();
			if (oEpiObj.flag !== "Cr" || oEpiObj.flag === undefined || oEpiObj.flag === "") {
				oEpiObj.flag = "Ch";
			};
			this.getView().getModel("artistContractModel").refresh(true);
		},
		onSearchSelection: function (oEvent) {
			var sValue = oEvent.getParameter("value");
			var oFilter =
				new Filter([
					new Filter(this.oValueHelpSelectionParams.propName, FilterOperator.Contains, sValue),
					new Filter(this.oValueHelpSelectionParams.keyName, FilterOperator.Contains, sValue)
				], false);

			var oBinding = oEvent.getParameter("itemsBinding");
			oBinding.filter([oFilter]);
		},
		onConfirmChangeAC: function () {
			var oModel = this.getView().getModel();
			var artistContractModel = this.getView().getModel("artistContractModel");
			var artistContractDetailInfo = artistContractModel.getData();

			var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
			MessageBox.confirm(oSourceBundle.getText("msgcreateNewVersion"), {
				actions: [oSourceBundle.getText("lblYes"), oSourceBundle.getText("lblNo")],
				emphasizedAction: "Yes",
				onClose: function (sAction) {
					if (sAction === oSourceBundle.getText("lblYes")) {

						this.onChangeAC();
					} else if (sAction === oSourceBundle.getText("lblNo")) {

					}
				}.bind(this)
			});

		},
		onChangeAC: function () {
			sap.ui.core.BusyIndicator.show(0);
			var oModel = this.getView().getModel();
			var artistContractModel = this.getView().getModel("artistContractModel");
			var artistContractDetailInfo = artistContractModel.getData();
			var paramObj = {
				"IV_TENTID": "IBS",
				"IV_DMNO": artistContractDetailInfo.Dmno,
				"IV_DMVER": artistContractDetailInfo.Dmver,
				"IV_CONTNO": artistContractDetailInfo.Contno,
				"IV_CONTVER": artistContractDetailInfo.Contver,
				"IV_CONTTP": artistContractDetailInfo.Conttp

			};
			oModel.callFunction("/GenerateContVersion", {
				method: "GET",
				urlParameters: paramObj,
				success: function (oData, response) {
					sap.ui.core.BusyIndicator.hide();
					// artistContractDetailInfo.setProperty("/costCodes", oData.results);
					artistContractModel.refresh(true);
					this.newVersionCreated = true;
					this.RouteArtistContractAfterChange();

				}.bind(this),
				error: function (oError) {
					sap.ui.core.BusyIndicator.hide();
					var oErrorResponse = JSON.parse(oError.responseText);
					var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
					MessageBox.error(oMsg);

				}
			})
		},
		RouteArtistContractAfterChange: function () {
			var oRouter = this.getOwnerComponent().getRouter();
			var artistContractModel = this.getView().getModel("artistContractModel");
			var artistContractDetailInfo = artistContractModel.getData();
			// var oContractItem = oEvent.getParameters()['listItem'].getBindingContext("dealMemoDetailModel").getObject();
			var newVersionCv = parseInt(artistContractDetailInfo.Contver) + parseInt("1");
			artistContractDetailInfo.Contver = "00" + newVersionCv;

			// var newVersionDv = parseInt(artistContractDetailInfo.Dmver) + parseInt("1");
			// artistContractDetailInfo.Dmver = "00" + newVersionDv;

			oRouter.navTo("ArtistContract", {
				"Dmno": artistContractDetailInfo.Dmno,
				"Dmver": artistContractDetailInfo.Dmver,
				"Contno": artistContractDetailInfo.Contno,
				"Contver": artistContractDetailInfo.Contver,
				"App": artistContractDetailInfo.App
			});
		},
		//Release Status
		onTabSelectionAC: function () {
			var oTab = this.getView().byId("idACTabBar").getSelectedKey();
			var oSubTab = this.getView().byId("idACPayTabBar2").getSelectedKey();
			if (oTab === "releaseStatus" ) {
				this.loadReleaseStatusDetails();
			}
			if ( oTab === "AdvreleaseStatus") {
				this.loadAdvReleaseStatusDetails();
			}
			if (oSubTab === "milestoneTab") {
				this.loadMileTabDetails();
			}

		},

		getDateInMS: function (date, time) {
			date.setHours(0, 0, 0, 0);
			var Actdt = date.getTime();
			var Time = time;
			var DtTime = Actdt + Time;
			DtTime = "Date(" + DtTime + ")";
			return DtTime;

		},
		loadMileTabDetails: function () {
			var artistContractModel = this.getView().getModel("artistContractModel");
			var artistContractDetailInfo = artistContractModel.getData();
			var srvUrl = "/sap/opu/odata/IBSCMS/DEALMEMO_SRV";
			var oModelSav = new sap.ui.model.odata.ODataModel(srvUrl, true, "", "");
			var oPath = "/DmCmMileWiseSet?$filter=Tentid eq 'IBS'and Dmno eq '" + artistContractDetailInfo.Dmno + "' and Dmver eq '" +
				artistContractDetailInfo.Dmver +
				"' and Contno eq '" + artistContractDetailInfo.Contno + "' and Conttp eq '01' and Contver eq'" + artistContractDetailInfo.Contver +
				"'";
			var oModel = this.getView().getModel();
			oModelSav.read(oPath, null, null, true, function (oData) {
				var oModel = new sap.ui.model.json.JSONModel(oData);
				oModel.setSizeLimit("999999");

				artistContractModel.setProperty("/mileWiseList", oData.results);
				artistContractModel.refresh(true);
			}, function (value) {
				sap.ui.core.BusyIndicator.hide();
				console.log(value);
				//alert("fail");
			});
			// var count = {};
			// artistContractDetailInfo.DmCmSet.results.forEach(v =>{
			// 	count[v] = (count[v] || 0 ) + 1
			// })		

		},
		calculateEpisode: function () {
			var artistContractModel = this.getView().getModel("artistContractModel");
			var artistContractDetailInfo = artistContractModel.getData();
			var srvUrl = "/sap/opu/odata/IBSCMS/DEALMEMO_SRV";
			var oModelSav = new sap.ui.model.odata.ODataModel(srvUrl, true, "", "");
			var oPath = "/DmMpml2SumSet?$filter=Tentid eq 'IBS'and Dmno eq '" + artistContractDetailInfo.Dmno + "' and Dmver eq '" +
				artistContractDetailInfo.Dmver +
				"' and Contno eq '" + artistContractDetailInfo.Contno + "' and Conttp eq '01' and Contver eq'" + artistContractDetailInfo.Contver +
				"'";
			var oModel = this.getView().getModel();
			oModelSav.read(oPath, null, null, true, function (oData) {
				var oModel = new sap.ui.model.json.JSONModel(oData);
				oModel.setSizeLimit("999999");

				artistContractModel.setProperty("/mileMpml2List", oData.results);
				artistContractModel.refresh(true);
			}, function (value) {
				sap.ui.core.BusyIndicator.hide();
				console.log(value);
				//alert("fail");
			});
		},
		loadReleaseStatusDetails: function () {
			var oModel = this.getView().getModel();
			var artistContractModel = this.getView().getModel("artistContractModel");
			var artistContractDetailInfo = artistContractModel.getData();
			artistContractDetailInfo.relStatustabcolor = "Critical";
			var iconUserActionMap = {
				"S": {
					icon: "sap-icon://initiative",
					state: "Success"
				},
				"A": {
					icon: "sap-icon://accept",
					state: "Success"
				},
				"R": {
					icon: "sap-icon://decline",
					state: "Error"
				},
				"F": {
					icon: "sap-icon://forward",
					state: "Warning"
				},
				"I": {
					icon: "sap-icon://lateness",
					state: "Warning"
				},
				"C": {
					icon: "sap-icon://activity-2",
					state: "Success"
				},
				"P": {
					icon: "sap-icon://pending",
					state: "Warning"
				}
			};
			var aFilters = [
				new Filter("Tentid", "EQ", "IBS"),
				new Filter("Dmno", "EQ", artistContractDetailInfo.Dmno),
				new Filter("Dmver", "EQ", artistContractDetailInfo.Dmver),
				new Filter("Contno", "EQ", artistContractDetailInfo.Contno),
				new Filter("Contver", "EQ", artistContractDetailInfo.Contver),
				new Filter("Conttp", "EQ", artistContractDetailInfo.Conttp)
			];
			var timeFormat = sap.ui.core.format.DateFormat.getTimeInstance({
				pattern: "KK:mm:ss"
			});
			var TZOffsetMs = new Date(0).getTimezoneOffset() * 60 * 1000;
			var releaseStatusInfo = [];
			var releaseStatusObj = {
				Author: "",
				Date: "",
				Status: "",
				Text: "",
				icon: "",
				state: ""
			};
			oModel.read("/DmlgSet", {
				filters: aFilters,
				success: function (oData) {

					oData.results.map(function (obj) {
						if (obj.Advwfapp == true ) {
						var relStObj = $.extend(true, {}, releaseStatusObj);
						relStObj.Author = obj.Usernm;
						relStObj.Status = obj.Usractiondesc;
						relStObj.icon = iconUserActionMap[obj.Usraction].icon;
						relStObj.state = iconUserActionMap[obj.Usraction].state;
						if (obj.Actdt != null) { //Added By Dhiraj Sarang for release strategy error
							var date = obj.Actdt;
							date = new Date(date);
							if (date == "Invalid Date") {
								/*for json format date*/
								var jsonDateString = obj.Actdt;
								var dt = new Date(parseInt(jsonDateString.replace(/\/+Date\(([\d+-]+)\)\/+/, '$1')));
								obj.Actdt = dt;
								var time = obj.Acttm[2] + obj.Acttm[3] + ":" + obj.Acttm[5] + obj.Acttm[6] +
									":" + obj.Acttm[8] + obj.Acttm[9];
								obj.Acttm = new Date(timeFormat.parse(time).getTime() - TZOffsetMs).getTime();
								var DtTime = this.getDateInMS(obj.Actdt, obj.Acttm);
								relStObj.Date = DtTime;

							} else {
								var DtTime = this.getDateInMS(obj.Actdt, obj.Acttm.ms);
								relStObj.Date = DtTime;
							}
						}
						releaseStatusInfo.push(relStObj);
					}
					}.bind(this));
					artistContractDetailInfo.releaseStatusInfo = releaseStatusInfo;
					if (releaseStatusInfo.length) {
						artistContractDetailInfo.relStatustabcolor = "Positive";
					}
					artistContractModel.refresh(true);

				}.bind(this),
				error: function (oError) {
					var oErrorResponse = JSON.parse(oError.responseText);
					var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
					MessageBox.error(oMsg);
				}

			})
		},
		loadAdvReleaseStatusDetails: function () {
			var oModel = this.getView().getModel();
			var artistContractModel = this.getView().getModel("artistContractModel");
			var artistContractDetailInfo = artistContractModel.getData();
			artistContractDetailInfo.relAdvStatustabcolor = "Critical";
			var iconUserActionMap = {
				"S": {
					icon: "sap-icon://initiative",
					state: "Success"
				},
				"A": {
					icon: "sap-icon://accept",
					state: "Success"
				},
				"R": {
					icon: "sap-icon://decline",
					state: "Error"
				},
				"F": {
					icon: "sap-icon://forward",
					state: "Warning"
				},
				"I": {
					icon: "sap-icon://lateness",
					state: "Warning"
				},
				"C": {
					icon: "sap-icon://activity-2",
					state: "Success"
				},
				"P": {
					icon: "sap-icon://pending",
					state: "Warning"
				}
			};
			var aFilters = [
				new Filter("Tentid", "EQ", "IBS"),
				new Filter("Dmno", "EQ", artistContractDetailInfo.Dmno),
				new Filter("Dmver", "EQ", artistContractDetailInfo.Dmver),
				new Filter("Contno", "EQ", artistContractDetailInfo.Contno),
				new Filter("Contver", "EQ", artistContractDetailInfo.Contver),
				new Filter("Conttp", "EQ", artistContractDetailInfo.Conttp)
			];
			var timeFormat = sap.ui.core.format.DateFormat.getTimeInstance({
				pattern: "KK:mm:ss"
			});
			var TZOffsetMs = new Date(0).getTimezoneOffset() * 60 * 1000;
			var releaseStatusInfo = [];
			var releaseStatusObj = {
				Author: "",
				Date: "",
				Status: "",
				Text: "",
				icon: "",
				state: ""
			};
			oModel.read("/DmlgSet", {
				filters: aFilters,
				success: function (oData) {

					oData.results.map(function (obj) {
						if (obj.Advwfapp == true ) {
						var relStObj = $.extend(true, {}, releaseStatusObj);
						relStObj.Author = obj.Usernm;
						relStObj.Status = obj.Usractiondesc;
						relStObj.icon = iconUserActionMap[obj.Usraction].icon;
						relStObj.state = iconUserActionMap[obj.Usraction].state;
						if (obj.Actdt != null) { //Added By Dhiraj Sarang for release strategy error
							var date = obj.Actdt;
							date = new Date(date);
							if (date == "Invalid Date") {
								/*for json format date*/
								var jsonDateString = obj.Actdt;
								var dt = new Date(parseInt(jsonDateString.replace(/\/+Date\(([\d+-]+)\)\/+/, '$1')));
								obj.Actdt = dt;
								var time = obj.Acttm[2] + obj.Acttm[3] + ":" + obj.Acttm[5] + obj.Acttm[6] +
									":" + obj.Acttm[8] + obj.Acttm[9];
								obj.Acttm = new Date(timeFormat.parse(time).getTime() - TZOffsetMs).getTime();
								var DtTime = this.getDateInMS(obj.Actdt, obj.Acttm);
								relStObj.Date = DtTime;

							} else {
								var DtTime = this.getDateInMS(obj.Actdt, obj.Acttm.ms);
								relStObj.Date = DtTime;
							}
						}
						releaseStatusInfo.push(relStObj);
					}
					}.bind(this));
					artistContractDetailInfo.releaseAdvStatusInfo = releaseStatusInfo;
					if (releaseStatusInfo.length) {
						artistContractDetailInfo.relAdvStatustabcolor = "Positive";
					}
					artistContractModel.refresh(true);

				}.bind(this),
				error: function (oError) {
					var oErrorResponse = JSON.parse(oError.responseText);
					var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
					MessageBox.error(oMsg);
				}

			})
		},


		//Attachmment Tab

		onChange: function(oEvent) {
			var artistContractModel = this.getView().getModel("artistContractModel");
			var artistContractDetailInfo = artistContractModel.getData();
			var oUploadCollection = oEvent.getSource();
			oUploadCollection.setUploadUrl(artistContractDetailInfo.attachURL);
			var oModel = this.getView().getModel();
			// Header Token
			var oCustomerHeaderToken = new sap.m.UploadCollectionParameter({
				name: "x-csrf-token",
				value: oModel.getHeaders()['x-csrf-token']
			});
			oUploadCollection.addHeaderParameter(oCustomerHeaderToken);

		},
		onBeforeUploadStarts: function(oEvent) {
			// Header Slug
			var oCustomerHeaderSlug = new sap.m.UploadCollectionParameter({
				name: "slug",
				value: oEvent.getParameter("fileName")
			});
			oEvent.getParameters().addHeaderParameter(oCustomerHeaderSlug);

		},
		onUploadComplete: function() {
			var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
			MessageToast.show(oSourceBundle.getText("msgUpldSucc"));
			this.loadAttachments();
		},
		onTypeMissmatch: function(oEvent) {
			var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
			MessageBox.error(oSourceBundle.getText("msgFileTypeMismatch"));
		},
		onFileSizeExceed: function() {
			var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
			MessageBox.error(oSourceBundle.getText("msgFileSizeExceed"));
		},
		onFilenameLengthExceed: function() {
			var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
			MessageBox.error(oSourceBundle.getText("msgFileNameLenExceed"));
		},
		onFileDeleted: function(oEvent) {
			var artistContractModel = this.getView().getModel("artistContractModel");
			var artistContractDetailInfo = artistContractModel.getData();
			var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
			var oModel = this.getView().getModel();
			var docId = oEvent.getParameter("documentId");
			var oPath = "/AttachmentSet(Tentid='IBS',Dmno='',Dmver='',Contno='" + artistContractDetailInfo.Contno + "',Contver='" + artistContractDetailInfo.Contver +
				"',Instanceid='" + docId + "')";
			oModel.remove(oPath, {
				success: function (oData) {
					MessageToast.show(oSourceBundle.getText("msgFileDelSucc"));
					this.loadAttachments();
				}.bind(this),
				error: function (oError) {
					var oErrorResponse = JSON.parse(oError.responseText);
					var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
					MessageBox.error(oMsg);
				}
			})
		},

		loadAttachments: function() {
			var artistContractModel = this.getView().getModel("artistContractModel");
			var artistContractDetailInfo = artistContractModel.getData();
			var oModel = this.getView().getModel();
			var aFilters = [
				new Filter("Tentid", "EQ", "IBS"),
				new Filter("Dmno", "EQ", ""),
				new Filter("Dmver", "EQ", ""),
				new Filter("Contno", "EQ", artistContractDetailInfo.Contno),
				new Filter("Contver", "EQ", artistContractDetailInfo.Contver),
				new Filter("Instanceid", "EQ", ''),
			];
			sap.ui.core.BusyIndicator.show(0);
			oModel.read("/AttachmentSet", {
				filters: aFilters,
				success: function (oData) {
					sap.ui.core.BusyIndicator.hide();
					artistContractDetailInfo.AttachmentDetails = oData.results;
					if (oData.results.length > 0) {
						artistContractDetailInfo.attachmentTabColor = "Positive";
					} else {
						artistContractDetailInfo.attachmentTabColor = "Critical";
					}
					artistContractModel.refresh(true);
				},
				error: function (oError) {
					var oErrorResponse = JSON.parse(oError.responseText);
					var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
					MessageBox.error(oMsg);
				}

			});
		},

		//End of artist contract
	});

	});