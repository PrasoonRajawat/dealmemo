sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"com/ui/dealmemolocal/model/formatter",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/ui/core/Fragment",
	"sap/ui/core/routing/History",
	"sap/ui/export/Spreadsheet",
	'sap/ui/export/library'
],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 */
	function (Controller, Filter, FilterOperator, Formatter, MessageBox, MessageToast, Fragment, History, Spreadsheet, exportLibrary) {
		"use strict";
		var EdmType = exportLibrary.EdmType;
		jQuery.sap.require("com.ui.dealmemolocal.model.jszip");
		jQuery.sap.require("com.ui.dealmemolocal.model.xlsx");
		return Controller.extend("com.ui.dealmemolocal.controller.VendorContract", {
			Formatter: Formatter,

			onInit: function () {

				this.getOwnerComponent().getRouter().attachRouteMatched(this.onRouteMatchedvendorContract, this);
			},

			onRouteMatchedvendorContract: function (oEvent) {
				var oName = oEvent.getParameter("name");
				if (oName === "VendorContract") {
					var oModel = new sap.ui.model.json.JSONModel();
					this.getView().setModel(oModel, "vendorContractModel");
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
					this.getView().byId("idVCTabBar").setSelectedKey("vcEpiData");

					this.loadDealMemoDetails();
					this.loadInitialDataFromMaster();

					this.loadEpisodes();
					this.loadPayTerms();
				}

			},
			checkForUnsavedData: function () {
				var oTab = this.getView().byId("idVCTabBar").getSelectedKey();
				var oTableData = [];
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();

				var unsavedFlag = false;
				if (vendorContractDetailInfo.epiVCTabData) {
					oTableData = vendorContractDetailInfo.epiVCTabData;
					if (oTableData.length > 0) {
						oTableData.map(function (oTabObj) {
							if (oTabObj.flag === "Cr" || oTabObj.flag === "Ch") {
								unsavedFlag = true;
							}
						})
					}
				}
				if (vendorContractDetailInfo.vcPaymentData) {
					oTableData = vendorContractDetailInfo.vcPaymentData;
					if (oTableData.length > 0) {
						oTableData.map(function (oTabObj) {
							if (oTabObj.flag === "Cr" || oTabObj.flag === "Ch") {
								unsavedFlag = true;
							}
						})
					}
				}
				if (vendorContractDetailInfo.vcDeliveryData) {
					oTableData = vendorContractDetailInfo.vcDeliveryData;
					if (oTableData.length > 0) {
						oTableData.map(function (oTabObj) {
							if (oTabObj.flag === "Cr" || oTabObj.flag === "Ch") {
								unsavedFlag = true;
							}
						})
					}
				}
				if (vendorContractDetailInfo.vcIPRData) {
					oTableData = vendorContractDetailInfo.vcIPRData;
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
			onNavBackFromVendorContractDetail: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var responseFlag = this.checkForUnsavedData();
				if (responseFlag) {
					if(vendorContractDetailInfo.App == "App"){
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
						if(vendorContractDetailInfo.App == "App"){
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
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				
				var dmno = vendorContractDetailInfo.Dmno;
				var dmver = vendorContractDetailInfo.Dmver;
				var conttp = vendorContractDetailInfo.Conttp;
				var host = window.location.origin;
				var path = window.location.pathname;
				
				var finalURL = host + path + "#ZVendorContract-display&/main/" + dmno + "/" + dmver + "/" + conttp ;
				sap.m.URLHelper.redirect(finalURL, false);
			},

			navToDealMemo: function () {
					var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				if (this.newContractCreated) {
					this.newContractCreated = false;
					window.history.go(-2);
				} else if (vendorContractDetailInfo.App){
					history.back();
				}	else {
					window.history.go(-1);
				}
			},
			onEditVendorContract: function (oEvent) {
				oEvent.getSource().setVisible(false);
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				vendorContractDetailInfo.saveVisible = true;
				vendorContractDetailInfo.changeVisible = false;
				vendorContractDetailInfo.editVisible = false;
				vendorContractDetailInfo.editDepartmentVisible = true;
				vendorContractModel.refresh(true);

			},
			loadDealMemoDetails: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var odetailEntityPath = "/DmHeaderSet(Tentid='IBS',Dmno='" + vendorContractDetailInfo.Dmno + "',Dmver='" + vendorContractDetailInfo
					.Dmver + "',Transtp='D')";
				var oModel = this.getView().getModel();

				sap.ui.core.BusyIndicator.show(0);
				oModel.read(odetailEntityPath, {
					urlParameters: {
						"$expand": "DmCostSet,DmCoSet"
					},

					success: function (oData) {
						Object.assign(vendorContractDetailInfo, oData);

						vendorContractModel.refresh(true);
						this.loadTaxCodes();
						this.loadCostCodes();
						if (vendorContractDetailInfo.Contno === "new") {
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
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();

				var vcCreateObj = {
					"vendorName": "",
					"vendorKey": "",
					"vendorRoleName": "",
					"vendorRoleKey": "",
					"vcDate": Formatter.formatDateVal(new Date),
					"Waers": vendorContractDetailInfo.Waers,
					"Totcost": "0.00",
					"taxCodeKey": "",
					"taxCodeName": "",
					"selEpisodes": [],
					"epiFromId": "",
					"epiToId": "",
					"episodeMode": 0,
					"episodeRangeVisible": false,
					"contractMode": "Cr",
					"vcTabEnable": false,
					"vcEpiDataColor": "Critical",
					"vcPaymentDataColor": "Critical",
					"vcDeliveryDataColor": "Critical",
					"vcEpiNonCostCdDataColor": "Critical",
					"saveVisible": true,
					"submitVisible": vendorContractDetailInfo.Contno !== "new" ? true : false,
					"releaseTabVisible": vendorContractDetailInfo.Contno !== "new" ? true : false,
					"changeVisible": vendorContractDetailInfo.Contstat === "04" ? true : false,
					"editDepartmentVisible": true,
					"editVisible": false,
					"epiDeleteEnable": false,
					"epiDelDeleteEnable": false,
					"enablevcEpiNonCostCdTab": false

				};
				// if (vendorContractDetailInfo.App === "App") { // added by dhiraj on 20/05/2022 for submit butn.
				// 	vendorContractDetailInfo.setProperty("/submitVisible", true);
				// }
				Object.assign(vendorContractDetailInfo, vcCreateObj);
				vendorContractModel.refresh(true);
				this.getView().byId("btnEditVC").setVisible(false);
				this.getView().byId("idIconSubTabBar2").setSelectedKey("vcSubEpiData");
				// if (vendorContractDetailInfo.Dmst !== "04") {
				this.loadVendors();
				// }

			},
			validateSubmit: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				var statusFlag = true;
				if (!vendorContractDetailInfo.DmCeSet.results.length) {
					statusFlag = false;
					MessageBox.error(oSourceBundle.getText("msgrequiredTabs"));
				} else if (!vendorContractDetailInfo.DmCmSet.results.length) {
					statusFlag = false;
					MessageBox.error(oSourceBundle.getText("msgrequiredTabs"));
				} else if (!vendorContractDetailInfo.DmVdSet.results.length) {
					statusFlag = false;
					MessageBox.error(oSourceBundle.getText("msgrequiredTabs"));
				} else if (!vendorContractDetailInfo.DmVrSet.results.length) {
					statusFlag = false;
					MessageBox.error(oSourceBundle.getText("msgrequiredTabs"));
				} else {
					statusFlag = true;
				}
				return statusFlag;
			},
			onSubmitVC: function () { // Adde by dhiraj on 19/05/2022

				var validKey = this.validateSubmit();
				if (validKey) {
					sap.ui.core.BusyIndicator.show(0);
					var oModel = this.getView().getModel();
					var vendorContractModel = this.getView().getModel("vendorContractModel");
					var vendorContractDetailInfo = vendorContractModel.getData();
					var paramObj = {
						"IV_TENTID": "IBS",
						"IV_DMNO": vendorContractDetailInfo.Dmno,
						"IV_DMVER": vendorContractDetailInfo.Dmver,
						"IV_CONTNO": vendorContractDetailInfo.Contno,
						"IV_CONTVER": vendorContractDetailInfo.Contver,
						"IV_CONTTP": vendorContractDetailInfo.Conttp

					};
					oModel.callFunction("/SubmitCont", {
						method: "GET",
						urlParameters: paramObj,
						success: function (oData, response) {
							sap.ui.core.BusyIndicator.hide();

							// dealMemoDetailModel.setProperty("/costCodes", oData.results);
							vendorContractModel.refresh(true);
							// this.loadDealMemoList();
							this.loadDealMemoDetails();

						}.bind(this),
						error: function (oError) {
							sap.ui.core.BusyIndicator.hide();
							var oErrorResponse = JSON.parse(oError.responseText);
							var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
							MessageBox.error(oMsg);
						}
					});
				}
			},
			displayContract: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				vendorContractModel.setProperty("/contractMode", "Ch");

				this.createParamModel();

				vendorContractModel.refresh(true);
				this.displayContractFlag = true;
				this.reloadVendorContractTabs();
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
			storeMasterCodeInfo: function (oData) {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				vendorContractModel.setProperty("/vendorRoleList", oData.results.filter(function (item) {
					return item.Mstpcd === "09";
				}));
				vendorContractModel.setProperty("/mileStoneList", oData.results.filter(function (item) {
					return item.Mstpcd === "08";
				}));
				vendorContractModel.setProperty("/deliveryCodeList", oData.results.filter(function (item) {
					return item.Mstpcd === "06";
				}));
				vendorContractModel.setProperty("/teritoryList", oData.results.filter(function (item) {
					return item.Mstpcd === "07";
				}));

				vendorContractModel.setProperty("/IPRRightsList", oData.results.filter(function (item) {
					return item.Mstpcd === "14";
				}));

				vendorContractModel.setProperty("/platformList", oData.results.filter(function (item) {
					return item.Mstpcd === "19";
				}));

				vendorContractModel.setProperty("/amortPatternList", oData.results.filter(function (item) {
					return item.Mstpcd === "12";
				}));

				vendorContractModel.setProperty("/nonAmmortPatternList", oData.results.filter(function (item) {
					return item.Mstpcd === "13";
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
						"val": "06"
					}, {
						"key": "Mstpcd",
						"val": "07"
					}, {
						"key": "Mstpcd",
						"val": "12"
					}, {
						"key": "Mstpcd",
						"val": "13"
					}, {
						"key": "Mstpcd",
						"val": "14"
					}, {
						"key": "Mstpcd",
						"val": "17"
					}, {
						"key": "Mstpcd",
						"val": "19"
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
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				sap.ui.core.BusyIndicator.show(0);
				var oPath = "/F4LFB1Set?$filter=Bukrs eq '" + vendorContractDetailInfo.Bukrs + "'";
				oModel.read(oPath, {
					success: function (oData) {
						//                   	var sortedList = oData.results.sort(function(a,b){
						//                   	    return a.Lifnr - b.Lifnr;
						//                   	    }
						//                   	);
						var sortedList = oData.results.sort((a, b) => (a.Lifnr > b.Lifnr) ? 1 : ((b.Lifnr > a.Lifnr) ? -1 : 0));
						//   	var filterNonBlank = sortedList.filter(function(obj){return obj.Mcod1 !== ""});
						vendorContractModel.setProperty("/vendorsList", sortedList);
						vendorContractModel.refresh(true);
						sap.ui.core.BusyIndicator.hide();
						this.onVendorSelection();

					}.bind(this),
					error: function () {

					}
				});
			},
			onVendorSelection: function () {
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				this.oValueHelpSelectionParams = {
					"bindPathName": "vendorContractModel>/vendorsList",
					"bindPropName": "vendorContractModel>Mcod1",
					"propName": "Mcod1",
					"keyName": "Lifnr",
					"bindPropDescName": "vendorContractModel>Lifnr",
					"keyPath": "/vendorKey",
					"valuePath": "/vendorName",
					"valueModel": "vendorContractModel",
					"dialogTitle": oSourceBundle.getText("titleVendor"),
					"callBackFunction": this.loadVendorRoles
				};
				this.openSelectionDialog();
			},
			loadVendorRoles: function (oRef) {
				var oSourceBundle = oRef.getView().getModel("i18n").getResourceBundle();
				oRef.oValueHelpSelectionParams = {
					"bindPathName": "vendorContractModel>/vendorRoleList",
					"bindPropName": "vendorContractModel>Mstcdnm",
					"propName": "Mstcdnm",
					"keyName": "Mstcd",
					"bindPropDescName": "vendorContractModel>Mstcd",
					"keyPath": "/vendorRoleKey",
					"valuePath": "/vendorRoleName",
					"valueModel": "vendorContractModel",
					"dialogTitle": oSourceBundle.getText("titleVendorRole")
					// "callBackFunction": this.loadDepartment
					//"callBackFunction":	oRef.createVendorContract

				};
				oRef.openSelectionDialog();

			},
			// Added by dhiraj on 30/06/2022
			editDepartment: function () {
				this.editDepartment = true;
				this.loadDepartment();
			},

			loadDepartment: function () { // added by dhiraj on 24/05/2022
				Fragment.load({
					name: "com.ui.dealmemolocal.fragments.SelectDepartmentDialog",
					controller: this
				}).then(function name(oFragment) {
					this._oCreateParamDialog = oFragment; //sap.ui.xmlfragment("com.ui.dealmemolocal.fragments.CreateParameterDialog", this);
					this.createParamModel();
					this.getView().addDependent(this._oCreateParamDialog);
					this._oCreateParamDialog.setModel(this.getView().getModel("vendorContractModel"));
					this._oCreateParamDialog.open();

				}.bind(this));
			},
			onCreateParamCancel: function () { // added by dhiraj on 24/05/2022
				this._oCreateParamDialog.destroy();

				this.onVendorSelection();

			},
			validateBeforeCreate: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var createParamsData = vendorContractModel.getData().createParams;
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				var statusFlag = true;
				if (createParamsData.Zltext === "" || createParamsData.Prreq === "" || createParamsData.Depthd === "" || createParamsData.Grsescr ===
					"") {
					statusFlag = false;
					MessageBox.error(oSourceBundle.getText("msgrequiredFieds"));
				}
				return statusFlag;
			},

			onCreateParamOk: function () {
				var oVaildFlag = this.validateBeforeCreate();
				if (oVaildFlag) {
					var vendorContractModel = this.getView().getModel("vendorContractModel");

					vendorContractModel.refresh(true);
					this._oCreateParamDialog.destroy();
				}

			},
			createParamModel: function () { // added by dhiraj on 24/05/2022
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				vendorContractModel.setProperty("/createParams", {
					"Zstext": "",
					"Zltext": "",
					"Prreq": "",
					"Depthd": "",
					"Dept": "",
					"Grsescr": "",
					"Recont": vendorContractDetailInfo.Cntsc === "Z0" ? true : false
				});
				if (vendorContractModel.oData.contractMode === "Ch") {
					vendorContractModel.oData.createParams.Zstext = vendorContractModel.oData.DmCoSet.results.find(d => d.Contno ===
						vendorContractModel.oData.Contno && d.Contver === vendorContractModel.oData.Contver).Dept
					vendorContractModel.oData.createParams.Prreq = vendorContractModel.oData.DmCoSet.results.find(d => d.Contno ===
						vendorContractModel.oData.Contno && d.Contver === vendorContractModel.oData.Contver).Prreq
					vendorContractModel.oData.createParams.Depthd = vendorContractModel.oData.DmCoSet.results.find(d => d.Contno ===
						vendorContractModel.oData.Contno && d.Contver === vendorContractModel.oData.Contver).Depthd
					vendorContractModel.oData.createParams.Grsescr = vendorContractModel.oData.DmCoSet.results.find(d => d.Contno ===
						vendorContractModel.oData.Contno && d.Contver === vendorContractModel.oData.Contver).Grsescr
				}
				//added by dhiraj on 52/05/2022
				this.loadDepartmentValue();
				vendorContractModel.refresh(true);
				this.loadDeptHeadValue();
				this.loadGrCreaterValue();
				this.loadPrRequestorValue();
				//----------------------------
			},

			loadDepartmentValue: function () { // added by dhiraj on 24/05/2022
				var oModel = this.getView().getModel();
				sap.ui.core.BusyIndicator.show();
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				sap.ui.core.BusyIndicator.show(0);
				var oPath = "/DmDeptF4Set";
				oModel.read(oPath, {
					success: function (oData) {
						var sortedList = oData.results.sort((a, b) => (a.Abtnr > b.Abtnr) ? 1 : ((b.Abtnr > a.Abtnr) ? -1 : 0));

						vendorContractModel.setProperty("/departmentList", sortedList);
						if (vendorContractModel.oData.contractMode === "Ch") {
							vendorContractModel.oData.createParams.Zltext = vendorContractModel.oData.departmentList.find(a => a.Zstext ===
								vendorContractModel.oData.createParams.Zstext).Zltext;
						}
						vendorContractModel.refresh(true);
						sap.ui.core.BusyIndicator.hide();
					}.bind(this),
					error: function () {

					}
				});

			},
			onValueHelpDept: function () { // added by dhiraj on 24/05/2022
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				this.oValueHelpSelectionParams = {
					"bindPathName": "vendorContractModel>/departmentList",
					"bindPropName": "vendorContractModel>Zltext",
					"propName": "Zltext",
					"keyName": "Zstext",
					"bindPropDescName": "vendorContractModel>Abtnr",
					"valuePath": "/createParams/Zltext",
					"keyPath": "/createParams/Zstext",
					"valueModel": "vendorContractModel",
					"dialogTitle": "Select Department",
					"callBackFunction": this.paramsEmpty
				};
				this.openSelectionDialog();

			},
			paramsEmpty: function (oRef) {

				var vendorContractModel = oRef.oView.getModel("vendorContractModel");
				vendorContractModel.oData.createParams.Prreq = "";
				vendorContractModel.oData.createParams.Depthd = "";
				vendorContractModel.oData.createParams.Grsescr = "";
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
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				sap.ui.core.BusyIndicator.show(0);
				var oPath = "/DmPrReqF4Set";
				oModel.read(oPath, {
					success: function (oData) {
						var sortedList = oData.results.sort((a, b) => (a.Bukrs > b.Bukrs) ? 1 : ((b.Bukrs > a.Bukrs) ? -1 : 0));

						vendorContractModel.setProperty("/prRequestorList", sortedList);
						vendorContractModel.refresh(true);
						sap.ui.core.BusyIndicator.hide();
					}.bind(this),
					error: function () {

					}
				});

			},
			onValueHelpPrRequestor: function () { // added by dhiraj on 24/05/2022

				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var list = vendorContractModel.oData.prRequestorList.filter(function (obj) {
					return obj.Dept === vendorContractModel.oData.createParams.Zstext
				}.bind(this))
				vendorContractModel.setProperty("/prRequestorListS", list);
				vendorContractModel.refresh(true);
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				this.oValueHelpSelectionParams = {
					"bindPathName": "vendorContractModel>/prRequestorListS",
					"bindPropName": "vendorContractModel>SpocList",
					"propName": "SpocList",
					"valuePath": "/createParams/Prreq",
					"valueModel": "vendorContractModel",
					"dialogTitle": "Select PR Requestor"
				};
				if (vendorContractModel.oData.createParams.Zltext !== "") {
					this.openSelectionDialog();
				} else {
					var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.information(oSourceBundle.getText("msgDeptCheck"));
				}
			},
			loadDeptHeadValue: function () { // added by dhiraj on 24/05/2022 
				var oModel = this.getView().getModel();
				sap.ui.core.BusyIndicator.show();
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				sap.ui.core.BusyIndicator.show(0);
				var oPath = "/DmDeptHeadF4Set";
				oModel.read(oPath, {
					success: function (oData) {
						var sortedList = oData.results.sort((a, b) => (a.Bukrs > b.Bukrs) ? 1 : ((b.Bukrs > a.Bukrs) ? -1 : 0));

						vendorContractModel.setProperty("/deptHeadList", sortedList);
						vendorContractModel.refresh(true);
						sap.ui.core.BusyIndicator.hide();
					}.bind(this),
					error: function () {

					}
				});

			},
			onValueHelpDeptHead: function () { // added by dhiraj on 24/05/2022

				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var list = vendorContractModel.oData.deptHeadList.filter(function (obj) {
					return obj.Dept === vendorContractModel.oData.createParams.Zstext
				}.bind(this))
				vendorContractModel.setProperty("/deptHeadListS", list);
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				this.oValueHelpSelectionParams = {
					"bindPathName": "vendorContractModel>/deptHeadListS",
					"bindPropName": "vendorContractModel>SpocList",
					"propName": "SpocList",
					"valuePath": "/createParams/Depthd",
					"valueModel": "vendorContractModel",
					"dialogTitle": "Select Department Head"
				};
				if (vendorContractModel.oData.createParams.Zltext !== "") {
					this.openSelectionDialog();
				} else {
					var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.information(oSourceBundle.getText("msgDeptCheck"));
				}
			},
			loadGrCreaterValue: function () { // added by dhiraj on 24/05/2022
				var oModel = this.getView().getModel();
				sap.ui.core.BusyIndicator.show();
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				sap.ui.core.BusyIndicator.show(0);
				var oPath = "/DmGrCreteF4Set";
				oModel.read(oPath, {
					success: function (oData) {
						var sortedList = oData.results.sort((a, b) => (a.Bukrs > b.Bukrs) ? 1 : ((b.Bukrs > a.Bukrs) ? -1 : 0));

						vendorContractModel.setProperty("/grCreaterList", sortedList);
						vendorContractModel.refresh(true);
						sap.ui.core.BusyIndicator.hide();
					}.bind(this),
					error: function () {

					}
				});

			},
			onValueHelpGrCreater: function () { // added by dhiraj on 24/05/2022

				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var list = vendorContractModel.oData.grCreaterList.filter(function (obj) {
					return obj.Dept === vendorContractModel.oData.createParams.Zstext
				}.bind(this))
				vendorContractModel.setProperty("/grCreaterListS", list);

				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				this.oValueHelpSelectionParams = {
					"bindPathName": "vendorContractModel>/grCreaterListS",
					"bindPropName": "vendorContractModel>SpocList",
					"propName": "SpocList",
					"valuePath": "/createParams/Grsescr",
					"valueModel": "vendorContractModel",
					"dialogTitle": "Select GR SES Creator"
				};
				if (vendorContractModel.oData.createParams.Zltext !== "") {
					this.openSelectionDialog();
				} else {
					var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.information(oSourceBundle.getText("msgDeptCheck"));
				}
			},
			onActionCB: function () { // FOr replacement Checkbox.
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				if (sap.ui.getCore().byId("recont").getSelected() === true) {
					vendorContractModel.setProperty("/createParams/Recont", true);
				} else {
					vendorContractModel.setProperty("/createParams/Recont", false);
				}
			},
			onSelectionDialogClose: function () {
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				if (this.oValueHelpSelectionParams.dialogTitle === oSourceBundle.getText("titleVendor")) {
					this.onNavBackFromVendorContractDetail();
				} else if (this.oValueHelpSelectionParams.dialogTitle === oSourceBundle.getText("titleVendorRole")) {
					this.onVendorSelection();
				}

			},
			loadTaxCodes: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var oModel = this.getView().getModel();
				sap.ui.core.BusyIndicator.show();
				var vendorContractModel = this.getView().getModel("vendorContractModel");

				var oFilters = [{
					"key": "Bukrs",
					"val": vendorContractDetailInfo.Bukrs

				}];

				var aFilters = this.getFilterArray(oFilters);
				oModel.read("/F4TaxCodeSet", {
					filters: aFilters,
					success: function (oData) {
						// var filteredList = oData.results.filter(function(obj) {
						// 	return obj.Mwskz.includes("V")
						// });
						// vendorContractModel.setProperty("/taxCodeList", filteredList);
						vendorContractModel.setProperty("/taxCodeList", oData.results);
						vendorContractModel.refresh(true);
						sap.ui.core.BusyIndicator.hide();

					}.bind(this),
					error: function () {

					}
				});
			},
			loadCostCodes: function () {
				var oModel = this.getView().getModel();
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var paramObj = {
					"IV_TENTID": "IBS",
					"IV_DMNO": vendorContractDetailInfo.Dmno,
					"IV_DMVER": vendorContractDetailInfo.Dmver,
					"IV_CONTTP": "01"

				};
				oModel.callFunction("/GetContractCostCode", {
					method: "GET",
					urlParameters: paramObj,
					success: function (oData, response) {
						oData.results.map(function (obj) {
							obj.costValueEditable = false;
							obj.costCodeValue = "0.00"
						});

						vendorContractModel.setProperty("/costCodeList", oData.results);
						vendorContractModel.refresh(true);

					}.bind(this),
					error: function (oError) { }
				})

			},
			loadEpisodes: function () {
				var oModel = this.getView().getModel();
				sap.ui.core.BusyIndicator.show();
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var oFilters = [{
					"key": "Tentid",
					"val": "IBS"
				}, {
					"key": "Spras",
					"val": "EN-US"
				}, {
					"key": "Dmno",
					"val": vendorContractDetailInfo.Dmno
				}, {
					"key": "Conttp",
					"val": "01"
				}

				];

				var aFilters = this.getFilterArray(oFilters);
				oModel.read("/F4EpiIDSet", {
					filters: aFilters,
					success: function (oData) {
						sap.ui.core.BusyIndicator.hide();
						var filteredEpisodes = oData.results.filter(function (epObj) {
							if (vendorContractDetailInfo.Contno !== "") {
								return epObj.Vcflag !== "X" || (epObj.Contno === vendorContractDetailInfo.Contno && epObj.Contver ===
									vendorContractDetailInfo.Contver);
							} else {
								epObj.Vcflag !== "X";
							}
						});
						var filterEpi = oData.results.filter(function (epObj) {
							return  epObj.Vcflag !== "X" || ( epObj.Contno === vendorContractDetailInfo.Contno || epObj.Contno === "" ); 
						})
						if (vendorContractDetailInfo.Contver == 'new') {
						vendorContractModel.setProperty("/episodeDataList", $.extend(true, [], filteredEpisodes));
						} else {
						vendorContractModel.setProperty("/episodeDataList", $.extend(true, [], filterEpi))
						}
						vendorContractModel.setProperty("/episodeVCList", filteredEpisodes);
						vendorContractModel.setProperty("/episode2List" , filterEpi);
						vendorContractModel.setProperty("/selEpisodes", filteredEpisodes);
						vendorContractModel.refresh(true);
						sap.ui.core.BusyIndicator.hide();

					}.bind(this),
					error: function (oError) {
						sap.ui.core.BusyIndicator.hide();
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				});
			},
			loadPayTerms: function () {
				var oModel = this.getView().getModel();
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				oModel.read("/F4PayTermSet", {
					success: function (oData) {
						vendorContractModel.setProperty("/payTermList", oData.results);
						vendorContractModel.refresh(true);
						sap.ui.core.BusyIndicator.hide();

					}.bind(this),
					error: function () {

					}
				});
			},
			openSelectionDialog: function () {
				Fragment.load({
					id: this.createId("vcOpenSelectionDialog"),
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
					//Added By Dhiraj For creating vendorcontract to default it as for production House
					if (this.oValueHelpSelectionParams.bindPathName === "vendorContractModel>/vendorRoleList") {
						this.onProdHouse();
					} else {
						this._oSelectionDialog.open();
					}
					//-----------------------------------------------------------------------------------------

				}.bind(this));
			},
			//Added By Dhiraj For creating vendorcontract to default it as for production House-----------------
			onProdHouse: function () {
				var oValuePath = this.oValueHelpSelectionParams.valuePath;
				var oKeyPath = this.oValueHelpSelectionParams.keyPath;
				var oProp = this.oValueHelpSelectionParams.propName;
				var oKey = this.oValueHelpSelectionParams.keyName;
				var oValueModelAlias = this.oValueHelpSelectionParams.valueModel;
				var vendorContractModel = this.getView().getModel(oValueModelAlias);
				vendorContractModel.setProperty(oValuePath, "Production House");
				vendorContractModel.setProperty(oKeyPath, "07");
				vendorContractModel.refresh(true);
				// if (this.oValueHelpSelectionParams.callBackFunction) {
				// 	this.oValueHelpSelectionParams.callBackFunction(this);
				// }
				this.loadDepartment();
			},
			//-----------------------------------------------------------------------------------------

			onConfirmSelection: function (oEvent) {
				var selectedItemObj = oEvent.getParameters()['selectedItem'].getBindingContext("vendorContractModel").getObject();
				var oValuePath = this.oValueHelpSelectionParams.valuePath;
				var oKeyPath = this.oValueHelpSelectionParams.keyPath;
				var oProp = this.oValueHelpSelectionParams.propName;
				var oKey = this.oValueHelpSelectionParams.keyName;
				var oValueModelAlias = this.oValueHelpSelectionParams.valueModel;
				var vendorContractModel = this.getView().getModel(oValueModelAlias);
				vendorContractModel.setProperty(oValuePath, selectedItemObj[oProp]);
				vendorContractModel.setProperty(oKeyPath, selectedItemObj[oKey]);
				vendorContractModel.refresh(true);
				if (this.oValueHelpSelectionParams.callBackFunction) {
					this.oValueHelpSelectionParams.callBackFunction(this);
				}
			},

			reloadVendorContractTabs: function () {

				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var oPath = "/DmCoSet(Tentid='IBS',Dmno='" + vendorContractDetailInfo.Dmno + "',Dmver='" + vendorContractDetailInfo.Dmver +
					"',Contno='" + vendorContractDetailInfo.Contno + "',Contver='" + vendorContractDetailInfo.Contver +
					"',Conttp='01')";
				var oModel = this.getView().getModel();
				oModel.read(oPath, {
					urlParameters: {
						"$expand": "DmCeSet,DmCmSet,DmVdSet,DmVrSet,DmCeBalAmtSet"
					},
					success: function (oData) {
						sap.ui.core.BusyIndicator.show(0);
						oData.Chnlnm = vendorContractDetailInfo.Chnlnm;
						oData.Cntnm = vendorContractDetailInfo.Cntnm;
						oData.DmCeSet.results.map(function (obj) {
							obj.episodeSaveFlag = true;
							obj.Diff = ((parseFloat(obj.Coepiamt) + parseFloat(obj.Wmwst)) - (obj.Baseamt)).toFixed(2);
							// obj.Diff = (parseFloat(obj.Coepiamt) - (obj.Coepiamt)).toFixed(2);
						});
						oData.epiVCTabData = $.extend(true, [], oData.DmCeSet.results);
						oData.vcEpiDataColor = "Critical";
						if (oData.DmCeSet.results.length) {
							oData.vcEpiDataColor = "Positive";
						}
						oData.DmCeBalAmtSet.results.map(function (obj) {
							obj.episodeSaveFlag = true;
							//	obj.Diff = ((parseFloat(obj.Coepiamt) + parseFloat(obj.Wmwst)) - (obj.Baseamt)).toFixed(2);
						});
						oData.vcEpiNonCostCdDataColor = "Critical";
						oData.enablevcEpiNonCostCdTab = false;
						if (oData.DmCeBalAmtSet.results.length) {
							oData.vcEpiNonCostCdDataColor = "Positive";
							oData.enablevcEpiNonCostCdTab = true;
						}

						oData.epiVCBalTabData = $.extend(true, [], oData.DmCeBalAmtSet.results);
						oData.DmCmSet.results.map(function (obj) {
							obj.episodeSaveFlag = true;
						});
						oData.vcPaymentData = $.extend(true, [], oData.DmCmSet.results);
						oData.vcPaymentDataColor = "Critical";
						if (oData.DmCmSet.results.length) {
							oData.vcPaymentDataColor = "Positive";
						}

						oData.DmVdSet.results.map(function (obj) {
							obj.episodeSaveFlag = true;
						});
						oData.vcDeliveryData = $.extend(true, [], oData.DmVdSet.results);

						oData.vcDeliveryDataColor = "Critical";
						if (oData.DmVdSet.results.length) {
							oData.vcDeliveryDataColor = "Positive";
						}
						oData.DmVrSet.results.map(function (vrObj) {
							vrObj.IPREditFlag = vrObj.Iprrht === "01" ? false : true;
							vrObj.episodeSaveFlag = true;
						})

						oData.vcIPRData = $.extend(true, [], oData.DmVrSet.results);
						oData.vcIPRDataColor = "Critical";
						if (oData.DmVrSet.results.length) {
							oData.vcIPRDataColor = "Positive";
						}
						oData.vendorName = oData.Name1;
						oData.vendorKey = oData.Lifnr;
						oData.vendorRoleName = oData.Artpnm;
						oData.vendorRoleKey = oData.Artp;
						oData.vcDate = Formatter.formatDateVal(oData.Contdt),
							oData.epiDeleteEnable = false;
						oData.epiDelDeleteEnable = false;
						oData.contractMode = "Ch";
						oData.vcTabEnable = true;
						if (oData.epiVCTabData.length === 0) {
							oData.vcTabEnable = false;
						}
						oData.submitVisible = false;
						if ((oData.Contstat === "01" || oData.Contstat === "03")) { // added by dhiraj on 20/05/2022 for submit butn.
							oData.submitVisible = true;
						}
						oData.releaseTabVisible = false;
						if (vendorContractDetailInfo.Contno !== "new") {
							oData.releaseTabVisible = true
						}
						oData.changeVisible = false;
						if (oData.Contstat === "04") {
							oData.changeVisible = true
						}
						oData.editDepartmentVisible = false; // added by dhiraj on 30/05/2022
						oData.saveVisible = true;
						if (this.displayContractFlag) {

							this.displayContractFlag = false;
							if (!this.newContractCreated) {
								oData.saveVisible = false;
								this.getView().byId("btnEditVC").setVisible(Formatter.formatEditableStatus(vendorContractDetailInfo.Contstat));
							}
						}
						this.getView().byId("idIconSubTabBar2").setSelectedKey("vcSubEpiDataNoCostCd");
						Object.assign(vendorContractDetailInfo, oData);
						vendorContractModel.refresh(true);
						this.selCostCodesPaths = [];
						sap.ui.core.BusyIndicator.hide();
					}.bind(this),
					error: function (oError) {
						sap.ui.core.BusyIndicator.hide();
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				})
			},

			//Episode Tab

			onSelectEpisode: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				vendorContractDetailInfo.episodeMode = 0;
				vendorContractDetailInfo.epiFromId = "";
				vendorContractDetailInfo.epiToId = "";
				vendorContractDetailInfo.taxCodeName = "";
				vendorContractDetailInfo.episodeRangeVisible = false;
				vendorContractDetailInfo.episode2List = vendorContractDetailInfo.episodeList; //episodeVCList
				vendorContractDetailInfo.vcEpiDataMsgVisible = false;
				vendorContractDetailInfo.vcEpiDataErrorMsg = "";
				vendorContractModel.refresh(true);
				if (!this._oSelectEpisodeDialog) {
					Fragment.load({
						id: this.createId("vcSelEpiDialog"),
						name: "com.ui.dealmemolocal.fragments.SelectEpisodeDialog",
						controller: this
					}).then(function name(oFragment) {
						this._oSelectEpisodeDialog = oFragment; //sap.ui.xmlfragment("com.ui.dealmemolocal.fragments.SelectEpisodeDialog", this);
						this.getView().addDependent(this._oSelectEpisodeDialog);
						this._oSelectEpisodeDialog.setModel(vendorContractModel);
						var oCostCodeList = this.byId(sap.ui.core.Fragment.createId("vcSelEpiDialog", "list_costcodeVC"));
						oCostCodeList.removeSelections();
						this._oSelectEpisodeDialog.open();

					}.bind(this));
				} else {
					var oCostCodeList = this.byId(sap.ui.core.Fragment.createId("vcSelEpiDialog", "list_costcodeVC"));
					oCostCodeList.removeSelections();
					this._oSelectEpisodeDialog.open();
				}
			},
			onCancelSelectEpisode: function () {
				this._oSelectEpisodeDialog.close();
			},
			onSelectEpisodeMode: function (oEvent) {
				var oselIndex = oEvent.getSource().getSelectedIndex();
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				if (oselIndex == 0) {
					vendorContractDetailInfo.episodeRangeVisible = false;
				} else {
					vendorContractDetailInfo.episodeRangeVisible = true;

				}
				vendorContractModel.refresh(true);
			},
			onvaluHelpTaxcode: function () {
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				this.oValueHelpSelectionParams = {
					"bindPathName": "vendorContractModel>/taxCodeList",
					"bindPropName": "vendorContractModel>Mwstx",
					"propName": "Mwstx",
					"keyName": "Mwskz",
					"bindPropDescName": "vendorContractModel>Mwskz",
					"keyPath": "/taxCodeKey",
					"valuePath": "/taxCodeName",
					"valueModel": "vendorContractModel",
					"dialogTitle": oSourceBundle.getText("titleTaxCode")

				};
				this.openSelectionDialog();
			},
			validateBeforePush: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var oselIndex = vendorContractDetailInfo.episodeMode;
				var selectedCostCodeContexts = this.byId(sap.ui.core.Fragment.createId("vcSelEpiDialog", "list_costcodeVC")).getSelectedContexts()

				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				if (oselIndex == 1) {
					if (vendorContractDetailInfo.epiFromId === "" || vendorContractDetailInfo.epiFromId === undefined || vendorContractDetailInfo.epiToId ===
						"" || vendorContractDetailInfo.epiToId === undefined) {
						//MessageBox.error(oSourceBundle.getText("msgSelectEpisode"));
						vendorContractDetailInfo.vcEpiDataMsgVisible = true;
						vendorContractDetailInfo.vcEpiDataErrorMsg = oSourceBundle.getText("msgSelectEpisode" + vendorContractDetailInfo.Cnttp);
						vendorContractModel.refresh(true);
						return false;
					}
				}
				if (vendorContractDetailInfo.taxCodeKey === "" || vendorContractDetailInfo.taxCodeKey === undefined) {
					//	MessageBox.error(oSourceBundle.getText("msgSelectTaxCode"));
					vendorContractDetailInfo.vcEpiDataMsgVisible = true;
					vendorContractDetailInfo.vcEpiDataErrorMsg = oSourceBundle.getText("msgSelectTaxCode");
					vendorContractModel.refresh(true);
					return false;
				}
				if (selectedCostCodeContexts.length === 0) {
					//MessageBox.error(oSourceBundle.getText("msgSelectCostCode"));
					vendorContractDetailInfo.vcEpiDataMsgVisible = true;
					vendorContractDetailInfo.vcEpiDataErrorMsg = oSourceBundle.getText("msgSelectCostCode");
					vendorContractModel.refresh(true);
					return false;
				}

				return true;
			},
			onLoadEpiDataTab: function () {
				var validFlag = this.validateBeforePush();
				if (validFlag) {
					var vendorContractModel = this.getView().getModel("vendorContractModel");
					var vendorContractDetailInfo = vendorContractModel.getData();
					var selectedEpisodeList = [];
					var oselIndex = vendorContractDetailInfo.episodeMode;
					if (oselIndex == 0) {
						selectedEpisodeList = vendorContractDetailInfo.episodeDataList;
					} else {
						selectedEpisodeList = [];
						vendorContractDetailInfo.episodeDataList.map(function (epVCObj) {
							if (epVCObj.Epiid >= vendorContractDetailInfo.epiFromId && epVCObj.Epiid <= vendorContractDetailInfo.epiToId) {
								selectedEpisodeList.push(epVCObj);
							}

						});
					}

					var episodeDealMemoInfo = vendorContractDetailInfo.DmCostSet.results;
					var vcEpiTabData = [];
					selectedEpisodeList.map(function (epObj) {
						var episodeDealMemoDetails = []
						episodeDealMemoInfo.map(function (epCostObj) {
							if (epCostObj.Epiid === epObj.Epiid) {
								if (epCostObj.Scostcd === "") {
									epCostObj.Scostcd = epCostObj.Costcd;
								}
								episodeDealMemoDetails.push(epCostObj)
							}
						});
						var selectedCostCodeContexts = this.byId(sap.ui.core.Fragment.createId("vcSelEpiDialog", "list_costcodeVC")).getSelectedContexts();

						selectedCostCodeContexts.map(function (costCodeContext) {
							var oCostCodeObj = costCodeContext.getObject();
							var epiSodeCostodeData = episodeDealMemoDetails.filter(function (epCostObj) {
								return epCostObj.Scostcd === oCostCodeObj.Costcode;
							});
							if (epiSodeCostodeData.length && parseInt(epiSodeCostodeData[0].Totcostamt) !== 0) {
								if (epiSodeCostodeData.length) {
									var oEpiDataObj = {
										Tentid: "IBS",
										Dmno: vendorContractDetailInfo.Dmno,
										Dmver: vendorContractDetailInfo.Dmver,
										Contno: "",
										Contver: "",
										Epiid: epObj.Epiid,
										Epinm: epObj.Epinm,
										Conttp: "01",
										Baseamt: "00.0",
										Totepiamt: epiSodeCostodeData[0].Totcostamt.toString(),
										Wmwst: "00.0",
										Mwskz: vendorContractDetailInfo.taxCodeKey,
										Coepiamt: epiSodeCostodeData[0].Totcostamt.toString(),
										Costcd: oCostCodeObj.Costcode,
										Costdesc: oCostCodeObj.Costdesc

									};
									if (vendorContractDetailInfo.contractMode === "Ch") {
										oEpiDataObj.Contno = vendorContractDetailInfo.Contno;
										oEpiDataObj.Contver = vendorContractDetailInfo.Contver;
									}

									vcEpiTabData.push(oEpiDataObj)
								}
							} else if (epiSodeCostodeData.length && vendorContractDetailInfo.Cntsc === "Z0") { //Added by dhiraj on 23/06/2022	
								if (epiSodeCostodeData.length) { //for zero cost code
									var oEpiDataObj = {
										Tentid: "IBS",
										Dmno: vendorContractDetailInfo.Dmno,
										Dmver: vendorContractDetailInfo.Dmver,
										Contno: "",
										Contver: "",
										Epiid: epObj.Epiid,
										Epinm: epObj.Epinm,
										Conttp: "01",
										Baseamt: "00.0",
										Totepiamt: epiSodeCostodeData[0].Totcostamt.toString(),
										Wmwst: "00.0",
										Mwskz: vendorContractDetailInfo.taxCodeKey,
										Coepiamt: epiSodeCostodeData[0].Totcostamt.toString(),
										Costcd: oCostCodeObj.Costcode,
										Costdesc: oCostCodeObj.Costdesc

									};
									if (vendorContractDetailInfo.contractMode === "Ch") {
										oEpiDataObj.Contno = vendorContractDetailInfo.Contno;
										oEpiDataObj.Contver = vendorContractDetailInfo.Contver;
									}

									vcEpiTabData.push(oEpiDataObj)
								}
							}

						}.bind(this));

					}.bind(this));

					this.displayEpisodeTabData(vcEpiTabData);
					this._oSelectEpisodeDialog.close();
				}
			},

			displayEpisodeTabData: function (vcEpiTabData) {
				sap.ui.core.BusyIndicator.show(0);
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var oPayLoad = {};
				oPayLoad.DmCeSet = vcEpiTabData;
				oPayLoad.Tentid = "IBS";
				oPayLoad.Dmno = vendorContractDetailInfo.Dmno;
				oPayLoad.Dmver = vendorContractDetailInfo.Dmver;
				oPayLoad.Contno = "";
				oPayLoad.Conttp = "01";

				var oModel = this.getView().getModel();
				oModel.setUseBatch(false);
				oModel.create("/DmCoSet", oPayLoad, {
					success: function (oData) {
						if (vendorContractDetailInfo.contractMode === "Cr" && vendorContractDetailInfo.epiVCTabData === undefined ||
							vendorContractDetailInfo.epiVCTabData.length === 0) {
							vendorContractDetailInfo.epiVCTabData = [];
							oData.DmCeSet.results.map(function (obj) {
								obj.flag = "Cr";
							});
							vendorContractDetailInfo.epiVCTabData = vendorContractDetailInfo.epiVCTabData.concat(oData.DmCeSet.results);
						} else {

							oData.DmCeSet.results.map(function (obj) {
								var flagNewEntry = true;
								obj.flag = "Cr";
								for (var oInd = 0; oInd < vendorContractDetailInfo.epiVCTabData.length; oInd++) {
									var vcEpiObj = vendorContractDetailInfo.epiVCTabData[oInd];
									if (vcEpiObj.Epiid === obj.Epiid && vcEpiObj.Costcd === obj.Costcd && vcEpiObj.Contver === obj.Contver) {
										flagNewEntry = false;
										break;
									}
								}
								if (flagNewEntry) {
									vendorContractDetailInfo.epiVCTabData.push(obj);
								} else {
									if (vendorContractDetailInfo.epiVCTabData[oInd].episodeSaveFlag) {
										obj.flag = "Ch";
									}
									vendorContractDetailInfo.epiVCTabData[oInd] = obj;
								}
							});

						}
						vendorContractModel.refresh(true);
						sap.ui.core.BusyIndicator.hide();
					}.bind(this),
					error: function (oError) {
						sap.ui.core.BusyIndicator.hide();
						var oBody = JSON.parse(oError.responseText);
						var oMsg = oBody.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				});
			},

			onSeletEpiTblVC: function () {

				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var oContexts = this.byId(sap.ui.core.Fragment.createId("vcEpiTab", "oTbl_vcepiData")).getSelectedContexts();
				if (oContexts.length) {
					vendorContractModel.setProperty("/epiDeleteEnable", true);
				} else {
					vendorContractModel.setProperty("/epiDeleteEnable", false);
				}
				vendorContractModel.refresh(true);
			},
			onDeletevcEpi: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				MessageBox.confirm(oSourceBundle.getText("msgdeleteConfirmContractEpi" + vendorContractDetailInfo.Cnttp), {
					actions: [oSourceBundle.getText("lblYes"), oSourceBundle.getText("lblNo")],
					emphasizedAction: "Yes",
					onClose: function (sAction) {
						if (sAction === oSourceBundle.getText("lblYes")) {

							this.deletevcEpiData();
						} else if (sAction === oSourceBundle.getText("lblNo")) {

						}
					}.bind(this)
				});
			},
			deletevcEpiData: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var oTable = this.byId(sap.ui.core.Fragment.createId("vcEpiTab", "oTbl_vcepiData"));
				var oContexts = oTable.getSelectedContexts();
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				var oModel = this.getView().getModel();
				oModel.setUseBatch(true);
				oModel.setDeferredGroups(oModel.getDeferredGroups().concat(["epiVCDeleteChanges"]));
				var mParameters = {
					groupId: "epiVCDeleteChanges",
					success: function (data, resp) {
						if (data.__batchResponses && data.__batchResponses[0].__changeResponses && data.__batchResponses[0].__changeResponses.length) {
							oTable.removeSelections();
							MessageToast.show(oSourceBundle.getText("msgSuccEpiDeleteSave" + vendorContractDetailInfo.Cnttp));
							this.reloadVendorContractTabs();
							this.loadEpisodes();
						} else if (data.__batchResponses[0].response.statusCode === "400") {
							var oError = JSON.parse(data.__batchResponses[0].response.body);
							var oMsg = oError.error.innererror.errordetails[0].message;
							MessageBox.error(oMsg);
						}

					}.bind(this),
					error: function (oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				};

				oContexts.map(function (oContext) {
					var oEpiObj = oContext.getObject()
					var oPath = "/DmCeSet(Tentid='IBS',Dmno='" + vendorContractDetailInfo.Dmno + "',Dmver='" + vendorContractDetailInfo.Dmver +
						"',Conttp='01',Contno='" + vendorContractDetailInfo.Contno + "',Contver='" + vendorContractDetailInfo.Contver + "',Epiid='" +
						oEpiObj.Epiid + "')";
					oModel.remove(oPath, {
						groupId: "epiVCDeleteChanges"
					});

				}.bind(this));

				oModel.submitChanges(mParameters);
			},

			createVCPayload: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var oPayload = {
					"Tentid": "IBS",
					"Dmno": vendorContractDetailInfo.Dmno,
					"Dmver": vendorContractDetailInfo.Dmver,
					"Lifnr": vendorContractDetailInfo.vendorKey,
					"Contdt": Formatter.formatDateValForBackend(new Date()),
					"Totcost": "0.0",
					"Tottaxamt": "0.0",
					"Cntnm": vendorContractDetailInfo.Cntnm,
					"Chnlnm": vendorContractDetailInfo.Chnlnm,
					"Contno": "",
					"Conttp": "01",
					"Contver": "",
					"Artp": vendorContractDetailInfo.vendorRoleKey,
					"Artpnm": vendorContractDetailInfo.vendorRoleName,
					"Dept": vendorContractDetailInfo.createParams.Zstext,
					"Prreq": vendorContractDetailInfo.createParams.Prreq,
					"Depthd": vendorContractDetailInfo.createParams.Depthd,
					"Grsescr": vendorContractDetailInfo.createParams.Grsescr,
					"Recont": vendorContractDetailInfo.createParams.Recont,

				};
				return oPayload;

			},
			createVCEpiData: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var epiVCTabData = vendorContractDetailInfo.epiVCTabData;
				var alreadySavedflag = true;
				var oModel = this.getView().getModel();
				oModel.setUseBatch(true);
				oModel.setDeferredGroups(oModel.getDeferredGroups().concat(["epiVCChanges"]));
				var mParameters = {
					groupId: "epiVCChanges",
					success: function (data, resp) {
						var oData = data.__batchResponses[0].__changeResponses;
						if (oData.length) {
							//DmCoSet response 
							var oContractResponse = oData[0].data;
							vendorContractModel.setProperty("/Contno", oContractResponse.Contno);
							vendorContractModel.setProperty("/Contver", oContractResponse.Contver);
						}
						vendorContractModel.refresh(true);
						var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
						MessageToast.show(oSourceBundle.getText("msgepiVCSave" + vendorContractDetailInfo.Cnttp));
						this.newContractCreated = true;
						var oRouter = this.getOwnerComponent().getRouter();
						oRouter.navTo("VendorContract", {
							"Dmno": vendorContractDetailInfo.Dmno,
							"Dmver": vendorContractDetailInfo.Dmver,
							"Contno": vendorContractDetailInfo.Contno,
							"Contver": vendorContractDetailInfo.Contver
						});
						//	this.reloadVendorContractTabs();
						this.loadEpisodes();

					}.bind(this),
					error: function (oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				};

				if (epiVCTabData !== undefined && epiVCTabData.length) {
					var oPayLoad = this.createVCPayload();
					oModel.create("/DmCoSet", oPayLoad, {
						groupId: "epiVCChanges"
					});

					epiVCTabData.map(function (oEpiVCObj) {
						var epiVCObj = $.extend(true, {}, oEpiVCObj);
						if (epiVCObj.flag === "Cr") {
							alreadySavedflag = false;
							delete epiVCObj.flag
							oModel.create("/DmCeSet", epiVCObj, {
								groupId: "epiVCChanges"
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
			updateVCEpiData: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var epiVCTabData = vendorContractDetailInfo.epiVCTabData;
				var alreadySavedflag = true;
				var oModel = this.getView().getModel();
				oModel.setUseBatch(true);
				oModel.setDeferredGroups(oModel.getDeferredGroups().concat(["epiVCUpdateChanges"]));
				var mParameters = {
					groupId: "epiVCUpdateChanges",
					success: function (data, resp) {

						var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
						MessageToast.show(oSourceBundle.getText("msgepiVCSave" + vendorContractDetailInfo.Cnttp));
						this.reloadVendorContractTabs();
						this.loadEpisodes();

					}.bind(this),
					error: function (oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				};
				epiVCTabData.map(function (oEpiVCObj) {
					var epiVCObj = $.extend(true, {}, oEpiVCObj);
					if (epiVCObj.flag === "Cr") {
						alreadySavedflag = false;
						delete epiVCObj.flag
						oModel.create("/DmCeSet", epiVCObj, {
							groupId: "epiVCUpdateChanges"
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

			createEpiTabVC: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();

				if (vendorContractDetailInfo.contractMode === "Cr") {
					this.createVCEpiData();
				} else if (vendorContractDetailInfo.Contno !== "" || vendorContractDetailInfo.contractMode === "Ch") {
					this.updateVCEpiData();
				}
			},

			//Payment Tab

			onEnterPayment: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				vendorContractDetailInfo.epiPaymentFromId = "";
				vendorContractDetailInfo.epiPaymentToId = "";
				vendorContractModel.setProperty("/episodeRangeVisiblePayment", false);
				vendorContractModel.setProperty("/episodeModePayment", 0);
				vendorContractModel.setProperty("/mileStonesForEpi", []);
				vendorContractModel.setProperty("/selContextsData", []);
				vendorContractDetailInfo.pushBtnEnable = false;
				vendorContractDetailInfo.colPercAmntLabel = "Amount";
				vendorContractDetailInfo.vcPaymentDataMsgVisible = false;
				vendorContractDetailInfo.vcPaymentDataErrorMsg = "";
				var DmCmSetData = vendorContractDetailInfo.DmCmSet.results;

				var DmCmSetEpIds = DmCmSetData.map(function (dmcmobj) {
					return dmcmobj.Epiid;
				});
				var epIds = [];
				var distEpisodes = [];
				vendorContractDetailInfo.epiVCTabData.map(function (obj) {
					if (epIds.indexOf(obj.Epiid) === -1) {

						epIds.push(obj.Epiid);
						distEpisodes.push(obj);

					}
				});
				vendorContractModel.setProperty("/epPaymentList", distEpisodes);
				vendorContractModel.refresh(true);

				if (!this._oSelectPaymentDialog) {
					Fragment.load({
						id: this.createId("vcPaymentDialog"),
						name: "com.ui.dealmemolocal.fragments.SelectPaymentDialog",
						controller: this
					}).then(function name(oFragment) {
						this._oSelectPaymentDialog = oFragment; //sap.ui.xmlfragment("com.ui.dealmemolocal.fragments.SelectPaymentDialog", this);
						this.getView().addDependent(this._oSelectPaymentDialog);
						this.byId(sap.ui.core.Fragment.createId("vcPaymentDialog", "list_mlList")).removeSelections();
						this.byId(sap.ui.core.Fragment.createId("vcPaymentDialog", "rbAmntType")).setSelectedIndex(1);
						this.byId(sap.ui.core.Fragment.createId("vcPaymentDialog", "rbAmtPerc")).setEditable(vendorContractDetailInfo.Contver == 1);
						this._oSelectPaymentDialog.open();
					}.bind(this));

				} else {
					this.byId(sap.ui.core.Fragment.createId("vcPaymentDialog", "list_mlList")).removeSelections();
					this.byId(sap.ui.core.Fragment.createId("vcPaymentDialog", "rbAmntType")).setSelectedIndex(1);
					this.byId(sap.ui.core.Fragment.createId("vcPaymentDialog", "rbAmtPerc")).setEditable(vendorContractDetailInfo.Contver == 1);
					this._oSelectPaymentDialog.open();
				}
			},
			onSelectAmntType: function (oEvent) {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				if (oEvent.getSource().getSelectedIndex() === 0) {
					vendorContractDetailInfo.colPercAmntLabel = "Percentage";
				} else if (oEvent.getSource().getSelectedIndex() === 1) {
					vendorContractDetailInfo.colPercAmntLabel = "Amount";
				}
				vendorContractModel.refresh(true);
			},
			onSelectEpisodeModePayment: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				vendorContractDetailInfo.mileStonesForEpi = [];
				vendorContractDetailInfo.episodeRangeVisiblePayment = false;
				if (vendorContractDetailInfo.episodeModePayment === 1) {
					vendorContractDetailInfo.episodeRangeVisiblePayment = true;
				}
				vendorContractModel.refresh(true);
			},
			onMileStoneSelectionToDetail: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				vendorContractDetailInfo.mileStonesForEpi = [];
				var oMLList = this.byId(sap.ui.core.Fragment.createId("vcPaymentDialog", "list_mlList"));
				var selectedMLCntxts = oMLList.getSelectedContexts();
				selectedMLCntxts.map(function (oCntext) {

					var oMLObj = oCntext.getObject();
					vendorContractDetailInfo.mileStonesForEpi.push({
						"Mstcd": oMLObj.Mstcd,
						"Mstcdnm": oMLObj.Mstcdnm,
						"payee": vendorContractDetailInfo.vendorName,
						"payeeKey": vendorContractDetailInfo.vendorKey,
						"Zterm": vendorContractDetailInfo.Zterm !== "" ? vendorContractDetailInfo.Zterm : "",
						"Dueamt": "0",
						"estDate": null
					});

				});
				if (selectedMLCntxts.length) {
					vendorContractDetailInfo.pushBtnEnable = true;
				}
				//oMLList.removeSelections();
				vendorContractModel.refresh(true);
			},
			onCancelPayment: function () {
				this._oSelectPaymentDialog.close();
			},
			onValueHelpPayterm: function (oEvent) {
				var oPath = oEvent.getSource().getBindingContext("vendorContractModel").sPath;

				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				this.oValueHelpSelectionParams = {
					"bindPathName": "vendorContractModel>/payTermList",
					"bindPropName": "vendorContractModel>ZtermT",
					"bindPropDescName": "vendorContractModel>Zterm",
					"propName": "ZtermT",
					"keyName": "Zterm",
					"valuePath": oPath + "/ZtermT",
					"keyPath": oPath + "/Zterm",
					"valueModel": "vendorContractModel",
					"dialogTitle": oSourceBundle.getText("titlePayTerm")
				};
				this.openSelectionDialog();
			},
			preparePaymentpayload: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var selectedEpisodeList = [];
				var oselIndex = vendorContractDetailInfo.episodeModePayment;
				var paymentPayloadArr = [];
				if (oselIndex == 0) {
					selectedEpisodeList = vendorContractDetailInfo.epPaymentList;
				} else {
					selectedEpisodeList = [];
					vendorContractDetailInfo
						.epPaymentList.map(function (epVCObj) {
							if (epVCObj.Epiid >= vendorContractDetailInfo.epiPaymentFromId && epVCObj.Epiid <= vendorContractDetailInfo.epiPaymentToId) {
								selectedEpisodeList.push(epVCObj);
							}

						});
				}

				
				selectedEpisodeList.map(function (selEpObj) {
					paymentPayloadArr.push({
						Contno: vendorContractDetailInfo.Contno,
						Conttp: "01",
						Contver: vendorContractDetailInfo.Contver,
						Dmno: vendorContractDetailInfo.Dmno,
						Dmver: vendorContractDetailInfo.Dmver,
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
						Zterm: ""
					});
				}.bind(this));
				if (vendorContractDetailInfo.vcPaymentData.length > 0) {
					vendorContractDetailInfo.vcPaymentData.map(function (selEpObj) {
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
							Seqnr: selEpObj.Seqnr
						});
					}.bind(this));
				}
				
				return paymentPayloadArr;
			},

			prepareMileStonePayload: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var milestones = vendorContractDetailInfo.mileStonesForEpi;
				var mileStonePayload = [];
				var oAmtType = this.byId(sap.ui.core.Fragment.createId("vcPaymentDialog", "rbAmntType")).getSelectedIndex();
				milestones.map(function (mlObj) {

					mileStonePayload.push({
						Amtper: oAmtType === 0 ? mlObj.Dueamt : "0.00",
						Contno: vendorContractDetailInfo.Contno,
						Conttp: "01",
						Contver: vendorContractDetailInfo.Contver,
						Costperamt: oAmtType === 1 ? "A" : "P",
						Dmno: vendorContractDetailInfo.Dmno,
						Dmver: vendorContractDetailInfo.Dmver,
						Dueamt: oAmtType === 1 ? mlObj.Dueamt : "0.00",
						Empfk: mlObj.vendorKey,
						Mestdt: mlObj.estDate != null ? Formatter.formatDateValForBackend(mlObj.estDate) : null ,
						Msid: mlObj.Mstcd,
						Msidnm: mlObj.Mstcdnm,
						Tentid: "IBS",
						Zterm: mlObj.Zterm,
						Ztermt: mlObj.ZtermT === undefined ? vendorContractDetailInfo.payTermList.find(tt => tt.Zterm === mlObj.Zterm).ZtermT : mlObj
							.ZtermT
					}); // Ztermt: Added By dhiraj on 23/05/2022 for getting payment term if Code is entered manually with out F4 help. 
				}.bind(this));
				return mileStonePayload;
			},

			// changeEstimatedDate: function() {
			// 	var vendorContractModel = this.getView().getModel("vendorContractModel");
			// 	var vendorContractDetailInfo = vendorContractModel.getData();
			// 	if (vendorContractDetailInfo.mileStonesForEpi.Mestdt === "") {
			// 		vendorContractDetailInfo.mileStonesForEpi.Mestdt = null;
			// 	}
			// 	vendorContractDetailInfo.refresh(true);
			// },

			validateMilestoneAchievementDate: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var allowedEpisodes = [];
				var response = {};
				response.allowedEpisodes = [];
				if (vendorContractDetailInfo.epiPaymentFromId == "" && vendorContractDetailInfo.epiPaymentToId == "") { //All Episodes
					var episodeList = [];
					vendorContractDetailInfo.DmCmSet.results.map(function (obj) {
						episodeList.push(obj.Epiid)
					});
					if (episodeList.length > 0) {
						for (let i = 0; i <= episodeList.length - 1; i++) {
							if (vendorContractDetailInfo.DmCmSet.results.findIndex(v => v.Epiid == episodeList[i] && v.Mscompdt && vendorContractDetailInfo.mileStonesForEpi
								.findIndex(obj => obj.Mstcd != v.Msid) == -1) == -1) {
								response.allowedEpisodes.push(episodeList[i]);
							} else {
								response.warningMessage = true;
							}
						}

					};
				} else if (vendorContractDetailInfo.epiPaymentFromId != "" && vendorContractDetailInfo.epiPaymentToId != "") { // Range of Episodes
					for (let i = vendorContractDetailInfo.epiPaymentFromId; i <= vendorContractDetailInfo.epiPaymentToId; i++) {
						if (vendorContractDetailInfo.DmCmSet.results.findIndex(v => v.Mscompdt && v.Epiid == i && vendorContractDetailInfo.mileStonesForEpi
							.findIndex(obj => obj.Mstcd != v.Msid) == -1) == -1) {
							response.allowedEpisodes.push(i);
						} else {
							response.warningMessage = true;
						}
					};

				}

				return response;

			},

			validateMileStoneData: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var milestones = vendorContractDetailInfo.mileStonesForEpi;
				var oAmtType = this.byId(sap.ui.core.Fragment.createId("vcPaymentDialog", "rbAmntType")).getSelectedIndex();
				var oselIndex = vendorContractDetailInfo.episodeModePayment;
				var mileStonePayload = [];
				var statusFlag = true;
				var oMsg = "";
				var totPerc = 0;
				if (oselIndex == 1) {
					if (vendorContractDetailInfo.epiPaymentFromId === "" || vendorContractDetailInfo.epiPaymentFromId === undefined ||
						vendorContractDetailInfo.epiPaymentToId === "" || vendorContractDetailInfo.epiPaymentToId === undefined) {
						//MessageBox.error(oSourceBundle.getText("msgSelectEpisode"));
						statusFlag = false;
						oMsg = "msgSelectEpisode" + vendorContractDetailInfo.Cnttp;

					}
				};
				if (statusFlag) {
					for (var oIndex = 0; oIndex < milestones.length; oIndex++) {
						var mlObj = milestones[oIndex];
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
				}
				if (oMsg !== "") {
					var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
					//				MessageBox.error(oSourceBundle.getText(oMsg));
					vendorContractDetailInfo.vcPaymentDataMsgVisible = true;
					vendorContractDetailInfo.vcPaymentDataErrorMsg = oSourceBundle.getText(oMsg);
					vendorContractModel.refresh(true);
				} else {
					vendorContractDetailInfo.vcPaymentDataMsgVisible = false;
					vendorContractDetailInfo.vcPaymentDataErrorMsg = "";
					vendorContractModel.refresh(true);
				}
				return statusFlag;
			},

			processPaymentData: function (vendorContractDetailInfo) {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var oPayLoad = {};
				var epiTabData = $.extend(true, [], vendorContractDetailInfo.epiVCTabData);
				epiTabData.map(function (epitabObj) {
					delete epitabObj.flag;
					delete epitabObj.episodeSaveFlag;
					delete epitabObj.Diff;
				});
				oPayLoad.DmCeSet = epiTabData;
				oPayLoad.DmCmSet = this.preparePaymentpayload();
				// oPayload.DmCmSet = oPayload.DmCmSet.filter(v=> validationResponse.allowedEpisodes.findIndex(episodeId => episodeId == v.Epiid) > -1);
				oPayLoad.DmMilestoneSet = this.prepareMileStonePayload();
				// oPayload.DmMilestoneSet = oPayload.DmMilestoneSet.filter(v=> validationResponse.allowedEpisodes.findIndex(episodeId => episodeId == v.Epiid) > -1);
				oPayLoad.Tentid = "IBS";
				oPayLoad.Dmno = vendorContractDetailInfo.Dmno;
				oPayLoad.Dmver = vendorContractDetailInfo.Dmver;
				oPayLoad.Contno = vendorContractDetailInfo.Contno;
				oPayLoad.Conttp = "01";

				var oModel = this.getView().getModel();
				oModel.setUseBatch(false);
				oModel.create("/DmCoSet", oPayLoad, {
					success: function (oData) {

						if (vendorContractDetailInfo.vcPaymentData === undefined || vendorContractDetailInfo.vcPaymentData.length === 0) {
							vendorContractDetailInfo.vcPaymentData = [];
							oData.DmCmSet.results.map(function (obj) {
								obj.flag = "Cr";
							});
							vendorContractDetailInfo.vcPaymentData = vendorContractDetailInfo.vcPaymentData.concat(oData.DmCmSet.results);
						} else {

							oData.DmCmSet.results.map(function (obj) {
								var flagNewEntry = true;
								obj.flag = "Cr";
								for (var oInd = 0; oInd < vendorContractDetailInfo.vcPaymentData.length; oInd++) {
									var vcEpiObj = vendorContractDetailInfo.vcPaymentData[oInd];
									if (vcEpiObj.Epiid === obj.Epiid && vcEpiObj.Msid === obj.Msid && vcEpiObj.Contver === obj.Contver) {
										flagNewEntry = false;
										break;
									}
								}
								if (flagNewEntry) {
									vendorContractDetailInfo.vcPaymentData.push(obj);
								} else {
									if (vendorContractDetailInfo.vcPaymentData[oInd].episodeSaveFlag) {
										obj.flag = "Ch";
										obj.Updkz = "U";
									}
									vendorContractDetailInfo.vcPaymentData[oInd] = obj;
								}
							});

						}

						vendorContractModel.refresh(true);
						this._oSelectPaymentDialog.close();
					}.bind(this),
					error: function (oError) {
						var oBody = JSON.parse(oError.responseText);
						var oMsg = oBody.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				});
			},
			onPushPayment: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var validateBeforePush = this.validateMileStoneData();
				var validationResponse = this.validateMilestoneAchievementDate();
				var continueProcessing = true;
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
										this.processPaymentData(vendorContractDetailInfo);
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
						this.processPaymentData(vendorContractDetailInfo);
					}
				}
				// if (validateBeforePush) {
				// 	processPaymentData(vendorContractDetailInfo);
				// }
			},
			savePaymentTabVC: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var epiPaymentabData = vendorContractDetailInfo.vcPaymentData;
				var alreadySavedflag = true;
				var oModel = this.getView().getModel();
				oModel.setUseBatch(true);
				oModel.sDefaultUpdateMethod = "PUT";
				oModel.setDeferredGroups(oModel.getDeferredGroups().concat(["epiPaymentVCChanges"]));
				var mParameters = {
					groupId: "epiPaymentVCChanges",
					success: function (data, resp) {

						var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
						MessageToast.show(oSourceBundle.getText("msgepiVCPaymentSave" + vendorContractDetailInfo.Cnttp));
						this.reloadVendorContractTabs();

					}.bind(this),
					error: function (oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				};

				epiPaymentabData.map(function (oEpiPaymentObj) {
					var epiPaymentObj = $.extend(true, {}, oEpiPaymentObj);
					if (epiPaymentObj.flag === "Cr") {
						alreadySavedflag = false;
						delete epiPaymentObj.flag;
						if (epiPaymentObj.Seqnr == "000") {
							oModel.create("/DmCmSet", epiPaymentObj, {
								groupId: "epiPaymentVCChanges"
							});
						} else {
							var oPath = "/DmCmSet(Tentid='IBS',Dmno='" + vendorContractDetailInfo.Dmno + "',Dmver='" + vendorContractDetailInfo.Dmver +
								"',Conttp='01',Contno='" + vendorContractDetailInfo.Contno + "',Contver='" + vendorContractDetailInfo.Contver + "',Epiid='" +
								epiPaymentObj.Epiid + "',Seqnr='" + epiPaymentObj.Seqnr +
								"',Msid='" + epiPaymentObj.Msid + "')";

							oModel.update(oPath, epiPaymentObj, {
								groupId: "epiPaymentVCChanges"
							});

						}
					} else if (epiPaymentObj.flag === "Ch") {
						alreadySavedflag = false;
						delete epiPaymentObj.flag;
						var oPath = "/DmCmSet(Tentid='IBS',Dmno='" + vendorContractDetailInfo.Dmno + "',Dmver='" + vendorContractDetailInfo.Dmver +
							"',Conttp='01',Contno='" + vendorContractDetailInfo.Contno + "',Contver='" + vendorContractDetailInfo.Contver + "',Epiid='" +
							epiPaymentObj.Epiid + "',Seqnr='" + epiPaymentObj.Seqnr +
							"',Msid='" + epiPaymentObj.Msid + "')";

						oModel.update(oPath, epiPaymentObj, {
							groupId: "epiPaymentVCChanges"
						});
					}
				}.bind(this));

				if (alreadySavedflag) {
					var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.information(oSourceBundle.getText("msgAlreadysave"));
				} else {
					oModel.submitChanges(mParameters);
				}

			},

			//Delivery Tab
			onSelectEpisodeModeDelivery: function (oEvent) {
				var oselIndex = oEvent.getSource().getSelectedIndex();
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				if (oselIndex == 0) {
					vendorContractDetailInfo.episodeRangeVisibleDelivery = false;
				} else {
					vendorContractDetailInfo.episodeRangeVisibleDelivery = true;

				}
				vendorContractModel.refresh(true);
			},
			onEnterDelivery: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				vendorContractModel.setProperty("/episodeRangeVisibleDelivery", false);
				vendorContractModel.setProperty("/episodeModeDelivery", 0);
				vendorContractModel.setProperty("/epiDeliveryFromId", "");
				vendorContractModel.setProperty("/epiDeliveryToId", "");
				vendorContractDetailInfo.vcDeliveryDataMsgVisible = false;
				vendorContractDetailInfo.vcDeliveryDataErrorMsg = "";

				var DmVdSetData = vendorContractDetailInfo.DmVdSet.results;
				var DmVdSetEpIds = DmVdSetData.map(function (dmvdobj) {
					return dmvdobj.Epiid;
				});
				var epIds = [];
				var distEpisodes = [];
				vendorContractDetailInfo.epiVCTabData.map(function (obj) {
					if (epIds.indexOf(obj.Epiid) === -1) {
						epIds.push(obj.Epiid);
						distEpisodes.push(obj);
					}
				});
				vendorContractModel.setProperty("/epDeliveryList", distEpisodes);
				vendorContractModel.refresh(true);
				if (!this._oSelectEpDeliveryDialog) {
					Fragment.load({
						id: this.createId("vcEpDeliveryDialog"),
						name: "com.ui.dealmemolocal.fragments.EpisodeSelectionVC",
						controller: this
					}).then(function name(oFragment) {
						this._oSelectEpDeliveryDialog = oFragment; //sap.ui.xmlfragment("com.ui.dealmemolocal.fragments.SelectPaymentDialog", this);
						this.getView().addDependent(this._oSelectEpDeliveryDialog);
						this._oSelectEpDeliveryDialog.open();
					}.bind(this));

				} else {
					this._oSelectEpDeliveryDialog.open();
				}
			},
			onCancelEpisodeSelection: function () {
				this._oSelectEpDeliveryDialog.close();
			},
			validateEpisodeSelection: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				if (vendorContractDetailInfo.episodeModeDelivery === 1) {
					if (vendorContractDetailInfo.epiDeliveryFromId === "" || vendorContractDetailInfo.epiDeliveryToId === "") {
						vendorContractDetailInfo.vcDeliveryDataMsgVisible = true;
						vendorContractDetailInfo.vcDeliveryDataErrorMsg = oSourceBundle.getText("msgSelectEpisode" + vendorContractDetailInfo.Cnttp);
						vendorContractModel.refresh(true);
						return false;
					}
				}
				return true;
			},
			onSearchDeliverables: function (oEvent) {
				var sValue = oEvent.getParameter("value");
				var oFilter =
					new Filter([
						new Filter(this._oSelectDeliveryCodeDialog.propName, FilterOperator.Contains, sValue),
						new Filter(this._oSelectDeliveryCodeDialog.keyName, FilterOperator.Contains, sValue)
					], false);

				// var oBinding = oEvent.getParameter("itemsBinding");
				var oBinding = oEvent.getSource().getBinding("items");
				oBinding.filter([oFilter]);
			},
			onNextDeliveryVC: function () {
				var validateDelEp = this.validateEpisodeSelection();
				if (validateDelEp) {
					this._oSelectEpDeliveryDialog.close();
					Fragment.load({
						id: this.createId("vcDeliveryCodeDialog"),
						name: "com.ui.dealmemolocal.fragments.SelectionDialogDelivery",
						controller: this
					}).then(function name(oFragment) {
						this._oSelectDeliveryCodeDialog = oFragment; //sap.ui.xmlfragment("com.ui.dealmemolocal.fragments.SelectPaymentDialog", this);
						this.getView().addDependent(this._oSelectDeliveryCodeDialog);
						var oItem = new sap.m.StandardListItem({
							title: "{vendorContractModel>Mstcdnm}",
							description: "{vendorContractModel>Mstcd}"
						});
						this._oSelectDeliveryCodeDialog.bindAggregation("items", "vendorContractModel>/deliveryCodeList", oItem);
						this._oSelectDeliveryCodeDialog.open();

					}.bind(this));
				}
			},
			onSeletDelTblVC: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var oContexts = this.getView().byId("oTbl_vcdelData").getSelectedContexts();
				if (oContexts.length) {
					vendorContractModel.setProperty("/epiDelDeleteEnable", true);
				} else {
					vendorContractModel.setProperty("/epiDelDeleteEnable", false);
				}
				vendorContractModel.refresh(true);
			},
			onDeleteDeliveryData: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var oTable = this.getView().byId("oTbl_vcdelData");
				var selectedContexts = oTable.getSelectedContexts();
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				var oModel = this.getView().getModel();
				oModel.setUseBatch(true);
				oModel.setDeferredGroups(oModel.getDeferredGroups().concat(["epiDelVCDeleteChanges"]));
				var mParameters = {
					groupId: "epiDelVCDeleteChanges",
					success: function (data, resp) {
						if (data.__batchResponses.length > 0) {
							if (data.__batchResponses[0].response != undefined){
                            if (data.__batchResponses[0].response.statusCode == "400") {
                                var oErrorResponse = JSON.parse(data.__batchResponses[0].response.body);
                                var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
                                if(oMsg.includes("Content post processing is done for")){
                                MessageBox.error(oMsg);
                               	this.reloadVendorContractTabs();
                            }}} else {
                                oTable.removeSelections();
                                MessageToast.show(oSourceBundle.getText("msgSuccEpiDeleteSave" + vendorContractDetailInfo.Cnttp));
                               	 this.reloadVendorContractTabs();
                        }
						}
					}.bind(this),
					error: function (oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				};

				selectedContexts.map(function (oCntxt) {
					var oDelObj = oCntxt.getObject();
					var oPath = "/DmVdSet(Tentid='IBS',Dmno='" + vendorContractDetailInfo.Dmno + "',Dmver='" + vendorContractDetailInfo.Dmver +
						"',Conttp='01',Contno='" + vendorContractDetailInfo.Contno + "',Contver='" + vendorContractDetailInfo.Contver +
						"',Epiid='" + oDelObj.Epiid + "',Delvcd='" + oDelObj.Delvcd + "')";
					oModel.remove(oPath, {
						groupId: "epiDelVCDeleteChanges"
					});
				}.bind(this));

				oModel.submitChanges(mParameters);
			},
			prepareDeliverypayload: function (oSelDelvCodeObj) {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var showLinkPaymentMsg = false;
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				var selectedEpisodeList = [];
				var oselIndex = vendorContractDetailInfo.episodeModeDelivery;
				var deliveryPayloadArr = [];
				if (oselIndex == 0) {
					selectedEpisodeList = vendorContractDetailInfo.epDeliveryList;
				} else {
					selectedEpisodeList = [];
					vendorContractDetailInfo.epDeliveryList.map(function (epVCObj) {
						if (epVCObj.Epiid >= vendorContractDetailInfo.epiDeliveryFromId && epVCObj.Epiid <= vendorContractDetailInfo.epiDeliveryToId) {
							selectedEpisodeList.push(epVCObj);
						}

					});
				}

				selectedEpisodeList.map(function (selEpObj) {

					var oContentReceiptPayObjs = vendorContractDetailInfo.vcPaymentData.filter(function (epPayObj) {
						return epPayObj.Epiid === selEpObj.Epiid && epPayObj.Msid === "02"
					});
					if (oContentReceiptPayObjs.length) {
						showLinkPaymentMsg = true;
						selEpObj.Delvpay = true;
					} else {
						selEpObj.Delvpay = false;
					}

				});
				selectedEpisodeList.map(function (selEpObj) {
					deliveryPayloadArr.push({

						Contno: vendorContractDetailInfo.Contno,
						Conttp: "01",
						Contver: vendorContractDetailInfo.Contver,
						Delvcd: oSelDelvCodeObj.Mstcd,
						Delvcdnm: oSelDelvCodeObj.Mstcdnm,
						Delvdoc: "",
						Delvdt: null,
						Delvpay: selEpObj.Delvpay,
						Delvtm: null,
						Dmno: vendorContractDetailInfo.Dmno,
						Dmver: vendorContractDetailInfo.Dmver,
						Epiid: selEpObj.Epiid,
						Epinm: selEpObj.Epinm,
						Invtind: "",
						Mscompdt: null,
						Remarks: "",
						Spras: "",
						Tecost: "",
						Telest: "",
						Tentid: "IBS",
						flag: "Cr"
					});
				}.bind(this));

				if (showLinkPaymentMsg) {
					MessageBox.confirm(oSourceBundle.getText("msgisPaymentLinked"), {
						actions: [oSourceBundle.getText("lblYes"), oSourceBundle.getText("lblNo")],
						emphasizedAction: "Yes",
						onClose: function (sAction) {
							if (sAction === oSourceBundle.getText("lblYes")) {

								var oResp = this.updateDeliveryData(deliveryPayloadArr, $.extend(true, [], vendorContractDetailInfo.vcDeliveryData));
								if (oResp.flag) {
									vendorContractDetailInfo.vcDeliveryData = oResp.oResTable;
									vendorContractModel.refresh(true);
								} else {

									var epiIds = oResp.oResTable.join(",");
									var oMsg = oSourceBundle.getText("lblForEpisodes" + vendorContractDetailInfo.Cnttp) + " " + epiIds + "Delivery Code" +
										oSelDelvCodeObj.Mstcdnm + " is already pushed";
									MessageBox.error(Msg);
								}

							} else if (sAction === oSourceBundle.getText("lblNo")) {
								deliveryPayloadArr.map(function (delPayloadObj) {
									delPayloadObj.Delvpay = false;
								});
								var oResp = this.updateDeliveryData(deliveryPayloadArr, $.extend(true, [], vendorContractDetailInfo.vcDeliveryData));
								if (oResp.flag) {
									vendorContractDetailInfo.vcDeliveryData = oResp.oResTable;
									vendorContractModel.refresh(true);
								} else {

									var epiIds = oResp.oResTable.join(",");
									var oMsg = oSourceBundle.getText("lblForEpisodes" + vendorContractDetailInfo.Cnttp) + " " + epiIds + "Delivery Code" +
										oSelDelvCodeObj.Mstcdnm + " is already pushed";
									MessageBox.error(Msg);
								}
							}
						}.bind(this)
					});

				} else {

					var oResp = this.updateDeliveryData(deliveryPayloadArr, $.extend(true, [], vendorContractDetailInfo.vcDeliveryData));
					if (oResp.flag) {
						vendorContractDetailInfo.vcDeliveryData = oResp.oResTable;
						vendorContractModel.refresh(true);
					} else {

						var epiIds = oResp.oResTable.join(",");
						var oMsg = oSourceBundle.getText("lblForEpisodes" + vendorContractDetailInfo.Cnttp) + " " + epiIds + "Delivery Code" +
							oSelDelvCodeObj.Mstcdnm + " is already pushed";
						MessageBox.error(oMsg)
					}
				}

			},

			updateDeliveryData: function (deliveryPayloadArr, delvTableData) {

				var oResponse = {
					flag: true,
					oResTable: delvTableData
				};
				var alreadyPushedEpisodes = [];
				deliveryPayloadArr.map(function (obj) {
					var flagNewEntry = true;
					obj.flag = "Cr";

					for (var oInd = 0; oInd < delvTableData.length; oInd++) {
						var vcEpiObj = delvTableData[oInd];
						if (vcEpiObj.Epiid === obj.Epiid && vcEpiObj.Delvcd === obj.Delvcd && vcEpiObj.Contver === obj.Contver) {
							alreadyPushedEpisodes.push(obj.Epiid);
							flagNewEntry = false;
							break;
						}
					}
					if (flagNewEntry) {
						delvTableData.push(obj);
					} else {
						if (delvTableData[oInd].episodeSaveFlag) {
							obj.flag = "Ch";
						}
						//	delvTableData[oInd] = obj;
					}
				});
				if (alreadyPushedEpisodes.length > 0) {
					oResponse.flag = false;
					oResponse.oResTable = alreadyPushedEpisodes;
				} else {
					oResponse.flag = true;
					oResponse.oResTable = delvTableData;
				}
				return oResponse;
			},

			onConfirmDeliverySelection: function (oEvent) {
				for (var sel = 0; sel <= oEvent.getParameters()['selectedItems'].length; sel++) { //added by Dhiraj On 19/05/2022 for selecting multiple deliverables
					var oSelDelvCodeObj = oEvent.getParameters()['selectedItems'][sel].getBindingContext("vendorContractModel").getObject();
					this.prepareDeliverypayload(oSelDelvCodeObj);
				}

				// var oSelDelvCodeObj = oEvent.getParameters()['selectedItem'].getBindingContext("vendorContractModel").getObject();   			
				// 	this.prepareDeliverypayload(oSelDelvCodeObj);  //ComMented by Dhiraj On 19/05/2022 for selecting multiple deliverables
			},
			onSelectionDialogDeliveryClose: function () {
				this._oSelectDeliveryCodeDialog.close();
			},

			saveDeliveryTabVC: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var epiDeliverytabData = vendorContractDetailInfo.vcDeliveryData;
				var alreadySavedflag = true;
				var oModel = this.getView().getModel();
				oModel.setUseBatch(true);
				oModel.setDeferredGroups(oModel.getDeferredGroups().concat(["epiDeliveryVCChanges"]));
				var mParameters = {
					groupId: "epiDeliveryVCChanges",
					success: function (data, resp) {

						var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
						MessageToast.show(oSourceBundle.getText("msgepiVCDeliverySave"));
						this.reloadVendorContractTabs();

					}.bind(this),
					error: function (oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				};

				epiDeliverytabData.map(function (oEpiDeliveryObj) {
					var epiDeliveryObj = $.extend(true, {}, oEpiDeliveryObj);
					if (epiDeliveryObj.flag === "Cr") {
						alreadySavedflag = false;
						delete epiDeliveryObj.flag;
						delete epiDeliveryObj.episodeSaveFlag;
						oModel.create("/DmVdSet", epiDeliveryObj, {
							groupId: "epiDeliveryVCChanges"
						});
					}
				}.bind(this));

				if (alreadySavedflag) {
					var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.information(oSourceBundle.getText("msgAlreadysave"));
				} else {
					oModel.submitChanges(mParameters);
				}
			},

			//IPR Rights Tab
			onEnterIPR: function () {
				
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				vendorContractModel.setProperty("/episodeRangeVisibleIPR", false);
				vendorContractModel.setProperty("/episodeModeIPR", 0);
				vendorContractModel.setProperty("/IPRRight", "");
				vendorContractModel.setProperty("/PlatformKey", "");
				vendorContractModel.setProperty("/rightStDate", null);
				vendorContractModel.setProperty("/rightendDate", null);
				vendorContractModel.setProperty("/territoryKey", "");
				vendorContractModel.setProperty("/amortKey", "");
				vendorContractModel.setProperty("/nonAmortKey", "");
				vendorContractModel.setProperty("/totRuns", "");
				vendorContractModel.setProperty("/selAdditionalRights", []);
				vendorContractModel.setProperty("/totRunsEnable", true);
				vendorContractModel.setProperty("/rightendDtEnable", true);
				vendorContractDetailInfo.vcIPRDataErrorMsg = "";
				vendorContractDetailInfo.vcIPRDataMsgVisible = false;
				vendorContractDetailInfo.epiIPRFromId = "";
				vendorContractDetailInfo.epiIPRToId = "";
				vendorContractModel.setProperty("/additionalRights", [{
					Mstcd: "DB",
					Mstcdnm: "Dubbing"
				}, {
					Mstcd: "SR",
					Mstcdnm: "Subtitle Rights"
				}, {
					Mstcd: "NR",
					Mstcdnm: "Natural Repeat"
				}, {
					Mstcd: "ER",
					Mstcdnm: "Exclusive Rights"
				}, {
					Mstcd: "ED",
					Mstcdnm: "Estimate Date"
				}, {
					Mstcd: "TR",
					Mstcdnm: "Trailers and Promotions"
				}]);
				var DmVrSetData = vendorContractDetailInfo.DmVrSet.results;
				var DmVrSetEpIds = DmVrSetData.map(function (dmvrobj) {
					return dmvrobj.Epiid;
				});
				var epIds = [];
				var distEpisodes = [];
				vendorContractDetailInfo.epiVCTabData.map(function (obj) {
					if (epIds.indexOf(obj.Epiid) === -1) {
						epIds.push(obj.Epiid);
						distEpisodes.push(obj);
					}
				});
				vendorContractModel.setProperty("/epIPRList", distEpisodes);
				vendorContractModel.refresh(true);

				if (!this._oSelectIPRDialog) {
					Fragment.load({
						id: this.createId("vcIPRDialog"),
						name: "com.ui.dealmemolocal.fragments.SelectIPR",
						controller: this
					}).then(function name(oFragment) {
						this._oSelectIPRDialog = oFragment; //sap.ui.xmlfragment("com.ui.dealmemolocal.fragments.SelectPaymentDialog", this);
						this.getView().addDependent(this._oSelectIPRDialog);
						this._oSelectIPRDialog.open(this.checkNature()); //edited by Dhiraj on 20/05/2022 if nature is commissioned
					}.bind(this));

				} else {
					this._oSelectIPRDialog.open(this.checkNature());
				}
			},
			getIPRMapping: function () {
				var that = this
				var validateIPR = this.validateIPRDetails();
				if (validateIPR) {
				sap.ui.core.BusyIndicator.show(0);
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var Dmno = vendorContractDetailInfo.Dmno;
				var Dmver = vendorContractDetailInfo.Dmver;
				var Contno = vendorContractDetailInfo.Contno;
				var Contver = vendorContractDetailInfo.Contver;
				var Stdate = Formatter.formatDateValForBackend(vendorContractDetailInfo.rightStDate);
				var Enddate =  Formatter.formatDateValForBackend(vendorContractDetailInfo.rightendDate);
				var srvUrl = "/sap/opu/odata/IBSCMS/DEALMEMO_SRV";
				var oModelSav = new sap.ui.model.odata.ODataModel(srvUrl, true, "", "");
				var pValue = "/AmrMapSet?$filter=Tentid eq 'IBS' and Dmno eq '" + Dmno + "' and Dmver eq '" + Dmver + "' and Contno eq '" + Contno + "' and Contver eq '" + Contver + "' and Rhtfrdt eq datetime'" + Stdate + "' and Rhttodt eq datetime'" + Enddate + "'";
				oModelSav.read(pValue, null, null, true, function (oData) {
					sap.ui.core.BusyIndicator.hide();
					vendorContractModel.setProperty("/AmortMapList", oData.results);
					var mapList = oData.results;
					that.mapList = oData.results;
					vendorContractModel.refresh(true);
					that.onPushIPR();
				}, function (value) {
					sap.ui.core.BusyIndicator.hide();
					console.log(value);

				});
			}
			},
			onCancelIPRSelection: function () {
				this._oSelectIPRDialog.close();
			},
			checkNature: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel"); //edited by Dhiraj on 20/05/2022 if nature is commissioned
				var vendorContractDetailInfo = vendorContractModel.getData(); //it should get select as all IPR	
				if (vendorContractDetailInfo.Cntnt === "03") {
					vendorContractModel.setProperty("/IPRRight", "01");
					vendorContractModel.setProperty("/IPRValue", "All IPR")
					vendorContractModel.IPRRight = "01";
					vendorContractModel.IPRItem = "All IPR";
					vendorContractModel.setProperty("/IPRRightEnable", false);
					vendorContractModel.setProperty("/totRuns", "999");
					vendorContractModel.setProperty("/totRunsEnable", false);
					vendorContractModel.setProperty("/rightendDtEnable", false);
					vendorContractModel.setProperty("/rightendDate", new Date("9999-12-31"));
				}
			},
			onIPRRightChange: function (oEvent) {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();

				var oKey = oEvent.getSource().getSelectedKey();
				if (oKey === "01") {
					vendorContractModel.setProperty("/totRuns", "999");
					vendorContractModel.setProperty("/totRunsEnable", false);
					vendorContractModel.setProperty("/rightendDtEnable", false);
					vendorContractModel.setProperty("/rightendDate", new Date("9999-12-31"));

				} else {
					vendorContractModel.setProperty("/totRuns", "");
					vendorContractModel.setProperty("/totRunsEnable", true);
					vendorContractModel.setProperty("/rightendDtEnable", true);
					vendorContractModel.setProperty("/rightendDate", null);

				}
				//vendorContractModel.refresh(true);
			},
			onSelectEpisodeModeIPR: function (oEvent) {
				var oselIndex = oEvent.getSource().getSelectedIndex();
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				if (oselIndex == 0) {
					vendorContractDetailInfo.episodeRangeVisibleIPR = false;
				} else {
					vendorContractDetailInfo.episodeRangeVisibleIPR = true;

				}
				vendorContractModel.refresh(true);
			},

			validateIPRDetails: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();

				if (vendorContractDetailInfo.episodeModeIPR === 1 && (vendorContractDetailInfo.epiIPRFromId === "" || vendorContractDetailInfo.epiIPRFromId ===
					undefined || vendorContractDetailInfo.epiIPRToId === "" || vendorContractDetailInfo.epiIPRToId === undefined)) {
					vendorContractDetailInfo.vcIPRDataMsgVisible = true;
					vendorContractDetailInfo.vcIPRDataErrorMsg = oSourceBundle.getText("msgSelectEpisode" + vendorContractDetailInfo.Cnttp);
					vendorContractModel.refresh(true);
					return false;
				// } else if (vendorContractDetailInfo.IPRRight === "" || vendorContractDetailInfo.PlatformKey === "" || vendorContractDetailInfo.totRuns ===
				// 	"" || vendorContractDetailInfo.amortKey === "" || vendorContractDetailInfo.nonAmortKey === "") {
				// 	vendorContractDetailInfo.vcIPRDataErrorMsg = oSourceBundle.getText("msgrequiredFieds");
				// 	vendorContractDetailInfo.vcIPRDataMsgVisible = true;
				// 	vendorContractModel.refresh(true);
				// 	return false;
				} else if (vendorContractDetailInfo.rightStDate === null || vendorContractDetailInfo.rightendDate === null) {
					// MessageBox.error(oSourceBundle.getText("msgrequiredFieds"));
					vendorContractDetailInfo.vcIPRDataErrorMsg = oSourceBundle.getText("msgrequiredFieds");
					vendorContractDetailInfo.vcIPRDataMsgVisible = true;
					vendorContractModel.refresh(true);
					return false;
				} else {
					return true;
				}
			},
			updateIPRData: function (IPRPayloadArr, IPRTableData) {

				var oResponse = {
					flag: true,
					oResTable: IPRTableData
				};
				var alreadyPushedEpisodes = [];
				IPRPayloadArr.map(function (obj) {
					var flagNewEntry = true;
					obj.flag = "Cr";

					for (var oInd = 0; oInd < IPRTableData.length; oInd++) {
						var vcEpiObj = IPRTableData[oInd];
						if (vcEpiObj.Epiid === obj.Epiid && vcEpiObj.Platform === obj.Platform && vcEpiObj.Contver === obj.Contver) {
							alreadyPushedEpisodes.push(obj.Epiid);
							flagNewEntry = false;
							break;
						}
					}
					if (flagNewEntry) {
						IPRTableData.push(obj);
					} else {
						if (IPRTableData[oInd].episodeSaveFlag) {
							obj.flag = "Ch";
						}
						//	delvTableData[oInd] = obj;
					}
				});
				if (alreadyPushedEpisodes.length > 0) {
					oResponse.flag = false;
					oResponse.oResTable = alreadyPushedEpisodes;
				} else {
					oResponse.flag = true;
					oResponse.oResTable = IPRTableData;
				}
				return oResponse;
			},

			
			onPushIPR: function () {
			
				var validateIPR = this.validateIPRDetails();
				if (validateIPR) {
					var vendorContractModel = this.getView().getModel("vendorContractModel");
					var vendorContractDetailInfo = vendorContractModel.getData();
					var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
					var selectedEpisodeList = [];
					var oselIndex = vendorContractDetailInfo.episodeModeIPR;
					var mapList = this.mapList
					var IPRPayloadArr = [];
					if (oselIndex == 0) {
						selectedEpisodeList = vendorContractDetailInfo.epIPRList;
					} else {
						selectedEpisodeList = [];
						vendorContractDetailInfo.epIPRList.map(function (epVCObj) {
							if (epVCObj.Epiid >= vendorContractDetailInfo.epiIPRFromId && epVCObj.Epiid <= vendorContractDetailInfo.epiIPRToId) {
								selectedEpisodeList.push(epVCObj);
							}

						});
					}

					selectedEpisodeList.map(function (selEpObj) {
						if(mapList.length > 0) {
						IPRPayloadArr.push({
							Tentid: "IBS",
							Dmno: vendorContractDetailInfo.Dmno,
							Dmver: vendorContractDetailInfo.Dmver,
							Epiid: selEpObj.Epiid, //Episode ID
							Contno: vendorContractDetailInfo.Contno,
							Conttp: "01",
							Contver: vendorContractDetailInfo.Contver,
							Iprrht: vendorContractDetailInfo.IPRRight,
							Rhtfrdt: vendorContractDetailInfo.rightStDate,
							Rhttodt: vendorContractDetailInfo.rightendDate,
							Norun: vendorContractDetailInfo.totRuns,
							// Leadamrtpt: vendorContractDetailInfo.amortKey,
							// Nleadamrtpt: vendorContractDetailInfo.nonAmortKey,
							Leadamrtpt: vendorContractDetailInfo.amortKey == "" ? mapList.find(t => t.Epiid == selEpObj.Epiid).Leadamrtpt : vendorContractDetailInfo.amortKey,
							Nleadamrtpt: vendorContractDetailInfo.nonAmortKey == "" ? mapList.find(t => t.Epiid == selEpObj.Epiid).Nleadamrtpt : vendorContractDetailInfo.nonAmortKey,
							Territory: vendorContractDetailInfo.territoryKey,
							Dubstitle: vendorContractDetailInfo.selAdditionalRights.indexOf("DB") >= 0 ? true : false,
							Stitile: vendorContractDetailInfo.selAdditionalRights.indexOf("SR") >= 0 ? true : false,
							Ntrpt: vendorContractDetailInfo.selAdditionalRights.indexOf("NR") >= 0 ? true : false,
							Exclrht: vendorContractDetailInfo.selAdditionalRights.indexOf("ER") >= 0 ? true : false,
							Estdt: vendorContractDetailInfo.selAdditionalRights.indexOf("ED") >= 0 ? true : false,
							Rhtstepid: "",
							Period: "",
							Dur: "",
							Platform: vendorContractDetailInfo.PlatformKey,
							Platformdsc: sap.ui.getCore().byId(vendorContractDetailInfo.PlatformItem).getText(),
							//for display
							Epinm: selEpObj.Epinm,
							Iprnm: sap.ui.getCore().byId(vendorContractDetailInfo.IPRItem).getText(),
							Tertnm: sap.ui.getCore().byId(vendorContractDetailInfo.TeritoryItem).getText(),
							// Leadnm: sap.ui.getCore().byId(vendorContractDetailInfo.AmortItem).getText(),
							// Nonleadnm: sap.ui.getCore().byId(vendorContractDetailInfo.NonAmortItem).getText(),
							Leadnm: vendorContractDetailInfo.amortKey != "" ? vendorContractDetailInfo.amortPatternList.find(g => g.Mstcd == vendorContractDetailInfo.amortKey ).Mstcdnm : mapList.find(g => g.Epiid == selEpObj.Epiid ).Leadnm,
							Nonleadnm: vendorContractDetailInfo.nonAmortKey != "" ? vendorContractDetailInfo.amortPatternList.find(g => g.Mstcd == vendorContractDetailInfo.nonAmortKey ).Mstcdnm : mapList.find(g => g.Epiid == selEpObj.Epiid ).Nonleadnm,
							IPREditFlag: vendorContractDetailInfo.IPRRight === "01" ? false : true,
							flag: "Cr"
							
						});
					} else {
						IPRPayloadArr.push({
							Tentid: "IBS",
							Dmno: vendorContractDetailInfo.Dmno,
							Dmver: vendorContractDetailInfo.Dmver,
							Epiid: selEpObj.Epiid, //Episode ID
							Contno: vendorContractDetailInfo.Contno,
							Conttp: "01",
							Contver: vendorContractDetailInfo.Contver,
							Iprrht: vendorContractDetailInfo.IPRRight,
							Rhtfrdt: vendorContractDetailInfo.rightStDate,
							Rhttodt: vendorContractDetailInfo.rightendDate,
							Norun: vendorContractDetailInfo.totRuns,
							Leadamrtpt: vendorContractDetailInfo.amortKey,
							Nleadamrtpt: vendorContractDetailInfo.nonAmortKey,
							Territory: vendorContractDetailInfo.territoryKey,
							Dubstitle: vendorContractDetailInfo.selAdditionalRights.indexOf("DB") >= 0 ? true : false,
							Stitile: vendorContractDetailInfo.selAdditionalRights.indexOf("SR") >= 0 ? true : false,
							Ntrpt: vendorContractDetailInfo.selAdditionalRights.indexOf("NR") >= 0 ? true : false,
							Exclrht: vendorContractDetailInfo.selAdditionalRights.indexOf("ER") >= 0 ? true : false,
							Estdt: vendorContractDetailInfo.selAdditionalRights.indexOf("ED") >= 0 ? true : false,
							Rhtstepid: "",
							Period: "",
							Dur: "",
							Platform: vendorContractDetailInfo.PlatformKey,
							Platformdsc: sap.ui.getCore().byId(vendorContractDetailInfo.PlatformItem).getText(),
							//for display
							Epinm: selEpObj.Epinm,
							Iprnm: sap.ui.getCore().byId(vendorContractDetailInfo.IPRItem).getText(),
							Tertnm: sap.ui.getCore().byId(vendorContractDetailInfo.TeritoryItem).getText(),
							Leadnm: vendorContractDetailInfo.amortKey != "" ? sap.ui.getCore().byId(vendorContractDetailInfo.AmortItem).getText() : "",
							Nonleadnm:  vendorContractDetailInfo.nonAmortKey != "" ? sap.ui.getCore().byId(vendorContractDetailInfo.NonAmortItem).getText() : "", 
							IPREditFlag: vendorContractDetailInfo.IPRRight === "01" ? false : true,
							flag: "Cr"
							
						});
					}
					}.bind(this));

					var oResp = this.updateIPRData(IPRPayloadArr, $.extend(true, [], vendorContractDetailInfo.vcIPRData));
					if (oResp.flag) {
						vendorContractDetailInfo.vcIPRData = oResp.oResTable;
						vendorContractModel.refresh(true);
					} else {

						var epiIds = oResp.oResTable.join(",");
						var oMsg = oSourceBundle.getText("lblForEpisodes" + vendorContractDetailInfo.Cnttp) + " " + epiIds + " Platform '" + sap.ui.getCore()
							.byId(vendorContractDetailInfo.PlatformItem).getText() + "' is already pushed";
						MessageBox.error(oMsg);
					}
					this._oSelectIPRDialog.close();
				}


			},

			onValueHelpAmort: function (oEvent) {
				var oPath = oEvent.getSource().getBindingContext("vendorContractModel").sPath;
				oEvent.getSource().getBindingContext("vendorContractModel").getObject().flag = "Ch";
				this.getView().getModel("vendorContractModel").refresh(true);
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				this.oValueHelpSelectionParams = {
					"bindPathName": "vendorContractModel>/amortPatternList",
					"bindPropName": "vendorContractModel>Mstcdnm",
					"bindPropDescName": "vendorContractModel>Mstcd",
					"propName": "Mstcdnm",
					"keyName": "Mstcd",
					"valuePath": oPath + "/Leadnm",
					"keyPath": oPath + "/Leadamrtpt",
					"valueModel": "vendorContractModel",
					"dialogTitle": oSourceBundle.getText("titleLeadingAmort")
				};
				this.openSelectionDialog();
			},
			onValueHelpNonAmort: function (oEvent) {
				var oPath = oEvent.getSource().getBindingContext("vendorContractModel").sPath;
				oEvent.getSource().getBindingContext("vendorContractModel").getObject().flag = "Ch";
				this.getView().getModel("vendorContractModel").refresh(true);
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				this.oValueHelpSelectionParams = {
					"bindPathName": "vendorContractModel>/nonAmmortPatternList",
					"bindPropName": "vendorContractModel>Mstcdnm",
					"bindPropDescName": "vendorContractModel>Mstcd",
					"propName": "Mstcdnm",
					"keyName": "Mstcd",
					"valuePath": oPath + "/Nonleadnm",
					"keyPath": oPath + "/Nleadamrtpt",
					"valueModel": "vendorContractModel",
					"dialogTitle": oSourceBundle.getText("titleNonLeadingAmort")
				};
				this.openSelectionDialog();
			},
			onValueHelpTerritory: function (oEvent) {
				var oPath = oEvent.getSource().getBindingContext("vendorContractModel").sPath;
				oEvent.getSource().getBindingContext("vendorContractModel").getObject().flag = "Ch";
				this.getView().getModel("vendorContractModel").refresh(true);
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				this.oValueHelpSelectionParams = {
					"bindPathName": "vendorContractModel>/teritoryList",
					"bindPropName": "vendorContractModel>Mstcdnm",
					"bindPropDescName": "vendorContractModel>Mstcd",
					"propName": "Mstcdnm",
					"keyName": "Mstcd",
					"valuePath": oPath + "/Tertnm",
					"keyPath": oPath + "/Territory",
					"valueModel": "vendorContractModel",
					"dialogTitle": oSourceBundle.getText("titleTerritory")
				};
				this.openSelectionDialog();
			},

			saveIPRTabVC: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var alreadySavedflag = true;
				var epiIPRtabData = vendorContractDetailInfo.vcIPRData;
				var oModel = this.getView().getModel();
				oModel.sDefaultUpdateMethod = "PUT";
				oModel.setUseBatch(true);
				oModel.setDeferredGroups(oModel.getDeferredGroups().concat(["epiIPRVCChanges"]));
				var mParameters = {
					groupId: "epiIPRVCChanges",
					success: function (data, resp) {

						var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
						MessageToast.show(oSourceBundle.getText("msgepiVCIPRSave"));
						this.reloadVendorContractTabs();

					}.bind(this),
					error: function (oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				};

				epiIPRtabData.map(function (oEpiIPRObj) {
					var epiIPRObj = $.extend(true, {}, oEpiIPRObj);
					delete epiIPRObj.IPREditFlag;
					epiIPRObj.Rhtfrdt = Formatter.formatDateValForBackend(epiIPRObj.Rhtfrdt);
					epiIPRObj.Rhttodt = Formatter.formatDateValForBackend(epiIPRObj.Rhttodt)
					if (epiIPRObj.flag === "Cr") {
						alreadySavedflag = false;
						delete epiIPRObj.flag;
						oModel.create("/DmVrSet", epiIPRObj, {
							groupId: "epiIPRVCChanges"
						});
					} else if (epiIPRObj.flag === "Ch") {
						alreadySavedflag = false;
						delete epiIPRObj.flag;
						delete epiIPRObj.episodeSaveFlag;

						var oPath = "/DmVrSet(Tentid='IBS',Dmno='" + vendorContractDetailInfo.Dmno + "',Dmver='" + vendorContractDetailInfo.Dmver +
							"',Contno='" + vendorContractDetailInfo.Contno + "',Contver='" + vendorContractDetailInfo.Contver + "',Platform='" + epiIPRObj
								.Platform + "',Epiid='" + epiIPRObj.Epiid + "')";

						oModel.update(oPath, epiIPRObj, {
							groupId: "epiIPRVCChanges"
						});

					}
				}.bind(this));
				if (alreadySavedflag) {
					var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.information(oSourceBundle.getText("msgAlreadysave"));
				} else {
					oModel.submitChanges(mParameters);
				}

			},

			onSaveVendorContract: function () {
				sap.ui.core.BusyIndicator.show(0);
				var oTab = this.getView().byId("idVCTabBar").getSelectedKey();
				if (oTab === "vcEpiData") {
					this.createEpiTabVC();
				} else if (oTab === "vcPaymentData") {
					this.savePaymentTabVC();
				} else if (oTab === "vcDeliveryData") {
					this.saveDeliveryTabVC();
				} else if (oTab === "vcIPRData") {
					this.saveIPRTabVC();
				}
				sap.ui.core.BusyIndicator.hide();
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
			onExport: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var labelOnType = {
					"01": "Episode ID",
					"02": "Movie ID",
					"05": "Match ID",
					"03": "Episode ID",
					"04": "Episode ID",
					"06": "Episode ID",
					"07": "Episode ID",
					"08": "Episode ID"
				};

				var aCols = [{
					ind: 0,
					label: labelOnType[vendorContractDetailInfo.Cnttp],
					property: "Epiid",
					type: EdmType.Number,

				}, {
					ind: 1,
					label: "IPR Rights",
					property: "IPRRights"
				}, {
					ind: 2,
					label: "Platform",
					property: "Platform"
				}, {
					ind: 3,
					label: "Rights Start Date(YYYY-MM-dd)",
					property: "RightsStartDate"
				}, {
					ind: 4,
					label: "Rights End Date(YYYY-MM-dd)",
					property: "RightsEndDate"
				}, {
					ind: 5,
					label: "No. of Run",
					property: "NoofRun"
				}, {
					ind: 6,
					label: "Leading Amort Pattern",
					property: "LeadingAmortPattern"
				}, {
					ind: 7,
					label: "Non Leading Amort Pattern",
					property: "NonLeadingAmortPattern"
				}, {
					ind: 8,
					label: "Territory",
					property: "Territory"
				}];

				var aData = [];
				var epIds = [];
				vendorContractDetailInfo.epiVCTabData.map(function (obj) {
					if (epIds.indexOf(obj.Epiid) === -1) {
						aData.push({

							Epiid: obj.Epiid,
							IPRRights: "",
							Platform: "",
							RightsStartDate: "",
							RightsEndDate: "",
							NoofRun: "",
							LeadingAmortPattern: "",
							NonLeadingAmortPattern: "",
							Territory: ""

						});

						epIds.push(obj.Epiid);
					}
				});

				var oSheet = new Spreadsheet({
					workbook: {
						columns: aCols
					},
					dataSource: aData,
					fileName: 'IPR Rights Template.xlsx'
				});

				oSheet.build()
					.then(function () {
						debugger;
					})
					.finally(oSheet.destroy);

			},
			onExportIPRDetails: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var IPRRightsList = $.extend(true, [], vendorContractDetailInfo.IPRRightsList);
				var platformList = $.extend(true, [], vendorContractDetailInfo.platformList);
				var territoryList = $.extend(true, [], vendorContractDetailInfo.teritoryList);
				var amortPatternList = $.extend(true, [], vendorContractDetailInfo.amortPatternList);
				var nonmortPatternList = $.extend(true, [], vendorContractDetailInfo.nonAmmortPatternList);

				var aColsIPRRights = [{
					ind: 0,
					label: "IPR Rights",
					property: "IPRRight",

				}, {
					ind: 1,
					label: "Platform",
					property: "Platform",

				}, {
					ind: 2,
					label: "Territory",
					property: "Territory",

				}, {
					ind: 3,
					label: "Leading Amort Pattern",
					property: "LeadingAmort",

				}, {
					ind: 4,
					label: "Non Leading Amort Pattern",
					property: "NonLeadingAmort",

				}];
				var entryPush = true;
				var oDataSourceIPRRights = [];
				while (entryPush) {
					var IPRRight = "";
					var Platform = "";
					var Territory = "";
					var LeadingAmort = "";
					var NonLeadingAmort = "";

					if (IPRRightsList.length) {
						IPRRight = IPRRightsList[0].Mstcd + " - " + IPRRightsList[0].Mstcdnm;
					}
					if (platformList.length) {
						Platform = platformList[0].Mstcd + " - " + platformList[0].Mstcdnm;
					}
					if (territoryList.length) {
						Territory = territoryList[0].Mstcd + " - " + territoryList[0].Mstcdnm;
					}
					if (amortPatternList.length) {
						LeadingAmort = amortPatternList[0].Mstcd + " - " + amortPatternList[0].Mstcdnm;
					}
					if (nonmortPatternList.length) {
						NonLeadingAmort = nonmortPatternList[0].Mstcd + " - " + nonmortPatternList[0].Mstcdnm;
					}
					var oDataObj = {
						IPRRight: IPRRight,
						Platform: Platform,
						Territory: Territory,
						LeadingAmort: LeadingAmort,
						NonLeadingAmort: NonLeadingAmort
					};
					oDataSourceIPRRights.push(oDataObj);
					if (IPRRightsList.length) {
						IPRRightsList.splice(0, 1);
					}
					if (platformList.length) {
						platformList.splice(0, 1);
					}
					if (territoryList.length) {
						territoryList.splice(0, 1);
					}
					if (amortPatternList.length) {
						amortPatternList.splice(0, 1);
					}
					if (nonmortPatternList.length) {
						nonmortPatternList.splice(0, 1);
					}
					if (IPRRightsList.length === 0 && platformList.length === 0 && territoryList.length === 0 && amortPatternList.length === 0 &&
						nonmortPatternList.length === 0) {
						entryPush = false;
					}

				}

				var oSheet1 = new Spreadsheet({
					workbook: {
						columns: aColsIPRRights
					},
					dataSource: oDataSourceIPRRights,
					fileName: 'IPR Rights Details.xlsx',
				});

				oSheet1.build()
					.then(function () {
						debugger;
					})
					.finally(oSheet1.destroy);
			},
			onUploadIPR: function () {
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				if (!this._oUploadIPRSheetDialog) {
					Fragment.load({
						id: this.createId("uploadIPRSheetDialog"),
						name: "com.ui.dealmemolocal.fragments.UploadCostSheetDialog",
						controller: this
					}).then(function name(oFragment) {
						this._oUploadIPRSheetDialog = oFragment;
						this.getView().addDependent(this._oUploadIPRSheetDialog);
						this._oUploadIPRSheetDialog.setTitle(oSourceBundle.getText("lblUploadIPRTemplate"));
						this.byId(sap.ui.core.Fragment.createId("uploadIPRSheetDialog", "fileUploader")).setValue("");
						this._oUploadIPRSheetDialog.open();
					}.bind(this));
				} else {
					this.byId(sap.ui.core.Fragment.createId("uploadIPRSheetDialog", "fileUploader")).setValue("");
					this._oUploadIPRSheetDialog.open();
				}
			},
			getIPRPayload: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				return {
					Tentid: "IBS",
					Dmno: vendorContractDetailInfo.Dmno,
					Dmver: vendorContractDetailInfo.Dmver,
					Epiid: "", //Episode ID
					Contno: vendorContractDetailInfo.Contno,
					Conttp: "01",
					Contver: vendorContractDetailInfo.Contver,
					Iprrht: "",
					Rhtfrdt: null,
					Rhttodt: null,
					Norun: "",
					Leadamrtpt: "",
					Nleadamrtpt: "",
					Territory: "",
					Dubstitle: false,
					Stitile: false,
					Ntrpt: false,
					Exclrht: false,
					Estdt: false,
					Rhtstepid: "",
					Period: "",
					Dur: "",
					Platform: "",
					Platformdsc: "",
					//for display
					Epinm: "",
					Iprnm: "",
					Tertnm: "",
					Leadnm: "",
					Nonleadnm: "",
					IPREditFlag: false,
					flag: "Cr"
				}

			},
			uploadIPRData: function (uploadedData, oControllerRef) {
				var vendorContractModel = oControllerRef.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var IPRRightsList = $.extend(true, [], vendorContractDetailInfo.IPRRightsList);
				var IPRListIds = IPRRightsList.map(function (obj) {
					return obj.Mstcd;
				});
				var platformList = $.extend(true, [], vendorContractDetailInfo.platformList);
				var platformListIds = platformList.map(function (obj) {
					return obj.Mstcd;
				});
				var territoryList = $.extend(true, [], vendorContractDetailInfo.teritoryList);
				var territoryListIds = territoryList.map(function (obj) {
					return obj.Mstcd;
				});
				var amortPatternList = $.extend(true, [], vendorContractDetailInfo.amortPatternList);
				var amortPatternIds = amortPatternList.map(function (obj) {
					return obj.Mstcd;
				});
				var nonmortPatternList = $.extend(true, [], vendorContractDetailInfo.nonAmmortPatternList);
				var nonmortPatternListIds = nonmortPatternList.map(function (obj) {
					return obj.Mstcd;
				});
				var oDateFormatter = sap.ui.core.format.DateFormat.getDateInstance({
					pattern: "yyyy-MM-dd",
					strictParsing: true
				});

				var statusFlag = true;
				var oMsg = "";
				var epIds = [];
				var episodeList = [];
				vendorContractDetailInfo.epiVCTabData.map(function (obj) {
					if (epIds.indexOf(obj.Epiid) === -1) {
						epIds.push(obj.Epiid);
						episodeList.push(obj);
					}
				});
				var epiIds = episodeList.map(function (obj) {
					return parseInt(obj.Epiid);
				});
				var IPRPayloadArr = [];
				var platformListForEpisodes = {};
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();

				for (var oIndex = 0; oIndex < uploadedData.length; oIndex++) {
					var epiObj = uploadedData[oIndex];
					var IPRPayload = $.extend(true, {}, this.getIPRPayload());
					var aKeys = Object.keys(epiObj);

					if (aKeys.indexOf("Episode ID") === -1 && vendorContractDetailInfo.Cnttp === "01" || aKeys.indexOf("Movie ID") === -1 &&
						vendorContractDetailInfo.Cnttp === "02" || aKeys.indexOf("Match ID") === -1 && vendorContractDetailInfo.Cnttp === "05") {
						statusFlag = false;
						oMsg = oSourceBundle.getText("msgMovIdNonBlank" + vendorContractDetailInfo.Cnttp);
						break;
					} else if (aKeys.indexOf("IPR Rights") === -1) {
						statusFlag = false;
						oMsg = oSourceBundle.getText("msgIPRRightsNonBlank");
						break;
					} else if (aKeys.indexOf("Platform") === -1) {
						statusFlag = false;
						oMsg = oSourceBundle.getText("msgPlatformNonBlank");
						break;
					} else if (aKeys.indexOf("Rights Start Date(YYYY-MM-dd)") === -1) {
						statusFlag = false;
						oMsg = oSourceBundle.getText("msgRightStrtDateNonBlank");
						break;
					}
					//				else if(aKeys.indexOf("Rights End Date(YYYY-MM-dd)") === -1 && IPRPayload.Iprrht  === "02"){
					//					statusFlag = false;
					//					oMsg =  oSourceBundle.getText("msgRightEndDateNonBlank");
					//					break;
					//				}
					//				else if(aKeys.indexOf("No. of Run") === -1 && IPRPayload.Iprrht  === "02"){
					//					statusFlag = false;
					//					oMsg =  oSourceBundle.getText("msgNoOfRunNonBlank");
					//					break;
					//				}
					else if (aKeys.indexOf("Leading Amort Pattern") === -1) {
						statusFlag = false;
						oMsg = oSourceBundle.getText("msgLeadingAmrtNonBlank");
						break;
					} else if (aKeys.indexOf("Non Leading Amort Pattern") === -1) {
						statusFlag = false;
						oMsg = oSourceBundle.getText("msgNonLeadingAmrtNonBlank");
						break;
					} else if (aKeys.indexOf("Territory") === -1) {
						statusFlag = false;
						oMsg = oSourceBundle.getText("msgTerritoryNonBlank");
						break;
					}

					for (var cnt = 0; cnt < aKeys.length; cnt++) {
						var aKey = aKeys[cnt];
						if (aKey === "Episode ID" || aKey === "Movie ID" || aKey === "Match ID") {
							if (epiObj[aKey] === "" || epiObj[aKey] === null) {
								statusFlag = false;
								oMsg = oSourceBundle.getText("msgMovIdNonBlank" + vendorContractDetailInfo.Cnttp);
								break;
							}
							//						else if(!isNaN(epiObj[aKey]) && !isNaN(parseInt(epiObj[aKey]))){
							//							statusFlag = false;
							//							oMsg =  oSourceBundle.getText("msgMovIdNumericOnly" + vendorContractDetailInfo.Cnttp);
							//							break;
							//						}
							else if (epiIds.indexOf(parseInt(epiObj[aKey])) >= 0) {
								IPRPayload.Epiid = episodeList[epiIds.indexOf(parseInt(epiObj[aKey]))].Epiid;
								IPRPayload.Epinm = episodeList[epiIds.indexOf(parseInt(epiObj[aKey]))].Epinm;
								//								if(aKeys.indexOf("Platform") >= 0){
								//									var platformId = epiObj[aKeys.indexOf("Platform")].split("-")[0].trim();
								//									if(platformListForEpisodes[epiObj[aKey]] === undefined || platformListForEpisodes[epiObj[aKey]] === null){
								//										platformListForEpisodes[epiObj[aKey]] = [];
								//										platformListForEpisodes[epiObj[aKey]].push(platformId);
								//									}
								//									else if(platformListForEpisodes[epiObj[aKey]].indexOf(platformId) === -1){
								//										platformListForEpisodes[epiObj[aKey]].push(platformId);
								//									}
								//									else if(platformListForEpisodes[epiObj[aKey]].indexOf(platformId) >= 0){
								//										statusFlag = false;
								//										oMsg =  oSourceBundle.getText("msgDuplicatePlatform" + vendorContractDetailInfo.Cnttp,epiObj[aKey]);
								//										break;
								//									}
								//								}

							} else {
								statusFlag = false;
								oMsg = oSourceBundle.getText("msgInvalidID" + vendorContractDetailInfo.Cnttp, epiObj[aKey]);
								break;
							}
						}

						if (aKey === "IPR Rights") {
							if (epiObj[aKey] === "" || epiObj[aKey] === null) {
								statusFlag = false;
								oMsg = oSourceBundle.getText("msgIPRRightsNonBlank");
								break;
							} else {
								IPRPayload.Iprrht = epiObj[aKey].split("-")[0].trim();
								IPRPayload.Iprnm = epiObj[aKey].split("-")[1].trim();
								IPRPayload.IPREditFlag = false;
								if (IPRPayload.Iprrht === "02") {
									IPRPayload.IPREditFlag = true;
								}
								//	if(IPRPayload.Iprrht  === "01"){
								if (aKeys.indexOf("Rights End Date(YYYY-MM-dd)") === -1) {
									epiObj['Rights End Date(YYYY-MM-dd)'] = "";
									aKeys.push("Rights End Date(YYYY-MM-dd)");
								}
								if (aKeys.indexOf("No. of Run") === -1) {
									epiObj['No. of Run'] = "";
									aKeys.push("No. of Run");
								}
								//}

							}
						}

						if (aKey === "Platform") {
							if (epiObj[aKey] === "" || epiObj[aKey] === null) {
								statusFlag = false;
								oMsg = oSourceBundle.getText("msgPlatformNonBlank");
								break;
							} else {

								IPRPayload.Platform = epiObj[aKey].split("-")[0].trim();
								IPRPayload.Platformdsc = epiObj[aKey].split("-")[1].trim();

							}
						}

						if (aKey === "Rights Start Date(YYYY-MM-dd)") {
							if (epiObj[aKey] === "" || epiObj[aKey] === null) {
								statusFlag = false;
								oMsg = oSourceBundle.getText("msgRightStrtDateNonBlank");
								break;
							} else {
								var strtDt = new Date(epiObj[aKey]);
								if (oDateFormatter.parse(epiObj[aKey]) === null) {
									statusFlag = false;
									oMsg = oSourceBundle.getText("msgInvalidRightStartDt");
									break;
								} else {
									IPRPayload.Rhtfrdt = strtDt;
								}
							}
						}
						if (aKey === "Rights End Date(YYYY-MM-dd)") {

							var flagUploadRtEndDt = false;
							if (IPRPayload.Iprrht === "01") {
								if (epiObj[aKey] !== "") {
									statusFlag = false;
									oMsg = oSourceBundle.getText("msgRightEndDateBlankForAllIPR");
									break;
								} else {
									flagUploadRtEndDt = true;
								}

							}
							if (IPRPayload.Iprrht === "02") {
								if (aKeys.indexOf("Rights End Date(YYYY-MM-dd)") === -1) {
									statusFlag = false;
									oMsg = oSourceBundle.getText("msgRightEndDateNonBlank");
									break;
								} else if (epiObj[aKey] === "" || epiObj[aKey] === null) {
									statusFlag = false;
									oMsg = oSourceBundle.getText("msgRightEndDateNonBlank");
									break;
								} else {
									flagUploadRtEndDt = true;
								}

							}
							if (flagUploadRtEndDt) {
								if (IPRPayload.Iprrht === "01") {
									var endDt = new Date("9999-12-31");
								} else {
									var endDt = new Date(epiObj[aKey]);
									if (oDateFormatter.parse(epiObj[aKey]) === null) {
										statusFlag = false;
										oMsg = oSourceBundle.getText("msgInvalidRightEndDt");
										break;
									}
								}
								IPRPayload.Rhttodt = endDt;

							}
							//						if(epiObj[aKey] === "" || epiObj[aKey] === null && IPRPayload.Iprrht  === "02"){
							//								statusFlag = false;
							//								oMsg =  oSourceBundle.getText("msgRightEndDateNonBlank");
							//								break;
							//							
							//						}
							//						else if(epiObj[aKey] !== "" || epiObj[aKey] !== null && IPRPayload.Iprrht  === "01"){
							//							statusFlag = false;
							//							oMsg =  oSourceBundle.getText("msgRightEndDateBlankForAllIPR");
							//							break;
							//						
							//						}
							//						else{
							//							if(IPRPayload.Iprrht  === "01"){
							//								var endDt =  new Date("9999-12-31");
							//							}
							//							else{
							//								var endDt =  new Date(epiObj[aKey]);
							//							}
							//							
							//							if(oDateFormatter.parse(epiObj[aKey]) === null){
							//								statusFlag = false;
							//								oMsg =  oSourceBundle.getText("msgInvalidRightEndDt");
							//								break;
							//							}
							//							else{
							//								IPRPayload.Rhttodt = endDt;
							//							}
							//						}
						}
						if (aKey === "No. of Run") {

							var flagUploadNoOfRun = false;
							if (IPRPayload.Iprrht === "01") {
								if (epiObj[aKey] !== "") {
									statusFlag = false;
									oMsg = oSourceBundle.getText("msgRightEndDateBlankForAllIPR");
									break;
								} else {
									flagUploadNoOfRun = true;
								}

							}
							if (IPRPayload.Iprrht === "02") {
								if (aKeys.indexOf("No. of Run") === -1) {
									statusFlag = false;
									oMsg = oSourceBundle.getText("msgNoOfRunNonBlank");
									break;
								} else if (epiObj[aKey] === "" || epiObj[aKey] === null) {
									statusFlag = false;
									oMsg = oSourceBundle.getText("msgNoOfRunNonBlank");
									break;
								} else {
									flagUploadNoOfRun = true;
								}

							}
							//						if(epiObj[aKey] === "" || epiObj[aKey] === null && IPRPayload.Iprrht  === "02"){
							//							statusFlag = false;
							//							oMsg =  oSourceBundle.getText("msgNoOfRunNonBlank");
							//							break;
							//						}
							//						else if(epiObj[aKey] !== "" || epiObj[aKey] !== null && IPRPayload.Iprrht  === "01"){
							//							statusFlag = false;
							//							oMsg =  oSourceBundle.getText("msgRightEndDateBlankForAllIPR");
							//							break;
							//						
							//						}
							if (flagUploadNoOfRun) {

								if (IPRPayload.Iprrht === "01") {
									IPRPayload.Norun = "999";
								} else {
									if (isNaN(epiObj[aKey])) {
										statusFlag = false;
										oMsg = oSourceBundle.getText("msgNoOfRunNumericOnly");
										break;
									} else if (parseInt(epiObj[aKey]) <= 0) {
										statusFlag = false;
										oMsg = oSourceBundle.getText("msgNoOfRunNonZero");
										break;
									} else {

										IPRPayload.Norun = epiObj[aKey];
									}
								}

							}
						}
						if (aKey === "Leading Amort Pattern") {
							if (epiObj[aKey] === "" || epiObj[aKey] === null) {
								statusFlag = false;
								oMsg = oSourceBundle.getText("msgLeadingAmrtNonBlank");
								break;
							} else {

								IPRPayload.Leadamrtpt = epiObj[aKey].split("-")[0].trim();
								IPRPayload.Leadnm = epiObj[aKey].split("-")[1].trim();

							}
						}
						if (aKey === "Non Leading Amort Pattern") {
							if (epiObj[aKey] === "" || epiObj[aKey] === null) {
								statusFlag = false;
								oMsg = oSourceBundle.getText("msgNonLeadingAmrtNonBlank");
								break;
							} else {

								IPRPayload.Nleadamrtpt = epiObj[aKey].split("-")[0].trim();
								IPRPayload.Nonleadnm = epiObj[aKey].split("-")[1].trim();

							}
						}
						if (aKey === "Territory") {
							if (epiObj[aKey] === "" || epiObj[aKey] === null) {
								statusFlag = false;
								oMsg = oSourceBundle.getText("msgTerritoryNonBlank");
								break;
							} else {

								IPRPayload.Territory = epiObj[aKey].split("-")[0].trim();
								IPRPayload.Tertnm = epiObj[aKey].split("-")[1].trim();

							}
						}

					}

					if (!statusFlag) {
						break;
					} else {
						IPRPayloadArr.push(IPRPayload);
					}
				}
				if (!statusFlag) {
					MessageBox.error(oMsg);
				} else {
					var oResp = oControllerRef.updateIPRData(IPRPayloadArr, $.extend(true, [], vendorContractDetailInfo.vcIPRData));
					if (oResp.flag) {
						vendorContractDetailInfo.vcIPRData = oResp.oResTable;
						vendorContractModel.refresh(true);
						oControllerRef._oUploadIPRSheetDialog.close();
					} else {

						var epiIds = oResp.oResTable.join(",");
						var oMsg = oSourceBundle.getText("lblForEpisodes" + vendorContractDetailInfo.Cnttp) + " " + epiIds +
							" duplicate Platform is pushed";
						MessageBox.error(oMsg);
					}
				}

			},
			handleUploadCostSheetCancel: function () {
				this._oUploadIPRSheetDialog.close();
			},
			handleUploadPress: function () {
				var oFileUploader = this.byId(sap.ui.core.Fragment.createId("uploadIPRSheetDialog", "fileUploader")); // get the sap.ui.unified.FileUploader
				var file = oFileUploader.getFocusDomRef().files[0]; // get the file from the FileUploader control
				var oControllerRef = this;

				if (file && window.FileReader) {
					var reader = new FileReader();
					reader.onload = function (e) {
						var data = e.target.result;
						var excelsheet = XLSX.read(data, {
							type: "binary"
						});
						excelsheet.SheetNames.forEach(function (sheetName) {
							var oExcelRow = XLSX.utils.sheet_to_row_object_array(excelsheet.Sheets[sheetName]); // this is the required data in Object format
							var sJSONData = JSON.stringify(oExcelRow); // this is the required data in String format
							oControllerRef.uploadIPRData(oExcelRow, oControllerRef);
						});
					};
					reader.readAsBinaryString(file);
				}
			},
			onTabSelectionVC: function () {
				var oTab = this.getView().byId("idVCTabBar").getSelectedKey();
				var oSubTab = this.getView().byId("idVCPayTabBar2").getSelectedKey();
				if (oTab === "releaseStatus") {
					this.loadReleaseStatusDetails();
				}
				if (oSubTab === "milestoneTab") {
					this.loadMileTabDetails();
				}

			},
			onConfirmChangeVC: function () {
				var oModel = this.getView().getModel();
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();

				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				MessageBox.confirm(oSourceBundle.getText("msgcreateNewVersion"), {
					actions: [oSourceBundle.getText("lblYes"), oSourceBundle.getText("lblNo")],
					emphasizedAction: "Yes",
					onClose: function (sAction) {
						if (sAction === oSourceBundle.getText("lblYes")) {

							this.onChangeVC();
						} else if (sAction === oSourceBundle.getText("lblNo")) {

						}
					}.bind(this)
				});

			},

			onChangeVC: function () {
				sap.ui.core.BusyIndicator.show(0);
				var oModel = this.getView().getModel();
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var paramObj = {
					"IV_TENTID": "IBS",
					"IV_DMNO": vendorContractDetailInfo.Dmno,
					"IV_DMVER": vendorContractDetailInfo.Dmver,
					"IV_CONTNO": vendorContractDetailInfo.Contno,
					"IV_CONTVER": vendorContractDetailInfo.Contver,
					"IV_CONTTP": vendorContractDetailInfo.Conttp

				};
				oModel.callFunction("/GenerateContVersion", {
					method: "GET",
					urlParameters: paramObj,
					success: function (oData, response) {
						sap.ui.core.BusyIndicator.hide();
						// vendorContractDetailInfo.setProperty("/costCodes", oData.results);
						vendorContractModel.refresh(true);
						this.newVersionCreated = true;
						this.RouteVendorContractAfterChange();

					}.bind(this),
					error: function (oError) {
						sap.ui.core.BusyIndicator.hide();
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);

					}
				})
			},
			RouteVendorContractAfterChange: function () {
				var oRouter = this.getOwnerComponent().getRouter();
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				// var oContractItem = oEvent.getParameters()['listItem'].getBindingContext("dealMemoDetailModel").getObject();
				var newVersionCv = parseInt(vendorContractDetailInfo.Contver) + parseInt("1");
				vendorContractDetailInfo.Contver = "00" + newVersionCv;

				// var newVersionDv = parseInt(vendorContractDetailInfo.Dmver) + parseInt("1");
				// vendorContractDetailInfo.Dmver = "00" + newVersionDv;

				oRouter.navTo("VendorContract", {
					"Dmno": vendorContractDetailInfo.Dmno,
					"Dmver": vendorContractDetailInfo.Dmver,
					"Contno": vendorContractDetailInfo.Contno,
					"Contver": vendorContractDetailInfo.Contver,
					"App": vendorContractDetailInfo.App
				});
			},
			//Release Status
			getDateInMS: function (date, time) {
				date.setHours(0, 0, 0, 0);
				var Actdt = date.getTime();
				var Time = time;
				var DtTime = Actdt + Time;
				DtTime = "Date(" + DtTime + ")";
				return DtTime;

			},
			loadMileTabDetails: function () {
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				var srvUrl = "/sap/opu/odata/IBSCMS/DEALMEMO_SRV";
				var oModelSav = new sap.ui.model.odata.ODataModel(srvUrl, true, "", "");
				var oPath = "/DmCmMileWiseSet?$filter=Tentid eq 'IBS'and Dmno eq '" + vendorContractDetailInfo.Dmno + "' and Dmver eq '" +
					vendorContractDetailInfo.Dmver +
					"' and Contno eq '" + vendorContractDetailInfo.Contno + "' and Conttp eq '01' and Contver eq'" + vendorContractDetailInfo.Contver +
					"'";
				var oModel = this.getView().getModel();
				oModelSav.read(oPath, null, null, true, function (oData) {
					var oModel = new sap.ui.model.json.JSONModel(oData);
					oModel.setSizeLimit("999999");

					vendorContractModel.setProperty("/mileWiseList", oData.results);
					vendorContractModel.refresh(true);
				}, function (value) {
					sap.ui.core.BusyIndicator.hide();
					console.log(value);
					//alert("fail");
				});
				// var count = {};
				// vendorContractDetailInfo.DmCmSet.results.forEach(v =>{
				// 	count[v] = (count[v] || 0 ) + 1
				// })		

			},
			loadReleaseStatusDetails: function () {
				var oModel = this.getView().getModel();
				var vendorContractModel = this.getView().getModel("vendorContractModel");
				var vendorContractDetailInfo = vendorContractModel.getData();
				vendorContractDetailInfo.relStatustabcolor = "Critical";
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
					new Filter("Dmno", "EQ", vendorContractDetailInfo.Dmno),
					new Filter("Dmver", "EQ", vendorContractDetailInfo.Dmver),
					new Filter("Contno", "EQ", vendorContractDetailInfo.Contno),
					new Filter("Contver", "EQ", vendorContractDetailInfo.Contver),
					new Filter("Conttp", "EQ", vendorContractDetailInfo.Conttp)
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
							var relStObj = $.extend(true, {}, releaseStatusObj);
							relStObj.Author = obj.Usernm;
							relStObj.Status = obj.Usractiondesc;
							relStObj.icon = iconUserActionMap[obj.Usraction].icon;
							relStObj.state = iconUserActionMap[obj.Usraction].state;
							if (relStObj.Actdt != null) { //Added By Dhiraj Sarang for release strategy error
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
						}.bind(this));
						vendorContractDetailInfo.releaseStatusInfo = releaseStatusInfo;
						if (releaseStatusInfo.length) {
							vendorContractDetailInfo.relStatustabcolor = "Positive";
						}
						vendorContractModel.refresh(true);

					}.bind(this),
					error: function (oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}

				})
			},
		});

	});