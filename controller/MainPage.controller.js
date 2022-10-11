var that = null;
var TabFlg = 0;
var lCtr = 0;
var status = "";
sap.ui.define([
		"sap/ui/core/mvc/Controller",
		"sap/ui/model/Filter",
		"sap/ui/model/FilterOperator",
		"com/ui/dealmemolocal/model/formatter",
		"sap/m/MessageBox",
		"sap/m/MessageToast",
		"sap/ui/core/Fragment",
		"sap/ui/export/Spreadsheet"
	],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 */
	function(Controller, Filter, FilterOperator, Formatter, MessageBox, MessageToast, Fragment, Spreadsheet) {
		"use strict";
		jQuery.sap.require("com.ui.dealmemolocal.model.jszip");
		jQuery.sap.require("com.ui.dealmemolocal.model.xlsx");
		return Controller.extend("com.ui.dealmemolocal.controller.MainPage", {
			Formatter: Formatter,
			onInit: function() {
				that = this;
				var oModel = new sap.ui.model.json.JSONModel();
				this.getView().setModel(oModel, "dealMemoModel");

				var odealMemoDetailModel = new sap.ui.model.json.JSONModel();
				this.getView().setModel(odealMemoDetailModel, "dealMemoDetailModel");
				odealMemoDetailModel.setSizeLimit(9999999);

				var odealMemoEpisodeModel = new sap.ui.model.json.JSONModel();
				this.getView().setModel(odealMemoEpisodeModel, "dealMemoEpisodeModel");
				odealMemoEpisodeModel.setSizeLimit(999999);
				this.tabsLoadedForDealMemo = {};
				this.dealMemoCreateOrDisplay = "D"; // "C" for create "D" display 
				this.loadTab = "";
				this.lang = "EN-US";
				var oRouter = this.getOwnerComponent().getRouter();
				oRouter.attachRouteMatched(this.onRouteMatched, this);
				this.showMaster = true;

			},
			onRouteMatched: function(oEvent) {
				var oName = oEvent.getParameter("name");
				this.Tentid = "IBS";
				if (oName === "VendorContract") {
					this.loadTab = "VendorContract";
				} else if (oName === "ArtistContract") {
					this.loadTab = "ArtistContract";

				} else {
					if (this.loadTab === "VendorContract") {

						this.getView().byId("idIconTabBar").setSelectedKey("vendorContract");
						this.loadDealMemoList();
					} else if (this.loadTab === "ArtistContract") {

						this.getView().byId("idIconTabBar").setSelectedKey("ArtContract");
						this.loadDealMemoList();
					} else {
						// Added by Dhiraj for link function in dealmemo
						var oModel = new sap.ui.model.json.JSONModel();
						this.getView().setModel(oModel, "dealMemoModel");
						var warplStr = window.location.href.split("?")[1];
						if (warplStr !== undefined && warplStr.includes("WARPL=") === true) {
							warplStr = warplStr.replaceAll("%20", "");
							warplStr = warplStr.split("WARPL=")[1];
							warplStr = warplStr.substr(3, warplStr.length);
							var dmno = warplStr[0] + warplStr[1] + warplStr[2] + warplStr[3] + warplStr[4] + warplStr[5] + warplStr[6] + warplStr[7];
							var dmver = warplStr[8] + warplStr[9] + warplStr[10]
							oModel.setProperty("/dealMemoNumber", dmno);
							oModel.setProperty("/dealMemoVersion", dmver);
						}
						//------------------------------------------------
						this.loadDefaultDealMemo(dmno, dmver);
					}
				}

				console.log();
			},
			onAfterRendering: function() {},
			loadDefaultDealMemo: function(dmno, dmver) {
				if (dmno === undefined && dmver === undefined) { // edited by dhiraj for link function in dealmemo
					this.loadDefaultDealMemo = true;
				} else {
					this.loadDefaultDealMemo = false;
					this.linkMemo = true;
				}
				this.loadInitialDataFromMaster();
				this.loadDealMemoList(dmno, dmver);
				this.loadCAFList();
			},
			getDefaultFilters: function() {
				return [
					new Filter("Tentid", "EQ", "IBS"),
					new Filter("Transtp", "EQ", "D")
					//   new Filter("Spras","EQ","E")
				]
			},
			getFilterArray: function(arr) {
				var filterArr = [];
				arr.map(function(obj) {
					filterArr.push(
						new Filter(obj.key, "EQ", obj.val)
					);
				});
				return filterArr;

			},

			/************  Deal Memo List ************/
			loadDealMemoList: function(dmno, dmver) {
				var basicFiilters = this.getDefaultFilters();
				var additionalFilters = [{
					"key": "Dmno",
					"val": ""
				}];
				var aFilters = basicFiilters.concat(this.getFilterArray(additionalFilters));
				var oModel = this.getView().getModel();
				var dealMemoModel = this.getView().getModel("dealMemoModel");
				sap.ui.core.BusyIndicator.show(0);
				oModel.read("/DmHeaderSet", {
					filters: aFilters,
					success: function(oData) {
						dealMemoModel.setProperty("/dealmemolist", oData.results);
						dealMemoModel.refresh(true);
						sap.ui.core.BusyIndicator.hide();
						if (this.loadDefaultDealMemo && this.getView().byId("list_dealmemo_master").getItems().length > 0) {
							this.getView().byId("list_dealmemo_master").getItems()[0].firePress();
							this.loadDefaultDealMemo = false;
						} else if (!this.loadDefaultDealMemo && this.linkMemo) { // Added by Dhiraj for link function in dealmemo
							this.linkMemo = false;
							var linkDM = oData.results.filter(function(obj) {
								return obj.Dmno === dmno && obj.Dmver === dmver
							}.bind(this));
							if (linkDM.length) {
								this.selectedDealMemoObj = linkDM[0];
							}

							this.loadDetailDealMemo(this.selectedDealMemoObj);
							this.onHideMaster();
							//-----------------------------------------------------------------------
						} else {
							if (this.newVersionCreated) {
								this.newVersionCreated = false;
								var newVersionDM = oData.results.filter(function(obj) {
									return obj.Dmno === this.selectedDealMemoObj.Dmno && parseInt(obj.Dmver) === (parseInt(this.selectedDealMemoObj.Dmver) +
										1);
								}.bind(this));
								if (newVersionDM.length) {
									this.selectedDealMemoObj = newVersionDM[0];
								}
								this.getView().byId("idIconTabBar").setSelectedKey("detail"); //Added by Dhiraj to load dealmemo in detail tab
							} else if (this.rejectedDm) {
								this.rejectedDm = false;
								var rejectDM = oData.results.filter(function(obj) {
									return obj.Dmno === this.selectedDealMemoObj.Dmno && this.selectedDealMemoObj.Dmver;
								}.bind(this));
								if (rejectDM.length) {
									this.selectedDealMemoObj = rejectDM[0];
								}
							}
							this.loadDetailDealMemo(this.selectedDealMemoObj);
						}

					}.bind(this),
					error: function(oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				});
			},

			handleSearch: function(oEvent) {
				var srchValue = oEvent.getSource().getValue();
				var modelBind = this.getView().byId("list_dealmemo_master");
				var multipleFilter =
					new sap.ui.model.Filter([
							new sap.ui.model.Filter("Dmno", sap.ui.model.FilterOperator.Contains, srchValue),
							new sap.ui.model.Filter("Cntnm", sap.ui.model.FilterOperator.Contains, srchValue)
						],
						false);
				var binding = modelBind.getBinding("items");
				binding.filter([multipleFilter]);
			},
			/************  Deal Memo List ************/

			/************ Master Data Load ************/

			storeMasterCodeInfo: function(oData) {
				var dealMemoModel = this.getView().getModel("dealMemoModel");

				dealMemoModel.setProperty("/contentTypeList", oData.results.filter(function(item) {
					return item.Mstpcd === "01" && item.Mstcd !== "05";
				}));

				dealMemoModel.setProperty("/contentNatureList", oData.results.filter(function(item) {
					return item.Mstpcd === "02";
				}));

				dealMemoModel.setProperty("/contentGenreList", oData.results.filter(function(item) {
					return item.Mstpcd === "03";
				}));

				dealMemoModel.setProperty("/contentObjectiveList", oData.results.filter(function(item) {
					return item.Mstpcd === "04";
				}));

				dealMemoModel.setProperty("/contentSubTypeList", oData.results.filter(function(item) {
					return item.Mstpcd === "05";
				}));

				dealMemoModel.setProperty("/contentSubGenreList", oData.results.filter(function(item) {
					return item.Mstpcd === "10";
				}));

				dealMemoModel.setProperty("/contentCategoryList", oData.results.filter(function(item) {
					return item.Mstpcd === "11";
				}));

				dealMemoModel.setProperty("/vendorRoleList", oData.results.filter(function(item) {
					return item.Mstpcd === "09";
				}));

				dealMemoModel.setProperty("/mileStoneList", oData.results.filter(function(item) {
					return item.Mstpcd === "08";
				}));

				dealMemoModel.setProperty("/deliveryCodeList", oData.results.filter(function(item) {
					return item.Mstpcd === "06";
				}));

				dealMemoModel.setProperty("/teritoryList", oData.results.filter(function(item) {
					return item.Mstpcd === "07";
				}));

				dealMemoModel.setProperty("/IPRRightsList", oData.results.filter(function(item) {
					return item.Mstpcd === "14";
				}));

				dealMemoModel.setProperty("/platformList", oData.results.filter(function(item) {
					return item.Mstpcd === "19";
				}));

				dealMemoModel.setProperty("/amortPatternList", oData.results.filter(function(item) {
					return item.Mstpcd === "12";
				}));

				dealMemoModel.setProperty("/nonAmmortPatternList", oData.results.filter(function(item) {
					return item.Mstpcd === "13";
				}));
				dealMemoModel.setProperty("/daysList", oData.results.filter(function(item) {
					return item.Mstpcd === "15";
				}));
				dealMemoModel.setProperty("/contentSubCategoryList", oData.results.filter(function(item) {
					return item.Mstpcd === "23";
				}));
				dealMemoModel.setProperty("/contentLanguageList", oData.results.filter(function(item) {
					return item.Mstpcd === "21";
				}));
				dealMemoModel.setProperty("/OrigLibraryList", oData.results.filter(function(item) {
					return item.Mstpcd === "25";
				}));
				dealMemoModel.refresh(true);
			},

			storeChannelInfo: function(oData) {
				var dealMemoModel = this.getView().getModel("dealMemoModel");
				dealMemoModel.setProperty("/channelList", oData.results);
				dealMemoModel.refresh(true);
			},

			storeContentInfo: function(oData) {
				var dealMemoModel = this.getView().getModel("dealMemoModel");
				dealMemoModel.setProperty("/contentList", oData.results);
				dealMemoModel.refresh(true);
			},
			storeCurrencyInfo: function(oData) {
				var dealMemoModel = this.getView().getModel("dealMemoModel");
				dealMemoModel.setProperty("/currencyList", oData.results);
				dealMemoModel.refresh(true);
			},
			storeMovieListInfo: function(oData) {
				var dealMemoModel = this.getView().getModel("dealMemoModel");
				oData.results.map(function(mvObj) {
					mvObj.Mvnm = mvObj.Mvid + "-" + mvObj.Mvidnm;
				});

				dealMemoModel.setProperty("/movieList", oData.results);
				dealMemoModel.refresh(true);
			},
			storeMusicListInfo: function(oData) {
				var dealMemoModel = this.getView().getModel("dealMemoModel");
				var musicList = oData.results.filter(function(obj) {
					return obj.Mstcd == "04";
				})
				musicList.map(function(mvObj) {
					mvObj.Mvnm = mvObj.Mvid + "-" + mvObj.Mvidnm;
				});

				dealMemoModel.setProperty("/musicList", musicList);
				dealMemoModel.refresh(true);
			},
			storeMatchMasterListInfo: function(oData) {
				var dealMemoModel = this.getView().getModel("dealMemoModel");
				// cnt.map(function(mvObj) {
				// 	// oData.results.map(function(mvObj) {
				// 	// mvObj.Matnm = mvObj.Matid + "-" + mvObj.Matds;
				// 	mvObj.Matnm = mvObj.Cntid + "-" + mvObj.Cntdesc; // added by dhiraj on 23/05/2022
				// });
				oData.results.map(function(mvObj) {
					mvObj.Matnm = mvObj.Matid + "-" + mvObj.Matds;
				});
				dealMemoModel.setProperty("/matchMasterList", oData.results);
				dealMemoModel.refresh(true);
			},
			storeMatchListInfo: function(oData) {
				var dealMemoModel = this.getView().getModel("dealMemoModel");
				oData.results.map(function(mvObj) {
					mvObj.Matnm = mvObj.Matid + "-" + mvObj.Matds;
				});

				dealMemoModel.setProperty("/matchList", oData.results);
				dealMemoModel.refresh(true);
			},

			loadInitialDataFromMaster: function() {
				var basicFiilters = this.getDefaultFilters();
				basicFiilters = [basicFiilters[0]];
				basicFiilters.push(new Filter("Spras", "EQ", "EN-US"));
				var additionalFilters = [{
					"key": "Mstpcd",
					"val": "01"
				}, {
					"key": "Mstpcd",
					"val": "02"
				}, {
					"key": "Mstpcd",
					"val": "03"
				}, {
					"key": "Mstpcd",
					"val": "04"
				}, {
					"key": "Mstpcd",
					"val": "05"
				}, {
					"key": "Mstpcd",
					"val": "06"
				}, {
					"key": "Mstpcd",
					"val": "07"
				}, {
					"key": "Mstpcd",
					"val": "08"
				}, {
					"key": "Mstpcd",
					"val": "09"
				}, {
					"key": "Mstpcd",
					"val": "10"
				}, {
					"key": "Mstpcd",
					"val": "11"
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
					"val": "15"
				}, {
					"key": "Mstpcd",
					"val": "19"
				}, {
					"key": "Mstpcd",
					"val": "23"
				}, {
					"key": "Mstpcd",
					"val": "21"
				}, {
					"key": "Mstpcd",
					"val": "25"
				}, ];

				var aFilters = basicFiilters.concat(this.getFilterArray(additionalFilters));
				var oModel = this.getView().getModel();

				oModel.read("/DDMastCdSet", {
					filters: aFilters,
					success: function(oData) {
						this.storeMasterCodeInfo(oData);
					}.bind(this),
					error: function(oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				});

				oModel.read("/F4ChnlIdSet", {
					filters: basicFiilters,
					success: function(oData) {
						this.storeChannelInfo(oData);
					}.bind(this),
					error: function(oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				});

				var additionalFilters = [new Filter("Mkdm", "EQ", "X")];
				oModel.read("/F4CntIDSet", {
					filters: basicFiilters.concat(additionalFilters),
					success: function(oData) {
						this.storeContentInfo(oData);
					}.bind(this),
					error: function(oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				});

				oModel.read("/F4WaersSet", {
					success: function(oData) {
						this.storeCurrencyInfo(oData);
					}.bind(this),
					error: function(oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}

				});

				additionalFilters = [new Filter("Mvid", "EQ", "")];
				oModel.read("/MvIDSet", {
					filters: basicFiilters.concat(additionalFilters),
					success: function(oData) {
						this.storeMovieListInfo(oData);
						this.storeMusicListInfo(oData);
					}.bind(this),
					error: function(oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				});
				// var oMatchMasterModel = this.getView().getModel("CONTENT_MAST");
				// additionalFilters = [new Filter("Cntty", "EQ", "05"), new Filter("Mlevel", "EQ", "02")];
				// var oPath = "/es_content_list?$filter=Tentid eq 'IBS' and Cntty eq '05' and Mlevel eq '02'";
				// oMatchMasterModel.read(oPath, {
				// 	// filters:   basicFiilters.concat(additionalFilters), // added by dhiraj on 24/05/2022
				// 	success: function(oData) {
				// 		var cnt = oData.results.filter(function(obj) {
				// 			return obj.Mlevel === "02" && obj.Cntty === "05" && obj.Mkdm === "X"
				// 		}.bind(this));
				// 		this.storeMatchMasterListInfo(cnt);
				// 	}.bind(this),
				// 	error: function(oError) {
				// 			var oErrorResponse = JSON.parse(oError.responseText);
				// 			var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
				// 			MessageBox.error(oMsg);
				// 		}
				// });
				// 	var additionalFilters = [new Filter("Mstcd", "EQ", "05")];
				// oModel.read("/F4CntIDSet", {
				// 	filters: basicFiilters.concat(additionalFilters),
				// 	success: function(oData) {
				// 		this.storeMatchListInfo(oData);
				// 	}.bind(this),
				// 	error: function(oError) {
				// 		var oErrorResponse = JSON.parse(oError.responseText);
				// 		var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
				// 		MessageBox.error(oMsg);
				// 	}
				// });
				// var oMatchModel = this.getView().getModel("MATCH_MAST"); // Added by dhiraj for level 3 on 23/06/2022
				// oMatchModel.read("/es_match_master", {					//Comented by dhiraj for repeated content
				additionalFilters = [new Filter("Matid", "EQ", "")];
				oModel.read("/MatIDSet", {
					filters: basicFiilters.concat(additionalFilters),
					success: function(oData) {
						this.storeMatchListInfo(oData);
						this.storeMatchMasterListInfo(oData);
					}.bind(this),
					error: function(oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				});

			},

			/************ Master Data Load ************/

			/************ Create Deal Memo ************/

			onAddDealMemo: function() {
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				MessageBox.confirm(oSourceBundle.getText("msgCreateDealMemoForCAF"), {
					actions: [oSourceBundle.getText("lblYes"), oSourceBundle.getText("lblNo"), oSourceBundle.getText("lblCancel")],
					emphasizedAction: "No",
					onClose: function(sAction) {
						if (sAction === oSourceBundle.getText("lblYes")) {
							this.createCAFDealMemo();
						} else if (sAction === oSourceBundle.getText("lblNo")) {
							this.createDealMemo();
						}
					}.bind(this)
				});
			},

			createParamModel: function() {
				var dealMemoModel = this.getView().getModel("dealMemoModel");
				dealMemoModel.setProperty("/createParams", {
					"Chnlnm": "",
					"Chnlcat": "",
					"Conttyp": "",
					"Content": "",
					"ContentNature": ""
				});

			},
			createDealMemo: function() {
				this.openCreateParameterDialog();
			},

			openCreateParameterDialog: function() {
				Fragment.load({
					name: "com.ui.dealmemolocal.fragments.CreateParameterDialog",
					controller: this
				}).then(function name(oFragment) {
					this._oCreateParamDialog = oFragment; //sap.ui.xmlfragment("com.ui.dealmemolocal.fragments.CreateParameterDialog", this);
					this.createParamModel();
					this.getView().addDependent(this._oCreateParamDialog);
					this._oCreateParamDialog.setModel(this.getView().getModel("dealMemoModel"));
					this._oCreateParamDialog.open();

				}.bind(this));
			},
			validateBeforeCreate: function() {
				var dealMemoModel = this.getView().getModel("dealMemoModel");
				var createParamsData = dealMemoModel.getData().createParams;
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				var statusFlag = true;
				if (createParamsData.Chnlnm === "" || createParamsData.Contsc === "" || createParamsData.Conttyp === "" || createParamsData.Content ===
					"" || createParamsData.ContentNature === "") {
					statusFlag = false;
					MessageBox.error(oSourceBundle.getText("msgrequiredFieds"));
				}
				return statusFlag;
			},
			onCreateParamOk: function() {
				var oVaildFlag = this.validateBeforeCreate();
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				if (oVaildFlag) {
					var dealMemoModel = this.getView().getModel("dealMemoModel");
					var createParamsData = dealMemoModel.getData().createParams;
					dealMemoModel.setProperty("/createParams/Dmdt", new Date());
					dealMemoModel.setProperty("/createParams/DmdtFormatted", Formatter.formatDateValForBackend(new Date()));
					var enableMPMCheckForContType = [
						"01", "03", "05", "06", "07", "08"
					]
					dealMemoModel.refresh(true);
					var contentmasterModel = this.getView().getModel("CONTENT_MAST");
					var oPath = "/es_content_list('" + dealMemoModel.getProperty("/createParams/ContentId") + "')";
					contentmasterModel.read(oPath, {
						success: function(oData) {
							if (enableMPMCheckForContType.indexOf(createParamsData.ConttypKey) >= 0 && (oData.Mpmid === "" || oData.Mpmid === null)) {
								MessageBox.error(oSourceBundle.getText("msgNoMPM", createParamsData.Content));
							} else {

								this.autoPopulateValueList = oData;
								this.loadNewDetailPage();
								this.onCreateParamCancel();
								this.contentSubTypeList();
							}

							//	           			this.selectedDealMemoObj = {"Dmno":""};
							//	           			this.loadDetailTab({"Dmno":""});

						}.bind(this),
						error: function(oError) {
							var oErrorResponse = JSON.parse(oError.responseText);
							var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
							MessageBox.error(oMsg);
						}

					});

				}
			},

			onCreateParamCancel: function() {
				this._oCreateParamDialog.close();
			},
			contentSubTypeList: function() {
				var contentsubTypeModel = this.getView().getModel("CONTENT_MAST");
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var ctype = dealMemoDetailModel.oData.Cnttp;
				var cFilter = new Filter("Mstpcd", "EQ", ctype);
				contentsubTypeModel.read("/es_content_subtype", {
					filters: [cFilter],
					success: function(oData1) {
						var dealMemoModel = this.getView().getModel("dealMemoModel");
						dealMemoModel.setProperty("/sortedContSubType", oData1.results);
						dealMemoModel.refresh(true);
					}.bind(this)
				});
			},
			/************ Create Deal Memo ************/

			/************ Value Helps ************/

			onValueHelpChannel: function() {
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				this.oValueHelpSelectionParams = {
					"bindPathName": "dealMemoModel>/channelList",
					"bindPropName": "dealMemoModel>Chnlnm",
					"propName": "Chnlnm",
					"keyName": "Chnlid",
					"valuePath": "/createParams/Chnlnm",
					"keyPath": "/createParams/Chnlid",
					"valueModel": "dealMemoModel",
					"dialogTitle": oSourceBundle.getText("titleChannel")
				};
				this.openSelectionDialog();
			},
			onValueHelpContentSubCategory: function() {
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				this.oValueHelpSelectionParams = {
					"bindPathName": "dealMemoModel>/contentSubCategoryList",
					"bindPropName": "dealMemoModel>Mstcdnm",
					"propName": "Mstcdnm",
					"keyName": "Mstcd",
					"keyPath": "/createParams/ContscKey",
					"valuePath": "/createParams/Contsc",
					"valueModel": "dealMemoModel",
					"dialogTitle": oSourceBundle.getText("titleContsc")
				};
				this.openSelectionDialog();
			},
			onValueHelpContentCategory: function() {
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				this.oValueHelpSelectionParams = {
					"bindPathName": "dealMemoModel>/contentCategoryList",
					"bindPropName": "dealMemoModel>Mstcdnm",
					"propName": "Mstcdnm",
					"keyName": "Mstcd",
					"keyPath": "/createParams/ContcatKey",
					"valuePath": "/createParams/Contcat",
					"valueModel": "dealMemoModel",
					"dialogTitle": oSourceBundle.getText("titleContCat")
				};
				this.openSelectionDialog();
			},
			onValueHelpContentType: function() {
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				this.oValueHelpSelectionParams = {
					"bindPathName": "dealMemoModel>/contentTypeList",
					"bindPropName": "dealMemoModel>Mstcdnm",
					"propName": "Mstcdnm",
					"keyName": "Mstcd",
					"keyPath": "/createParams/ConttypKey",
					"valuePath": "/createParams/Conttyp",
					"valueModel": "dealMemoModel",
					"dialogTitle": oSourceBundle.getText("titleCntType")
				};
				this.openSelectionDialog();
			},
			onValueHelpContent: function() {
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				var dealMemoModel = this.getView().getModel("dealMemoModel");
				var dealMemoInfo = dealMemoModel.getData();
				var contentList = $.extend(true, [], dealMemoInfo.contentList);
				var filteredContentList = [];
				filteredContentList = contentList.filter(function(obj) {
					return obj.Mstcd === dealMemoInfo.createParams.ConttypKey;
				});
				dealMemoInfo.filteredContentList = filteredContentList;
				dealMemoModel.refresh(true);
				this.oValueHelpSelectionParams = {
					"bindPathName": "dealMemoModel>/filteredContentList",
					"bindPropName": "dealMemoModel>Cntnm",
					"propName": "Cntnm",
					"keyName": "Cntid",
					"keyPath": "/createParams/ContentId",
					"valuePath": "/createParams/Content",
					"valueModel": "dealMemoModel",
					"dialogTitle": oSourceBundle.getText("titleCnt")
				};
				this.openSelectionDialog();
			},
			onValueHelpContentNature: function() {
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				this.oValueHelpSelectionParams = {
					"bindPathName": "dealMemoModel>/contentNatureList",
					"bindPropName": "dealMemoModel>Mstcdnm",
					"propName": "Mstcdnm",
					"keyName": "Mstcd",
					"keyPath": "/createParams/ContentNatureKey",
					"valuePath": "/createParams/ContentNature",
					"valueModel": "dealMemoModel",
					"dialogTitle": oSourceBundle.getText("titleCntNature")
				};
				this.openSelectionDialog();
			},

			onValuHelpCurrency: function() {
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				this.oValueHelpSelectionParams = {
					"bindPathName": "dealMemoModel>/currencyList",
					"bindPropName": "dealMemoModel>Waers",
					"propName": "Waers",
					"keyName": "Waers",
					"keyPath": "/Waers",
					"valuePath": "/Waers",
					"valueModel": "dealMemoDetailModel",
					"dialogTitle": oSourceBundle.getText("titleCurrency"),
					"callBackFunction": this.mapExchrt
				};
				this.openSelectionDialog();
			},
			onValueHelpEpiDesc: function(oEvent) {
				var oPath = oEvent.getSource().getBindingContext("dealMemoDetailModel").sPath;
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				if (dealMemoDetailInfo.Cnttp === "02") {
					this.oValueHelpSelectionParams = {
						"bindPathName": "dealMemoModel>/movieList",
						"bindPropName": "dealMemoModel>Mvnm",
						"propName": "Mvnm",
						"keyName": "Mvid",
						"valuePath": oPath + "/Epinm",
						"keyPath": oPath + "/Epiid",
						"valueModel": "dealMemoDetailModel",
						"dialogTitle": oSourceBundle.getText("titleMovie")
					};
				} else if (dealMemoDetailInfo.Cnttp === "05") {
					this.oValueHelpSelectionParams = {
						"bindPathName": "dealMemoModel>/matchList",
						"bindPropName": "dealMemoModel>Matnm",
						"propName": "Matnm",
						"keyName": "Matid",
						"valuePath": oPath + "/Epinm",
						"keyPath": oPath + "/Epiid",
						"valueModel": "dealMemoDetailModel",
						"dialogTitle": oSourceBundle.getText("titleMatch")
					};
				} else if (dealMemoDetailInfo.Cnttp === "09") {
					this.oValueHelpSelectionParams = {
						"bindPathName": "dealMemoModel>/matchMasterList",
						"bindPropName": "dealMemoModel>Matnm",
						"propName": "Matnm",
						"keyName": "Matid",
						"valuePath": oPath + "/Epinm",
						"keyPath": oPath + "/Epiid",
						"valueModel": "dealMemoDetailModel",
						"dialogTitle": oSourceBundle.getText("titleMatch")
					};
				} else if (dealMemoDetailInfo.Cnttp === "04") {
					this.oValueHelpSelectionParams = {
						"bindPathName": "dealMemoModel>/musicList",
						"bindPropName": "dealMemoModel>Mvnm",
						"propName": "Mvnm",
						"keyName": "Mvid",
						"valuePath": oPath + "/Epinm",
						"keyPath": oPath + "/Epiid",
						"valueModel": "dealMemoDetailModel",
						"dialogTitle": oSourceBundle.getText("titleMusic")
					};
				}
				this.openSelectionDialog();
			},

			openSelectionDialog: function() {
				Fragment.load({
					name: "com.ui.dealmemolocal.fragments.SelectionDialog",
					controller: this
				}).then(function name(oFragment) {
					this._oSelectionDialog = oFragment; //sap.ui.xmlfragment("com.ui.dealmemolocal.fragments.SelectionDialog", this);
					this.getView().addDependent(this._oSelectionDialog);
					this._oSelectionDialog.setModel(this.getView().getModel("dealMemoModel"));
					this._oSelectionDialog.setTitle(this.oValueHelpSelectionParams.dialogTitle);
					var oItem = new sap.m.StandardListItem({
						title: "{" + this.oValueHelpSelectionParams.bindPropName + "}",
						info: "{dealMemoModel>Ltext}"
					});
					if (this.oValueHelpSelectionParams.bindPropDescName) {
						oItem.bindProperty("description", this.oValueHelpSelectionParams.bindPropDescName);
					}
					this._oSelectionDialog.bindAggregation("items", this.oValueHelpSelectionParams.bindPathName, oItem);
					this._oSelectionDialog.open();
				}.bind(this));
			},

			onConfirmSelection: function(oEvent) {
				var selectedItemObj = oEvent.getParameters()['selectedItem'].getBindingContext("dealMemoModel").getObject();
				var oValuePath = this.oValueHelpSelectionParams.valuePath;
				var oKeyPath = this.oValueHelpSelectionParams.keyPath;
				var oProp = this.oValueHelpSelectionParams.propName;
				var oKey = this.oValueHelpSelectionParams.keyName;
				var oValueModelAlias = this.oValueHelpSelectionParams.valueModel;
				var dealMemoModel = this.getView().getModel(oValueModelAlias);
				dealMemoModel.setProperty(oValuePath, selectedItemObj[oProp]);
				dealMemoModel.setProperty(oKeyPath, selectedItemObj[oKey]);
				dealMemoModel.refresh(true);
				if (this.oValueHelpSelectionParams.callBackFunction) {
					this.oValueHelpSelectionParams.callBackFunction(this);
				}
			},
			mapExchrt: function(oRef) {
				sap.ui.core.BusyIndicator.show(0);
				var dealMemoDetailModel = oRef.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var Chnlid = dealMemoDetailInfo.Chnlid;
				var Waers = dealMemoDetailInfo.Waers;
				var srvUrl = "/sap/opu/odata/IBSCMS/DEALMEMO_SRV";
				var oModelSav = new sap.ui.model.odata.ODataModel(srvUrl, true, "", "");
				var pValue = "/DmExchrtSet?$filter=Chnlid  eq '" + Chnlid + "' and Waers eq '" + Waers + "'";
				oModelSav.read(pValue, null, null, true, function(oData) {
					dealMemoDetailModel.setProperty("/Exchrt", oData.results[0].Exchrt);
					dealMemoDetailModel.refresh(true);
					sap.ui.core.BusyIndicator.hide();
				}, function(value) {
					sap.ui.core.BusyIndicator.hide();
					console.log(value);
					//alert("fail");

				});

			},
			onSearchSelection: function(oEvent) {
				var sValue = oEvent.getParameter("value");
				var oFilter = new Filter(this.oValueHelpSelectionParams.propName, FilterOperator.Contains, sValue);
				var oBinding = oEvent.getParameter("itemsBinding");
				oBinding.filter([oFilter]);
			},

			/************ Value Helps ************/

			/***** New Deal Memo Detail Load ******/

			getDetailPageInfo: function() {
				return {
					"Dmno": "",
					"Dmver": "",
					"Totdmamt": "0.00",
					"Waers": "",
					"Dmstdesc": "",
					"Chnlnm": dealMemoModel.getProperty("/createParams/Chnlnm"),
					"Cnttpnm": dealMemoModel.getProperty("/createParams/Conttyp"),
					"Cntnm": dealMemoModel.getProperty("/createParams/Content"),
					"Cntcatnm": dealMemoModel.getProperty("/createParams/Contcat"),
					"Dmdt": dealMemoModel.getProperty("/createParams/Dmdt"),
					"DmdtFormatted": dealMemoModel.getProperty("/createParams/DmdtFormatted"),
					"Cntntnm": dealMemoModel.getProperty("/createParams/ContentNature"),
					"Chnlid": dealMemoModel.getProperty("/createParams/Chnlid"),
					"Cnttp": dealMemoModel.getProperty("/createParams/ConttypKey"),
					"Cntid": dealMemoModel.getProperty("/createParams/ContentId"),
					"Cntcat": dealMemoModel.getProperty("/createParams/ContcatKey"),
					"Cntnt": dealMemoModel.getProperty("/createParams/ContentNatureKey"),
					"Cafrefno": "",
					"Prdnm": "",
					"Exprdnm": "",
					"Costcenter": "",
					"Cntobj": "",
					"Cntgn": this.autoPopulateValueList.Genre,
					"Cntstp": this.autoPopulateValueList.Cntsb,
					"Cntsgn": this.autoPopulateValueList.Subgr,
					"Cntsc": this.autoPopulateValueList.Cntsc,
					"Langu": this.autoPopulateValueList.Langu,
					"Langud": this.autoPopulateValueList.Langud,
					"Orilib": this.autoPopulateValueList.Orilib,
					"Noofepi": "",
					"Amrtpercost": "0.00",
					"Estprgreldt": "",
					"BudgetCurr": "INR",
					"Waers": "INR",
					"Exchrt": "",
					"OwnchnlPerc": "100.00",
					"SecondChnl": "",
					"SecondPerc": "0.00",
					"FromYr": null,
					"ToYr": null,
					"FiscalYrFromTo": "",
					"budgetMainTabColor": "Critical",
					"msgDetailTabVisible": false,
					"errorMsgDetailTab": ""
				};
			},
			loadNewDetailPage: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoModel = this.getView().getModel("dealMemoModel");
				var dealmemoDetObj = {
					"Dmno": "",
					"Dmver": "",
					"Totdmamt": "0.00",
					"Waers": "",
					"Dmstdesc": "",
					"Chnlnm": dealMemoModel.getProperty("/createParams/Chnlnm"),
					"Cnttpnm": dealMemoModel.getProperty("/createParams/Conttyp"),
					"Cntnm": dealMemoModel.getProperty("/createParams/Content"),
					"Cntcatnm": this.autoPopulateValueList.Cntctd,
					"Dmdt": dealMemoModel.getProperty("/createParams/Dmdt"),
					"DmdtFormatted": dealMemoModel.getProperty("/createParams/DmdtFormatted"),
					"Cntntnm": dealMemoModel.getProperty("/createParams/ContentNature"),
					"Chnlid": dealMemoModel.getProperty("/createParams/Chnlid"),
					"Cnttp": dealMemoModel.getProperty("/createParams/ConttypKey"),
					"Cntid": dealMemoModel.getProperty("/createParams/ContentId"),
					"Cntcat": this.autoPopulateValueList.Cntct,
					"Cntnt": dealMemoModel.getProperty("/createParams/ContentNatureKey"),
					"Cafrefno": "",
					"Prdnm": "",
					"Exprdnm": "",
					"Costcenter": "",
					"Cntobj": "",
					"Cntgn": this.autoPopulateValueList.Genre,
					"Cntstp": this.autoPopulateValueList.Cntsb,
					"Cntsgn": this.autoPopulateValueList.Subgr,
					"Cntsc": dealMemoModel.getProperty("/createParams/ContscKey"),
					"Cntscnm": dealMemoModel.getProperty("/createParams/Contsc"),
					"Langu": this.autoPopulateValueList.Langu,
					"Langud": this.autoPopulateValueList.Langud,
					"Orilib": this.autoPopulateValueList.Orilib,
					"Noofepi": "",
					"Amrtpercost": "0.00",
					"Estprgreldt": null,
					"BudgetCurr": "INR",
					"Waers": "INR",
					"OwnchnlPerc": "100.00",
					"SecondChnl": "",
					"SecondPerc": "0.00",
					"FromYr": null,
					"ToYr": null,
					"FiscalYrFromTo": "",
					"budgetMainTabColor": "Critical",
					"msgDetailTabVisible": false,
					"errorMsgDetailTab": "",
					"enablePerc": false,
					"NoOfEpiEnableFlag": true,
					"Exchrt": "1.00",
					"fisYrEnableFlag": true,
					"secChanelEnableFlag": true,
					"secChannelList": this.getSecChannelList(dealMemoModel.getProperty("/createParams/Chnlid"))
				};

				this.selectedDealMemoObj = dealmemoDetObj;
				dealMemoDetailModel.setData(dealmemoDetObj);
				dealMemoDetailModel.refresh(true);
				this.getView().byId("idIconTabBar").setSelectedKey("detail");
				this._noOfEpiChanged = false;
				this._yearChanged = false;

				this.getView().byId("btnChangeDM").setVisible(false);
				this.getView().byId("btnSaveDM").setEnabled(true);
				this.getView().byId("btnSubmitDM").setEnabled(false);
				this.getView().byId("splitApp").toDetail(this.getView().byId("dealMemoDetail"));
			},

			/***** New Deal Memo Detail Load ******/

			/****** Deal Memo Item Select *********/

			resetTabsLoaded: function(Dmno) {
				var defaultTabsInfo = {
					"DetailTab": false,
					"BudgetTab": false,
					"YearWiseBudgetTab": false,
					"EpisodeDetailsTab": false
				};

				this.tabsLoadedForDealMemo[Dmno] = defaultTabsInfo;

			},
			onDealMemoItemPress: function(oEvent) {
				var selectedDealMemoObj = oEvent.getSource().getBindingContext("dealMemoModel").getObject();
				this.resetTabsLoaded(selectedDealMemoObj.Dmno);
				this.selectedDealMemoObj = selectedDealMemoObj;
				if (this.showMaster) {
					this.showMaster = false;
					this.onShowMatser();
				} else {
					this.onHideMaster();
				}
				this.getView().byId("splitApp").toDetail(this.getView().byId("dealMemoDetail"));
				this.loadDetailTab(selectedDealMemoObj);
				//    			var oRouter = this.getOwnerComponent().getRouter();
				//    				oRouter.navTo("DealMemo",{
				//    					"Dmno":selectedDealMemoObj.Dmno,
				//    					"Dmver":selectedDealMemoObj.Dmver
				//    					
				//    				});	
			},

			loadDetailDealMemo: function(selectedDealMemoObj) {

				var odetailEntityPath = "/DmHeaderSet(Tentid='IBS',Dmno='" + selectedDealMemoObj.Dmno + "',Dmver='" + selectedDealMemoObj.Dmver +
					"',Transtp='D')";
				var oModel = this.getView().getModel();
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				sap.ui.core.BusyIndicator.show(0);
				oModel.read(odetailEntityPath, {
					urlParameters: {
						"$expand": "DmEpisodeSet,DmCostSet,DmCoSet,DmYCSet,DmbsSet,Dmaf,DmtxtSet"
					},

					success: function(oData) {
						//	this.displayDealMemoDetailPageInfo(oData);

						//Detail Tab
						if (oData.Estprgreldt !== null && oData.Estprgreldt !== "") {
							oData.Estprgreldt = Formatter.formatDateVal(oData.Estprgreldt);
						}
						oData.Avgepidur = Formatter.formatTimeDuration(oData.Avgepidur);
						if (oData.FromYr == oData.ToYr) { //Changes Done By Dhiraj To show fiscal year as one year if both year are same
							oData.FiscalYrFromTo = oData.FromYr;
						} else {
							oData.FiscalYrFromTo = oData.FromYr + "-" + oData.ToYr;
						}
						oData.YearEpisodes = this.getYearEpisodes(parseInt(oData.FromYr), parseInt(oData.ToYr));
						oData.msgVisible = false;
						oData.errorMsg = "";
						oData.YearBudgetAllInfo = oData.DmYCSet.results;
						oData.YearBudgetLin = oData.DmYCSet.results.filter(function(obj) {
							return obj.Platform === "01"
						});
						oData.YearBudgetLinTot = this.handleTotalBudgetYear(oData.YearBudgetLin)
						oData.YearBudgetNonLin = oData.DmYCSet.results.filter(function(obj) {
							return obj.Platform === "02"
						});
						oData.YearBudgetNonLinTot = this.handleTotalBudgetYear(oData.YearBudgetNonLin)
						oData.YearBudgetInfo = oData.DmYCSet.results;
						oData.episodeData = oData.DmEpisodeSet.results;

						oData.vendorContractData = oData.DmCoSet.results.filter(function(obj) {
							return obj.Conttp === "01";
						});
						oData.artistContractData = oData.DmCoSet.results.filter(function(obj) {
							return obj.Conttp === "02";
						});
						oData.msgDetailTabVisible = false;
						oData.errorMsgDetailTab = "";
						oData.enablePerc = false;
						if (oData.SecondChnl !== "") {
							oData.enablePerc = true;
						}
						oData.yearWiseMainTable = true;
						oData.NoOfEpiEnableFlag = true;
						oData.fisYrEnableFlag = true;
						oData.CurrencyEnableFlag = true;
						oData.tableMode = false;
						if (oData.Dmver !== "001") {
							oData.NoOfEpiEnableFlag = false;
							oData.fisYrEnableFlag = false;
							oData.secChanelEnableFlag = false;
							oData.enablePerc = false;
							oData.CurrencyEnableFlag = false;
						}
						oData.enableFlow = "P";
						if (oData.Cnttp === "02" || oData.Cnttp === "05" || oData.Cnttp === "09" || oData.Cnttp === "04") {
							oData.enableFlow = "M" // MovieFlow

						}
						oData.secChannelList = this.getSecChannelList(oData.Chnlid);
						oData.ScheduleDetVisibility = false;
						var scheduleInfo = [];
						if (oData.DmbsSet.results.length) {
							oData.ScheduleDetVisibility = true;
							oData.DmbsSet.results.map(function(DmbsObj) {
								var oDmbsObj = $.extend(true, {}, DmbsObj);
								oDmbsObj.Timeslotfm = Formatter.formatTimeDuration(DmbsObj.Timeslotfm);
								oDmbsObj.TimeslotfmDt = Formatter.formatTimeDurationDt(DmbsObj.Timeslotfm);
								oDmbsObj.Timeslotto = Formatter.formatTimeDuration(DmbsObj.Timeslotto);
								oDmbsObj.Duration = Formatter.formatTimeDuration(DmbsObj.Duration);
								oDmbsObj.DurationDt = Formatter.formatTimeDurationDt(DmbsObj.Duration);
								scheduleInfo.push(oDmbsObj);

							});
						}
						oData.scheduleInfo = scheduleInfo;

						oData.Totcnthrs = oData.Dmaf.Totcnthrs;
						oData.Noofslots = oData.Dmaf.Noofslots;
						oData.Estavgrtng = oData.Dmaf.Estavgrtng;
						oData.relStatustabcolor = "Critical";

						oData.attachmentTabColor = "Critical";

						oData.attachURL = oModel.sServiceUrl + "/AttachmentSet(Tentid='IBS',Dmno='" + oData.Dmno + "',Dmver='" + oData.Dmver +
							"',Instanceid='')/AttachmentMedSet";
						oData.fileTypeList = ["jpg", "doc", "xls", "pdf", "xlsx", "docx"];

						dealMemoDetailModel.setData(oData);
						dealMemoDetailModel.refresh(true);
						if (oData.Cnttp === "02" || oData.Cnttp === "05" || oData.Cnttp === "09" || oData.Cnttp === "04") {
							this.loadMovieCostTemplate();
						}
						if (oData.DmEpisodeSet.results.length) {
							this.calculateEpisodeDetTabData(oData);
							if (Formatter.formatEditableStatus(oData.Dmst)) {
								oData.tableMode = true;
							}

						}
						this.handleIconTabColor(oData);
						if (!this.loadDefaultDealMemo) {
							this.onSelectTabCostDetail()
						}
						this._noOfEpiChanged = false;
						this._yearChanged = false;
						this.contentSubTypeList(oData);
						sap.ui.core.BusyIndicator.hide();
						this.loadAttachments();
						this.loadChangeCostTemplate();
						var blankModel = new sap.ui.model.json.JSONModel();
						this.getView().byId("lblComments").setModel(blankModel);
						var tempbar = new sap.m.IconTabBar({
							visible: false
						});
						tempbar.addItem(that.getView().byId("SYN"));
						that.getView().byId("commentInner").destroyItems();
						that.getView().byId("lblCommentStatus").setText("0");
						that.getView().byId("commentInner").addItem(that.getView().byId("SYN"));
						var len = that.getView().byId("commentInner").getItems().length;
						for (var i = 1; i < len; i++) {
							that.getView().byId("commentInner").getItems()[i].setVisible(false);
						}
					}.bind(this),
					error: function(oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				});

			},
			getSecChannelList: function(ownerChnlId) {
				var dealMemoModel = this.getView().getModel("dealMemoModel");
				var secChannelList = [];
				if (dealMemoModel.getData().channelList.length) {
					secChannelList = dealMemoModel.getData().channelList.filter(function(obj) {
						return obj.Chnlid !== ownerChnlId
					})

				}
				return secChannelList;

			},

			displayDealMemoDetailPageInfo: function(oData) {

			},
			/****** Deal Memo Item Select *********/

			/***************** Load Detail Tab for Deal Memo ******************/

			loadDetailTab: function(selectedDealMemoObj) {
				this.getView().byId("idIconTabBar").setSelectedKey("detail");
				//    			if(selectedDealMemoObj.Dmno === "" && this.selectedDealMemoObj.Dmno !== ""){
				//    				this._noOfEpiChanged = false;
				//            		this._yearChanged= false;
				//    				this.loadNewDetailPage();
				//    			}
				//    			else{
				if (this.selectedDealMemoObj.Dmno !== "") {
					this._noOfEpiChanged = false;
					this._yearChanged = false;
					this.loadDetailDealMemo(selectedDealMemoObj);
				}
			},

			/***************** Load Detail Tab for Deal Memo ******************/

			onMainTabSelect: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var mainSelectedKey = this.getView().byId("idIconTabBar").getSelectedKey();
				if (mainSelectedKey === "detail") {
					this.loadDetailTab(this.selectedDealMemoObj);
				} else if (mainSelectedKey == "cost") {
					var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
					var dealMemoDetailInfo = dealMemoDetailModel.getData();
					if (dealMemoDetailInfo.enableFlow === "M") {
						this.getView().byId("idIconTabBar2").setSelectedKey("epiDet");
					} else {
						this.getView().byId("idIconTabBar2").setSelectedKey("costDet");
					}

					this.getView().byId("idIconTabBar2").fireSelect();

				} else if (mainSelectedKey == "releaseStatus") {
					this.loadReleaseStatusDetails();
				} else if (mainSelectedKey == "attachment") {
					this.loadAttachments();
				} else if (mainSelectedKey == "rev30") {
					var orev30Model = new sap.ui.model.json.JSONModel(jQuery.sap.getModulePath("com.ui.dealmemolocal.json", "/rev30Tab.json"));
					this.getView().byId("Rev30Table").setModel(orev30Model);
					this.loadRevenueTab();
				} else if (mainSelectedKey == "makt") {
					var txt_makt = this.getView().getModel("i18n").getResourceBundle().getText("txt_advcostoffair");

					var maktData = {
						"results": [{
							"skey": txt_makt,
							"sinput": "",
							"curr": ""
						}]
					};
					var omarketModel = new sap.ui.model.json.JSONModel(maktData);
					this.getView().byId("marketTable").setModel(omarketModel);
					this.loadMarketingTab();
				} else if (mainSelectedKey == "progPL") {
					var progModel = new sap.ui.model.json.JSONModel(jQuery.sap.getModulePath("com.ui.dealmemolocal.json", "/prog30Tab.json"));
					var progTRPModel = new sap.ui.model.json.JSONModel(jQuery.sap.getModulePath("com.ui.dealmemolocal.json", "/progTRPTab.json"));
					this.getView().byId("prog30Table").setModel(progModel);
					this.getView().byId("progTRPTable").setModel(progTRPModel);
					this.loadProgPL();
				} else if (mainSelectedKey == "comment") {
					this.loadComment();
				}

				if (mainSelectedKey == "progPL") {
					this.getView().byId("btnSaveDM").setEnabled(false);
				} else {
					if (dealMemoDetailInfo.Dmst == "01") {
						this.getView().byId("btnSaveDM").setEnabled(true);
					} else {
						this.getView().byId("btnSaveDM").setEnabled(false);
					}
				}
			},

			getYearEpisodes: function(FromYr, ToYr) {
				var yearRange = [];
				for (var ind = FromYr; ind <= ToYr; ind++) {
					yearRange.push({
						"Year": ind.toString(),
						"noOfEpisodes": ""

					});

				}
				return yearRange;

			},
			handleDmStatus: function(oData) {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				this.getView().byId("btnChangeDM").setVisible(false);
				this.getView().byId("btnSaveDM").setEnabled(true);
				if (oData.Dmst === "04") {
					this.getView().byId("btnChangeDM").setVisible(true);
					this.getView().byId("btnSaveDM").setEnabled(false);
					this.getView().byId("btnSubmitDM").setEnabled(false);
				} else if (oData.Dmst === "02") {
					this.getView().byId("btnChangeDM").setVisible(false);
					this.getView().byId("btnSaveDM").setEnabled(false);
					this.getView().byId("btnSubmitDM").setEnabled(false);
				} else if (oData.Dmst === "03") {
					this.getView().byId("btnChangeDM").setVisible(true);
					this.getView().byId("btnSaveDM").setEnabled(false);
					this.getView().byId("btnSubmitDM").setEnabled(false);
				}
			},

			handleIconTabColor: function(oData) {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				dealMemoDetailModel.setProperty("/budgetTabColor", "Critical");
				dealMemoDetailModel.setProperty("/yearWiseTabColor", "Critical");
				dealMemoDetailModel.setProperty("/episodeDetTabColor", "Critical");
				dealMemoDetailModel.setProperty("/budgetMainTabColor", "Critical");
				dealMemoDetailModel.setProperty("/vctabcolor", "Critical");
				dealMemoDetailModel.setProperty("/actabcolor", "Critical");
				dealMemoDetailModel.setProperty("/scheduletabcolor", "Critical");
				dealMemoDetailModel.setProperty("/revenueTabColor", "Critical");
				dealMemoDetailModel.setProperty("/marketTabColor", "Critical");
				dealMemoDetailModel.setProperty("/progTabColor", "Critical");
				dealMemoDetailModel.setProperty("/commentTabColor", "Critical");
				this.getView().byId("btnSubmitDM").setEnabled(false);
				if (dealMemoDetailInfo.enableFlow === "M") {
					dealMemoDetailModel.setProperty("/episodeDetTabEnable", true);
					if (oData.DmEpisodeSet.results.length) {
						dealMemoDetailModel.setProperty("/episodeDetTabColor", "Positive");
						dealMemoDetailModel.setProperty("/yearWiseTabEnable", true);
						dealMemoDetailModel.setProperty("/costDetTabEnable", true);
					} else {
						dealMemoDetailModel.setProperty("/yearWiseTabEnable", false);
						dealMemoDetailModel.setProperty("/costDetTabEnable", false);
					}
					if (oData.DmYCSet.results.length) {
						dealMemoDetailModel.setProperty("/yearWiseTabColor", "Positive");
						dealMemoDetailModel.setProperty("/yearWiseTabEnable", true);
						dealMemoDetailModel.setProperty("/costDetTabEnable", true);
					} else {

						dealMemoDetailModel.setProperty("/costDetTabEnable", false);
					}
					if (oData.DmCostSet.results.length) {
						dealMemoDetailModel.setProperty("/budgetTabColor", "Positive");
						dealMemoDetailModel.setProperty("/budgetMainTabColor", "Positive");
						dealMemoDetailModel.setProperty("/costDetTabEnable", true);

						this.getView().byId("btnSubmitDM").setEnabled(true); // Added by dhiraj on 31/05/2022 for submit butn for movie
					}

				} else {
					if (oData.DmCostSet.results.length) {
						dealMemoDetailModel.setProperty("/budgetTabColor", "Positive");
						dealMemoDetailModel.setProperty("/yearWiseTabEnable", true);
						dealMemoDetailModel.setProperty("/costDetTabEnable", true);
					} else {
						dealMemoDetailModel.setProperty("/costDetTabEnable", true);
						dealMemoDetailModel.setProperty("/yearWiseTabEnable", false);
						dealMemoDetailModel.setProperty("/episodeDetTabEnable", false);
					}
					if (oData.DmYCSet.results.length) {
						dealMemoDetailModel.setProperty("/yearWiseTabColor", "Positive");
						dealMemoDetailModel.setProperty("/yearWiseTabEnable", true);
						dealMemoDetailModel.setProperty("/episodeDetTabEnable", true);
					} else {
						dealMemoDetailModel.setProperty("/episodeDetTabEnable", false);
					}
					if (oData.DmEpisodeSet.results.length) {
						dealMemoDetailModel.setProperty("/episodeDetTabColor", "Positive");
						dealMemoDetailModel.setProperty("/budgetMainTabColor", "Positive");
						dealMemoDetailModel.setProperty("/episodeDetTabEnable", true);

						this.getView().byId("btnSubmitDM").setEnabled(true);
					}

				}
				var oContractData = oData.DmCoSet.results;

				if (oContractData.length) {
					var oVCData = oContractData.filter(function(obj) {
						return obj.Conttp === "01"
					});
					var oACData = oContractData.filter(function(obj) {
						return obj.Conttp === "02"
					});
					if (oVCData.length > 0) {
						dealMemoDetailModel.setProperty("/vctabcolor", "Positive");
					}
					if (oACData.length > 0) {
						dealMemoDetailModel.setProperty("/actabcolor", "Positive");
					}
					oData.NoOfEpiEnableFlag = false;
				}

				if (oData.DmbsSet.results.length) {
					dealMemoDetailModel.setProperty("/scheduletabcolor", "Positive");
					dealMemoDetailModel.setProperty("/revenueTabEnable", true);
					dealMemoDetailModel.setProperty("/marketTabEnable", true);
					dealMemoDetailModel.setProperty("/progTabEnable", true);
				} else {
					dealMemoDetailModel.setProperty("/revenueTabEnable", false);
					dealMemoDetailModel.setProperty("/marketTabEnable", false);
					dealMemoDetailModel.setProperty("/progTabEnable", false);
				}
				if (oData.Dmaf.Avgbcrevamt !== "0.00") {
					dealMemoDetailModel.setProperty("/revenueTabColor", "Positive");
				}
				if (oData.Dmaf.Advoffairamt !== "0.00") {
					dealMemoDetailModel.setProperty("/marketTabColor", "Positive");
					dealMemoDetailModel.setProperty("/progTabColor", "Positive");
				}
				if (oData.DmtxtSet.results.length) {
					dealMemoDetailModel.setProperty("/commentTabColor", "Positive");
				}
				dealMemoDetailModel.refresh(true);
				this.handleDmStatus(oData);
			},

			loadDetailPage: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				this.getView().byId("idIconTabBar").setSelectedKey("detail");

			},

			handleFiscalYrChange: function(oEvent) {
				this._yearChanged = true;
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				//		 dealMemoDetailModel.setProperty("/FiscalYrFromTo");
			},
			validateBeforeSaveDetailTab: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var oMsg = "";
				var statusFlag = true;
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				if (dealMemoDetailInfo.Noofepi === "" || dealMemoDetailInfo.Noofepi === "0" || dealMemoDetailInfo.Waers === "" ||
					dealMemoDetailInfo.FiscalYrFromTo === "" || dealMemoDetailInfo.Cntstp === "") {
					oMsg = "msgrequiredFieds";
					statusFlag = false;
				} else {

					var secChanel = dealMemoDetailInfo.SecondChnl;
					if (secChanel && secChanel !== undefined && secChanel !== null) {

						var ownerChanlPerc = dealMemoDetailInfo.OwnchnlPerc;
						var secChanlPerc = dealMemoDetailInfo.SecondPerc;

						if (ownerChanlPerc === "" || secChanlPerc === "") {
							statusFlag = false;
							oMsg = "ChanelTotPercValidation";
						} else {

							if (parseInt(ownerChanlPerc) <= 0) {
								statusFlag = false;
								oMsg = "ChanelPercValidation";

							} else if (parseInt(secChanlPerc) <= 0) {
								statusFlag = false;
								oMsg = "ChanelPercValidation";

							} else {
								var totPerc = parseInt(ownerChanlPerc) + parseInt(secChanlPerc);
								if (totPerc === 100) {
									oMsg = "";
									statusFlag = true;
								} else {
									statusFlag = false;
									oMsg = "ChanelTotPercValidation";
								}
							}
						}
					} else {
						statusFlag = true;
						oMsg = "";

					}

				}

				if (parseInt(dealMemoDetailInfo.Amrtpercost) < 0 || parseInt(dealMemoDetailInfo.Amrtpercost) > 100) {
					statusFlag = false;
					oMsg = "AmortPercNotValid";
				}

				if (oMsg !== "") {
					MessageBox.error(oSourceBundle.getText(oMsg));
				}
				return statusFlag;
			},
			handleSecChannelChange: function(oEvent) {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				if (dealMemoDetailInfo.SecondChnl === "") {
					dealMemoDetailInfo.SecondPerc = "0.00";
					dealMemoDetailInfo.OwnchnlPerc = "100.00";
					dealMemoDetailInfo.enablePerc = false;
					dealMemoDetailModel.setProperty("/enablePerc", false);
				} else {
					dealMemoDetailInfo.enablePerc = true;
					dealMemoDetailModel.setProperty("/enablePerc", true);
				}
				//	 dealMemoDetailModel.refresh(true);
			},

			// Detail Tab Save
			prepareDetailPayload: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var checkFiscalYr = dealMemoDetailInfo.FiscalYrFromTo.includes("-");
				if (checkFiscalYr == true) {
					var fiscalYrSplit = dealMemoDetailInfo.FiscalYrFromTo.split("-");
					var fromYr = fiscalYrSplit[0].trim();
					var ToYr = fiscalYrSplit[1].trim();
				} else {
					var fromYr = dealMemoDetailInfo.FiscalYrFromTo;
					var ToYr = dealMemoDetailInfo.FiscalYrFromTo
				}
				var payload = {
					Amrtpercost: dealMemoDetailInfo.Amrtpercost,
					Bukrs: "",
					Cafrefno: "",
					Chnlid: dealMemoDetailInfo.Chnlid,
					Chnlnm: dealMemoDetailInfo.Chnlnm,
					Cntcat: dealMemoDetailInfo.Cntcat,
					Cntcatnm: dealMemoDetailInfo.Cntcatnm,
					Cntid: dealMemoDetailInfo.Cntid,
					Cntnm: dealMemoDetailInfo.Cntnm,
					Cnttp: dealMemoDetailInfo.Cnttp,
					Cnttpnm: dealMemoDetailInfo.Cnttpnm,
					Cntnt: dealMemoDetailInfo.Cntnt,
					Cntntnm: dealMemoDetailInfo.Cntntnm,
					Cntobj: dealMemoDetailInfo.Cntobj,
					Cntgn: dealMemoDetailInfo.Cntgn,
					Cntsgn: dealMemoDetailInfo.Cntsgn,
					Cntstp: dealMemoDetailInfo.Cntstp,
					Cntsc: dealMemoDetailInfo.Cntsc,
					Dmdt: Formatter.formatDateValForBackend(dealMemoDetailInfo.DmdtFormatted),
					Dmrefno: "",
					Dmst: "",
					Dmstdesc: "",
					Exprdnm: "",
					FromYr: fromYr,
					Lastepi: "",
					Noofepi: dealMemoDetailInfo.Noofepi,
					OwnchnlPerc: dealMemoDetailInfo.OwnchnlPerc,
					Prdnm: "",
					SecondPerc: dealMemoDetailInfo.SecondPerc,
					SecondChnl: dealMemoDetailInfo.SecondChnl,
					Tentid: "IBS",
					ToYr: ToYr,
					Totdmamt: "0.00",
					Transtp: "D",
					Waers: dealMemoDetailInfo.Waers,
					Prdnm: dealMemoDetailInfo.Prdnm,
					Exprdnm: dealMemoDetailInfo.Exprdnm,
					Exchrt: dealMemoDetailInfo.Exchrt,
					Costcenter: dealMemoDetailInfo.Costcenter,
					Estprgreldt: dealMemoDetailInfo.Estprgreldt !== null ? Formatter.formatDateValForBackend(dealMemoDetailInfo.Estprgreldt) : null,
					Avgepidur: Formatter.formatTimeValForBackend(dealMemoDetailInfo.Avgepidur)
				}

				return payload;
			},
			changeEstimatedDate: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				if (dealMemoDetailInfo.Estprgreldt === "") {
					dealMemoDetailInfo.Estprgreldt = null;
				}
				dealMemoDetailModel.refresh(true);
			},
			saveDealMemoDetailData: function() {
				var validationFlag = this.validateBeforeSaveDetailTab();
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				if (validationFlag) {

					if (dealMemoDetailInfo.Dmno !== "") {
						this.checkIfEpiOrYearChanged();
						//this.updateDealMemoHeaderSet();
					} else {
						this.createDealMemoHeaderSet();
					}

				}

			},

			createDealMemoHeaderSet: function() {
				var oDetPayload = this.prepareDetailPayload();
				var oModel = this.getView().getModel();
				oModel.create("/DmHeaderSet", oDetPayload, {
					success: function(oData) {
						var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
						MessageToast.show(oSourceBundle.getText("msgSuccDealMemoCreate"));
						this.loadDealMemoList();
						this.loadDefaultDealMemo = true;
					}.bind(this),
					error: function(oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				});
			},
			checkIfEpiOrYearChanged: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				var oMsg = "";
				if (dealMemoDetailInfo.DmCostSet.results.length || dealMemoDetailInfo.DmEpisodeSet.results.length) {
					if (this._noOfEpiChanged) {
						oMsg = oSourceBundle.getText("msgDetSaveBudgetDataLoss");
					} else {
						var checkFiscalYr = dealMemoDetailInfo.FiscalYrFromTo.includes("-");
						if (checkFiscalYr == true) {
							var fiscalYrSplit = dealMemoDetailInfo.FiscalYrFromTo.split("-");
							var fromYr = fiscalYrSplit[0].trim();
							var ToYr = fiscalYrSplit[1].trim();
						} else {
							var fromYr = dealMemoDetailInfo.FiscalYrFromTo;
							var ToYr = dealMemoDetailInfo.FiscalYrFromTo
						}
						// var fiscalYrSplit = dealMemoDetailInfo.FiscalYrFromTo.split("-");
						// var fromYr = fiscalYrSplit[0].trim();
						// var ToYr = fiscalYrSplit[1].trim()
						if (fromYr !== dealMemoDetailInfo.FromYr || ToYr !== dealMemoDetailInfo.ToYr) {
							oMsg = oSourceBundle.getText("msgDetSaveBudgetDataLoss");
						}
					}
				}

				if (oMsg !== "") {
					MessageBox.information(oMsg, {

						actions: ["Continue", MessageBox.Action.CLOSE],
						emphasizedAction: "Continue",
						onClose: function(sAction) {
							if (sAction === "Continue") {
								this.updateDealMemoHeaderSet();
							}
						}.bind(this)
					});
				} else {
					this.updateDealMemoHeaderSet();
				}

			},
			updateDealMemoHeaderSet: function() {
				var oDetPayload = this.prepareDetailPayload();
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				oDetPayload.Dmno = dealMemoDetailInfo.Dmno;
				var oModel = this.getView().getModel();
				oModel.sDefaultUpdateMethod = "MERGE";
				var oPath = "/DmHeaderSet(Tentid='IBS',Dmno='" + dealMemoDetailInfo.Dmno + "',Dmver='" + dealMemoDetailInfo.Dmver +
					"',Transtp='D')";
				oModel.update(oPath, oDetPayload, {
					success: function(oData) {
						var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
						MessageToast.show(oSourceBundle.getText("msgSuccDealMemoUpdate", dealMemoDetailInfo.Dmno));
						//	 this.loadDealMemoList();
						this.loadDetailDealMemo(this.selectedDealMemoObj);
					}.bind(this),
					error: function(oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				});
			},

			//Budget Tab

			loadCostTemplate: function() {
				var oModel = this.getView().getModel();
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var paramObj = {
					"IV_TENTID": "IBS",
					"IV_DMNO": dealMemoDetailInfo.Dmno,
					"IV_DMVER": dealMemoDetailInfo.Dmver

				};
				oModel.callFunction("/Getcosttemp", {
					method: "GET",
					urlParameters: paramObj,
					success: function(oData, response) {
						var costSheetFormatted = this.prepareCostSheet(oData.results, true);
						dealMemoDetailModel.setProperty("/budgetCostData", costSheetFormatted);
						dealMemoDetailModel.refresh(true);
						var oTableBinding = this.getView().byId("oTable_budgetdetail").getBinding("items");
						oTableBinding.filter([new Filter("itemVisible", "EQ", true)]);

					}.bind(this),
					error: function(oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				})

			},

			loadChangeCostTemplate: function() {
				var oModel = this.getView().getModel();
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var paramObj = {
					"IV_TENTID": "IBS",
					"IV_DMNO": dealMemoDetailInfo.Dmno,
					"IV_DMVER": dealMemoDetailInfo.Dmver

				};
				oModel.callFunction("/Getcosttemp", {
					method: "GET",
					urlParameters: paramObj,
					success: function(oData, response) {
						var costSheetFormatted = this.prepareCostSheet(oData.results, true);
						dealMemoDetailModel.setProperty("/changeCostDataTemplate", costSheetFormatted);
						dealMemoDetailModel.setProperty("/createEpiCostDataTemplate", $.extend(true, [], costSheetFormatted));
						dealMemoDetailModel.refresh(true);

					}.bind(this),
					error: function(oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				})

			},
			loadMovieCostTemplate: function() {
				var oModel = this.getView().getModel();
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var paramObj = {
					"IV_TENTID": "IBS",
					"IV_DMNO": dealMemoDetailInfo.Dmno,
					"IV_DMVER": dealMemoDetailInfo.Dmver

				};
				oModel.callFunction("/Getcosttemp", {
					method: "GET",
					urlParameters: paramObj,
					success: function(oData, response) {
						var costSheetFormatted = this.prepareCostSheet(oData.results, true);
						dealMemoDetailModel.setProperty("/moviebudgetCostData", costSheetFormatted);
						dealMemoDetailModel.setProperty("/budgetCostData", $.extend(true, [], costSheetFormatted));
						dealMemoDetailModel.refresh(true);

					}.bind(this),
					error: function(oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				})

			},
			prepareCostSheet: function(costSheetData, editModeFlag) {
				var budgetSheetList = [];
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				if (costSheetData.length) {
					var costHeads = [];
					costSheetData.map(function(costSheetObj) {

						var ChildObj = {
							"Costcd": costSheetObj.Scostcd,
							"Costdesc": costSheetObj.Scostdesc,
							"Scostdesc": costSheetObj.Scostdesc,
							"Scostcd": costSheetObj.Scostcd,
							"Prdhsamt": costSheetObj.Prdhsamt,
							"Inhsamt": costSheetObj.Inhsamt, //External Budget
							"Inhouseamt": costSheetObj.Inhouseamt, //In house Budget
							"Totcostamt": costSheetObj.Totcostamt
						};
						ChildObj.enableAcquisition = false;
						ChildObj.enableExternal = false;
						ChildObj.enableInhouse = false;
						ChildObj.enableTotal = false;
						ChildObj.itemVisible = false;
						ChildObj.hasChild = false;
						ChildObj.Costdesc = "";
						ChildObj.Waers = dealMemoDetailInfo.Waers;
						if (costSheetObj.Leadcostcd) {
							ChildObj.Leadcostcd = costSheetObj.Leadcostcd;
						}
						if (editModeFlag) {
							if (costSheetObj.Prdhscostfatt === "2") {
								ChildObj.enableAcquisition = true;
							};
							if (costSheetObj.Inhscostfatt === "2") {
								ChildObj.enableExternal = true;
							};
							if (costSheetObj.Inhouseamtfatt === "2") {
								ChildObj.enableInhouse = true;
							};
						}

						var oIndex = costHeads.indexOf(costSheetObj.Costcd);

						if (oIndex === -1) {
							//var costHeadObj = JSON.parse(JSON.stringify(ChildObj));
							var costHeadObj = $.extend(true, {}, ChildObj);
							costHeadObj.Costcd = costSheetObj.Costcd;
							costHeadObj.Costdesc = costSheetObj.Costdesc;
							costHeadObj.hasChild = false;
							costHeadObj.itemVisible = true;
							costHeadObj.isExpanded = false;
							costHeadObj.parenCostcd = "";
							if (costSheetObj.Scostcd !== "") {
								costHeadObj.enableAcquisition = false;
								costHeadObj.enableExternal = false;
								costHeadObj.enableInhouse = false;
								costHeadObj.childHeads = [ChildObj];
								costHeadObj.hasChild = true;
								costHeadObj.Scostdesc = "";
							}

							ChildObj.parenCostcd = costHeadObj.Costcd;
							budgetSheetList.push(costHeadObj);
							costHeads.push(costHeadObj.Costcd);
						} else {
							var existingCostHeadCodes = budgetSheetList.map(function(obj) {
								return obj.Costcd;
							});
							var costHeadObj = budgetSheetList[existingCostHeadCodes.indexOf(costSheetObj.Costcd)];
							if (costHeadObj.childHeads) {
								var existingchildCostHeades = costHeadObj.childHeads.map(function(obj) {
									return obj.Costcd;
								})
								if (existingchildCostHeades.indexOf(ChildObj.Costcd) === -1) {
									ChildObj.parenCostcd = costHeadObj.Costcd;
									costHeadObj.childHeads.push(ChildObj);
									costHeadObj.Prdhsamt = (parseFloat(costHeadObj.Prdhsamt) + parseFloat(ChildObj.Prdhsamt)).toFixed(2);
									costHeadObj.Inhsamt = (parseFloat(costHeadObj.Inhsamt) + parseFloat(ChildObj.Inhsamt)).toFixed(2);
									costHeadObj.Inhouseamt = (parseFloat(costHeadObj.Inhouseamt) + parseFloat(ChildObj.Inhouseamt)).toFixed(2);
									costHeadObj.Totcostamt = (parseFloat(costHeadObj.Totcostamt) + parseFloat(ChildObj.Totcostamt)).toFixed(2);
								}
							}
						}
					});

				}
				var budgetData = [];
				budgetSheetList.map(function(obj) {
					budgetData.push(obj);
					if (obj.childHeads && obj.childHeads.length) {
						budgetData = budgetData.concat(obj.childHeads);
					}
				});
				return budgetData;
			},
			onNodeExpand: function(oEvent) {
				var currentDetPageId = this.getView().byId("splitApp").getCurrentDetailPage().getId();
				if (currentDetPageId.includes("episodeDetail")) {
					var oModel = this.getView().getModel("dealMemoEpisodeModel");
					var budgetCostData = oModel.getData().epiSodeCostSheet;
					var selectedCostHeadObj = oEvent.getSource().getBindingContext("dealMemoEpisodeModel").getObject();
				} else {
					var oModel = this.getView().getModel("dealMemoDetailModel");
					var budgetCostData = oModel.getData().budgetCostData;
					var selectedCostHeadObj = oEvent.getSource().getBindingContext("dealMemoDetailModel").getObject();
				}

				var childCostHeads = budgetCostData.filter(function(obj) {
					return obj.parenCostcd === selectedCostHeadObj.Costcd
				});
				selectedCostHeadObj.isExpanded = !selectedCostHeadObj.isExpanded;
				childCostHeads.map(function(childObj) {
					childObj.itemVisible = selectedCostHeadObj.isExpanded
				});
				oModel.refresh(true);
			},

			onChangeAcquisitionAmount: function(oEvent) {

				var currentDetPageId = this.getView().byId("splitApp").getCurrentDetailPage().getId();
				if (currentDetPageId.includes("episodeDetail")) {
					var changedCostHeadObj = oEvent.getSource().getBindingContext("dealMemoEpisodeModel").getObject();
					var oModel = this.getView().getModel("dealMemoEpisodeModel");
					var budgetCostData = oModel.getData().epiSodeCostSheet;
					var flag = "Ch";
				} else if (this.changeEpiCostFlag) {
					var changedCostHeadObj = oEvent.getSource().getBindingContext("dealMemoDetailModel").getObject();
					var oModel = this.getView().getModel("dealMemoDetailModel");
					var budgetCostData = oModel.getData().changeCostData;
					var flag = "Ch";
				} else if (this.createEpiCostFlag) {
					var changedCostHeadObj = oEvent.getSource().getBindingContext("dealMemoDetailModel").getObject();
					var oModel = this.getView().getModel("dealMemoDetailModel");
					var budgetCostData = oModel.getData().creteEpisodeCostData;
					var flag = "Ch";

				} else {
					var changedCostHeadObj = oEvent.getSource().getBindingContext("dealMemoDetailModel").getObject();
					var oModel = this.getView().getModel("dealMemoDetailModel");
					var budgetCostData = oModel.getData().budgetCostData;
					var flag = "Cr";
					if (oModel.getData().budgetCostDataExists) {
						flag = "Ch";
					}

				}

				var costCodes = budgetCostData.map(function(obj) {
					return obj.Costcd
				});
				if (changedCostHeadObj.parenCostcd !== "") {
					changedCostHeadObj.flag = flag;
					this.changedCostCodes.push(changedCostHeadObj.Scostcd);
					var parentCostHeadObj = budgetCostData[budgetCostData.map(function(obj) {
						return obj.Costcd
					}).indexOf(changedCostHeadObj.parenCostcd)];
					var allChildCostHeads = budgetCostData.filter(function(bcObj) {
						return bcObj.parenCostcd === changedCostHeadObj.parenCostcd
					});
					parentCostHeadObj.Prdhsamt = 0;
					allChildCostHeads.map(function(childObj) {
						parentCostHeadObj.Prdhsamt += parseFloat(childObj.Prdhsamt);
					})
					parentCostHeadObj.Prdhsamt = parentCostHeadObj.Prdhsamt.toFixed(2);
					parentCostHeadObj.Totcostamt = parseFloat(parentCostHeadObj.Prdhsamt) + parseFloat(parentCostHeadObj.Inhsamt) + parseFloat(
						parentCostHeadObj.Inhouseamt);

				} else if (!changedCostHeadObj.hasChild) {
					changedCostHeadObj.flag = flag;
					this.changedCostCodes.push(changedCostHeadObj.Costcd);

				}
				changedCostHeadObj.Totcostamt = parseFloat(changedCostHeadObj.Prdhsamt) + parseFloat(changedCostHeadObj.Inhsamt) + parseFloat(
					changedCostHeadObj.Inhouseamt);

				oModel.refresh(true);

			},
			onChangeExternalAmount: function(oEvent) {
				//    			var changedCostHeadObj = oEvent.getSource().getBindingContext("dealMemoDetailModel").getObject();
				//    			var detailModel = this.getView().getModel("dealMemoDetailModel");
				//    			var budgetCostData = detailModel.getData().budgetCostData;
				var currentDetPageId = this.getView().byId("splitApp").getCurrentDetailPage().getId();

				if (currentDetPageId.includes("episodeDetail")) {
					var changedCostHeadObj = oEvent.getSource().getBindingContext("dealMemoEpisodeModel").getObject();
					var oModel = this.getView().getModel("dealMemoEpisodeModel");
					var budgetCostData = oModel.getData().epiSodeCostSheet;
					var flag = "Ch";
				} else if (this.changeEpiCostFlag) {
					var changedCostHeadObj = oEvent.getSource().getBindingContext("dealMemoDetailModel").getObject();
					var oModel = this.getView().getModel("dealMemoDetailModel");
					var budgetCostData = oModel.getData().changeCostData;
					var flag = "Ch";
				} else if (this.createEpiCostFlag) {
					var changedCostHeadObj = oEvent.getSource().getBindingContext("dealMemoDetailModel").getObject();
					var oModel = this.getView().getModel("dealMemoDetailModel");
					var budgetCostData = oModel.getData().creteEpisodeCostData;
					var flag = "Ch";

				} else {
					var changedCostHeadObj = oEvent.getSource().getBindingContext("dealMemoDetailModel").getObject();
					var oModel = this.getView().getModel("dealMemoDetailModel");
					var budgetCostData = oModel.getData().budgetCostData;
					var flag = "Cr";
					if (oModel.getData().budgetCostDataExists) {
						flag = "Ch";
					}
				}
				var costCodes = budgetCostData.map(function(obj) {
					return obj.Costcd
				});
				if (changedCostHeadObj.parenCostcd !== "") {
					changedCostHeadObj.flag = flag;
					this.changedCostCodes.push(changedCostHeadObj.Scostcd);
					var parentCostHeadObj = budgetCostData[budgetCostData.map(function(obj) {
						return obj.Costcd
					}).indexOf(changedCostHeadObj.parenCostcd)];
					var allChildCostHeads = budgetCostData.filter(function(bcObj) {
						return bcObj.parenCostcd === changedCostHeadObj.parenCostcd
					});
					parentCostHeadObj.Inhsamt = 0;
					allChildCostHeads.map(function(childObj) {
						parentCostHeadObj.Inhsamt += parseFloat(childObj.Inhsamt);
					})
					parentCostHeadObj.Inhsamt = parentCostHeadObj.Inhsamt.toFixed(2);
					parentCostHeadObj.Totcostamt = parseFloat(parentCostHeadObj.Prdhsamt) + parseFloat(parentCostHeadObj.Inhsamt) + parseFloat(
						parentCostHeadObj.Inhouseamt);

				} else if (!changedCostHeadObj.hasChild) {
					changedCostHeadObj.flag = flag;
					this.changedCostCodes.push(changedCostHeadObj.Costcd);

				}
				changedCostHeadObj.Totcostamt = parseFloat(changedCostHeadObj.Prdhsamt) + parseFloat(changedCostHeadObj.Inhsamt) + parseFloat(
					changedCostHeadObj.Inhouseamt);

				oModel.refresh(true);
			},
			onChangeInHouseAmount: function(oEvent) {
				//    			var changedCostHeadObj = oEvent.getSource().getBindingContext("dealMemoDetailModel").getObject();
				//    			var detailModel = this.getView().getModel("dealMemoDetailModel");
				//    			var budgetCostData = detailModel.getData().budgetCostData;
				var currentDetPageId = this.getView().byId("splitApp").getCurrentDetailPage().getId();

				if (currentDetPageId.includes("episodeDetail")) {
					var changedCostHeadObj = oEvent.getSource().getBindingContext("dealMemoEpisodeModel").getObject();
					var oModel = this.getView().getModel("dealMemoEpisodeModel");
					var budgetCostData = oModel.getData().epiSodeCostSheet;
					var flag = "Ch";
				} else if (this.changeEpiCostFlag) {
					var changedCostHeadObj = oEvent.getSource().getBindingContext("dealMemoDetailModel").getObject();
					var oModel = this.getView().getModel("dealMemoDetailModel");
					var budgetCostData = oModel.getData().changeCostData;
					var flag = "Ch";
				} else if (this.createEpiCostFlag) {
					var changedCostHeadObj = oEvent.getSource().getBindingContext("dealMemoDetailModel").getObject();
					var oModel = this.getView().getModel("dealMemoDetailModel");
					var budgetCostData = oModel.getData().creteEpisodeCostData;
					var flag = "Ch";

				} else {
					var changedCostHeadObj = oEvent.getSource().getBindingContext("dealMemoDetailModel").getObject();
					var oModel = this.getView().getModel("dealMemoDetailModel");
					var budgetCostData = oModel.getData().budgetCostData;
					var flag = "Cr";
					if (oModel.getData().budgetCostDataExists) {
						flag = "Ch";
					}
				}
				var costCodes = budgetCostData.map(function(obj) {
					return obj.Costcd
				});
				if (changedCostHeadObj.parenCostcd !== "") {
					changedCostHeadObj.flag = flag;
					this.changedCostCodes.push(changedCostHeadObj.Scostcd);
					var parentCostHeadObj = budgetCostData[budgetCostData.map(function(obj) {
						return obj.Costcd
					}).indexOf(changedCostHeadObj.parenCostcd)];
					var allChildCostHeads = budgetCostData.filter(function(bcObj) {
						return bcObj.parenCostcd === changedCostHeadObj.parenCostcd
					});
					parentCostHeadObj.Inhouseamt = 0;
					allChildCostHeads.map(function(childObj) {
						parentCostHeadObj.Inhouseamt += parseFloat(childObj.Inhouseamt);
					})
					parentCostHeadObj.Inhouseamt = parentCostHeadObj.Inhouseamt.toFixed(2);
					parentCostHeadObj.Totcostamt = parseFloat(parentCostHeadObj.Prdhsamt) + parseFloat(parentCostHeadObj.Inhsamt) + parseFloat(
						parentCostHeadObj.Inhouseamt);

				} else if (!changedCostHeadObj.hasChild) {
					changedCostHeadObj.flag = flag;
					this.changedCostCodes.push(changedCostHeadObj.Costcd);

				}
				changedCostHeadObj.Totcostamt = parseFloat(changedCostHeadObj.Prdhsamt) + parseFloat(changedCostHeadObj.Inhsamt) + parseFloat(
					changedCostHeadObj.Inhouseamt);

				oModel.refresh(true);
			},

			prepareCostPostPayload: function(parentCostHead, childCostHead) {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				return {

					"Tentid": "IBS",
					"Dmno": dealMemoDetailInfo.Dmno,
					"Dmver": dealMemoDetailInfo.Dmver,
					"Costcd": parentCostHead.Costcd,
					"Costdesc": parentCostHead.Costdesc,
					"Scostcd": childCostHead.Scostcd,
					"Scostdesc": childCostHead.Scostdesc,
					"Prdhsamt": childCostHead.Prdhsamt.toString(),
					"Inhsamt": childCostHead.Inhsamt.toString(),
					"Inhouseamt": childCostHead.Inhouseamt.toString(),
					"Totcostamt": childCostHead.Totcostamt.toString(),
					"Prntprdhsamt": parentCostHead.Prdhsamt.toString(),
					"Prntinhsamt": parentCostHead.Inhsamt.toString(),
					"Prntinhouseamt": parentCostHead.Inhouseamt.toString(),
					"Prnttotcostamt": parentCostHead.Totcostamt.toString(),
					"Recst": "I"
				}

			},
			saveBudgetCostData: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				if (dealMemoDetailInfo.DmCostSet.results.length) {
					this.updateBudgetCostData();
				} else {
					this.createBudgetCostData();
				}
			},
			createBudgetCostData: function() {
				var detailModel = this.getView().getModel("dealMemoDetailModel");
				var budgetCostData = detailModel.getData().budgetCostData;
				var costCodes = budgetCostData.map(function(obj) {
					return obj.Costcd
				});
				var postPayLoad = [];
				var batchCostChanges = [];
				var oModel = this.getView().getModel();
				oModel.setUseBatch(true);
				oModel.setDeferredGroups(["budgetChanges"]);
				var mParameters = {
					groupId: "budgetChanges",
					success: function(odata, resp) {
						var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
						MessageToast.show(oSourceBundle.getText("msgSuccBudgetDetSave"));
						this.loadDefaultDealMemo = false;
						this.getView().byId("idIconTabBar").setSelectedKey("cost");
						this.getView().byId("idIconTabBar2").setSelectedKey("costDet");
						this.loadDealMemoList();
						//this.loadDetailDealMemo(this.selectedDealMemoObj);

						//	this.getView().byId("idIconTabBar2").fireSelect();

					}.bind(this),
					error: function(oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				};

				budgetCostData.map(function(budgetObj) {
					if (!budgetObj.hasChild) {
						if (budgetObj.parenCostcd !== "") {
							var parentCostHead = budgetCostData[costCodes.indexOf(budgetObj.parenCostcd)];
						} else {
							var parentCostHead = budgetObj;
						}
						var payLoadData = this.prepareCostPostPayload(parentCostHead, budgetObj);
						postPayLoad.push(payLoadData);
						//   					batchCostChanges.push(oModel.createBatchOperation("DmCostSet", "POST", payLoadData))
						oModel.create("/DmCostSet", payLoadData, {
							groupId: "budgetChanges"
						});
					}

				}.bind(this));

				oModel.submitChanges(mParameters);
				console.log(postPayLoad);
			},
			updateBudgetCostData: function() {
				var detailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = detailModel.getData();
				var budgetCostData = detailModel.getData().budgetCostData;
				var costCodes = budgetCostData.map(function(obj) {
					return obj.Costcd
				});
				var postPayLoad = [];
				var batchCostChanges = [];
				var alreadySaveFlag = true;
				var oModel = this.getView().getModel();
				oModel.setUseBatch(true);
				oModel.setDeferredGroups(["budgetChanges"]);
				oModel.sDefaultUpdateMethod = "PUT";
				var mParameters = {
					groupId: "budgetChanges",
					success: function(odata, resp) {
						var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
						MessageToast.show(oSourceBundle.getText("msgSuccBudgetDetUpdate"));
						this.loadDefaultDealMemo = false;
						this.getView().byId("idIconTabBar").setSelectedKey("cost");
						this.getView().byId("idIconTabBar2").setSelectedKey("costDet");
						this.loadDealMemoList();
						//	this.loadDetailDealMemo(this.selectedDealMemoObj);

						//	this.getView().byId("idIconTabBar2").fireSelect();

					}.bind(this),
					error: function(oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				};

				budgetCostData.map(function(budgetObj) {
					if (!budgetObj.hasChild && budgetObj.flag === "Ch") {
						alreadySaveFlag = false;
						if (budgetObj.parenCostcd !== "") {
							var parentCostHead = budgetCostData[costCodes.indexOf(budgetObj.parenCostcd)];
						} else {
							var parentCostHead = budgetObj;
						}
						var payLoadData = this.prepareCostPostPayload(parentCostHead, budgetObj);
						payLoadData.Epiid = "";
						var oPath = "/DmCostSet(Tentid='IBS',Dmno='" + dealMemoDetailInfo.Dmno + "',Dmver='" + dealMemoDetailInfo.Dmver +
							"',Epiid=''" + ",Costcd='" + budgetObj.parenCostcd + "',Scostcd='" + budgetObj.Scostcd + "')";
						oModel.update(oPath, payLoadData, {
							groupId: "budgetChanges"
						});
					}

				}.bind(this));
				if (alreadySaveFlag) {
					var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.information(oSourceBundle.getText("msgAlreadysave"));

				} else {
					oModel.submitChanges(mParameters);
				}

			},
			prepareYearBudgetPayload: function(yearObj) {
				return {
					"Tentid": yearObj.Tentid,
					"Dmno": yearObj.Dmno,
					"Dmver": yearObj.Dmver,
					"Platform": yearObj.Platform,
					"Gjahr": yearObj.Gjahr,
					"Noofepi": yearObj.Noofepi,
					"Prdhsamt": yearObj.Prdhsamt,
					"Inhsamt": yearObj.Inhsamt,
					"Inhouseamt": yearObj.Inhouseamt,
					"Ficamt": yearObj.Ficamt,
					"Spikeamt": yearObj.Spikeamt,
					"Totalamt": yearObj.Totalamt,
					"Recst": "I"
				};
			},
			saveYearBudgetCostData: function() {
				var detailModel = this.getView().getModel("dealMemoDetailModel");
				var yearBudgetData = (detailModel.getProperty("/YearBudgetAllInfo"));
				var oModel = this.getView().getModel();
				oModel.setUseBatch(true);
				oModel.setDeferredGroups(["yearBudgetChanges"]);
				var mParameters = {
					groupId: "yearBudgetChanges",
					success: function(odata, resp) {
						var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
						MessageToast.show(oSourceBundle.getText("msgSuccYearBudgetDetSave"));
						detailModel.setProperty("/yearWiseTabColor", "Positive");
						detailModel.setProperty("/episodeDetTabEnable", true);
						detailModel.refresh(true);

					}.bind(this),
					error: function(oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				};
				if (yearBudgetData.length) {
					yearBudgetData.map(function(yearBudgetObj) {
						var payLoadData = this.prepareYearBudgetPayload(yearBudgetObj);
						//postPayLoad.push(payLoadData);
						oModel.create("/DmYCSet", payLoadData, {
							groupId: "yearBudgetChanges"
						});

					}.bind(this));
					oModel.submitChanges(mParameters);
				} else {
					var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.error(oSourceBundle.getText("msgNoDatatoSave"));
				}
			},
			handlePlatformChange: function(oEvent) {
				var selectedKey = this.getView().byId("cbplatformchnge").getSelectedKey();
				var mapObj = {
					"01": "/YearBudgetLin",
					"02": "/YearBudgetNonLin"
				}
				var mapObjTot = {
					"01": "/YearBudgetLinTot",
					"02": "/YearBudgetNonLinTot"
				}
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var yearBudgetData = dealMemoDetailModel.getProperty(mapObj[selectedKey]);
				var yearBudgetDataTot = dealMemoDetailModel.getProperty(mapObjTot[selectedKey]);
				
				dealMemoDetailModel.setProperty("/YearBudgetInfo", yearBudgetData);
				dealMemoDetailModel.setProperty("yearWiseTableTot", yearBudgetDataTot);
				dealMemoDetailModel.refresh(true);

			},
			handleTotalBudgetYear : function(yearBudgetData){
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();

				var Totalamt = 0;
				var Ficamt = 0;
				var Inhouseamt = 0;
				var Inhsamt = 0;
				var Spikeamt = 0;
				var Prdhsamt = 0;
				var yearTot = [];
				if(yearBudgetData.length){
					for ( let i = 0 ; i < yearBudgetData.length ; i ++) {
						Totalamt = Totalamt + parseFloat(yearBudgetData[i].Totalamt);
						Ficamt = Ficamt + parseFloat(yearBudgetData[i].Ficamt);
						Inhouseamt = Inhouseamt +  parseFloat(yearBudgetData[i].Inhouseamt);
						Inhsamt = Inhsamt +  parseFloat(yearBudgetData[i].Inhsamt);
						Spikeamt = Spikeamt +  parseFloat(yearBudgetData[i].Spikeamt);
						Prdhsamt = Prdhsamt +  parseFloat(yearBudgetData[i].Prdhsamt);
					}
				var totalYearBud = 	{
						"Tentid": dealMemoDetailModel.oData.Tentid,
						"Dmno": dealMemoDetailModel.oData.Dmno,
						"Dmver": dealMemoDetailModel.oData.Dmver,
						"Platform": yearBudgetData[0].Platform,
						"Gjahr": "Total",
						"Noofepi": dealMemoDetailModel.oData.Noofepi,
						"Prdhsamt": Prdhsamt,
						"Inhsamt": Inhsamt,
						"Inhouseamt": Inhouseamt,
						"Ficamt": Ficamt,
						"Spikeamt": Spikeamt,
						"Totalamt": Totalamt,
						"Recst": "I"
					};
					
					yearTot.push($.extend(true, {}, totalYearBud))
				}
				return yearTot;
			},
			onChangeEpisodeCost: function() {
				this.calculateEpisodeHeadCost();
				this.getView().byId("splitApp").toDetail(this.getView().byId("dealMemoDetail"));
			},

			onEpisodeCostChange: function() {

				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				dealMemoDetailInfo.episodeCostChangeList = $.extend(true, [], dealMemoDetailInfo.episodeData);
				dealMemoDetailInfo.changeCostData = $.extend(true, [], dealMemoDetailInfo.changeCostDataTemplate);
				dealMemoDetailInfo.epiCostChangeFromId = "";
				dealMemoDetailInfo.epiCostChangeToId = "";
				//---Added-By-Dhiraj-on-17/05/2022-for-Changing-year-on-budget-details----------------------
				dealMemoDetailInfo.epiCostChangeYear = "";
				var yearList = this.getYearEpisodes(parseInt(dealMemoDetailInfo.FromYr), parseInt(dealMemoDetailInfo.ToYr));
				dealMemoDetailInfo.yearList = $.extend(true, [], yearList);
				//-------------------------------------------------------------------------------------
				this.changeEpiCostFlag = true;
				dealMemoDetailModel.refresh(true);
				if (dealMemoDetailInfo.Cnttp === "02" || dealMemoDetailInfo.Cnttp === "04" || dealMemoDetailInfo.Cnttp === "05" ||
					dealMemoDetailInfo.Cnttp === "09") {
					if (!this._oEpiCostChangeDialog) {
						Fragment.load({
							id: this.createId("chngeEpiCostDialog"),
							name: "com.ui.dealmemolocal.fragments.ChangeMovieMatchCost",
							controller: this
						}).then(function name(oFragment) {
							this._oEpiCostChangeDialog = oFragment; //sap.ui.xmlfragment("com.ui.dealmemolocal.fragments.SelectPaymentDialog", this);
							this.getView().addDependent(this._oEpiCostChangeDialog);
							var oTableBinding = this.byId(sap.ui.core.Fragment.createId("chngeEpiCostDialog", "oTable_changeCost")).getBinding("items");
							oTableBinding.filter([new Filter("itemVisible", "EQ", true)]);
							this._oEpiCostChangeDialog.open();
						}.bind(this));

					} else {
						var oTableBinding = this.byId(sap.ui.core.Fragment.createId("chngeEpiCostDialog", "oTable_changeCost"))
							.getBinding("items");
						oTableBinding.filter([new Filter("itemVisible", "EQ", true)]);
						this._oEpiCostChangeDialog.open();
					}
				} else {
					if (!this._oEpiCostChangeDialog) {
						Fragment.load({
							id: this.createId("chngeEpiCostDialog"),
							name: "com.ui.dealmemolocal.fragments.ChangeEpisodeCost",
							controller: this
						}).then(function name(oFragment) {
							this._oEpiCostChangeDialog = oFragment; //sap.ui.xmlfragment("com.ui.dealmemolocal.fragments.SelectPaymentDialog", this);
							this.getView().addDependent(this._oEpiCostChangeDialog);
							var oTableBinding = this.byId(sap.ui.core.Fragment.createId("chngeEpiCostDialog", "oTable_changeCost")).getBinding("items");
							oTableBinding.filter([new Filter("itemVisible", "EQ", true)]);
							this._oEpiCostChangeDialog.open();
						}.bind(this));

					} else {
						var oTableBinding = this.byId(sap.ui.core.Fragment.createId("chngeEpiCostDialog", "oTable_changeCost"))
							.getBinding("items");
						oTableBinding.filter([new Filter("itemVisible", "EQ", true)]);
						this._oEpiCostChangeDialog.open();
					}

				}

			},
			onNodeExpandChangeCost: function(oEvent) {

				var oModel = this.getView().getModel("dealMemoDetailModel");
				var budgetCostData = oModel.getData().changeCostData;
				var selectedCostHeadObj = oEvent.getSource().getBindingContext("dealMemoDetailModel").getObject();

				var childCostHeads = budgetCostData.filter(function(obj) {
					return obj.parenCostcd === selectedCostHeadObj.Costcd
				});
				selectedCostHeadObj.isExpanded = !selectedCostHeadObj.isExpanded;
				childCostHeads.map(function(childObj) {
					childObj.itemVisible = selectedCostHeadObj.isExpanded
				});
				oModel.refresh(true);
			},
			validateChangeCost: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				var oMsg = "";
				if (dealMemoDetailInfo.epiCostChangeFromId === "" || dealMemoDetailInfo.epiCostChangeToId === "") {
					oMsg = "msgSelectEpisode" + dealMemoDetailInfo.Cnttp;
				}
				//---Added-By-Dhiraj-on-17/05/2022-for-Changing-year-on-budget-details----------------------
				var costHeadChangedFlag = false;
				var yearChangedFlag = false;
				if (dealMemoDetailInfo.epiCostChangeYear === "") {
					// oMsg = "msgfillAllYear
				} else {
					yearChangedFlag = true;

				}
				//--------------------------------------------------------------------------------------------
				dealMemoDetailInfo.changeCostData.map(function(costObj) {
					if (costObj.flag === "Ch") {
						costHeadChangedFlag = true;
					}
				});
				if (!costHeadChangedFlag && !yearChangedFlag) {
					oMsg = "msgnocostchange";
				}

				if (oMsg !== "") {
					MessageBox.error(oSourceBundle.getText(oMsg));
					return false;
				} else {
					return true;
				}
			},
			getAddedCostSheet: function(episodeCostSheet, changedCostSheet) {
				var changedCostSheetCostCodes = changedCostSheet.map(function(chngObj) {
					return chngObj.Costcd
				});
				var episodeCostSheetCostCodes = episodeCostSheet.map(function(chngObj) {
					return chngObj.Costcd
				});
				episodeCostSheet.map(function(epCostObj) {
					if (!epCostObj.hasChild) {
						var oIndex = changedCostSheetCostCodes.indexOf(epCostObj.Costcd);
						if (oIndex >= 0) {
							epCostObj.flag = changedCostSheet[oIndex].flag;
							epCostObj.Prdhsamt = parseFloat(epCostObj.Prdhsamt) + parseFloat(changedCostSheet[oIndex].Prdhsamt);
							if (parseInt(epCostObj.Prdhsamt) < 0) {
								epCostObj.Prdhsamt = 0;
							}
							epCostObj.Inhsamt = parseFloat(epCostObj.Inhsamt) + parseFloat(changedCostSheet[oIndex].Inhsamt);
							if (parseInt(epCostObj.Inhsamt) < 0) {
								epCostObj.Inhsamt = 0;
							}
							epCostObj.Inhouseamt = parseFloat(epCostObj.Inhouseamt) + parseFloat(changedCostSheet[oIndex].Inhouseamt);
							if (parseInt(epCostObj.Inhouseamt) < 0) {
								epCostObj.Inhouseamt = 0;
							}
							epCostObj.Totcostamt = parseFloat(epCostObj.Prdhsamt) + parseFloat(epCostObj.Inhsamt) + parseFloat(epCostObj.Inhouseamt);
						}
						if (epCostObj.parenCostcd !== "") {
							var oParentCostIndex = episodeCostSheetCostCodes.indexOf(epCostObj.parenCostcd);
							if (oParentCostIndex >= 0) {
								var oParentCostObj = episodeCostSheet[oParentCostIndex];
								oParentCostObj.Prdhsamt += parseFloat(epCostObj.Prdhsamt);
								oParentCostObj.Inhsamt += parseFloat(epCostObj.Inhsamt);
								oParentCostObj.Inhouseamt += parseFloat(epCostObj.Inhouseamt);
								oParentCostObj.Totcostamt = parseFloat(oParentCostObj.Prdhsamt) + parseFloat(oParentCostObj.Inhsamt) + parseFloat(
									oParentCostObj.Inhouseamt);

							}

						}

					} else {
						epCostObj.Prdhsamt = 0;
						epCostObj.Inhsamt = 0
						epCostObj.Inhouseamt = 0
					}

				});
				return episodeCostSheet;

			},
			onApplyChangeCost: function() {
				sap.ui.core.BusyIndicator.show(0);
				var validFlag = this.validateChangeCost();
				if (validFlag) {
					var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
					var dealMemoDetailInfo = dealMemoDetailModel.getData();
					var changedCostSheet = dealMemoDetailInfo.changeCostData;
					var selectedEpisodeList = [];
					var yearValue = dealMemoDetailInfo.epiCostChangeYear; //---Added-By-Dhiraj-on-17/05/2022-for-Changing-year-on-budget-details--
					dealMemoDetailInfo.episodeData.map(function(epObj) {
						if (epObj.Epiid >= dealMemoDetailInfo.epiCostChangeFromId && epObj.Epiid <= dealMemoDetailInfo.epiCostChangeToId) {
							var oAddedCostSheet = this.getAddedCostSheet(epObj.epiSodeCostSheet, $.extend(true, [], changedCostSheet));
							epObj.epiSodeCostSheet = oAddedCostSheet; // $.extend(true,[],changedCostSheet);
							epObj.epiSodeCostSheetEditMode = oAddedCostSheet; //$.extend(true,[],changedCostSheet);
							epObj.Gjahr = yearValue === "" ? epObj.Gjahr : yearValue; //---Added-By-Dhiraj-on-17/05/2022-for-Changing-year-on-budget-details--
						}

					}.bind(this));
					dealMemoDetailModel.refresh(true);
					this.changeEpiCostFlag = false;
					this.calculateEpisodeHeadCost();
					this._oEpiCostChangeDialog.close();
				}
				sap.ui.core.BusyIndicator.hide();
			},
			onCancelChangeCost: function() {
				this.changeEpiCostFlag = false;
				this._oEpiCostChangeDialog.close();
			},
			//Create Additional Episode
			onNodeExpandCreateEpiCost: function(oEvent) {

				var oModel = this.getView().getModel("dealMemoDetailModel");
				var budgetCostData = oModel.getData().creteEpisodeCostData;
				var selectedCostHeadObj = oEvent.getSource().getBindingContext("dealMemoDetailModel").getObject();

				var childCostHeads = budgetCostData.filter(function(obj) {
					return obj.parenCostcd === selectedCostHeadObj.Costcd
				});
				selectedCostHeadObj.isExpanded = !selectedCostHeadObj.isExpanded;
				childCostHeads.map(function(childObj) {
					childObj.itemVisible = selectedCostHeadObj.isExpanded
				});
				oModel.refresh(true);
			},
			onCreateAdditionalEpisode: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				dealMemoDetailInfo.additionalEpisodeObj = {
					"YearValue": "",
					"noOfEpisodes": ""
				};
				dealMemoDetailInfo.additonalEpisodeData = [];
				dealMemoDetailInfo.additonalEpisodeData.push($.extend(true, {}, dealMemoDetailInfo.additionalEpisodeObj));
				var yearList = this.getYearEpisodes(parseInt(dealMemoDetailInfo.FromYr), parseInt(dealMemoDetailInfo.ToYr));
				dealMemoDetailInfo.yearList = $.extend(true, [], yearList);
				dealMemoDetailInfo.errorMsgCreateEpisode = "";
				dealMemoDetailInfo.msgVisibleCreateEpisode = false;
				dealMemoDetailInfo.createEpiLayoutVisible = true;
				dealMemoDetailInfo.createEpiCostLayoutVisible = false;
				dealMemoDetailInfo.creteEpisodeCostData = $.extend(true, [], dealMemoDetailInfo.createEpiCostDataTemplate);
				dealMemoDetailModel.refresh(true);

				if (!this._oCreateEpisodeDialog) {
					Fragment.load({
						id: this.createId("createEpisodetDialog"),
						name: "com.ui.dealmemolocal.fragments.CreateEpisode",
						controller: this
					}).then(function name(oFragment) {
						this._oCreateEpisodeDialog = oFragment; //sap.ui.xmlfragment("com.ui.dealmemolocal.fragments.SelectPaymentDialog", this);
						this.getView().addDependent(this._oCreateEpisodeDialog);
						this.onBackCreateEpisode();
						this._oCreateEpisodeDialog.open();
					}.bind(this));

				} else {
					this.onBackCreateEpisode();
					this._oCreateEpisodeDialog.open();
				}

			},
			onAddRow: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var addedRows = dealMemoDetailInfo.additonalEpisodeData;
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				var lastRow = addedRows[addedRows.length - 1];
				var oMsg = "";
				if (lastRow.YearValue !== "" && lastRow.noOfEpisodes !== "") {
					dealMemoDetailInfo.additonalEpisodeData.push($.extend(true, {}, dealMemoDetailInfo.additionalEpisodeObj));
				} else {
					oMsg = "msgfillAllYearNoOfEpi" + dealMemoDetailInfo.Cnttp;
				}
				if (oMsg !== "") {
					dealMemoDetailInfo.errorMsgCreateEpisode = oSourceBundle.getText(oMsg);
					dealMemoDetailInfo.msgVisibleCreateEpisode = true;
				}
				dealMemoDetailModel.refresh(true);
			},
			onDeleteRow: function(oEvent) {
				var oContextPath = oEvent.getSource().getBindingContext("dealMemoDetailModel").getPath();
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var additionalEpisodeData = dealMemoDetailModel.getProperty("/additonalEpisodeData");
				if (additionalEpisodeData.length > 1) {
					var splittedPath = oContextPath.split("/");
					if (splittedPath.length) {
						var oRowInd = splittedPath[2];
						additionalEpisodeData.splice(oRowInd, 1);

					}
					dealMemoDetailModel.refresh(true);
				}
			},
			onNextCreateEpisode: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var proceedFlag = true;
				if (dealMemoDetailInfo.additonalEpisodeData.length) {
					for (var oInd = 0; oInd < dealMemoDetailInfo.additonalEpisodeData.length; oInd++) {
						var oRowObj = dealMemoDetailInfo.additonalEpisodeData[oInd];
						if (oRowObj.YearValue === "" || oRowObj.noOfEpisodes === "") {
							proceedFlag = false;
							break;
						}
					}
				}
				if (proceedFlag) {
					dealMemoDetailInfo.createEpiLayoutVisible = false;
					dealMemoDetailInfo.createEpiCostLayoutVisible = true;
					dealMemoDetailInfo.errorMsgCreateEpisode = "";
					dealMemoDetailInfo.msgVisibleCreateEpisode = false;
					var oTableBinding = this.byId(sap.ui.core.Fragment.createId("createEpisodetDialog", "oTable_createEpisodeCost")).getBinding(
						"items");
					oTableBinding.filter([new Filter("itemVisible", "EQ", true)]);
					this.createEpiCostFlag = true;
					this._oCreateEpisodeDialog.setContentWidth("90%");
				} else {
					var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
					dealMemoDetailInfo.errorMsgCreateEpisode = oSourceBundle.getText("msgfillAllYearNoOfEpi" + dealMemoDetailInfo.Cnttp);
					dealMemoDetailInfo.msgVisibleCreateEpisode = true;
				}
				dealMemoDetailModel.refresh(true);
			},
			onBackCreateEpisode: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				dealMemoDetailInfo.createEpiLayoutVisible = true;
				dealMemoDetailInfo.createEpiCostLayoutVisible = false;
				this._oCreateEpisodeDialog.setContentWidth("40%");
				dealMemoDetailModel.refresh(true);
			},
			generateAdditionalEpisodes: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var additionalEpiData = dealMemoDetailInfo.additonalEpisodeData;
				var changedCostSheet = dealMemoDetailInfo.creteEpisodeCostData;
				var additionalEpisodeInfo = [];
				this.episodesGenerated = false;
				additionalEpiData.map(function(epiObj) {
					var postData = {
						"Tentid": "IBS",
						"Dmno": dealMemoDetailInfo.Dmno,
						"Dmver": dealMemoDetailInfo.Dmver,
						"Gjahr": epiObj.YearValue,
						"Epiid": epiObj.noOfEpisodes
					};
					additionalEpisodeInfo.push(postData);
				}.bind(this));

				var postPayload = {
					"DmYearWiseEpiSet": additionalEpisodeInfo
				};
				var oModel = this.getView().getModel();
				oModel.create("/DmHeaderSet", postPayload, {
					success: function(oData) {
						oData.DmYearWiseEpiSet.results.map(function(epObj) {
							epObj.flag = "Cr";
							epObj.epiDescEditable = false;
							if (dealMemoDetailInfo.enableFlow === "M") {
								epObj.epiDescEditable = true;
							}

							epObj.epiSodeCostSheet = $.extend(true, [], changedCostSheet);
							epObj.epiSodeCostSheetEditMode = $.extend(true, [], changedCostSheet);
							epObj.Epidur = Formatter.formatTimeDuration(epObj.Epidur);
						});
						dealMemoDetailInfo.episodeData = dealMemoDetailInfo.episodeData.concat(oData.DmYearWiseEpiSet.results);
						dealMemoDetailModel.refresh(true);
						this.episodesGenerated = true;
						this.calculateEpisodeHeadCost();

					}.bind(this),
					error: function(oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				});
				this.createEpiCostFlag = false;
				this._oCreateEpisodeDialog.close();
			},

			onCancelAdditionalEpisode: function() {
				this.changeEpiCostFlag = false;
				this._oCreateEpisodeDialog.close()
			},
			calculateEpisodeHeadCost: function(episodeCostData) {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var episodeData = dealMemoDetailModel.getProperty("/episodeData");
				var budgetTabData = dealMemoDetailModel.getProperty("/budgetCostData");
				//episodeCostData = episodeCostData.filter(function(obj){return obj.Epiid !== "00000"});
				var totalEpiCostsPerEpisode = {
					"AcquisitionTot": 0,
					"ExternalTot": 0,
					"InhouseTot": 0,
					"Tot": 0
				};
				episodeData.map(function(epiObj) {
					var episodeTotCost = 0;
					epiObj.epiSodeCostSheet.map(function(epiCostObj) {
						if (epiCostObj.Leadcostcd === "P") {
							epiObj.Leadcost = epiCostObj.Prdhsamt;
						} else if (epiCostObj.Leadcostcd === "I") {
							epiObj.Leadcost = epiCostObj.Inhsamt;
						}
						// if(epiCostObj.parenCostcd === ""){
						if (!epiCostObj.hasChild) {
							totalEpiCostsPerEpisode['AcquisitionTot'] += parseFloat(epiCostObj.Prdhsamt);
							totalEpiCostsPerEpisode['ExternalTot'] += parseFloat(epiCostObj.Inhsamt);
							totalEpiCostsPerEpisode['InhouseTot'] += parseFloat(epiCostObj.Inhouseamt);
							totalEpiCostsPerEpisode['Tot'] += parseFloat(epiCostObj.Totcostamt);
							episodeTotCost += parseFloat(epiCostObj.Totcostamt);

						}

					}.bind(this));
					epiObj.Totepiamt = episodeTotCost;
				}.bind(this));
				dealMemoDetailModel.setProperty("/episodeTotalData", [totalEpiCostsPerEpisode]);
				dealMemoDetailModel.refresh(true);

			},
			calculateEpisodeDetTabData: function(oData) {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var episodeData = oData.DmEpisodeSet.results;
				var budgetCostData = JSON.parse(JSON.stringify(oData.DmCostSet.results));
				budgetCostData = budgetCostData.filter(function(obj) {
					return obj.Epiid !== "00000"
				});
				var totalEpiCostsPerEpisode = {
					"AcquisitionTot": 0,
					"ExternalTot": 0,
					"InhouseTot": 0,
					"Tot": 0
				};
				episodeData.map(function(epObj) {
					epObj.Epidur = Formatter.formatTimeDuration(epObj.Epidur);
					epObj.epiDescEditable = false;
					var episodeCostData = budgetCostData.filter(function(obj) {
						return obj.Epiid === epObj.Epiid;
					});
					var episodeCostSheet = this.prepareCostSheet(episodeCostData, true);
					var episodeCostSheetDisplay = this.prepareCostSheet(episodeCostData, false);
					epObj.epiSodeCostSheet = episodeCostSheet;
					epObj.epiSodeCostSheetDisplayMode = episodeCostSheetDisplay;
					epObj.epiSodeCostSheetEditMode = $.extend(true, [], episodeCostSheet);
					episodeCostSheet.map(function(epiObj) {

						if (epiObj.parenCostcd === "") {
							totalEpiCostsPerEpisode['AcquisitionTot'] += parseFloat(epiObj.Prdhsamt);
							totalEpiCostsPerEpisode['ExternalTot'] += parseFloat(epiObj.Inhsamt);
							totalEpiCostsPerEpisode['InhouseTot'] += parseFloat(epiObj.Inhouseamt);
							totalEpiCostsPerEpisode['Tot'] += parseFloat(epiObj.Totcostamt);

						}
					}.bind(this));

				}.bind(this));
				dealMemoDetailModel.setProperty("/episodeData", episodeData);
				dealMemoDetailModel.setProperty("/episodeTotalData", [totalEpiCostsPerEpisode]);
				dealMemoDetailModel.setProperty("/episodeDataOriginal", episodeData);
				dealMemoDetailModel.setProperty("/episodeTotalDataOriginal", [totalEpiCostsPerEpisode]);
				dealMemoDetailModel.refresh(true);

			},
			calculateCostSheetPerMovie: function(oData) {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var moviebudgetCostData = $.extend(true, [], dealMemoDetailModel.getData().moviebudgetCostData);
				var totalEpiCostsPerEpisode = {};
				oData.results.map(function(obj) {
					obj.epiSodeCostSheet = $.extend(true, [], moviebudgetCostData);
					obj.epiSodeCostSheetEditMode = $.extend(true, [], moviebudgetCostData);
					obj.Totepiamt = "0.00";
					obj.Epidur = Formatter.formatTimeDuration(obj.Epidur);
					obj.epiDescEditable = true;
					obj.flag = "Cr";
				});

				totalEpiCostsPerEpisode['AcquisitionTot'] = "0.00";
				totalEpiCostsPerEpisode['ExternalTot'] = "0.00";
				totalEpiCostsPerEpisode['InhouseTot'] = "0.00";
				totalEpiCostsPerEpisode['Tot'] = "0.00";
				totalEpiCostsPerEpisode['Waers'] = dealMemoDetailModel.getProperty("/Waers");

				dealMemoDetailModel.setProperty("/episodeData", oData.results);
				dealMemoDetailModel.setProperty("/episodeTotalData", [totalEpiCostsPerEpisode]);
				dealMemoDetailModel.refresh(true);
			},
			calculateCostSheetPerEpisode: function(oData) {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var noOfEpi = dealMemoDetailModel.getProperty("/Noofepi");
				var budgetCostData = $.extend(true, [], dealMemoDetailModel.getData().budgetCostDataEditMode);
				var budgetCostDataLast = $.extend(true, [], dealMemoDetailModel.getData().budgetCostDataEditMode);
				var episodeCostSheet = [];
				var episodeCostSheetLast = [];
				var remainCost = "";
				var costFlag = "";
				var totalEpiCostsPerEpisodeLast = {
					"AcquisitionTot": 0,
					"ExternalTot": 0,
					"InhouseTot": 0,
					"Tot": 0
				}
				var totalEpiCostsPerEpisode = {
					"AcquisitionTot": 0,
					"ExternalTot": 0,
					"InhouseTot": 0,
					"Tot": 0
				};
				budgetCostData.map(function(budgetObj) {
					budgetObj.Prdhsamt = parseFloat(budgetObj.Prdhsamt) / noOfEpi;
					budgetObj.Inhouseamt = parseFloat(budgetObj.Inhouseamt) / noOfEpi;
					budgetObj.Inhsamt = parseFloat(budgetObj.Inhsamt) / noOfEpi;
					budgetObj.Totcostamt = parseFloat(budgetObj.Totcostamt) / noOfEpi;

					if (budgetObj.parenCostcd === "") {
						totalEpiCostsPerEpisode['AcquisitionTot'] += budgetObj.Prdhsamt;
						totalEpiCostsPerEpisode['ExternalTot'] += budgetObj.Inhsamt;
						totalEpiCostsPerEpisode['InhouseTot'] += budgetObj.Inhouseamt;
						totalEpiCostsPerEpisode['Tot'] += budgetObj.Totcostamt;
					}
					episodeCostSheet.push(budgetObj);
				});

				budgetCostDataLast.map(function(budgetObjLast) {
					remainCost = 0;
					if (parseFloat(budgetObjLast.Prdhsamt) !== 0) {
						remainCost = parseFloat(budgetObjLast.Prdhsamt) - (parseFloat(budgetObjLast.Prdhsamt / noOfEpi).toFixed(2) * noOfEpi);
					}
					budgetObjLast.Prdhsamt = (parseFloat(budgetObjLast.Prdhsamt) / noOfEpi) + remainCost;
					remainCost = 0;
					if (parseFloat(budgetObjLast.Inhouseamt) !== 0) {
						remainCost = parseFloat(budgetObjLast.Inhouseamt) - (parseFloat(budgetObjLast.Inhouseamt / noOfEpi).toFixed(2) * noOfEpi);
					}
					budgetObjLast.Inhouseamt = (parseFloat(budgetObjLast.Inhouseamt) / noOfEpi) + remainCost;
					remainCost = 0;
					if (parseFloat(budgetObjLast.Inhsamt) !== 0) {
						remainCost = parseFloat(budgetObjLast.Inhsamt) - (parseFloat(budgetObjLast.Inhsamt / noOfEpi).toFixed(2) * noOfEpi);
					}
					budgetObjLast.Inhsamt = (parseFloat(budgetObjLast.Inhsamt) / noOfEpi) + remainCost;
					remainCost = 0;
					if (parseFloat(budgetObjLast.Totcostamt) !== 0) {
						remainCost = parseFloat(budgetObjLast.Totcostamt) - (parseFloat(budgetObjLast.Totcostamt / noOfEpi).toFixed(2) * noOfEpi);
					}
					budgetObjLast.Totcostamt = (parseFloat(budgetObjLast.Totcostamt) / noOfEpi) + remainCost;
					remainCost = 0;

					if (budgetObjLast.parenCostcd === "") {
						totalEpiCostsPerEpisodeLast['AcquisitionTot'] += budgetObjLast.Prdhsamt;
						totalEpiCostsPerEpisodeLast['ExternalTot'] += budgetObjLast.Inhsamt;
						totalEpiCostsPerEpisodeLast['InhouseTot'] += budgetObjLast.Inhouseamt;
						totalEpiCostsPerEpisodeLast['Tot'] += budgetObjLast.Totcostamt;
					}
					episodeCostSheetLast.push(budgetObjLast);
				});

				oData.results.map(function(obj, i) {
					if (oData.results.length === i + 1) {
						obj.epiSodeCostSheet = $.extend(true, [], episodeCostSheetLast);
						obj.epiSodeCostSheetEditMode = $.extend(true, [], episodeCostSheetLast);
						if (parseFloat(dealMemoDetailModel.oData.Totdmamt / noOfEpi).toFixed(2) * noOfEpi == parseFloat(dealMemoDetailModel.oData.Totdmamt)) {
							obj.Totepiamt = totalEpiCostsPerEpisode["Tot"];
						} else {
							obj.Totepiamt = totalEpiCostsPerEpisodeLast["Tot"];
						}
					} else {
						obj.epiSodeCostSheet = $.extend(true, [], episodeCostSheet);
						obj.epiSodeCostSheetEditMode = $.extend(true, [], episodeCostSheet);
						obj.Totepiamt = totalEpiCostsPerEpisode["Tot"];
					}
					obj.Epidur = Formatter.formatTimeDuration(obj.Epidur);
					obj.epiDescEditable = false;
					obj.flag = "Cr";
				});

				totalEpiCostsPerEpisode['AcquisitionTot'] = totalEpiCostsPerEpisode['AcquisitionTot'] * noOfEpi;
				totalEpiCostsPerEpisode['ExternalTot'] = totalEpiCostsPerEpisode['ExternalTot'] * noOfEpi;
				totalEpiCostsPerEpisode['InhouseTot'] = totalEpiCostsPerEpisode['InhouseTot'] * noOfEpi;
				totalEpiCostsPerEpisode['Tot'] = totalEpiCostsPerEpisode['Tot'] * noOfEpi;
				totalEpiCostsPerEpisode['Waers'] = dealMemoDetailModel.getProperty("/Waers");

				dealMemoDetailModel.setProperty("/episodeData", oData.results);
				dealMemoDetailModel.setProperty("/episodeTotalData", [totalEpiCostsPerEpisode]);
				dealMemoDetailModel.refresh(true);
			},
			generateMovies: function() {
				var oModel = this.getView().getModel();
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var paramObj = {
					"IV_TENTID": "IBS",
					"IV_DMNO": dealMemoDetailInfo.Dmno,
					"IV_DMVER": dealMemoDetailInfo.Dmver,
					"IV_NOOFEPI": dealMemoDetailInfo.Noofepi,
					"IV_LASTEPI": ""

				};
				oModel.callFunction("/GenerateEpi", {
					method: "GET",
					urlParameters: paramObj,
					success: function(oData, response) {
						this.calculateCostSheetPerMovie(oData);
						//      						dealMemoDetailModel.setProperty("/episodeData",oData.results);
						//      						dealMemoDetailModel.refresh(true);

					}.bind(this),
					error: function(oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				})
			},
			onLeadingValueChange: function(oEvent) {
				var oRowObj = oEvent.getSource().getBindingContext("dealMemoDetailModel").getObject();
				var leadingValue = Number(oEvent.getSource().getValue().replace(/[^0-9\.]+/g, ""));
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				oRowObj.epiSodeCostSheet.map(function(oRObj, oIndex) {
					if (!(oRObj.hasChild) && oRObj.Leadcostcd !== "" && oRObj.Leadcostcd !== undefined && oRObj.parenCostcd != "") {
						var parentCostHeadObj = oRowObj.epiSodeCostSheet[oRowObj.epiSodeCostSheet.map(function(obj) {
							return obj.Costcd
						}).indexOf(oRObj.parenCostcd)];
						oRObj.flag = "Ch";
						if (oRObj.Leadcostcd === "P") {
							oRObj.Prdhsamt = leadingValue;
						} else if (oRObj.Leadcostcd === "I") {
							oRObj.Inhsamt = leadingValue;
						}
						parentCostHeadObj.Prdhsamt = parseFloat(parentCostHeadObj.Prdhsamt) + oRObj.Prdhsamt;
						parentCostHeadObj.Inhsamt = parseFloat(parentCostHeadObj.Inhsamt) + oRObj.Inhsamt;
						oRObj.Totcostamt = parseFloat(oRObj.Prdhsamt) + parseFloat(oRObj.Inhsamt) + parseFloat(oRObj.Inhouseamt);
						parentCostHeadObj.Totcostamt = parseFloat(parentCostHeadObj.Prdhsamt) + parseFloat(parentCostHeadObj.Inhsamt) + parseFloat(
							parentCostHeadObj.Inhouseamt);
					} else if (!(oRObj.hasChild) && oRObj.Leadcostcd !== "" && oRObj.Leadcostcd !== undefined && oRObj.parenCostcd == "") {
						var parentCostHeadObj = oRowObj.epiSodeCostSheet[oRowObj.epiSodeCostSheet.map(function(obj) {
							return obj.Costcd
						}).indexOf(oRObj.Costcd)];
						oRObj.flag = "Ch";
						if (oRObj.Leadcostcd === "P") {
							oRObj.Prdhsamt = leadingValue;
						} else if (oRObj.Leadcostcd === "I") {
							oRObj.Inhsamt = leadingValue;
						}
						parentCostHeadObj.Prdhsamt = parseFloat(parentCostHeadObj.Prdhsamt); //+ oRObj.Prdhsamt;
						parentCostHeadObj.Inhsamt = parseFloat(parentCostHeadObj.Inhsamt); //+ oRObj.Inhsamt;
						oRObj.Totcostamt = parseFloat(oRObj.Prdhsamt) + parseFloat(oRObj.Inhsamt) + parseFloat(oRObj.Inhouseamt);
						parentCostHeadObj.Totcostamt = parseFloat(parentCostHeadObj.Prdhsamt) + parseFloat(parentCostHeadObj.Inhsamt) + parseFloat(
							parentCostHeadObj.Inhouseamt);
					} else {
						oRObj.Prdhsamt = 0;
						oRObj.Inhsamt = 0;
					}
				});

				oRowObj.epiSodeCostSheetEditMode = $.extend(true, [], oRowObj.epiSodeCostSheet);
				dealMemoDetailModel.refresh(true);
				this.calculateEpisodeHeadCost();
			},
			generateEpisodes: function() {
				var oModel = this.getView().getModel();
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var paramObj = {
					"IV_TENTID": "IBS",
					"IV_DMNO": dealMemoDetailInfo.Dmno,
					"IV_DMVER": dealMemoDetailInfo.Dmver,
					"IV_NOOFEPI": dealMemoDetailInfo.Noofepi,
					"IV_LASTEPI": ""

				};
				oModel.callFunction("/GenerateEpi", {
					method: "GET",
					urlParameters: paramObj,
					success: function(oData, response) {
						this.calculateCostSheetPerEpisode(oData);
						//   						dealMemoDetailModel.setProperty("/episodeData",oData.results);
						//   						dealMemoDetailModel.refresh(true);

					}.bind(this),
					error: function(oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				})
			},
			loadBudgetCostTabAdditional: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				dealMemoDetailInfo.budgetCostDataExists = false;
				if (dealMemoDetailInfo.DmCostSet.results.length) {
					dealMemoDetailInfo.budgetCostDataExists = true;
					var budgetDetails = dealMemoDetailInfo.DmCostSet.results.filter(function(obj) {
						return obj.Epiid === "00000"
					});
					var costSheetFormatted = this.prepareCostSheet(budgetDetails, false);
					dealMemoDetailModel.setProperty("/budgetCostData", costSheetFormatted);
					dealMemoDetailModel.refresh(true);
				}
			},
			onSelectTabCostDetail: function() {
				var selectedTab = this.getView().byId("idIconTabBar2").getSelectedKey();
				var mainSelectedKey = this.getView().byId("idIconTabBar").getSelectedKey();

				var detailModel = this.getView().getModel("dealMemoDetailModel");
				var detailModelData = detailModel.getData();
				//var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = detailModel.getData();
				if (mainSelectedKey == "cost") {
					if (selectedTab === "costDet") {
						this.changedCostCodes = [];
						detailModelData.budgetCostDataExists = false;
						if (dealMemoDetailInfo.DmCostSet.results.length) {
							detailModelData.budgetCostDataExists = true;
							var budgetDetails = dealMemoDetailInfo.DmCostSet.results.filter(function(obj) {
								return obj.Epiid === "00000"
							});
							var costSheetDisplayFlag = true;
							if (dealMemoDetailInfo.DmYCSet.results.length > 0 || dealMemoDetailInfo.yearWiseTabColor === "Positive") {
								costSheetDisplayFlag = false;
							}
							var costSheetFormatted = this.prepareCostSheet(budgetDetails, costSheetDisplayFlag);
							var costSheetFormattedEditMode = this.prepareCostSheet(budgetDetails, true);
							detailModel.setProperty("/budgetCostData", costSheetFormatted);
							detailModel.setProperty("/budgetCostDataEditMode", costSheetFormattedEditMode);
							detailModel.refresh(true);

							this.getView().byId("btnSaveDM").setEnabled(true);
							if (dealMemoDetailInfo.Dmst === "04") {
								this.getView().byId("btnSaveDM").setEnabled(false);
							} else if (dealMemoDetailInfo.Dmst === "02") {
								this.getView().byId("btnSaveDM").setEnabled(false);
							} else if (dealMemoDetailInfo.Dmst === "03") {
								this.getView().byId("btnSaveDM").setEnabled(false);
							}

							var oTableBinding = this.getView().byId("oTable_budgetdetail").getBinding("items");
							oTableBinding.filter([new Filter("itemVisible", "EQ", true)]);
						} else {
							this.loadCostTemplate();
						}
					}
					if (selectedTab === "yearCostDet") {
						this.getView().byId("cbplatformchnge").setSelectedKey("01");

						if (detailModel.getProperty("/yearWiseTabColor") !== "Positive" && dealMemoDetailInfo.YearBudgetInfo.length === 0) {
							this.showYearPopup();
						} else {
							this.handlePlatformChange();
						}

						this.getView().byId("btnSaveDM").setEnabled(true);
						if (dealMemoDetailInfo.Dmst === "04") {
							this.getView().byId("btnSaveDM").setEnabled(false);
						} else if (dealMemoDetailInfo.Dmst === "02") {
							this.getView().byId("btnSaveDM").setEnabled(false);
						} else if (dealMemoDetailInfo.Dmst === "03") {
							this.getView().byId("btnSaveDM").setEnabled(false);
						}

						detailModelData.yearWiseMainTable = true;
						detailModelData.deleteEpiVisibility = false;
						detailModelData.ChangeEpiVisibility = false;
						detailModelData.AddEpiVisibility = false;
						detailModelData.msgVisible = false;
						detailModelData.UploadBtnVisibility = false;
						detailModel.refresh(true);
					} else if (selectedTab === "epiDet") {
						this.changedCostCodes = [];
						this.selEpisodePaths = [];
						if (detailModel.getProperty("/episodeDetTabColor") !== "Positive") {

							if (dealMemoDetailInfo.enableFlow === "M") {
								this.generateMovies();
							} else {
								this.generateEpisodes();
							}

							this.getView().byId("btnSaveDM").setEnabled(true);
							if (dealMemoDetailInfo.Dmst === "04") {
								this.getView().byId("btnSaveDM").setEnabled(false);
							} else if (dealMemoDetailInfo.Dmst === "02") {
								this.getView().byId("btnSaveDM").setEnabled(false);
							} else if (dealMemoDetailInfo.Dmst === "03") {
								this.getView().byId("btnSaveDM").setEnabled(false);
							}

							detailModelData.deleteEpiVisibility = false;

						} else {
							detailModelData.episodeData = $.extend(true, [], detailModelData.episodeDataOriginal);
							detailModelData.episodeTotalData = $.extend(true, [], detailModelData.episodeTotalDataOriginal);
							detailModelData.deleteEpiVisibility = true;
							this.loadBudgetCostTabAdditional();
						}
						detailModelData.UploadBtnVisibility = false;
						if (detailModelData.Cnttp === "02" || detailModelData.Cnttp === "05" || detailModelData.Cnttp === "04" || detailModelData.Cnttp ===
							"09") {
							detailModelData.UploadBtnVisibility = true;
						}
						detailModelData.ChangeEpiVisibility = true;
						detailModelData.AddEpiVisibility = false;

						if (detailModelData.DmCoSet.results.length > 0) {
							detailModelData.AddEpiVisibility = true;
						}
						detailModel.refresh(true);
						this.byId(sap.ui.core.Fragment.createId("epiDetailTab", "oTable_epiDetail")).removeSelections();
					}
				}
			},
			showYearPopup: function() {
				Fragment.load({
					name: "com.ui.dealmemolocal.fragments.YearEpisodeDialog",
					controller: this
				}).then(function name(oFragment) {
					this._oYearEpisodeDialog = oFragment; //sap.ui.xmlfragment("com.ui.dealmemolocal.fragments.YearEpisodeDialog", this);
					this.getView().addDependent(this._oYearEpisodeDialog);
					this._oYearEpisodeDialog.setModel(this.getView().getModel("dealMemoDetailModel"));
					this._oYearEpisodeDialog.open();

				}.bind(this));
			},
			_validateBeforPush: function() {
				var YearInfo = this._oYearEpisodeDialog.getModel().getData().YearEpisodes;
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var noOfEpisodesBlankForYear = false;
				var noOfEpisodesIsZero = false;
				var calculatedTotEpisodes = 0;
				var returnStatus = {
					"status": false,
					"msg": ""
				};
				for (var ind = 0; ind < YearInfo.length; ind++) {
					if (YearInfo[ind].noOfEpisodes === undefined || YearInfo[ind].noOfEpisodes === null || YearInfo[ind].noOfEpisodes === "") {
						noOfEpisodesBlankForYear = true;
						break;
					} else if (parseInt(YearInfo[ind].noOfEpisodes) === 0) {
						noOfEpisodesIsZero = true;
						break;
					}
					calculatedTotEpisodes += parseInt(YearInfo[ind].noOfEpisodes);
				}
				if (noOfEpisodesBlankForYear) {
					returnStatus.status = false;
					returnStatus.msg = "NoOfEpisodesTotValidation"
				} else if (noOfEpisodesIsZero) {
					returnStatus.status = false;
					returnStatus.msg = "NoOfEpisodesNonZeroValidation"
				} else {
					if (calculatedTotEpisodes !== parseInt(dealMemoDetailInfo.Noofepi)) {
						returnStatus.status = false;
						returnStatus.msg = "NoOfEpisodesTotValidation"

					} else {
						returnStatus.status = true;
						returnStatus.msg = "";
					}

				}

				return returnStatus;

			},
			onChangeNoOfEpi: function() {
				this._noOfEpiChanged = true;
			},
			onPressPush: function() {
				var validationStatus = this._validateBeforPush();
				var detailModel = this.getView().getModel("dealMemoDetailModel");
				var oModel = this.getView().getModel();
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();

				if (validationStatus.status) {
					var YearInfo = detailModel.getProperty("/YearEpisodes");
					var yearArrInfo = [];
					YearInfo.map(function(yearObj) {
						var postData = {
							"Tentid": detailModel.getProperty("/Tentid"),
							"Dmno": detailModel.getProperty("/Dmno"),
							"Dmver": detailModel.getProperty("/Dmver"),
							"Gjahr": yearObj.Year,
							"Noofepi": yearObj.noOfEpisodes
						};
						yearArrInfo.push(postData);
					}.bind(this));

					var postPayload = {
						"DmYCSet": yearArrInfo
					};

					oModel.create("/DmHeaderSet", postPayload, {
						success: function(oData) {
							detailModel.setProperty("/YearBudgetAllInfo", oData.DmYCSet.results);

							var yearBudgetLin = oData.DmYCSet.results.filter(function(obj) {
								return obj.Platform === "01"
							});
							var yearBudgetLinTot = this.handleTotalBudgetYear(yearBudgetLin);
							detailModel.setProperty("/YearBudgetLin", yearBudgetLin);
							detailModel.setProperty("/yearBudgetLinTot", yearBudgetLinTot);

							var yearBudgetNonLin = oData.DmYCSet.results.filter(function(obj) {
								return obj.Platform === "02"
							});
							var yearBudgetNonLinTot = this.handleTotalBudgetYear(yearBudgetNonLin);

							detailModel.setProperty("/YearBudgetNonLin", yearBudgetNonLin);
							detailModel.setProperty("/yearBudgetNonLinTot", yearBudgetNonLinTot);
							detailModel.setProperty("/YearBudgetInfo", yearBudgetLin);
							detailModel.setProperty("/yearWiseTableTot" , yearBudgetNonLinTot )
							detailModel.refresh(true);
						}.bind(this),
						error: function(oError) {
							var oErrorResponse = JSON.parse(oError.responseText);
							var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
							MessageBox.error(oMsg);
						}
					});
					this._oYearEpisodeDialog.close();
				} else {
					detailModel.setProperty("/errorMsg", oSourceBundle.getText(validationStatus.msg));
					detailModel.setProperty("/msgVisible", true);
					detailModel.refresh(true);

				}
			},
			onCloseYearEpiDialog: function(oEvent) {
				this._oYearEpisodeDialog.close();
			},
			onYearBudgetPress: function(oEvent) {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				dealMemoDetailInfo.yearWiseMainTable = false;
				var selectedYearItem = oEvent.getParameters()['listItem'].getBindingContext("dealMemoDetailModel").getObject();
				var episodeDataOriginal = $.extend(true, [], dealMemoDetailInfo.episodeDataOriginal);
				dealMemoDetailInfo.episodeData = episodeDataOriginal.filter(function(obj) {
					return obj.Gjahr === selectedYearItem.Gjahr
				});
				var episodeTotalData = [{
					"AcquisitionTot": selectedYearItem.Prdhsamt,
					"ExternalTot": selectedYearItem.Inhsamt,
					"InhouseTot": selectedYearItem.Inhouseamt,
					"Tot": selectedYearItem.Totalamt
				}];
				dealMemoDetailInfo.episodeTotalData = episodeTotalData;

				dealMemoDetailModel.refresh(true);
			},
			onNavBackYearEpDetails: function() {
				var detailModel = this.getView().getModel("dealMemoDetailModel");
				detailModel.setProperty("/yearWiseMainTable", true);
				detailModel.refresh(true);
			},
			onPressEpisodeDetail: function(oEvent) {
				var detailModel = this.getView().getModel("dealMemoDetailModel");
				var selectedEpisodeObject = oEvent.getParameters()["listItem"].getBindingContext("dealMemoDetailModel").getObject();
				var episodeModel = this.getView().getModel("dealMemoEpisodeModel");
				var subCostTab = this.getView().byId("idIconTabBar2").getSelectedKey();
				if (subCostTab === "yearCostDet") {
					selectedEpisodeObject.epiSodeCostSheet = $.extend(true, [], selectedEpisodeObject.epiSodeCostSheetDisplayMode);

				} else {
					if (detailModel.getProperty("/Dmst") === "01") {
						selectedEpisodeObject.epiSodeCostSheet = selectedEpisodeObject.epiSodeCostSheetEditMode;
					} else {
						selectedEpisodeObject.epiSodeCostSheet = selectedEpisodeObject.epiSodeCostSheetDisplayMode;
					}
				}
				selectedEpisodeObject.OldTrp = selectedEpisodeObject.Trp;
				selectedEpisodeObject.OldEpidur = selectedEpisodeObject.Epidur;
				episodeModel.setData(selectedEpisodeObject);
				episodeModel.refresh(true);
				this.getView().byId("splitApp").toDetail(this.getView().byId("episodeDetail"));
				var oTableBinding = this.getView().byId("oTable_Epibudgetdetail").getBinding("items");
				oTableBinding.filter([new Filter("itemVisible", "EQ", true)]);
			},
			onNavBackFromEpisodeDetail: function() {
				this.getView().byId("splitApp").toDetail(this.getView().byId("dealMemoDetail"));
			},
			onChangeTrpValue: function(oEvent) {
				var dealMemoEpisodeModel = this.getView().getModel("dealMemoEpisodeModel");
				if (dealMemoEpisodeModel.getData().OldTrp !== dealMemoEpisodeModel.Trp) {
					if (dealMemoEpisodeModel.getData().flag !== "Cr") {
						dealMemoEpisodeModel.getData().flag = "Ch";
					}
				}
				dealMemoEpisodeModel.refresh(true);
			},
			onChangeEpiDur: function(oEvent) {
				var dealMemoEpisodeModel = this.getView().getModel("dealMemoEpisodeModel");
				if (dealMemoEpisodeModel.getData().OldEpidur !== dealMemoEpisodeModel.Epidur) {
					if (dealMemoEpisodeModel.getData().flag !== "Cr") {
						dealMemoEpisodeModel.getData().flag = "Ch";
					}
				}
				dealMemoEpisodeModel.refresh(true);
			},
			onChangeTrpValue: function(oEvent) {
				var dealMemoEpisodeModel = this.getView().getModel("dealMemoEpisodeModel");
				if (dealMemoEpisodeModel.getData().OldTrp !== dealMemoEpisodeModel.Trp) {
					if (dealMemoEpisodeModel.getData().flag !== "Cr") {
						dealMemoEpisodeModel.getData().flag = "Ch";
					}
				}
				dealMemoEpisodeModel.refresh(true);
			},
			onShowMatser: function() {
				this.getView().byId("splitApp").setMode("ShowHideMode");
				this.getView().byId("splitApp").toMaster(this.getView().byId("dealMemoMaster"));
			},
			onHideMaster: function() {
				this.getView().byId("splitApp").setMode("HideMode");
				this.getView().byId("splitApp").hideMaster();
			},
			prepareEpisodePayload: function(epObj) {
				var detailModel = this.getView().getModel("dealMemoDetailModel");
				return {
					"Loekz": false,
					"Dmno": detailModel.getProperty("/Dmno"),
					"Dmver": detailModel.getProperty("/Dmver"),
					"Totepiamt": epObj.Totepiamt.toString(),
					"Permincost": "0.00",
					"Waers": detailModel.getProperty("/Waers"),
					"Tentid": "IBS",
					"Trp": epObj.Trp,
					"Epiid": epObj.Epiid,
					"Epitp": "00",
					"Epinm": epObj.Epinm,
					"Epidur": Formatter.formatTimeValForBackend(epObj.Epidur),
					"Pspnr": "000000000000000000000000",
					"Anln1": "",
					"Anln2": "",
					"Aufnr": "",
					"Epist": "",
					"Gjahr": epObj.Gjahr,
					"Leadcost": "0.000",
					"Mvid": detailModel.oData.Cnttp === "02" || "03" ? epObj.Mvid : ""
				};
			},
			prepareEpisodePayloadYear: function(epObj) { // Added by Dhiraj For fiscal year change
				var detailModel = this.getView().getModel("dealMemoDetailModel");
				return {
					"Anln1": epObj.Anln1,
					"Anln2": epObj.Anln2,
					"Loekz": false,
					"Dmno": detailModel.getProperty("/Dmno"),
					"Dmver": detailModel.getProperty("/Dmver"),
					"Totepiamt": epObj.Totepiamt.toString(),
					"Permincost": "0.00",
					"Waers": detailModel.getProperty("/Waers"),
					"Tentid": "IBS",
					"Trp": epObj.Trp,
					"Epiid": epObj.Epiid,
					"Epitp": "00",
					"Epinm": epObj.Epinm,
					"Epidur": Formatter.formatTimeValForBackend(epObj.Epidur),
					// "Pspnr": epObj.Pspnr,
					"Pspid": epObj.Pspid,
					"Recst": epObj.Recst,
					"Aufnr": "",
					"Epist": epObj.Epist,
					"Gjahr": epObj.Gjahr,
					"Leadcost": "0.000",
					"Mvid": detailModel.oData.Cnttp === "02" || "03" ? epObj.Mvid : ""

				};
			},
			saveEpisodeCostData: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				if (dealMemoDetailInfo.enableFlow === "M") {
					this.saveMovieCostDetails();
				} else {
					this.saveEpisodeCostDetails();
				}

				//   			 	if(dealMemoDetailInfo.DmEpisodeSet.results.length){
				//   			 		
				//   			 		if(this.episodesGenerated){
				//   			 			this.createEpisodeCostData();
				//   			 			this.episodesGenerated = false;
				//   			 		}
				//   			 		this.updateEpisodeCostData();
				//   			 	}
				//   			 	else{
				//   			 		this.createEpisodeCostData();
				//   			 	}
			},
			getSaveParametersForEpisode: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				return {
					groupId: "eipsodeChanges",
					success: function(odata, resp) {
						this.byId(sap.ui.core.Fragment.createId("epiDetailTab", "oTable_epiDetail")).setBusy(false);
						var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
						MessageToast.show(oSourceBundle.getText("msgSuccEpiDetUpdate" + dealMemoDetailInfo.Cnttp));
						this.getView().byId("idIconTabBar").setSelectedKey("cost");
						this.getView().byId("idIconTabBar2").setSelectedKey("epiDet");
						this.changedCostCodes = [];
						this.loadDealMemoList();
					}.bind(this),
					error: function(oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				}
			},
			getSaveParametersForMovie: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				return {
					groupId: "eipsodeMovieChanges",
					success: function(odata, resp) {

						if (odata.__batchResponses.length > 0) {
							if (odata.__batchResponses[0].response != undefined) {
								if (odata.__batchResponses[0].response.statusCode == "400") {
									var oErrorResponse = JSON.parse(odata.__batchResponses[0].response.body);
									var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
									if (oMsg.includes("present in another Deal Memo")) {
										MessageBox.error(oMsg);
									}
								}
							} else {
								var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
								MessageToast.show(oSourceBundle.getText("msgSuccEpiDetUpdate" + dealMemoDetailInfo.Cnttp));
								this.getView().byId("idIconTabBar").setSelectedKey("cost");
								this.getView().byId("idIconTabBar2").setSelectedKey("epiDet");
								this.changedCostCodes = [];
								this.loadDealMemoList();
							}
						}
						// var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
						// MessageToast.show(oSourceBundle.getText("msgSuccEpiDetUpdate" + dealMemoDetailInfo.Cnttp));
						// this.getView().byId("idIconTabBar").setSelectedKey("cost");
						// this.getView().byId("idIconTabBar2").setSelectedKey("epiDet");
						// this.changedCostCodes = [];
						// this.loadDealMemoList();
					}.bind(this),
					error: function(oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				}
			},
			// validateMovieDetails: function() {  //Commented By dhiraj on 23/06/2022 . Please do not replace / delete it
			// 	var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
			// 	var dealMemoModel = this.getView().getModel("dealMemoModel");
			// 	var dealMemoDetailInfo = dealMemoDetailModel.getData();
			// 	var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
			// 	var oMsg = "";
			// 	var statusFlag = true;
			// 	var episodeData = dealMemoDetailInfo.episodeData;
			// 	var Epids = [],
			// 		episodeList = [],
			// 		episodeIds = [];

			// 	if (dealMemoDetailInfo.Cnttp === "05") {
			// 		episodeList = dealMemoModel.getProperty("/matchList");

			// 		for (var i = 0; i < episodeData.length; i++) { //Added By Dhiraj For converting matid
			// 			var epiidSplit = episodeData[i].Epinm.split("-");
			// 			episodeData[i].Epiid = epiidSplit[0].trim();
			// 			episodeData[i].Mvid = epiidSplit[0].trim();
			// 		}

			// 		episodeIds = episodeList.map(function(obj) {
			// 			return obj.Cntid // Removed Matid by Dhiraj on 23/05/2022 to cntid 
			// 		});
			// 	} else if (dealMemoDetailInfo.Cnttp === "02") {
			// 		episodeList = dealMemoModel.getProperty("/movieList");

			// 		for (var i = 0; i < episodeData.length; i++) { //Added By Dhiraj For converting mvid
			// 			var epiidSplit = episodeData[i].Epinm.split("-");
			// 			episodeData[i].Epiid = epiidSplit[0].trim();
			// 			episodeData[i].Mvid = epiidSplit[0].trim();
			// 		}

			// 		episodeIds = episodeList.map(function(obj) {
			// 			return obj.Mvid
			// 		});
			// 	}

			// 	for (var oInd = 0; oInd < episodeData.length; oInd++) {
			// 		var epObj = episodeData[oInd];

			// 		if (epObj.Epinm === "" || epObj.Epinm === undefined || epObj.Epinm === null) {
			// 			statusFlag = false;
			// 			oMsg = oSourceBundle.getText("msgEpDescBlank" + dealMemoDetailInfo.Cnttp);
			// 			break;

			// 		} else if (episodeList[episodeIds.indexOf(epObj.Epiid)].Mpmid === "") {
			// 			statusFlag = false;
			// 			oMsg = oSourceBundle.getText("msgNOMPMExist" + dealMemoDetailInfo.Cnttp, epObj.Epiid);
			// 			break;
			// 		} else if (Epids.indexOf(epObj.Epiid) >= 0) {
			// 			statusFlag = false;
			// 			oMsg = oSourceBundle.getText("msgDuplicateEpId" + dealMemoDetailInfo.Cnttp);
			// 			break;
			// 		} else if (!(parseInt(epObj.Gjahr) >= parseInt(dealMemoDetailInfo.FromYr) && parseInt(epObj.Gjahr) <= parseInt(dealMemoDetailInfo.ToYr))) {
			// 			statusFlag = false;
			// 			oMsg = oSourceBundle.getText("msgYearNotInRange");
			// 			break;
			// 		} else if (parseInt(epObj.Totepiamt) <= 0) {
			// 			statusFlag = false;
			// 			oMsg = oSourceBundle.getText("msgtotEpiCostNonZero" + dealMemoDetailInfo.Cnttp);
			// 			break;
			// 		}

			// 		if (Epids.indexOf(epObj.Epiid) === -1) {
			// 			Epids.push(epObj.Epiid);
			// 		}
			// 	}
			// 	if (!statusFlag && oMsg !== "") {
			// 		MessageBox.error(oMsg);
			// 	}
			// 	for (var i = 0; i < episodeData.length; i++) { //Added By Dhiraj For converting matid or mvid to epiid of 5 digits
			// 		// var epiidSplit = episodeData[i].Epinm.split("."); //comented by dhiraj for mvid demo
			// 		// episodeData[i].Epiid = epiidSplit[0].trim()
			// 		const a = i + 1;
			// 		episodeData[i].Epiid = "000" + a;
			// 	}
			// 	return statusFlag;
			// },
			validateMovieDetails: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoModel = this.getView().getModel("dealMemoModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				var oMsg = "";
				var statusFlag = true;
				var episodeData = dealMemoDetailInfo.episodeData;
				var Epids = [],
					episodeList = [],
					episodeIds = [];

				if (dealMemoDetailInfo.Cnttp === "05") {
					episodeList = dealMemoModel.getProperty("/matchList");
					for (var i = 0; i < episodeData.length; i++) { //Added By Dhiraj For converting matid
						var epiidSplit = episodeData[i].Epinm.split("-");
						episodeData[i].Epiid = epiidSplit[0].trim();
						episodeData[i].Mvid = epiidSplit[0].trim();
					}
					episodeIds = episodeList.map(function(obj) {
						return obj.Matid
					});
				} else if (dealMemoDetailInfo.Cnttp === "02") {
					episodeList = dealMemoModel.getProperty("/movieList");
					for (var i = 0; i < episodeData.length; i++) { //Added By Dhiraj For converting mvid
						var epiidSplit = episodeData[i].Epinm.split("-");
						episodeData[i].Epiid = epiidSplit[0].trim();
						episodeData[i].Mvid = epiidSplit[0].trim();
					}
					episodeIds = episodeList.map(function(obj) {
						return obj.Mvid
					});
				} else if (dealMemoDetailInfo.Cnttp === "09") {
					episodeList = dealMemoModel.getProperty("/matchMasterList");
					for (var i = 0; i < episodeData.length; i++) { //Added By Dhiraj For converting matid
						var epiidSplit = episodeData[i].Epinm.split("-");
						episodeData[i].Epiid = epiidSplit[0].trim();
						episodeData[i].Mvid = epiidSplit[0].trim();
					}
					episodeIds = episodeList.map(function(obj) {
						return obj.Matid
					});
				} else if (dealMemoDetailInfo.Cnttp === "04") {
					episodeList = dealMemoModel.getProperty("/musicList");
					for (var i = 0; i < episodeData.length; i++) { //Added By Dhiraj For converting matid
						var epiidSplit = episodeData[i].Epinm.split("-");
						episodeData[i].Epiid = epiidSplit[0].trim();
						episodeData[i].Mvid = epiidSplit[0].trim();
					}
					episodeIds = episodeList.map(function(obj) {
						return obj.Mvid
					});
				}

				for (var oInd = 0; oInd < episodeData.length; oInd++) {
					var epObj = episodeData[oInd];

					if (epObj.Epinm === "" || epObj.Epinm === undefined || epObj.Epinm === null) {
						statusFlag = false;
						oMsg = oSourceBundle.getText("msgEpDescBlank" + dealMemoDetailInfo.Cnttp);
						break;

					} else if (episodeList[episodeIds.indexOf(epObj.Epiid)].Mpmid === "") {
						statusFlag = false;
						oMsg = oSourceBundle.getText("msgNOMPMExist" + dealMemoDetailInfo.Cnttp, epObj.Epiid);
						break;
					} else if (Epids.indexOf(epObj.Epiid) >= 0) {
						statusFlag = false;
						oMsg = oSourceBundle.getText("msgDuplicateEpId" + dealMemoDetailInfo.Cnttp);
						break;
					} else if (!(parseInt(epObj.Gjahr) >= parseInt(dealMemoDetailInfo.FromYr) && parseInt(epObj.Gjahr) <= parseInt(dealMemoDetailInfo.ToYr))) {
						statusFlag = false;
						oMsg = oSourceBundle.getText("msgYearNotInRange");
						break;
					} else if (parseInt(epObj.Totepiamt) <= 0 && dealMemoDetailInfo.Cntsc !== "Z0" && epObj.Epist !== "05") {
						statusFlag = false;
						oMsg = oSourceBundle.getText("msgtotEpiCostNonZero" + dealMemoDetailInfo.Cnttp);
						break;
					}

					if (Epids.indexOf(epObj.Epiid) === -1) {
						Epids.push(epObj.Epiid);
					}
				}
				//-----------------------------------------

				var yearChk = episodeData.map(function(yObj) {
					return yObj.Gjahr
				});
				for (var year = dealMemoDetailInfo.FromYr; year <= dealMemoDetailInfo.ToYr; year++) {
					var yearFind = yearChk.find(y => y == year);

					if (yearFind == "" || yearFind == undefined) {
						statusFlag = false;
						var yearRange = dealMemoDetailInfo.FromYr +  " - " + dealMemoDetailInfo.ToYr;
						oMsg = oSourceBundle.getText("msgtotEpiYearChek" + dealMemoDetailInfo.Cnttp , yearRange);
						// oMsg = "Enter atleast one movie for each individual year in range ''"
					}
				}

				//--------------------------------

				if (!statusFlag && oMsg !== "") {
					MessageBox.error(oMsg);
				}
				for (var i = 0; i < episodeData.length; i++) { //Added By Dhiraj For converting matid or mvid to epiid of 5 digits
					const a = i + 1;
					var str = a.toString();
					episodeData[i].Epiid = str; //"0000" + a

				}
				return statusFlag;
			},
			saveMovieCostDetails: function() {
				var validationFlag = this.validateMovieDetails();
				if (validationFlag) {
					var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
					var dealMemoDetailInfo = dealMemoDetailModel.getData();
					var episodeData = dealMemoDetailInfo.episodeData;
					var budgetTabData = dealMemoDetailInfo.budgetCostData;
					var budgetTabUpdatedCost = [];
					var oModel = this.getView().getModel();
					var alreadySaveFlag = true;
					oModel.setUseBatch(true);
					oModel.setDeferredGroups(["eipsodeMovieChanges"]);
					oModel.sDefaultUpdateMethod = "PUT";
					var budgetTabData = dealMemoDetailInfo.budgetCostData;
					episodeData.map(function(epObj) {
						if (epObj.flag === "Cr") {
							var payLoadData = this.prepareEpisodePayload(epObj);
							oModel.create("/DmEpisodeSet", payLoadData, {
								groupId: "eipsodeMovieChanges"
							});
							alreadySaveFlag = false;
						} else if (epObj.flag === "Ch") {
							var payLoadData = this.prepareEpisodePayload(epObj);
							var oPath = "/DmEpisodeSet(Tentid='IBS',Dmno='" + dealMemoDetailInfo.Dmno + "',Dmver='" + dealMemoDetailInfo.Dmver +
								"',Epiid='" + epObj.Epiid + "',Cntid='')"
							oModel.update(oPath, payLoadData, {
								groupId: "eipsodeChanges"
							});
							alreadySaveFlag = false;
						} else if (this.checkForYearChange(dealMemoDetailInfo)) { // Added by Dhiraj For fiscal year change
							var payLoadData = this.prepareEpisodePayloadYear(epObj);
							var oPath = "/DmEpisodeSet(Tentid='IBS',Dmno='" + dealMemoDetailInfo.Dmno + "',Dmver='" + dealMemoDetailInfo.Dmver +
								"',Epiid='" + epObj.Epiid + "',Cntid='')"
							oModel.update(oPath, payLoadData, {
								groupId: "eipsodeChanges"
							});
							alreadySaveFlag = false;
						}
						var budgetCostData = epObj.epiSodeCostSheet;
						var costCodes = budgetCostData.map(function(obj) {
							return obj.Costcd
						});

						budgetCostData.map(function(budgetObj) {
							if (!budgetObj.hasChild) {
								if (budgetObj.parenCostcd !== "") {
									var parentCostHead = budgetCostData[costCodes.indexOf(budgetObj.parenCostcd)];
									var Scostcd = budgetObj.Scostcd;
								} else {
									var parentCostHead = budgetObj;
									var Scostcd = budgetObj.Costcd;
								}

								var payLoadData = this.prepareCostPostPayload(parentCostHead, budgetObj);
								payLoadData.Epiid = epObj.Epiid;

								if (epObj.flag === "Cr") {
									alreadySaveFlag = false;
									oModel.create("/DmCostSet", payLoadData, {
										groupId: "eipsodeMovieChanges"
									});
								} else if (budgetObj.flag === "Ch") {
									alreadySaveFlag = false;
									var oPath = "/DmCostSet(Tentid='IBS',Dmno='" + dealMemoDetailInfo.Dmno + "',Dmver='" + dealMemoDetailInfo.Dmver +
										"',Epiid='" + epObj.Epiid + "',Costcd='" + parentCostHead.Costcd + "',Scostcd='" + budgetObj.Scostcd + "')";
									oModel.update(oPath, payLoadData, {
										groupId: "eipsodeMovieChanges"
									});
								}

								//	if(this.changedCostCodes.indexOf(budgetObj.Costcd) >= 0){
								if (this.changedCostCodes.indexOf(Scostcd) >= 0) {
									if (budgetTabUpdatedCost.length) {
										var existingCostHead = budgetTabUpdatedCost.filter(function(budgetUpObj) {
											return budgetUpObj.Scostcd === budgetObj.Scostcd && budgetUpObj.Costcd === budgetObj.Costcd
										});
										if (existingCostHead.length) {
											var budgetCostHeadToUpdate = existingCostHead[0];
											budgetCostHeadToUpdate.Prdhsamt += parseFloat(budgetObj.Prdhsamt);
											budgetCostHeadToUpdate.Inhouseamt += parseFloat(budgetObj.Inhouseamt);
											budgetCostHeadToUpdate.Inhsamt += parseFloat(budgetObj.Inhsamt);
											budgetCostHeadToUpdate.Totcostamt += parseFloat(budgetObj.Totcostamt);

										} else {
											var parentObj = $.extend(true, {}, budgetObj);
											parentObj.Prdhsamt = parseFloat(budgetObj.Prdhsamt);
											parentObj.Inhouseamt = parseFloat(budgetObj.Inhouseamt);
											parentObj.Inhsamt = parseFloat(budgetObj.Inhsamt);
											parentObj.Totcostamt = parseFloat(budgetObj.Totcostamt);
											budgetTabUpdatedCost.push(parentObj);
										}
									} else {
										var parentObj = $.extend(true, {}, budgetObj);
										parentObj.Prdhsamt = parseFloat(budgetObj.Prdhsamt);
										parentObj.Inhouseamt = parseFloat(budgetObj.Inhouseamt);
										parentObj.Inhsamt = parseFloat(budgetObj.Inhsamt);
										parentObj.Totcostamt = parseFloat(budgetObj.Totcostamt);
										budgetTabUpdatedCost.push(parentObj);
									}

								}

							}
							if (dealMemoDetailInfo.DmCostSet.results.length === 0) {
								var oIndex = budgetTabData.map(function(obj) {
									return obj.Costcd;
								}).indexOf(budgetObj.Costcd);
								if (oIndex >= 0) {

									budgetTabData[oIndex].Prdhsamt = parseFloat(budgetTabData[oIndex].Prdhsamt) + parseFloat(budgetObj.Prdhsamt);
									budgetTabData[oIndex].Inhouseamt = parseFloat(budgetTabData[oIndex].Inhouseamt) + parseFloat(budgetObj.Inhouseamt);
									budgetTabData[oIndex].Inhsamt = parseFloat(budgetTabData[oIndex].Inhsamt) + parseFloat(budgetObj.Inhsamt);
									budgetTabData[oIndex].Totcostamt = parseFloat(budgetTabData[oIndex].Totcostamt) + parseFloat(budgetObj.Totcostamt);
								}
							}

						}.bind(this));

					}.bind(this));
					//---Added-By-Dhiraj-on-17/05/2022-for-Changing-year-on-budget-details---------
					if (alreadySaveFlag) {
						dealMemoDetailInfo.episodeData.forEach(v => {
							if (dealMemoDetailInfo.episodeDataOriginal.findIndex(og => og.Epiid === v.Epiid && og.Gjahr !== v.Gjahr) > -1) {
								alreadySaveFlag = false
							}
						});
					}
					//---Added-By-Dhiraj-on-17/05/2022-for-Changing-year-on-budget-details----------
					if (alreadySaveFlag) {
						var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
						MessageBox.information(oSourceBundle.getText("msgAlreadysave"));
					} else {
						if (dealMemoDetailInfo.DmCostSet.results.length === 0) {
							var budgetTabcostCodes = budgetTabData.map(function(obj) {
								return obj.Costcd
							});
							budgetTabData.map(function(budgetObj) {
								if (!budgetObj.hasChild) {
									if (budgetObj.parenCostcd !== "") {
										var parentCostHead = budgetTabData[budgetTabcostCodes.indexOf(budgetObj.parenCostcd)];
									} else {
										var parentCostHead = budgetObj;
									}
									var payLoadData = this.prepareCostPostPayload(parentCostHead, budgetObj);
									oModel.create("/DmCostSet", payLoadData, {
										groupId: "eipsodeMovieChanges"
									});
								}
							}.bind(this));
						} else {
							var budgetTabcostCodes = budgetTabData.map(function(obj) {
								return obj.Costcd
							});
							budgetTabUpdatedCost.map(function(budgetParentCstObj) {
								if (budgetParentCstObj.parenCostcd !== "") {
									var parentCostHead = budgetTabData[budgetTabcostCodes.indexOf(budgetParentCstObj.parenCostcd)];
								} else {
									var parentCostHead = budgetParentCstObj;
								}
								var payLoadData = this.prepareCostPostPayload(parentCostHead, budgetParentCstObj);
								payLoadData.Epiid = "";
								var oPath = "/DmCostSet(Tentid='IBS',Dmno='" + dealMemoDetailInfo.Dmno + "',Dmver='" + dealMemoDetailInfo.Dmver +
									"',Epiid=''" + ",Costcd='" + parentCostHead.Costcd + "',Scostcd='" + budgetParentCstObj.Scostcd + "')";
								oModel.update(oPath, payLoadData, {
									groupId: "eipsodeMovieChanges"
								});
							}.bind(this));
						}

						oModel.submitChanges(this.getSaveParametersForMovie());
					}
				}
			},
			//---Added-By-Dhiraj-on-17/05/2022-for-Changing-year-on-budget-details-----------------------

			checkForYearChange: function(dealMemoDetailInfo) {
				var isChanged = false;
				dealMemoDetailInfo.episodeData.forEach(v => {
					if (dealMemoDetailInfo.episodeDataOriginal.findIndex(og => parseInt(og.Epiid) === parseInt(v.Epiid) && og.Gjahr !== v.Gjahr) > -
						1) {
						isChanged = true
					}
				});
				return isChanged;
			},
			//-----------------------------------------------------------------------------------------------
			saveEpisodeCostDetails: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var episodeData = dealMemoDetailInfo.episodeData;
				var budgetTabData = dealMemoDetailInfo.budgetCostData;
				var budgetTabUpdatedCost = [];
				var oModel = this.getView().getModel();
				oModel.setUseBatch(true);
				oModel.setDeferredGroups(["eipsodeChanges"]);
				oModel.sDefaultUpdateMethod = "PUT";
				var budgetTabData = dealMemoDetailInfo.budgetCostData;
				var alreadySaveFlag = true;
				episodeData.map(function(epObj) {
					if (epObj.flag === "Cr") {
						var payLoadData = this.prepareEpisodePayload(epObj);
						oModel.create("/DmEpisodeSet", payLoadData, {
							groupId: "eipsodeChanges"
						});
						alreadySaveFlag = false;
					} else if (epObj.flag === "Ch") {
						var payLoadData = this.prepareEpisodePayload(epObj);
						var oPath = "/DmEpisodeSet(Tentid='IBS',Dmno='" + dealMemoDetailInfo.Dmno + "',Dmver='" + dealMemoDetailInfo.Dmver +
							"',Epiid='" + epObj.Epiid + "',Cntid='')"
						oModel.update(oPath, payLoadData, {
							groupId: "eipsodeChanges"
						});
						alreadySaveFlag = false;
					} else if (this.checkForYearChange(dealMemoDetailInfo)) { // Added by Dhiraj For fiscal year change
						payLoadData = this.prepareEpisodePayloadYear(epObj);
						oPath = "/DmEpisodeSet(Tentid='IBS',Dmno='" + dealMemoDetailInfo.Dmno + "',Dmver='" + dealMemoDetailInfo.Dmver +
							"',Epiid='" + epObj.Epiid + "',Cntid='')"
						oModel.update(oPath, payLoadData, {
							groupId: "eipsodeChanges"
						});
						alreadySaveFlag = false;
					}
					var budgetCostData = epObj.epiSodeCostSheet;

					var costCodes = budgetCostData.map(function(obj) {
						return obj.Costcd
					});

					budgetCostData.map(function(budgetCostObj) {
						var budgetObj = $.extend(true, {}, budgetCostObj);
						var updateBudgetCostHead = false;
						if (!budgetObj.hasChild) {
							if (budgetObj.parenCostcd !== "") {
								var parentCostHead = budgetCostData[costCodes.indexOf(budgetObj.parenCostcd)];
								var Scostcd = budgetObj.Scostcd;
							} else {
								var parentCostHead = budgetObj;
								var Scostcd = budgetObj.Costcd;
							}

							var payLoadData = this.prepareCostPostPayload(parentCostHead, budgetObj);
							payLoadData.Epiid = epObj.Epiid;

							if (epObj.flag === "Cr") {
								alreadySaveFlag = false;
								oModel.create("/DmCostSet", payLoadData, {
									groupId: "eipsodeChanges"
								});
								updateBudgetCostHead = false;
							} else if (budgetObj.flag === "Ch") {
								alreadySaveFlag = false;
								var oPath = "/DmCostSet(Tentid='IBS',Dmno='" + dealMemoDetailInfo.Dmno + "',Dmver='" + dealMemoDetailInfo.Dmver +
									"',Epiid='" + epObj.Epiid + "',Costcd='" + parentCostHead.Costcd + "',Scostcd='" + budgetObj.Scostcd + "')";
								oModel.update(oPath, payLoadData, {
									groupId: "eipsodeChanges"
								});
								if (this.changedCostCodes.indexOf(budgetObj.Scostcd) >= 0) {
									updateBudgetCostHead = true;
								}
							}

							var oCostCode
							if (this.changedCostCodes.indexOf(Scostcd) >= 0) {
								//	if(updateBudgetCostHead){
								if (budgetTabUpdatedCost.length) {
									var existingCostHead = budgetTabUpdatedCost.filter(function(budgetUpObj) {
										return budgetUpObj.Costcd === Scostcd
									});
									if (existingCostHead.length) {
										var budgetCostHeadToUpdate = existingCostHead[0];
										budgetCostHeadToUpdate.Prdhsamt += parseFloat(budgetObj.Prdhsamt);
										budgetCostHeadToUpdate.Inhouseamt += parseFloat(budgetObj.Inhouseamt);
										budgetCostHeadToUpdate.Inhsamt += parseFloat(budgetObj.Inhsamt);
										budgetCostHeadToUpdate.Totcostamt += parseFloat(budgetObj.Totcostamt);

									} else {
										var parentObj = $.extend(true, {}, budgetObj);
										parentObj.Prdhsamt = parseFloat(budgetObj.Prdhsamt);
										parentObj.Inhouseamt = parseFloat(budgetObj.Inhouseamt);
										parentObj.Inhsamt = parseFloat(budgetObj.Inhsamt);
										parentObj.Totcostamt = parseFloat(budgetObj.Totcostamt);
										budgetTabUpdatedCost.push(parentObj);
									}
								} else {
									var parentObj = $.extend(true, {}, budgetObj);
									parentObj.Prdhsamt = parseFloat(budgetObj.Prdhsamt);
									parentObj.Inhouseamt = parseFloat(budgetObj.Inhouseamt);
									parentObj.Inhsamt = parseFloat(budgetObj.Inhsamt);
									parentObj.Totcostamt = parseFloat(budgetObj.Totcostamt);
									budgetTabUpdatedCost.push(parentObj);
								}

							}

						}

					}.bind(this));

				}.bind(this));
				//---Added-By-Dhiraj-on-17/05/2022-for-Changing-year-on-budget-details---------
				if (alreadySaveFlag) {
					dealMemoDetailInfo.episodeData.forEach(v => {
						if (dealMemoDetailInfo.episodeDataOriginal.findIndex(og => og.Epiid === v.Epiid && og.Gjahr !== v.Gjahr) > -1) {
							alreadySaveFlag = false
						}
					});
				}
				//---Added-By-Dhiraj-on-17/05/2022-for-Changing-year-on-budget-details---------
				if (alreadySaveFlag) {
					var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.information(oSourceBundle.getText("msgAlreadysave"));
				} else {
					var budgetTabcostCodes = budgetTabData.map(function(obj) {
						return obj.Costcd
					});
					budgetTabUpdatedCost.map(function(budgetParentCstObj) {
						if (budgetParentCstObj.parenCostcd !== "") {
							var parentCostHead = budgetTabData[budgetTabcostCodes.indexOf(budgetParentCstObj.parenCostcd)];
						} else {
							var parentCostHead = budgetParentCstObj;
						}
						var payLoadData = this.prepareCostPostPayload(parentCostHead, budgetParentCstObj);
						payLoadData.Epiid = "";
						var oPath = "/DmCostSet(Tentid='IBS',Dmno='" + dealMemoDetailInfo.Dmno + "',Dmver='" + dealMemoDetailInfo.Dmver +
							"',Epiid=''" + ",Costcd='" + parentCostHead.Costcd + "',Scostcd='" + budgetParentCstObj.Scostcd + "')";
						oModel.update(oPath, payLoadData, {
							groupId: "eipsodeChanges"
						});
					}.bind(this));
					this.byId(sap.ui.core.Fragment.createId("epiDetailTab", "oTable_epiDetail")).setBusy(true);
					oModel.submitChanges(this.getSaveParametersForEpisode());
				}

			},
			addToBudgetTabData: function(budgetObj) {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var budgetTabData = dealMemoDetailInfo.budgetCostData;
				var oIndex = budgetTabData.map(function(obj) {
					return obj.Costcd;
				}).indexOf(budgetObj.Costcd);
				if (oIndex >= 0) {

					budgetTabData[oIndex].Prdhsamt = parseFloat(budgetTabData[oIndex].Prdhsamt) + parseFloat(budgetObj.Prdhsamt);
					budgetTabData[oIndex].Inhouseamt = parseFloat(budgetTabData[oIndex].Inhouseamt) + parseFloat(budgetObj.Inhouseamt);
					budgetTabData[oIndex].Inhsamt = parseFloat(budgetTabData[oIndex].Inhsamt) + parseFloat(budgetObj.Inhsamt);
					budgetTabData[oIndex].Totcostamt = parseFloat(budgetTabData[oIndex].Totcostamt) + parseFloat(budgetObj.Totcostamt);
				}

			},
			updateEpisodeCostData: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var episodeData = dealMemoDetailInfo.episodeData;
				var budgetTabData = dealMemoDetailInfo.budgetCostData;
				var budgetTabUpdatedCost = [];
				var oModel = this.getView().getModel();
				oModel.setUseBatch(true);
				oModel.setDeferredGroups(["eipsodeChanges"]);
				oModel.sDefaultUpdateMethod = "PUT";
				var mParameters = {
					groupId: "eipsodeChanges",
					success: function(odata, resp) {
						var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
						MessageToast.show(oSourceBundle.getText("msgSuccEpiDetUpdate"));
						//		this.loadDetailDealMemo(this.selectedDealMemoObj);
						this.getView().byId("idIconTabBar").setSelectedKey("cost");
						this.getView().byId("idIconTabBar2").setSelectedKey("epiDet");
						//		this.getView().byId("idIconTabBar2").fireSelect();
						this.changedCostCodes = [];
						this.loadDealMemoList();
					}.bind(this),
					error: function(oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				};

				episodeData.map(function(epObj) {

					var budgetCostData = epObj.epiSodeCostSheet;
					var costCodes = budgetCostData.map(function(obj) {
						return obj.Costcd
					});
					budgetCostData.map(function(budgetObj) {
						if (!budgetObj.hasChild) {
							if (budgetObj.parenCostcd !== "") {
								var parentCostHead = budgetCostData[costCodes.indexOf(budgetObj.parenCostcd)];
							} else {
								var parentCostHead = budgetObj;
							}
							if (budgetObj.flag === "Ch") {
								var payLoadData = this.prepareCostPostPayload(parentCostHead, budgetObj);
								payLoadData.Epiid = epObj.Epiid;

								//Episode Cost
								var oPath = "/DmCostSet(Tentid='IBS',Dmno='" + dealMemoDetailInfo.Dmno + "',Dmver='" + dealMemoDetailInfo.Dmver +
									"',Epiid='" + epObj.Epiid + "',Costcd='" + budgetObj.parenCostcd + "',Scostcd='" + budgetObj.Scostcd + "')";
								oModel.update(oPath, payLoadData, mParameters);

							}

							if (this.changedCostCodes.indexOf(budgetObj.Scostcd) >= 0) {
								if (budgetTabUpdatedCost.length) {
									var existingCostHead = budgetTabUpdatedCost.filter(function(budgetUpObj) {
										return budgetUpObj.Scostcd === budgetObj.Scostcd
									});
									if (existingCostHead.length) {
										var budgetCostHeadToUpdate = existingCostHead[0];
										budgetCostHeadToUpdate.Prdhsamt += parseFloat(budgetObj.Prdhsamt);
										budgetCostHeadToUpdate.Inhouseamt += parseFloat(budgetObj.Inhouseamt);
										budgetCostHeadToUpdate.Inhsamt += parseFloat(budgetObj.Inhsamt);
										budgetCostHeadToUpdate.Totcostamt += parseFloat(budgetObj.Totcostamt);

									} else {
										var parentObj = $.extend(true, {}, budgetObj);
										parentObj.Prdhsamt = parseFloat(budgetObj.Prdhsamt);
										parentObj.Inhouseamt = parseFloat(budgetObj.Inhouseamt);
										parentObj.Inhsamt = parseFloat(budgetObj.Inhsamt);
										parentObj.Totcostamt = parseFloat(budgetObj.Totcostamt);
										budgetTabUpdatedCost.push(parentObj);
									}
								} else {
									var parentObj = $.extend(true, {}, budgetObj);
									parentObj.Prdhsamt = parseFloat(budgetObj.Prdhsamt);
									parentObj.Inhouseamt = parseFloat(budgetObj.Inhouseamt);
									parentObj.Inhsamt = parseFloat(budgetObj.Inhsamt);
									parentObj.Totcostamt = parseFloat(budgetObj.Totcostamt);
									budgetTabUpdatedCost.push(parentObj);
								}

							}
						}

					}.bind(this));

				}.bind(this));

				var budgetTabData = dealMemoDetailInfo.budgetCostData;
				var budgetTabcostCodes = budgetTabData.map(function(obj) {
					return obj.Costcd
				});
				budgetTabUpdatedCost.map(function(budgetParentCstObj) {
					if (budgetParentCstObj.parenCostcd !== "") {
						var parentCostHead = budgetTabData[budgetTabcostCodes.indexOf(budgetParentCstObj.parenCostcd)];
					} else {
						var parentCostHead = budgetParentCstObj;
					}
					var payLoadData = this.prepareCostPostPayload(parentCostHead, budgetParentCstObj);
					payLoadData.Epiid = "";
					var oPath = "/DmCostSet(Tentid='IBS',Dmno='" + dealMemoDetailInfo.Dmno + "',Dmver='" + dealMemoDetailInfo.Dmver +
						"',Epiid=''" + ",Costcd='" + budgetParentCstObj.parenCostcd + "',Scostcd='" + budgetParentCstObj.Scostcd + "')";
					oModel.update(oPath, payLoadData, mParameters);
				}.bind(this));

				oModel.submitChanges(mParameters);
			},
			createEpisodeCostData: function() {
				var detailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = detailModel.getData();
				var episodeData = detailModel.getProperty("/episodeData");
				var oModel = this.getView().getModel();
				var budgetTabUpdatedCost = [];
				oModel.setUseBatch(true);
				oModel.setDeferredGroups(["eipsodeChanges"]);
				var mParameters = {
					groupId: "eipsodeChanges",
					success: function(odata, resp) {
						var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
						MessageToast.show(oSourceBundle.getText("msgSuccEpiDetSave"));
						detailModel.setProperty("/episodeDetTabColor", "Positive");
						detailModel.refresh(true);

						this.getView().byId("idIconTabBar").setSelectedKey("cost");
						this.getView().byId("idIconTabBar2").setSelectedKey("epiDet");
						//this.getView().byId("idIconTabBar2").fireSelect();
						//this.loadDetailDealMemo(this.selectedDealMemoObj);
						this.changedCostCodes = [];
						this.loadDealMemoList();
					}.bind(this),
					error: function(oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				};

				episodeData.map(function(epObj) {
					if (epObj.flag === "Cr") {
						var payLoadData = this.prepareEpisodePayload(epObj);
						//oModel.create("/DmEpisodeSet",payLoadData,mParameters);	
						oModel.create("/DmEpisodeSet", payLoadData, {
							groupId: "eipsodeChanges"
						});

						var budgetCostData = epObj.epiSodeCostSheet;
						var costCodes = budgetCostData.map(function(obj) {
							return obj.Costcd
						});
						budgetCostData.map(function(budgetObj) {
							if (!budgetObj.hasChild) {
								if (budgetObj.parenCostcd !== "") {
									var parentCostHead = budgetCostData[costCodes.indexOf(budgetObj.parenCostcd)];
								} else {
									var parentCostHead = budgetObj;
								}
								var payLoadData = this.prepareCostPostPayload(parentCostHead, budgetObj);
								payLoadData.Epiid = epObj.Epiid;
								//	postPayLoad.push(payLoadData);
								oModel.create("/DmCostSet", payLoadData, {
									groupId: "eipsodeChanges"
								});

								if (this.changedCostCodes.indexOf(budgetObj.Scostcd) >= 0) {
									if (budgetTabUpdatedCost.length) {
										var existingCostHead = budgetTabUpdatedCost.filter(function(budgetUpObj) {
											return budgetUpObj.Scostcd === budgetObj.Scostcd
										});
										if (existingCostHead.length) {
											var budgetCostHeadToUpdate = existingCostHead[0];
											budgetCostHeadToUpdate.Prdhsamt += parseFloat(budgetObj.Prdhsamt);
											budgetCostHeadToUpdate.Inhouseamt += parseFloat(budgetObj.Inhouseamt);
											budgetCostHeadToUpdate.Inhsamt += parseFloat(budgetObj.Inhsamt);
											budgetCostHeadToUpdate.Totcostamt += parseFloat(budgetObj.Totcostamt);

										}
									} else {
										var parentObj = $.extend(true, {}, budgetObj);
										parentObj.Prdhsamt = parseFloat(budgetObj.Prdhsamt);
										parentObj.Inhouseamt = parseFloat(budgetObj.Inhouseamt);
										parentObj.Inhsamt = parseFloat(budgetObj.Inhsamt);
										parentObj.Totcostamt = parseFloat(budgetObj.Totcostamt);
										budgetTabUpdatedCost.push(parentObj);
									}

								}
							}

						}.bind(this));
					}

				}.bind(this));

				if (budgetTabUpdatedCost.length) {
					oModel.sDefaultUpdateMethod = "PUT";
					var budgetTabData = dealMemoDetailInfo.budgetCostData;
					var budgetTabcostCodes = budgetTabData.map(function(obj) {
						return obj.Costcd
					});
					budgetTabUpdatedCost.map(function(budgetParentCstObj) {
						if (budgetParentCstObj.parenCostcd !== "") {
							var parentCostHead = budgetTabData[budgetTabcostCodes.indexOf(budgetParentCstObj.parenCostcd)];
						} else {
							var parentCostHead = budgetParentCstObj;
						}
						var payLoadData = this.prepareCostPostPayload(parentCostHead, budgetParentCstObj);
						payLoadData.Epiid = "";
						var oPath = "/DmCostSet(Tentid='IBS',Dmno='" + dealMemoDetailInfo.Dmno + "',Dmver='" + dealMemoDetailInfo.Dmver +
							"',Epiid=''" + ",Costcd='" + budgetParentCstObj.parenCostcd + "',Scostcd='" + budgetParentCstObj.Scostcd + "')";
						oModel.update(oPath, payLoadData, {
							groupId: "eipsodeChanges"
						});
					}.bind(this));
				}

				oModel.submitChanges(mParameters);

			},
			onSavePress: function(oEvent) {

				sap.ui.core.BusyIndicator.show(0);
				var selectedTab = this.getView().byId("idIconTabBar").getSelectedKey();
				if (selectedTab == "detail") {
					this.saveDealMemoDetailData();
				} else if (selectedTab == "cost") {
					var subSelectedTab = this.getView().byId("idIconTabBar2").getSelectedKey();
					if (subSelectedTab === "costDet") {
						this.saveBudgetCostData();
					} else if (subSelectedTab === "yearCostDet") {
						this.getView().byId("idIconTabBar2").setSelectedKey("yearCostDet");
						this.saveYearBudgetCostData();
					} else if (subSelectedTab === "epiDet") {
						this.saveEpisodeCostData();
						// this.saveEpisodeCostDetails();
					}

				} else if (selectedTab === "schedule") {
					this.saveScheduleData();
				} else if (selectedTab == "rev30") {
					this.saveRevenueTab();
				} else if (selectedTab == "makt") {
					this.saveMarketingTab();
				} else if (selectedTab == "comment") {
					var Key = that.getView().byId("commentInner").getSelectedKey();
					this.saveComments(Key);
				}
				sap.ui.core.BusyIndicator.hide();
			},
			beforeDelete: function() {
				var detailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = detailModel.getData();
				var episodeDataLen = dealMemoDetailInfo.episodeData.length - 1;

				var selectedIndices = this.selEpisodePaths.map(function(oPath) {
					var arr = oPath.split("/");
					// return arr[arr.length - 1];
					var indicesRet = parseInt(arr[arr.length - 1]);
					return indicesRet;
				}).sort((a, b) => a - b).reverse();
				if (selectedIndices.length) {
					var oValToCompare = episodeDataLen;
					var returnStatus = true;
					for (var i = 0; i < selectedIndices.length; i++) {
						if (oValToCompare === parseInt(selectedIndices[i])) {
							oValToCompare = oValToCompare - 1;
						} else {
							returnStatus = false;
							break;

						}
					}
					if (!returnStatus) {
						var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
						MessageBox.error(oSourceBundle.getText("msgselectendrowdel"));
					}
					return returnStatus;
				} else {
					oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.error(oSourceBundle.getText("msgselectonerowdel"));
					return false;
				}
			},

			onDeleteEpisodeConfirm: function() {
				var detailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = detailModel.getData();
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				var selRowCount = this.byId(sap.ui.core.Fragment.createId("epiDetailTab", "oTable_epiDetail")).getSelectedContexts().length;
				if (dealMemoDetailInfo.enableFlow === "M") {
					if (selRowCount > 0) {
						var deleteValidFlag = false;
						if (dealMemoDetailInfo.enableFlow === "M") {
							deleteValidFlag = true;
						} else {
							deleteValidFlag = this.beforeDelete();

						}
						if (deleteValidFlag) {

							MessageBox.confirm(oSourceBundle.getText("msgdeleteEpiConfirm" + dealMemoDetailInfo.Cnttp), {
								actions: [oSourceBundle.getText("lblYes"), oSourceBundle.getText("lblNo")],
								emphasizedAction: "Yes",
								onClose: function(sAction) {
									if (sAction === oSourceBundle.getText("lblYes")) {
										this.onDeleteEpisode();
									} else if (sAction === oSourceBundle.getText("lblNo")) {

									}
								}.bind(this)
							});
						}
					} else {
						MessageBox.error(oSourceBundle.getText("msgSelectAtleastOneEpi" + dealMemoDetailInfo.Cnttp));
					}
				} else {
					this.onDeleteEpisodeDialog();
				}
			},
			onCancelEpisodeSelectionDelete: function() {
				this._oEpiDeleteDialog.close();
			},

			onSelectEpisodeModeDelivery: function(oEvent) {
				var oselIndex = oEvent.getSource().getSelectedIndex();
				var detailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = detailModel.getData();
				if (oselIndex == 0) {
					dealMemoDetailInfo.episodeRangeVisibleDelivery = false;
				} else {
					dealMemoDetailInfo.episodeRangeVisibleDelivery = true;

				}
				detailModel.refresh(true);
			},
			onDeleteEpisodeDialog: function() {
				var detailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = detailModel.getData();
				detailModel.setProperty("/episodeRangeVisibleDelivery", false);
				detailModel.setProperty("/episodeModeDelivery", 0);
				detailModel.setProperty("/epiDelFromId", "");
				detailModel.setProperty("/epiDelToId", "");
				var dmedSetData = dealMemoDetailInfo.episodeData.filter(function(epiobj) {
					return epiobj.Epist != '05';
				});
				var dmedSetDataEpi = dmedSetData.sort().reverse();
				dealMemoDetailInfo.dmedSetDataEpi = $.extend(true, [], dmedSetDataEpi);
				detailModel.refresh(true);
				if (!this._oEpiDeleteDialog) {
					Fragment.load({
						id: this.createId("deleteEpiDialog"),
						name: "com.ui.dealmemolocal.fragments.EpisodeDeleteDialog",
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
			confirmToDelete: function() {
				var detailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = detailModel.getData();
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				var oselIndex = dealMemoDetailInfo.episodeModeDelivery;
				var selectedEpisodeList = [];
				if (oselIndex == 0) {
					selectedEpisodeList = dealMemoDetailInfo.dmedSetDataEpi;
				} else {
					selectedEpisodeList = [];
					dealMemoDetailInfo.dmedSetDataEpi.map(function(obj) {
						if (obj.Epiid <= dealMemoDetailInfo.epiDelFromId && obj.Epiid >= dealMemoDetailInfo.epiDelToId) {
							selectedEpisodeList.push(obj);
						}
					});
				}
				if (selectedEpisodeList.length > 0) {
					if (this.checkDlete(selectedEpisodeList)) {
						this._oEpiDeleteDialog.close();
						MessageBox.confirm(oSourceBundle.getText("msgdeleteEpiConfirm" + dealMemoDetailInfo.Cnttp), {
							actions: [oSourceBundle.getText("lblYes"), oSourceBundle.getText("lblNo")],
							emphasizedAction: "Yes",
							onClose: function(sAction) {
								if (sAction === oSourceBundle.getText("lblYes")) {
									this.onDeleteEpisodeViaDialog(selectedEpisodeList);
								} else if (sAction === oSourceBundle.getText("lblNo")) {

								}
							}.bind(this)
						});
					} else {

						MessageBox.error("Select the Last No. of Episode");
					}
				} else {
					this._oEpiDeleteDialog.close();
					MessageBox.error(oSourceBundle.getText("msgSelectAtleastOneEpi" + dealMemoDetailInfo.Cnttp));
				}
			},

			checkDlete: function(selectedEpisodeList) {
				var detailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = detailModel.getData();
				var dmedSetData = dealMemoDetailInfo.episodeData.filter(function(epiobj) {
					return epiobj.Epist != '05';
				});
				var dmedSetDataEpi = dmedSetData.sort().reverse();
				var epiData = dmedSetDataEpi.map(function(oEpi) {
					return oEpi.Epiid;
				});
				var checkEpi = selectedEpisodeList.map(function(oChkEpi) {
					return oChkEpi.Epiid;
				});
				var check = true;
				if (checkEpi[0] == epiData[0]) {
					check = true;
				} else {
					check = false;
				}
				return check;
			},

			onDeleteEpisodeViaDialog: function(selectedEpisodeList) {
				sap.ui.core.BusyIndicator.show(0);
				var detailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = detailModel.getData();
				var NoOfEpisodes = dealMemoDetailInfo.Noofepi;
				var oModel = this.getView().getModel();
				var deleteAllEpiodes = false;
				oModel.setUseBatch(true);
				oModel.setChangeGroups({
					"/DmEpisodeSet": {
						groupId: "episodeDelete"
					}
				});
				oModel.setDeferredGroups(["episodeDelete"]);
				if (parseInt(NoOfEpisodes) === selectedEpisodeList.length) {
					deleteAllEpiodes = true;
				}
				var mParameters = {
					groupId: "episodeDelete",
					success: function(odata, resp) {
						var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
						var oResponse = odata.__batchResponses[0];
						if (oResponse.__changeResponses && oResponse.__changeResponses.length) {
							if (oResponse.__changeResponses[0].statusCode === "204") {
								MessageToast.show(oSourceBundle.getText("msgSuccEpiDeleteSave" + dealMemoDetailInfo.Cnttp));
								detailModel.refresh(true);
								if (deleteAllEpiodes) {
									this.getView().byId("idIconTabBar").setSelectedKey("cost");
									if (dealMemoDetailInfo.enableFlow === "M") {
										this.getView().byId("idIconTabBar2").setSelectedKey("epiDet");
									} else {
										this.getView().byId("idIconTabBar2").setSelectedKey("costDet");
									}

									this.loadDefaultDealMemo = false;
									this.loadDealMemoList();
								} else {
									this.getView().byId("idIconTabBar").setSelectedKey("cost");
									this.getView().byId("idIconTabBar2").setSelectedKey("epiDet");
									this.loadDealMemoList();
								}
								// this.byId(sap.ui.core.Fragment.createId("epiDetailTab", "oTable_epiDetail")).removeSelections();
							}
						} else {
								sap.ui.core.BusyIndicator.hide();
							var oError = JSON.parse(oResponse.response.body);
							var oMsg = oError.error.innererror.errordetails[0].message;
							MessageBox.error(oMsg);
							
						}

					}.bind(this),
					error: function(oError) {
						sap.ui.core.BusyIndicator.hide();
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);

					}
				};

				selectedEpisodeList.map(function(itemPath) {

					var payLoadData = this.prepareEpisodePayload(itemPath);
					var oPath = "/DmEpisodeSet(Tentid='IBS',Dmno='" + dealMemoDetailInfo.Dmno + "',Dmver='" + dealMemoDetailInfo.Dmver + "',Epiid='" +
						itemPath.Epiid + "',Cntid='')";
					oModel.remove(oPath, {
						groupId: "episodeDelete"
					});

				}.bind(this));
				oModel.submitChanges(mParameters);
				sap.ui.core.BusyIndicator.hide();
			},

			onDeleteEpisode: function() {
					sap.ui.core.BusyIndicator.show(0);
				var detailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = detailModel.getData();
				var NoOfEpisodes = dealMemoDetailInfo.Noofepi;
				var oModel = this.getView().getModel();
				var deleteAllEpiodes = false;
				oModel.setUseBatch(true);
				oModel.setChangeGroups({
					"/DmEpisodeSet": {
						groupId: "episodeDelete"
					}
				});
				oModel.setDeferredGroups(["episodeDelete"]);
				if (parseInt(NoOfEpisodes) === this.selEpisodePaths.length) {
					deleteAllEpiodes = true;
				}
				var mParameters = {
					groupId: "episodeDelete",
					success: function(odata, resp) {
						var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
						var oResponse = odata.__batchResponses[0];
						if (oResponse.__changeResponses && oResponse.__changeResponses.length) {
							if (oResponse.__changeResponses[0].statusCode === "204") {
								MessageToast.show(oSourceBundle.getText("msgSuccEpiDeleteSave" + dealMemoDetailInfo.Cnttp));
								detailModel.refresh(true);
								if (deleteAllEpiodes) {
									this.getView().byId("idIconTabBar").setSelectedKey("cost");
									if (dealMemoDetailInfo.enableFlow === "M") {
										this.getView().byId("idIconTabBar2").setSelectedKey("epiDet");
									} else {
										this.getView().byId("idIconTabBar2").setSelectedKey("costDet");
									}

									this.loadDefaultDealMemo = false;
									this.loadDealMemoList();
								} else {
									this.getView().byId("idIconTabBar").setSelectedKey("cost");
									this.getView().byId("idIconTabBar2").setSelectedKey("epiDet");
									this.loadDealMemoList();
								}
								this.byId(sap.ui.core.Fragment.createId("epiDetailTab", "oTable_epiDetail")).removeSelections();
							}
						} else {
								sap.ui.core.BusyIndicator.hide();
							var oError = JSON.parse(oResponse.response.body);
							var oMsg = oError.error.innererror.errordetails[0].message;
							MessageBox.error(oMsg);
						}

					}.bind(this),
					error: function(oError) {
							sap.ui.core.BusyIndicator.hide();
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);

					}
				};

				this.selEpisodePaths.map(function(itemPath) {
					var oEpisodeInfo = detailModel.getProperty(itemPath);
					var payLoadData = this.prepareEpisodePayload(oEpisodeInfo);
					var oPath = "/DmEpisodeSet(Tentid='IBS',Dmno='" + dealMemoDetailInfo.Dmno + "',Dmver='" + dealMemoDetailInfo.Dmver + "',Epiid='" +
						oEpisodeInfo.Epiid + "',Cntid='')";
					oModel.remove(oPath, {
						groupId: "episodeDelete"
					});

				}.bind(this));
				oModel.submitChanges(mParameters);
				sap.ui.core.BusyIndicator.hide();
			},
			handleEpiRowSelection: function(oEvent) {
				var oSelItems = oEvent.getParameters()['listItems'];
				var oSelected = oEvent.getParameters()['selected'];
				oSelItems.map(function(oItem) {
					var itemPath = oItem.getBindingContext("dealMemoDetailModel").sPath;
					if (oSelected) {
						this.selEpisodePaths.push(itemPath);
					} else {
						var oIndex = this.selEpisodePaths.indexOf(itemPath);
						if (oIndex >= 0) {
							this.selEpisodePaths.splice(oIndex, 1);
						}
					}
				}.bind(this));

			},
			onConfirmSubmitDm: function() {
				sap.ui.core.BusyIndicator.show(0);
				var oModel = this.getView().getModel();
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var paramObj = {
					"IV_TENTID": "IBS",
					"IV_DMNO": dealMemoDetailInfo.Dmno,
					"IV_DMVER": dealMemoDetailInfo.Dmver

				};
				oModel.callFunction("/CalcLocalCurr", {
					method: "GET",
					urlParameters: paramObj,
					success: function(oData, response) {
						sap.ui.core.BusyIndicator.hide();
						var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
						var dealMemoDetailInfo = dealMemoDetailModel.getData();
						if (oData.results.length > 0 && oData.results[0].Cnttp == "I") {
							var oMsg = oData.results[0].Prdnm
							sap.m.MessageBox.show(oMsg, {
								icon: sap.m.MessageBox.Icon.INFORMATION,
								title: "Information",
								onClose: function() { 
									if((parseFloat(oData.results[0].LoclCrcyAmt) >= parseFloat("750000000.00")) && (dealMemoDetailInfo.AttachmentDetails.length <= 0)) {
										var oWarningMsg = "'Attachment of COFA approval is mandatory' if deal amount exceeds INR 75 CR"
										sap.m.MessageBox.show(oWarningMsg, {
											icon: sap.m.MessageBox.Icon.INFORMATION,
											title: "Information",
											onClose: function() { 
										// that.submitDialog(oData);
											}
										});
									} else {
										that.submitDialog(oData);
									}
									
								}
							});

						} else {
							if((parseFloat(oData.results[0].LoclCrcyAmt) >= parseFloat("750000000.00")) && (dealMemoDetailInfo.AttachmentDetails.length <= 0)) {
								var oWarningMsg = "'Attachment of COFA approval is mandatory' if deal amount exceeds INR 75 CR"
								sap.m.MessageBox.show(oWarningMsg, {
									icon: sap.m.MessageBox.Icon.INFORMATION,
									title: "Information",
									onClose: function() { 
								// that.submitDialog(oData);
									}
								});
							} else {
								that.submitDialog(oData);
							}
						}
					}.bind(this),
					error: function(oError) {
						sap.ui.core.BusyIndicator.hide();
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				});

			},
			submitDialog: function(oData) {
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				var dmWaers = oData.results[0].Waers
					// var locAmt = oData.results[0].LoclCrcyAmt
				var locKey = oData.results[0].LoclCrcyKey
				var dollarIndianLocale = Intl.NumberFormat('en-IN');
				var locAmt = dollarIndianLocale.format(oData.results[0].LoclCrcyAmt)
				if (dmWaers != "INR") {
					var text = "Equivalent local currency deal value is " + locAmt + " " + locKey + ". Do you want to submit for an approval?"
					MessageBox.confirm(text, {
						actions: [oSourceBundle.getText("lblYes"), oSourceBundle.getText("lblNo")],
						emphasizedAction: "Yes",
						onClose: function(sAction) {
							if (sAction === oSourceBundle.getText("lblYes")) {
								this.onSubmitDm();
							} else if (sAction === oSourceBundle.getText("lblNo")) {
								this.loadDealMemoList();
							}
						}.bind(this)
					});
				} else {
					this.onSubmitDm();
				}
			},

			onSubmitDm: function() {
				sap.ui.core.BusyIndicator.show(0);
				var oModel = this.getView().getModel();
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var paramObj = {
					"IV_TENTID": "IBS",
					"IV_DMNO": dealMemoDetailInfo.Dmno,
					"IV_DMVER": dealMemoDetailInfo.Dmver

				};
				oModel.callFunction("/SubmitDM", {
					method: "GET",
					urlParameters: paramObj,
					success: function(oData, response) {
						sap.ui.core.BusyIndicator.hide();
						dealMemoDetailModel.setProperty("/costCodes", oData.results);
						dealMemoDetailModel.refresh(true);
						this.loadDealMemoList();

					}.bind(this),
					error: function(oError) {
						sap.ui.core.BusyIndicator.hide();
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				});
			},
			onConfirmChangeDm: function() {
				var oModel = this.getView().getModel();
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				if (dealMemoDetailInfo.Dmst === "03") {
					this.onRejectedDm();
				} else {
					var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.confirm(oSourceBundle.getText("msgcreateNewVersion"), {
						actions: [oSourceBundle.getText("lblYes"), oSourceBundle.getText("lblNo")],
						emphasizedAction: "Yes",
						onClose: function(sAction) {
							if (sAction === oSourceBundle.getText("lblYes")) {
								this.onChangeDm();
							} else if (sAction === oSourceBundle.getText("lblNo")) {

							}
						}.bind(this)
					});
				}
			},
			onRejectedDm: function() {
				sap.ui.core.BusyIndicator.show(0);
				var oModel = this.getView().getModel();
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var paramObj = {
					"IV_TENTID": "IBS",
					"IV_DMNO": dealMemoDetailInfo.Dmno,
					"IV_DMVER": dealMemoDetailInfo.Dmver

				};
				oModel.callFunction("/RejectDMStat", {
					method: "GET",
					urlParameters: paramObj,
					success: function(oData, response) {
						sap.ui.core.BusyIndicator.hide();
						dealMemoDetailModel.setProperty("/costCodes", oData.results);
						dealMemoDetailModel.refresh(true);
						// this.newVersionCreated = true;
						this.rejectedDm = true;
						this.loadDealMemoList();

					}.bind(this),
					error: function(oError) {
						sap.ui.core.BusyIndicator.hide();
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);

					}
				})

			},
			onChangeDm: function() {
				sap.ui.core.BusyIndicator.show(0);
				var oModel = this.getView().getModel();
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var paramObj = {
					"IV_TENTID": "IBS",
					"IV_DMNO": dealMemoDetailInfo.Dmno,
					"IV_DMVER": dealMemoDetailInfo.Dmver

				};
				oModel.callFunction("/GenerateVersion", {
					method: "GET",
					urlParameters: paramObj,
					success: function(oData, response) {
						sap.ui.core.BusyIndicator.hide();
						dealMemoDetailModel.setProperty("/costCodes", oData.results);
						dealMemoDetailModel.refresh(true);
						this.newVersionCreated = true;
						this.loadDealMemoList();

					}.bind(this),
					error: function(oError) {
						sap.ui.core.BusyIndicator.hide();
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);

					}
				})
			},

			// CAF
			loadCAFList: function() {
				var aFilters = [
					new Filter("Tentid", "EQ", "IBS"),
					new Filter("Transtp", "EQ", "C"),
					new Filter("Dmno", "EQ", ""),
				];
				var dealMemoModel = this.getView().getModel("dealMemoModel");
				var oModel = this.getView().getModel();
				var dealMemoModel = this.getView().getModel("dealMemoModel");
				sap.ui.core.BusyIndicator.show(0);
				oModel.read("/DmHeaderSet", {
					filters: aFilters,
					success: function(oData) {
						var filterCafList = oData.results.filter(function(item) {
							return item.Dmst === '04' && item.Recst === 'A' && item.Dmrefno === '';
						});
						dealMemoModel.setProperty("/CAFDMList", filterCafList);
						dealMemoModel.refresh(true);
					},
					error: function(oError) {

					}
				});
			},
			createCAFDealMemo: function() {

				if (!this._oSelectCAFDialog) {
					Fragment.load({
						id: this.createId("CAFDialog"),
						name: "com.ui.dealmemolocal.fragments.SelectCAFDialog",
						controller: this
					}).then(function name(oFragment) {
						this._oSelectCAFDialog = oFragment; //sap.ui.xmlfragment("com.ui.dealmemolocal.fragments.SelectEpisodeDialog", this);
						this.getView().addDependent(this._oSelectCAFDialog);
						this._oSelectCAFDialog.open();

					}.bind(this));
				} else {
					this._oSelectCAFDialog.open();
				}
			},
			onSelectCAFNo: function() {
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				this.oValueHelpSelectionParams = {
					"bindPathName": "dealMemoModel>/CAFDMList",
					"bindPropName": "dealMemoModel>Dmno",
					"propName": "Dmno",
					"bindPropDescName": "dealMemoModel>Cntnm",
					"keyName": "Dmno",
					"keyPath": "/CAFDmno",
					"valuePath": "/CAFDmno",
					"valueModel": "dealMemoModel",
					"dialogTitle": oSourceBundle.getText("titleCAFDM")

				};
				this.openSelectionDialog();
			},

			onSaveCAF: function() {
				var dealMemoModel = this.getView().getModel("dealMemoModel");
				var oModel = this.getView().getModel();
				if (dealMemoModel.getProperty("/CAFDmno") === "" || dealMemoModel.getProperty("/CAFDmno") === undefined) {
					MessageBox.error("msgselectCAF");
				} else {
					var oPayload = {
						Cafrefno: dealMemoModel.getProperty("/CAFDmno"),
						Tentid: "IBS"
					}
					oModel.create("/DmHeaderSet", oPayload, {
						success: function(oData) {
							this.loadDefaultDealMemo = true;
							this.loadDealMemoList();
						}.bind(this),
						error: function(oError) {

						}
					});
					this._oSelectCAFDialog.close();
				}

			},
			onCancelCAF: function() {
				this._oSelectCAFDialog.close();
			},

			onDMFilter: function() {
				var dealMemoModel = this.getView().getModel("dealMemoModel");
				var dealMemoModelData = dealMemoModel.getData();
				var channelFilterList = [],
					contentTypeFilterList = [],
					statusFilterList = [];
				dealMemoModelData.channelList.map(function(obj) {
					channelFilterList.push({
						itemText: obj.Chnlnm,
						itemKey: obj.Chnlid,
						filterProp: "Chnlid"
					})
				});
				dealMemoModelData.contentTypeList.map(function(obj) {
					contentTypeFilterList.push({
						itemText: obj.Mstcdnm,
						itemKey: obj.Mstcd,
						filterProp: "Cnttp"
					})
				});
				statusFilterList = [{
					itemText: "Open For Change",
					itemKey: "01",
					filterProp: "Dmst"
				}, {
					itemText: "Waiting For Approval",
					itemKey: "02",
					filterProp: "Dmst"
				}, {
					itemText: "Rejected",
					itemKey: "03",
					filterProp: "Dmst"
				}, {
					itemText: "Approved",
					itemKey: "04",
					filterProp: "Dmst"
				}, {
					itemText: "Contract Under Approval",
					itemKey: "05",
					filterProp: "Dmst"
				}];
				var filterItemsList = [{
					filterItemText: "Status",
					filterItemKey: "01",
					itemList: statusFilterList
				}, {
					filterItemText: "Channel",
					filterItemKey: "02",
					itemList: channelFilterList
				}, {
					filterItemText: "Content Type",
					filterItemKey: "01",
					itemList: contentTypeFilterList
				}];
				dealMemoModelData.filterItemsList = filterItemsList;
				dealMemoModel.refresh(true);
				if (!this._oDMFilterDialog) {
					Fragment.load({
						id: this.createId("DMFilterDialog"),
						name: "com.ui.dealmemolocal.fragments.DMFilterDialog",
						controller: this
					}).then(function name(oFragment) {
						this._oDMFilterDialog = oFragment; //sap.ui.xmlfragment("com.ui.dealmemolocal.fragments.SelectEpisodeDialog", this);
						this.getView().addDependent(this._oDMFilterDialog);
						this._oDMFilterDialog.open();

					}.bind(this));
				} else {
					this._oDMFilterDialog.open();
				}
			},

			handleDMFilter: function(oEvent) {
				var filterItems = oEvent.getParameters()['filterItems'];
				var aFilters = [];

				filterItems.map(function(filterItem) {
					var filterItemObj = filterItem.getBindingContext("dealMemoModel").getObject();
					aFilters.push(new Filter(filterItemObj.filterProp, "EQ", filterItemObj.itemKey));
				})

				this.getView().byId("list_dealmemo_master").getBinding("items").filter(aFilters);
			},

			onDMSort: function() {
				var oBinding = this.getView().byId("list_dealmemo_master").getBinding("items");
				var bDescending = '';
				if (oBinding.aSorters.length === 0) {
					bDescending = false;
				} else if (oBinding.aSorters[0].bDescending == true) {
					bDescending = false;
				} else {
					bDescending = true;
				}
				var aSorters = [];
				aSorters.push(new sap.ui.model.Sorter("Dmno", bDescending));
				aSorters.push(new sap.ui.model.Sorter('Dmno', bDescending));
				oBinding.sort(aSorters);
			},

			//Download template
			onExport: function() {
				var oModel = this.getView().getModel();
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var paramObj = {
					"IV_TENTID": "IBS",
					"IV_DMNO": dealMemoDetailInfo.Dmno,
					"IV_DMVER": dealMemoDetailInfo.Dmver

				};
				oModel.callFunction("/Getcosttemp", {
					method: "GET",
					urlParameters: paramObj,
					success: function(oData, response) {
						var costSheetFormatted = this.prepareCostSheet(oData.results, true);
						var epTypeObj = {
							ind: 0,
							label: 'Movie ID',
							property: 'MovieID'
								//	type: EdmType.Number
						};

						if (dealMemoDetailInfo.Cnttp === "05" || dealMemoDetailInfo.Cnttp === "09") {
							epTypeObj = {

								ind: 0,
								label: 'Match ID',
								property: 'MatchID'

							}

						}

						var aCols = [

							epTypeObj, {
								ind: 1,
								label: 'Year',
								property: 'Year',
								//	type: EdmType.Number
							}
						];

						costSheetFormatted.map(function(obj) {
							if (!obj.hasChild) {
								var costCodeDesc = obj.Scostdesc;
								if (obj.parenCostcd === "") {
									costCodeDesc = obj.Costdesc;
								}
								if (obj.enableAcquisition) {
									aCols.push({
										ind: 1,
										label: 'Acquisition - ' + costCodeDesc + "/" + obj.Costcd,
										property: 'Year',
										//		type: EdmType.Number
									});
								}
								if (obj.enableExternal) {
									aCols.push({
										ind: 1,
										label: 'External - ' + costCodeDesc + "/" + obj.Costcd,
										property: 'Year',
										//	type: EdmType.Number
									});
								}
								if (obj.enableInhouse) {
									aCols.push({
										ind: 1,
										label: 'Inhouse - ' + costCodeDesc + "/" + obj.Costcd,
										property: 'Year',
										//	type: EdmType.Number
									});
								}

							}

						});
						var oSheet = new Spreadsheet({
							workbook: {
								columns: aCols
							},
							dataSource: []
						});

						oSheet.build()
							.then(function() {
								debugger;
							})
							.finally(oSheet.destroy);

					}.bind(this),
					error: function(oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				})
			},
			handleUploadCostSheetCancel: function() {
				this._oUploadSheetDialog.close();
			},
			onUploadDialog: function() {
				if (!this._oUploadSheetDialog) {
					Fragment.load({
						id: this.createId("uploadCostSheetDialog"),
						name: "com.ui.dealmemolocal.fragments.UploadCostSheetDialog",
						controller: this
					}).then(function name(oFragment) {
						this._oUploadSheetDialog = oFragment;
						this.getView().addDependent(this._oUploadSheetDialog);
						this.byId(sap.ui.core.Fragment.createId("uploadCostSheetDialog", "fileUploader")).setValue("");
						this._oUploadSheetDialog.open();
					}.bind(this));
				} else {
					this.byId(sap.ui.core.Fragment.createId("uploadCostSheetDialog", "fileUploader")).setValue("");
					this._oUploadSheetDialog.open();
				}
			},
			get_header_row: function(sheet) {
				var headers = [];
				var range = XLSX.utils.decode_range(sheet['!ref']);
				var C, R = range.s.r; /* start in the first row */
				/* walk every column in the range */
				for (C = range.s.c; C <= range.e.c; ++C) {
					var cell = sheet[XLSX.utils.encode_cell({
						c: C,
						r: R
					})] /* find the cell in the first row */

					var hdr = "UNKNOWN " + C; // <-- replace with your desired default 
					if (cell && cell.t) hdr = XLSX.utils.format_cell(cell);

					headers.push(hdr);
				}
				return headers;
			},
			uploadMovieData: function(uploadedData, oControllerRef) {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoModel = this.getView().getModel("dealMemoModel");
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				var statusFlag = true;
				var nonZeroCostCdAtLeastOne = false;
				var nonNumericCost = false;
				var oMsg = "";
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var noChangedepisodeData = $.extend(true, [], dealMemoDetailInfo.episodeData);
				var episodeData = dealMemoDetailInfo.episodeData;
				var episodeList, episodeIds;
				if (dealMemoDetailInfo.Cnttp === "05" || dealMemoDetailInfo.Cnttp === "09") {
					episodeList = dealMemoModel.getProperty("/matchList");
					episodeIds = episodeList.map(function(obj) {
						return obj.Matid
					});
				} else if (dealMemoDetailInfo.Cnttp === "02") {
					episodeList = dealMemoModel.getProperty("/movieList");
					episodeIds = episodeList.map(function(obj) {
						return obj.Mvid
					});
				}
				// var movieList = dealMemoModel.getProperty("/movieList");
				var movieIds = episodeList.map(function(obj) {
					return obj.Mvid
				});
				var uploadedMoviedIds = [],
					uploadedMatchIds = [];
				if (uploadedData.length !== episodeData.length) {
					statusFlag = false;
					oMsg = oSourceBundle.getText("msgTotEpisodeCountNontch" + dealMemoDetailInfo.Cnttp, episodeData.length);
				}
				if (statusFlag) {
					//	movieData.map(function(mvObj,oIndex){
					for (var oIndex = 0; oIndex < uploadedData.length; oIndex++) {
						var mvObj = uploadedData[oIndex];

						episodeData[oIndex]['Totepiamt'] = 0;
						nonNumericCost = false;

						var aKeys = Object.keys(mvObj);

						if (aKeys.indexOf("Movie ID") === -1 && dealMemoDetailInfo.Cnttp === "02") {
							statusFlag = false;
							oMsg = oSourceBundle.getText("msgMovIdNonBlank" + dealMemoDetailInfo.Cnttp);
							break;
						} else if (aKeys.indexOf("Match ID") === -1 && dealMemoDetailInfo.Cnttp === "05") {
							statusFlag = false;
							oMsg = oSourceBundle.getText("msgMovIdNonBlank" + dealMemoDetailInfo.Cnttp);
							break;
						} else if (aKeys.indexOf("Match ID") === -1 && dealMemoDetailInfo.Cnttp === "09") {
							statusFlag = false;
							oMsg = oSourceBundle.getText("msgMovIdNonBlank" + dealMemoDetailInfo.Cnttp);
							break;
						} else if (aKeys.indexOf("Year") === -1) {
							statusFlag = false;
							oMsg = oSourceBundle.getText("msgYearNonBlankExcel");
							break;
						}
						//aKeys.map(function(aKey){
						for (var cnt = 0; cnt < aKeys.length; cnt++) {
							var aKey = aKeys[cnt];
							if (aKey === "Movie ID") {

								if (uploadedMoviedIds.indexOf(mvObj[aKey]) >= 0) {
									statusFlag = false;
									oMsg = oSourceBundle.getText("msgDuplicateMovIdInExcel" + dealMemoDetailInfo.Cnttp, mvObj[aKey]);
									break;
								} else {
									uploadedMoviedIds.push(mvObj[aKey]);
								}

								if (episodeIds.indexOf(mvObj[aKey]) >= 0) {

									var mvIndex = episodeIds.indexOf(mvObj[aKey]);
									if (episodeList[mvIndex].Mpmid === "") {
										statusFlag = false;
										oMsg = oSourceBundle.getText("msgNOMPMExist" + dealMemoDetailInfo.Cnttp, mvObj[aKey]);
										break;
									} else {
										episodeData[oIndex]['Epiid'] = mvObj[aKey];
										episodeData[oIndex]['Epinm'] = episodeList[mvIndex].Mvnm;
									}
								} else {
									statusFlag = false;
									oMsg = oSourceBundle.getText("msgMovieIdNoExist" + dealMemoDetailInfo.Cnttp, mvObj[aKey]);
									break;
									//error message Movie id does not exist
								}

							} else if (aKey === "Match ID") {

								if (uploadedMatchIds.indexOf(mvObj[aKey]) >= 0) {
									statusFlag = false;
									oMsg = oSourceBundle.getText("msgDuplicateMovIdInExcel" + dealMemoDetailInfo.Cnttp, mvObj[aKey]);
									break;
								} else {
									uploadedMatchIds.push(mvObj[aKey]);
								}

								if (episodeIds.indexOf(mvObj[aKey]) >= 0) {

									var mvIndex = episodeIds.indexOf(mvObj[aKey]);
									if (episodeList[mvIndex].Mpmid === "") {
										statusFlag = false;
										oMsg = oSourceBundle.getText("msgNOMPMExist" + dealMemoDetailInfo.Cnttp, mvObj[aKey]);
										break;
									} else {
										episodeData[oIndex]['Epiid'] = mvObj[aKey];
										episodeData[oIndex]['Epinm'] = episodeList[mvIndex].Matnm;
									}

								} else {
									statusFlag = false;
									oMsg = oSourceBundle.getText("msgMovieIdNoExist" + dealMemoDetailInfo.Cnttp, mvObj[aKey]);
									break;
									//error message Movie id does not exist
								}

							} else if (aKey === "Year") {

								if (!(parseInt(mvObj[aKey]) >= parseInt(dealMemoDetailInfo.FromYr) && parseInt(mvObj[aKey]) <= parseInt(dealMemoDetailInfo.ToYr))) {
									statusFlag = false;
									oMsg = oSourceBundle.getText("msgYearNotInRangeExcel", dealMemoDetailInfo.FromYr + "-" + dealMemoDetailInfo.ToYr);
									break;
								} else if (mvObj[aKey] === "" || mvObj[aKey] === null || mvObj[aKey] === undefined) {
									statusFlag = false;
									oMsg = oSourceBundle.getText("msgYearNotInRangeExcel", dealMemoDetailInfo.FromYr + "-" + dealMemoDetailInfo.ToYr);
									break;
								} else {
									episodeData[oIndex]['Gjahr'] = mvObj[aKey];
								}
							} else {
								var costCode = aKey.split("/")[1];
								if (episodeData[oIndex].epiSodeCostSheet.length > 0) {
									var costCodesInfo = episodeData[oIndex].epiSodeCostSheet.map(function(obj) {
										return obj.Costcd;
									});
									if (costCodesInfo.indexOf(costCode) >= 0) {
										var costCodeIndex = costCodesInfo.indexOf(costCode);
										var costCodeObj = episodeData[oIndex].epiSodeCostSheet[costCodeIndex];
										if (aKey.includes("Acquisition")) {
											if (!isNaN(mvObj[aKey]) && !isNaN(parseFloat(mvObj[aKey]))) {
												//	atleastOneCostHead = true;
												costCodeObj.Prdhsamt = parseFloat(mvObj[aKey]);
											} else {
												nonNumericCost = true;
												break;
											}

										} else if (aKey.includes("External")) {
											if (!isNaN(mvObj[aKey]) && !isNaN(parseFloat(mvObj[aKey]))) {
												//	atleastOneCostHead = true;
												costCodeObj.Inhsamt = parseFloat(mvObj[aKey]);
											} else {
												nonNumericCost = true;
												break;
											}

										} else if (aKey.includes("Inhouse")) {
											if (!isNaN(mvObj[aKey]) && !isNaN(parseFloat(mvObj[aKey]))) {
												//	atleastOneCostHead = true;
												costCodeObj.Inhouseamt = parseFloat(mvObj[aKey]);
											} else {
												nonNumericCost = true;
												break;
											}
										}
										if (!Number.isNaN(parseFloat(costCodeObj.Prdhsamt)) && !Number.isNaN(parseFloat(costCodeObj.Inhsamt)) && !Number.isNaN(
												parseFloat(costCodeObj.Inhouseamt))) {
											costCodeObj.Totcostamt = parseFloat(costCodeObj.Prdhsamt) + parseFloat(costCodeObj.Inhsamt) + parseFloat(costCodeObj.Inhouseamt);
										}

									}
									if (costCodeObj.parenCostcd !== "") {
										var parenCostCodeInd = costCodesInfo.indexOf(costCodeObj.parenCostcd);
										var parenCostCodeObj = episodeData[oIndex].epiSodeCostSheet[parenCostCodeInd];
										parenCostCodeObj.Prdhsamt = parseFloat(parenCostCodeObj.Prdhsamt) + costCodeObj.Prdhsamt;
										parenCostCodeObj.Inhsamt = parseFloat(parenCostCodeObj.Inhsamt) + costCodeObj.Inhsamt;
										parenCostCodeObj.Inhouseamt = parseFloat(parenCostCodeObj.Inhouseamt) + costCodeObj.Inhouseamt;
										parenCostCodeObj.Totcostamt = parseFloat(parenCostCodeObj.Prdhsamt) + parseFloat(parenCostCodeObj.Inhsamt) + parseFloat(
											parenCostCodeObj.Inhouseamt);
									}
									if (costCodeObj.Leadcostcd === "P") {
										episodeData[oIndex].Leadcost = costCodeObj.Prdhsamt;
									} else if (costCodeObj.Leadcostcd === "I") {
										episodeData[oIndex].Leadcost = costCodeObj.Inhsamt;
									}
									episodeData[oIndex]['Totepiamt'] = parseFloat(episodeData[oIndex]['Totepiamt']) + parseFloat(costCodeObj.Prdhsamt) +
										parseFloat(costCodeObj.Inhsamt) + parseFloat(costCodeObj.Inhouseamt);

								} else {

								}
							}
						}
						if (!statusFlag) {
							break;
						}
						if (nonNumericCost) {
							statusFlag = false;
							oMsg = oSourceBundle.getText("msgCostCodeCostNumericOnly");
							break
						}
						if (parseInt(episodeData[oIndex]['Totepiamt']) === 0) {
							statusFlag = false;
							oMsg = oSourceBundle.getText("msgtotCostCodeCostNonZero");
							break;
						}
						//    				if(!atleastOneCostHead){
						//    					atleastOneCostHead = false;
						//    					break;
						//    				}
						episodeData[oIndex]['epiSodeCostSheetEditMode'] = episodeData[oIndex].epiSodeCostSheet;

					} //.bind(this));

				}

				if (!statusFlag) {
					dealMemoDetailInfo.episodeData = noChangedepisodeData;
					dealMemoDetailModel.refresh(true);
					this._oUploadSheetDialog.close();
					MessageBox.error(oMsg);
				}
				//    			else if(!atleastOneCostHead){
				//    				 statusFlag = false;
				//    				 MessageBox.error(oSourceBundle.getText("msgtotCostCodeCostNonZero"));
				//    			 }
				//    			//MessageBox.error(
				else {

					dealMemoDetailModel.refresh(true);
					this.calculateEpisodeHeadCost();
					this._oUploadSheetDialog.close();
				}

				return statusFlag;
			},
			fillValueInCostSheet: function(episodeCostSheet) {

			},
			handleUploadPress: function() {

				var oFileUploader = this.byId(sap.ui.core.Fragment.createId("uploadCostSheetDialog", "fileUploader")); // get the sap.ui.unified.FileUploader
				var file = oFileUploader.getFocusDomRef().files[0]; // get the file from the FileUploader control
				var oControllerRef = this;

				if (file && window.FileReader) {
					var reader = new FileReader();
					reader.onload = function(e) {
						var data = e.target.result;
						var excelsheet = XLSX.read(data, {
							type: "binary"
						});
						excelsheet.SheetNames.forEach(function(sheetName) {
							var oExcelRow = XLSX.utils.sheet_to_row_object_array(excelsheet.Sheets[sheetName]); // this is the required data in Object format
							var headerCols = oControllerRef.get_header_row(excelsheet.Sheets[sheetName]);
							var sJSONData = JSON.stringify(oExcelRow); // this is the required data in String format
							oControllerRef.uploadMovieData(oExcelRow, oControllerRef);
						});
					};
					reader.readAsBinaryString(file);
				}
			},

			//Schedule Tab

			onCreateSchedule: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				dealMemoDetailInfo.scheduleTimeFrom = "";
				dealMemoDetailInfo.scheduleDur = "";
				dealMemoDetailInfo.scheduleDays = [];
				dealMemoDetailModel.refresh(true);

				if (!this._oCreateScheduleDialog) {
					Fragment.load({
						id: this.createId("scheduleDialog"),
						name: "com.ui.dealmemolocal.fragments.DealMemoTabs.Schedule.ScheduleDialog",
						controller: this
					}).then(function name(oFragment) {
						this._oCreateScheduleDialog = oFragment;
						this.getView().addDependent(this._oCreateScheduleDialog);
						this._oCreateScheduleDialog.open();
					}.bind(this));
				} else {
					this._oCreateScheduleDialog.open();
				}
			},
			getMaxOfArray: function(numArray) {
				return Math.max.apply(null, numArray);
			},
			onCreateScheduleOk: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var dealMemoModel = this.getView().getModel("dealMemoModel");
				var daysList = dealMemoModel.getData()['daysList'];
				var daysInfo = daysList.map(function(dayObj) {
					return dayObj.Mstcd;
				});
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();

				var statusFlag = true;
				var oMsg = "";
				if (dealMemoDetailInfo.scheduleTimeFrom === "") {
					statusFlag = false;
					oMsg = oSourceBundle.getText("msgrequiredFieds");
				} else if (dealMemoDetailInfo.scheduleDur === "") {
					statusFlag = false;
					oMsg = oSourceBundle.getText("msgrequiredFieds");
				} else if (dealMemoDetailInfo.scheduleDays.length === 0) {
					statusFlag = false;
					oMsg = oSourceBundle.getText("msgrequiredFieds");
				} else if (dealMemoDetailInfo.Noofepi < dealMemoDetailInfo.scheduleDays.length) {
					statusFlag = false;
					oMsg = oSourceBundle.getText("msgExceedDays" + dealMemoDetailInfo.Cnttp);
				}

				if (!statusFlag) {
					MessageBox.error(oMsg);
				} else {
					var schedulePayload = [];
					var seqNo = 0;

					var noOfEpi = parseInt(dealMemoDetailInfo.Noofepi);
					var totalSelectedDays = dealMemoDetailInfo.scheduleDays.length;
					var totalWeeks = Math.floor(noOfEpi / totalSelectedDays);
					var additionalWeeks = noOfEpi % totalSelectedDays;
					var scheduleDays = dealMemoDetailInfo.scheduleDays;
					var scheduleInfo = []
					if (dealMemoDetailInfo.scheduleInfo.length) {
						scheduleInfo = dealMemoDetailInfo.scheduleInfo;

					}
					var existingScheduleDays = scheduleInfo.map(function(schObj) {
						return schObj.Bcschcd;
					})

					scheduleDays = scheduleDays.sort();
					//	var scheduleDays = scheduleDays.sort((a,b) => (a.Mstcd > b.Mstcd) ? 1 : ((b.Lifnr > a.Lifnr) ? -1 : 0));
					scheduleDays.map(function(scheduleDay) {
						var dayInfoObj = {};
						if (daysInfo.indexOf(scheduleDay) >= 0) {
							dayInfoObj = daysList[daysInfo.indexOf(scheduleDay)];

						}

						var scheduleTimeToHrs = dealMemoDetailInfo.scheduleTimeFromDt.getHours() + dealMemoDetailInfo.scheduleDurDt.getHours();
						var scheduleTimeToMins = dealMemoDetailInfo.scheduleTimeFromDt.getMinutes() + dealMemoDetailInfo.scheduleDurDt.getMinutes();

						var schedulePayloadObj = {
							Seqnr: 0,
							Bcschnm: dayInfoObj.Mstcdnm,
							Timeslotfm: dealMemoDetailInfo.scheduleTimeFrom,
							Timeslotto: scheduleTimeToHrs + ":" + scheduleTimeToMins + ":" + "00",
							Duration: dealMemoDetailInfo.scheduleDur,
							Noofweeks: 0,
							Trpbudrntg: "0", //Added By Lakshmana on 19.06.2020 for Deal memo changes V2
							Trpestrntg: "",
							Bcschcd: dayInfoObj.Mstcd
						}

						if (existingScheduleDays.indexOf(scheduleDay) === -1) {
							schedulePayloadObj.flag = "Cr";
							scheduleInfo.push(schedulePayloadObj);

						} else {
							var oIndex = existingScheduleDays.indexOf(scheduleDay);
							schedulePayloadObj.flag = "Ch";
							scheduleInfo[oIndex] = schedulePayloadObj;
						}

					}.bind(this));

					var countWeeks = 0;
					var flagOneIterationDone = true;
					while (countWeeks < noOfEpi) {
						scheduleInfo.map(function(schInfo) {
							if (flagOneIterationDone) {
								schInfo.Seqnr = seqNo + 1;
								schInfo.Noofweeks = 0;
							}
							if (countWeeks < noOfEpi) {
								schInfo.Noofweeks = schInfo.Noofweeks + 1;
							}
							countWeeks++;
							seqNo++;
						});
						flagOneIterationDone = false;
					}

					dealMemoDetailInfo.scheduleInfo = scheduleInfo;
					dealMemoDetailModel.refresh(true);
					this._oCreateScheduleDialog.close();
				}

			},
			onCreateScheduleCancel: function() {
				this._oCreateScheduleDialog.close();
			},
			onTimeChange: function(oEvent) {

				var oSchObj = oEvent.getSource().getBindingContext("dealMemoDetailModel").getObject();
				var scheduleTimeToHrs = oSchObj.TimeslotfmDt.getHours() + oSchObj.DurationDt.getHours();
				var scheduleTimeToMins = oSchObj.TimeslotfmDt.getMinutes() + oSchObj.DurationDt.getMinutes();
				oSchObj.Timeslotto = scheduleTimeToHrs + ":" + scheduleTimeToMins + ":" + "00";
				if (oSchObj.flag === undefined || oSchObj.flag !== "Cr") {
					oSchObj.flag = "Ch";
				}
				this.getView().getModel("dealMemoDetailModel").refresh(true);

			},
			onScheduleChange: function(oEvent) {
				var schObj = oEvent.getSource().getBindingContext("dealMemoDetailModel").getObject();
				if (schObj.flag === undefined || schObj.flag !== "Cr") {
					schObj.flag = "Ch";
				}
				this.getView().getModel("dealMemoDetailModel").refresh(true);
			},
			prepareSchedulePayload: function(scheduleObj) {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				return {
					Tentid: 'IBS',
					Dmno: dealMemoDetailInfo.Dmno,
					Seqnr: scheduleObj.Seqnr.toString(),
					Bcschnm: scheduleObj.Bcschnm,
					Timeslotfm: Formatter.formatTimeValForBackend(scheduleObj.Timeslotfm),
					Timeslotto: Formatter.formatTimeValForBackend(scheduleObj.Timeslotto),
					Duration: Formatter.formatTimeValForBackend(scheduleObj.Duration),
					Noofweeks: scheduleObj.Noofweeks.toString(),
					Trpbudrntg: "0",
					Trpestrntg: scheduleObj.Trpestrntg.toString(),
					Bcschcd: scheduleObj.Bcschcd
				}

			},
			prepareDmafPayload: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				return {
					Tentid: "IBS",
					Dmno: dealMemoDetailInfo.Dmno,
					Netothrev: "0.00",
					Budcashamt: "0.00",
					Cntamrtamt: "0.00",
					Avgbcrevamt: "0.00",
					Contribefoffairmakt: "0.00",
					Lessmaktamt: "0.00",
					Totothrevamt: "0.00",
					Advoffairamt: "0.00",
					Contriaftoffairmakt: "0.00",
					Budavgbcrevamt: "0.00",
					Contriper: "0.00",
					Budtotothvamt: "0.00",
					Trpnetbcrevaftcom: "0.00",
					Budadvoffairamt: "0.00",
					Trpcntamrtamt: "0.00",
					Trpcontribefoffairmakt: "0.00",
					Noofslots: "0",
					Trplessmaktamt: "0.00",
					Totavgbcrevamt: "0.00",
					Trpcontriaftoffairmakt: "0.00",
					Estavgrtng: "0.00",
					Revtrptvtamt: "0.00",
					Totbcrevamt: "0.00",
					Budavgrtng: "0.00",
					Budrevtrptvtamt: "0.00",
					Budtotbcrevamt: "0.00",
					Totcnthrs: "0",
					Noofepi: "0",
					Totbudcashamt: "0.00",
				}
			},
			validateScheduleData: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var scheduleData = dealMemoDetailInfo.scheduleInfo;
				var statusFlag = true;
				var oMsg = "";
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				var totalWeekCount = 0;
				for (var oInd = 0; oInd < scheduleData.length; oInd++) {
					var schObj = scheduleData[oInd];

					if (schObj.Timeslotfm === null || schObj.Timeslotfm === '') {
						statusFlag = false;
						oMsg = oSourceBundle.getText("msgSchtimefromline");
						break;

					} else if (schObj.Duration === null || schObj.Duration === '' || schObj.Duration === "00:00:00") {
						statusFlag = false;
						oMsg = oSourceBundle.getText("msgSchdurline");
						break;

					} else if (schObj.Noofweeks == '' || schObj.Noofweeks == 0) {
						statusFlag = false;
						oMsg = oSourceBundle.getText("msgSchweekline");
						break;
					} else if (schObj.Trpestrntg == '' || schObj.Trpestrntg == 0) {
						statusFlag = false;
						oMsg = oSourceBundle.getText("msgSchestimatetrp");
						break
					}
					totalWeekCount += parseInt(schObj.Noofweeks);

				}

				if (oInd === scheduleData.length && totalWeekCount !== parseInt(dealMemoDetailInfo.Noofepi)) {
					statusFlag = false;
					oMsg = oSourceBundle.getText("msgWeekmismatch");
				}

				if (!statusFlag) {
					MessageBox.error(oMsg);
				}
				return statusFlag;

			},
			saveScheduleData: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var scheduleData = dealMemoDetailInfo.scheduleInfo;
				var validateSchFlag = this.validateScheduleData();
				if (validateSchFlag) {
					var oModel = this.getView().getModel();
					oModel.setUseBatch(true);
					oModel.setDeferredGroups(["scheduleSaveChanges"]);
					oModel.sDefaultUpdateMethod = "PUT";
					var alreadySaveFlag = true;
					var saveScheduleParams = {
						groupId: "scheduleSaveChanges",

						success: function(odata, resp) {
							var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
							MessageToast.show(oSourceBundle.getText("msgSuccSchDetUpdate"));
							this.getView().byId("idIconTabBar").setSelectedKey("schedule");
							//	this.loadDealMemoList();
							this.loadDetailDealMemo(this.selectedDealMemoObj);
						}.bind(this),
						error: function(oError) {
							var oErrorResponse = JSON.parse(oError.responseText);
							var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
							MessageBox.error(oMsg);
						}
					}
					var schPayloadArr = [];
					scheduleData.map(function(schObj) {
						var schPayload = this.prepareSchedulePayload(schObj);
						schPayloadArr.push(schPayload);
						if (schObj.flag === "Cr") {
							alreadySaveFlag = false;
							oModel.create("/DmbsSet", schPayload, {
								groupId: "scheduleSaveChanges"
							});

						} else if (schObj.flag === "Ch") {
							alreadySaveFlag = false;
							var oPath = "/DmbsSet(Tentid='IBS',Dmno='" + dealMemoDetailInfo.Dmno + "',Seqnr='" + schObj.Seqnr + "',Bcschcd='" + schObj.Bcschcd +
								"')";
							oModel.update(oPath, schPayload, {
								groupId: "scheduleSaveChanges"
							});
						}
					}.bind(this))
					if (alreadySaveFlag) {
						var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
						MessageBox.information(oSourceBundle.getText("msgAlreadysave"));
					} else {
						var dmafPayload = this.prepareDmafPayload();
						dmafPayload.DmbsSet = schPayloadArr;
						oModel.create("/DmafSet", dmafPayload, {
							groupId: "scheduleSaveChanges"
						});
						oModel.submitChanges(saveScheduleParams);
					}
				}
			},
			onDeleteScheduleConfirm: function() {
				var detailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = detailModel.getData();
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				var selRowCount = this.getView().byId("oTblSchedule").getSelectedContexts().length;
				if (selRowCount > 0) {

					MessageBox.confirm(oSourceBundle.getText("msgDeleteconfirm"), {
						actions: [oSourceBundle.getText("lblYes"), oSourceBundle.getText("lblNo")],
						emphasizedAction: "Yes",
						onClose: function(sAction) {
							if (sAction === oSourceBundle.getText("lblYes")) {
								this.onDeleteSchedule();
							} else if (sAction === oSourceBundle.getText("lblNo")) {

							}
						}.bind(this)
					});

				} else {
					MessageBox.error(oSourceBundle.getText("msgSelectAtleastOneDay"));
				}
			},
			onDeleteSchedule: function() {
				var detailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = detailModel.getData();
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				var selRows = this.getView().byId("oTblSchedule").getSelectedContexts();
				var oModel = this.getView().getModel();
				oModel.setUseBatch(true);
				oModel.setDeferredGroups(["scheduleDelete"]);
				var mParameters = {
					groupId: "scheduleDelete",
					success: function(odata, resp) {
						var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
						var oResponse = odata.__batchResponses[0];
						if (oResponse.__changeResponses && oResponse.__changeResponses.length) {
							if (oResponse.__changeResponses[0].statusCode === "204") {
								MessageToast.show(oSourceBundle.getText("msgSuccScheduleDeleteSave"));

								this.getView().byId("oTblSchedule").removeSelections();
								this.getView().byId("idIconTabBar").setSelectedKey("schedule");
								this.loadDetailDealMemo(this.selectedDealMemoObj);
							}
						} else {
							var oError = JSON.parse(oResponse.response.body);
							var oMsg = oError.error.innererror.errordetails[0].message;
							MessageBox.error(oMsg);
						}

					}.bind(this),
					error: function(oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);

					}
				};

				selRows.map(function(oRow) {
					var schObj = oRow.getObject();
					var oPath = "/DmbsSet(Tentid='IBS',Dmno='" + dealMemoDetailInfo.Dmno + "',Seqnr='" + schObj.Seqnr + "',Bcschcd='" + schObj.Bcschcd +
						"')"
					oModel.remove(oPath, {
						groupId: "scheduleDelete"
					});

				}.bind(this));

				oModel.submitChanges(mParameters);
			},

			//Release Status Tab
			getDateInMS: function(date, time) {
				date.setHours(0, 0, 0, 0);
				var Actdt = date.getTime();
				var Time = time;
				var DtTime = Actdt + Time;
				DtTime = "Date(" + DtTime + ")";
				return DtTime;

			},
			loadReleaseStatusDetails: function() {
				var oModel = this.getView().getModel();
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				dealMemoDetailInfo.relStatustabcolor = "Critical";
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
					new Filter("Dmno", "EQ", dealMemoDetailInfo.Dmno),
					new Filter("Dmver", "EQ", dealMemoDetailInfo.Dmver)
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
					success: function(oData) {

						oData.results.map(function(obj) {
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
						}.bind(this));
						dealMemoDetailInfo.releaseStatusInfo = releaseStatusInfo;
						if (releaseStatusInfo.length) {
							dealMemoDetailInfo.relStatustabcolor = "Positive";
						}
						dealMemoDetailModel.refresh(true);

					}.bind(this),
					error: function(oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}

				})
			},

			//Attachmment Tab

			onChange: function(oEvent) {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var oUploadCollection = oEvent.getSource();
				oUploadCollection.setUploadUrl(dealMemoDetailInfo.attachURL);
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
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
				var oModel = this.getView().getModel();
				var docId = oEvent.getParameter("documentId");
				var oPath = "/AttachmentSet(Tentid='IBS',Dmno='" + dealMemoDetailInfo.Dmno + "',Dmver='" + dealMemoDetailInfo.Dmver +
					"',Instanceid='" + docId + "')";
				oModel.remove(oPath, {
					success: function(oData) {
						MessageToast.show(oSourceBundle.getText("msgFileDelSucc"));
						this.loadAttachments();
					}.bind(this),
					error: function(oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}
				})
			},

			loadAttachments: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var oModel = this.getView().getModel();
				var aFilters = [
					new Filter("Tentid", "EQ", "IBS"),
					new Filter("Dmno", "EQ", dealMemoDetailInfo.Dmno),
					new Filter("Dmver", "EQ", dealMemoDetailInfo.Dmver),
					new Filter("Instanceid", "EQ", ''),
				];
				sap.ui.core.BusyIndicator.show(0);
				oModel.read("/AttachmentSet", {
					filters: aFilters,
					success: function(oData) {
						sap.ui.core.BusyIndicator.hide();
						dealMemoDetailInfo.AttachmentDetails = oData.results;
						if(oData.results.length > 0) {
							dealMemoDetailInfo.attachmentTabColor = "Positive";
						} else {
							dealMemoDetailInfo.attachmentTabColor = "Critical";
						}
						dealMemoDetailModel.refresh(true);
					},
					error: function(oError) {
						var oErrorResponse = JSON.parse(oError.responseText);
						var oMsg = oErrorResponse.error.innererror.errordetails[0].message;
						MessageBox.error(oMsg);
					}

				});
			},
			// load Revenue tab
			loadRevenueTab: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				sap.ui.core.BusyIndicator.show(0);
				var bModel = this.getView().byId("Rev30Table").getModel();
				var dmNo = dealMemoDetailInfo.Dmno
				var srvUrl = "/sap/opu/odata/IBSCMS/DEALMEMO_SRV/";
				var oModelSav = new sap.ui.model.odata.ODataModel(srvUrl, true, "", "");
				var pValue = "/DmafSet(Tentid='IBS',Dmno='" + dmNo + "')";
				oModelSav.read(pValue, null, null, true, function(oData) {
					sap.ui.core.BusyIndicator.hide();
					var oModel = new sap.ui.model.json.JSONModel(oData);
					if (bModel.oData.results.length > 0) {
						if (oData.Avgbcrevamt !== "0.00") {
							dealMemoDetailModel.setProperty("/revenueTabColor", "Positive");
						} else {
							dealMemoDetailModel.setProperty("/revenueTabColor", "Critical");
						}
						dealMemoDetailModel.refresh(true);

						bModel.oData.results[1].sinput = oData.Avgbcrevamt;
						bModel.oData.results[2].sinput = oData.Totavgbcrevamt;
						bModel.oData.results[3].sinput = oData.Totothrevamt;
						bModel.oData.results[0].sinput = oData.Noofslots;
						bModel.oData.results[0].curr = bModel.oData.results[1].curr = bModel.oData.results[1].curr = bModel.oData.results[3].curr =
							dealMemoDetailInfo.Waers;
					}
					bModel.refresh();
					dealMemoDetailModel.refresh(true);
				}, function() {
					sap.ui.core.BusyIndicator.hide();
					if (bModel.oData.results.length > 0) {
						bModel.oData.results[1].sinput = dealMemoDetailInfo.Dmaf.Avgbcrevamt;
						bModel.oData.results[2].sinput = dealMemoDetailInfo.Dmaf.Totavgbcrevamt;
						bModel.oData.results[3].sinput = dealMemoDetailInfo.Dmaf.Totothrevamt;
						bModel.oData.results[0].sinput = dealMemoDetailInfo.Dmaf.Noofslots;
						bModel.oData.results[0].curr = dealMemoDetailInfo.Waers;
					}
					bModel.refresh();
				});
			},
			calRev30: function(oEvent) {

				var val = oEvent.getSource().getValue();
				var bModel = this.getView().byId("Rev30Table").getModel();
				var id = oEvent.getSource().sId;

				var pattern1 = /^[1-9]\d*((,\d{3}){1})(((,\d{3}){1})?(\.\d{0,2})?)$/; // values like 000,000,000.00
				var pattern2 = /^\d{1,9}(\.\d{1,2})?$/;

				if (val.match(pattern1) || val == "") {
					oEvent.getSource().setValueState("None");

				} else if (val.match(pattern2)) {
					oEvent.getSource().setValueState("None");
				} else {
					oEvent.getSource().setValueState("Error");
					oEvent.getSource().setValueStateText(this.getView().getModel("i18n").getResourceBundle().getText("msg_tooltipamount"));
				}
				var no = id.substr(id.length - 1);
				if (no === "1") {

					var tot30min = bModel.oData.results[0].sinput;
					var val = Number(val.replace(/[^0-9\.]+/g, ""));
					var TBRTotalRun = val * tot30min;
					bModel.oData.results[2].sinput = TBRTotalRun;
				}
				/*		if (no === "3") {
							bModel.oData.results[3].sinput = val;
						}*/
				bModel.refresh();

			},
			saveRevenueTab: function() {
				sap.ui.core.BusyIndicator.show(0);
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var dmNo = dealMemoDetailInfo.Dmno;
				var srvUrl = "/sap/opu/odata/IBSCMS/DEALMEMO_SRV/";
				var oModelSave = new sap.ui.model.odata.ODataModel(srvUrl, true, "", "");
				var bModel = this.getView().byId("Rev30Table").getModel();
				var state1 = this.getView().byId("Rev30Table").getItems()[1].getCells()[1].getValueState();
				var state2 = this.getView().byId("Rev30Table").getItems()[3].getCells()[1].getValueState();
				if (bModel.oData.results[1].sinput !== "" && bModel.oData.results[1].sinput !== "0.00" && bModel.oData.results[3].sinput !== "" &&
					bModel.oData.results[3].sinput !== "0.00" && state1 === "None" && state2 === "None") {
					// var aModel = this.getView().byId("mLabel").getModel();
					var pValue = "/DmafSet(Tentid='IBS',Dmno='" + dmNo + "')";
					oModelSave.read(pValue, null, null, true, dSuccRev30, eFailRev30);
					if (dealMemoDetailInfo.Dmaf.Avgbcrevamt !== "0.00") {
						dealMemoDetailModel.setProperty("/revenueTabColor", "Positive");
					} else {
						dealMemoDetailModel.setProperty("/revenueTabColor", "Critical");
					}
					dealMemoDetailModel.refresh(true);

				} else {
					sap.ui.core.BusyIndicator.hide();
					if (state1 == "Error" || state2 == "Error") {
						sap.m.MessageBox.show(this.getView().getModel("i18n").getText("msg_highlighterror"), {
							icon: sap.m.MessageBox.Icon.ERROR,
							title: "{i18n>Error}"
						});
					} else {
						if (bModel.oData.results[1].sinput == "" || bModel.oData.results[1].sinput == "0.00") {
							sap.m.MessageBox.show(this.getView().getModel("i18n").getText("msg_avgbroadrev"), {
								icon: sap.m.MessageBox.Icon.ERROR,
								title: "{i18n>Error}"
							});

						} else {
							sap.m.MessageBox.show(this.getView().getModel("i18n").getText("msg_totalotherrev"), {
								icon: sap.m.MessageBox.Icon.ERROR,
								title: "{i18n>Error}"
							});
						}
					}
				}

				function dSuccRev30(oData) {
					sap.ui.core.BusyIndicator.hide();
					if (oData.Dmno == "") {
						sap.ui.core.BusyIndicator.show(0);
						// var aModel = this.getView().byId("mLabel").getModel();

						var bModel = that.getView().byId("Rev30Table").getModel();
						oData.Tentid = "IBS";
						var dealMemoDetailModel = that.getView().getModel("dealMemoDetailModel");
						var dealMemoDetailInfo = dealMemoDetailModel.getData();
						var dmNo = dealMemoDetailInfo.Dmno;
						oData.Dmno = dmNo;
						oData.Avgbcrevamt = bModel.oData.results[1].sinput.toString();
						oData.Totavgbcrevamt = bModel.oData.results[2].sinput.toString();
						oData.Totothrevamt = bModel.oData.results[3].sinput.toString();

						var intDataModelUrl = "/sap/opu/odata/IBSCMS/DEALMEMO_SRV/";
						var oModelSav = new sap.ui.model.odata.ODataModel(intDataModelUrl, true, "", "");
						oModelSav.setHeaders({
							"Accept": "application/json"
						});
						oModelSav.setHeaders({
							"X-Requested-With": "X"
						});
						var pValue = "/DmafSet";
						oModelSav.create(pValue, oData, null, function() {
								//	alert("revenue created");
								sap.ui.core.BusyIndicator.hide();
								if (oData.Avgbcrevamt !== "0") {
									dealMemoDetailModel.setProperty("/revenueTabColor", "Positive");
								} else {
									dealMemoDetailModel.setProperty("/revenueTabColor", "Critical");
								}
								dealMemoDetailModel.refresh(true);
								// this.getView().byId("idRev30").setIconColor("Positive");
								sap.m.MessageToast.show(that.getView().getModel("i18n")._oResourceBundle.getText("msg_revper30save"));
							},

							function(oData) {
								sap.ui.core.BusyIndicator.hide();
								//	alert("revenue creation failed");
								var errMsg = JSON.parse(oData.response.body);
								if (errMsg != '') {
									var stext = errMsg.error.innererror.errordetails[0].message;
									sap.m.MessageBox.show(stext, {
										icon: sap.m.MessageBox.Icon.ERROR,
										title: "{i18n>Error}"
									});

								} else {

									sap.m.MessageBox.show(that.getView().getModel("i18n")._oResourceBundle.getText("msg_revper30savefail"), {
										icon: sap.m.MessageBox.Icon.ERROR,
										title: "{i18n>Error}"
									});
								}
							});
					} else {
						var bModel = that.getView().byId("Rev30Table").getModel();
						if (oData.Avgbcrevamt == bModel.oData.results[1].sinput && oData.Totothrevamt == bModel.oData.results[3].sinput) {
							sap.m.MessageBox.show(that.getView().getModel("i18n")._oResourceBundle.getText("msg_alreadysave"), {
								icon: sap.m.MessageBox.Icon.ERROR,
								title: "{i18n>Error}"
							});
						} else {
							sap.ui.core.BusyIndicator.show(0);
							oData.Avgbcrevamt = bModel.oData.results[1].sinput.toString();
							oData.Totavgbcrevamt = bModel.oData.results[2].sinput.toString();
							oData.Totothrevamt = bModel.oData.results[3].sinput.toString();
							var dealMemoDetailModel = that.getView().getModel("dealMemoDetailModel");
							var dealMemoDetailInfo = dealMemoDetailModel.getData();
							var intDataModelUrl = "/sap/opu/odata/IBSCMS/DEALMEMO_SRV/";
							var oModelSav = new sap.ui.model.odata.ODataModel(intDataModelUrl, true, "", "");
							oModelSav.setHeaders({
								"Accept": "application/json"
							});
							oModelSav.setHeaders({
								"X-Requested-With": "X"
							});
							var pValue = "/DmafSet(Tentid='IBS',Dmno='" + oData.Dmno + "')";
							oModelSav.update(pValue, oData, null, function() {
									sap.ui.core.BusyIndicator.hide();
									if (oData.Avgbcrevamt !== "0") {
										dealMemoDetailModel.setProperty("/revenueTabColor", "Positive");
									} else {
										dealMemoDetailModel.setProperty("/revenueTabColor", "Critical");
									}
									dealMemoDetailModel.refresh(true);
									// this.getView().byId("idRev30").setIconColor("Positive");
									// this.BudgEnable();
									sap.m.MessageToast.show(that.getView().getModel("i18n")._oResourceBundle.getText("msg_revper30upd"));
								},
								function(oData) {
									sap.ui.core.BusyIndicator.hide();
									var errMsg = JSON.parse(oData.response.body);
									if (errMsg !== '') {
										var stext = errMsg.error.innererror.errordetails[0].message;
										sap.m.MessageBox.show(stext, {
											icon: sap.m.MessageBox.Icon.ERROR,
											title: "{i18n>Error}"
										});

									} else {
										sap.m.MessageBox.show(that.getView().getModel("i18n")._oResourceBundle.getText("msg_revper30updfail"), {
											icon: sap.m.MessageBox.Icon.ERROR,
											title: "{i18n>Error}"
										});
									}

								});
						}
					}
				}

				function eFailRev30(oData) {
					sap.ui.core.BusyIndicator.hide();
					//	alert("Update Revenue per 30 min failed");
					var errMsg = JSON.parse(oData.response.body);
					if (errMsg != '') {
						var stext = errMsg.error.innererror.errordetails[0].message;
						sap.m.MessageBox.show(stext, {
							icon: sap.m.MessageBox.Icon.ERROR,
							title: "{i18n>Error}"
						});

					}
				}

			},

			saveMarketingTab: function() {

				sap.ui.core.BusyIndicator.show(0);
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var dmNo = dealMemoDetailInfo.Dmno;
				var srvUrl = "/sap/opu/odata/IBSCMS/DEALMEMO_SRV/";
				var oModelSave = new sap.ui.model.odata.ODataModel(srvUrl, true, "", "");
				var state = this.getView().byId("marketTable").getItems()[0].getCells()[1].getValueState();
				var bModel = this.getView().byId("marketTable").getModel();
				if (bModel.oData.results[0].sinput !== "" && bModel.oData.results[0].sinput !== "0.00" && state == "None") {

					// var aModel = this.getView().byId("mLabel").getModel();
					var pValue = "/DmafSet(Tentid='IBS',Dmno='" + dmNo + "')";
					oModelSave.read(pValue, null, null, true, function(oData) {
						sap.ui.core.BusyIndicator.hide();
						var dealMemoDetailModel = that.getView().getModel("dealMemoDetailModel");
						var dealMemoDetailInfo = dealMemoDetailModel.getData();
						var dmNo = dealMemoDetailInfo.Dmno;
						//	alert(" get market");
						if (oData.Dmno == "") {
							sap.ui.core.BusyIndicator.show(0);
							var aModel = that.getView().byId("mLabel").getModel();
							var bModel = that.getView().byId("marketTable").getModel();
							oData.Tentid = "IBS";
							var dealMemoDetailModel = that.getView().getModel("dealMemoDetailModel");
							var dealMemoDetailInfo = dealMemoDetailModel.getData();
							var dmNo = dealMemoDetailInfo.Dmno;
							oData.Advoffairamt = bModel.oData.results[0].sinput;
							oData.Advoffairamt = oData.Advoffairamt.toString();
							//	var oModelSave = new sap.ui.model.odata.ODataModel(intDataModelUrl, true, "", "");
							oModelSave.setHeaders({
								"Accept": "application/json"
							});
							oModelSave.setHeaders({
								"X-Requested-With": "X"
							});
							var pValue = "/DmafSet";
							oModelSave.create(pValue, oData, null, function() {
									sap.ui.core.BusyIndicator.hide();
									// this.getView().byId("idMarketing").setIconColor("Positive");
									if (oData.Advoffairamt !== "0") {
										dealMemoDetailModel.setProperty("/marketTabColor", "Positive");
										dealMemoDetailModel.setProperty("/progTabColor", "Positive");
									} else {
										dealMemoDetailModel.setProperty("/marketTabColor", "Critical");
										dealMemoDetailModel.setProperty("/progTabColor", "Critical");
									}
									dealMemoDetailModel.refresh(true);
									sap.m.MessageToast.show(that.getView().getModel("i18n").getResourceBundle().getText("msg_maktbudsave"));
								},
								function(oData) {
									sap.ui.core.BusyIndicator.hide();
									var errMsg = JSON.parse(oData.response.body);
									if (errMsg !== '') {
										var stext = errMsg.error.innererror.errordetails[0].message;
										sap.m.MessageBox.show(stext, {
											icon: sap.m.MessageBox.Icon.ERROR,
											title: "{i18n>Error}"
										});

									} else {
										sap.ui.core.BusyIndicator.hide();
										sap.m.MessageBox.show(that.getView().getModel("i18n").getResourceBundle().getText("msg_maktbudsavefail"), {
											icon: sap.m.MessageBox.Icon.ERROR,
											title: "{i18n>Error}"
										});
									}

								});

						} else {
							sap.ui.core.BusyIndicator.show(0);
							var bModel = that.getView().byId("marketTable").getModel();
							if (oData.Advoffairamt == bModel.oData.results[0].sinput) {
								sap.m.MessageBox.show(that.getView().getModel("i18n").getResourceBundle().getText("msg_alreadysave"), {
									icon: sap.m.MessageBox.Icon.ERROR,
									title: "{i18n>Error}"
								});
								sap.ui.core.BusyIndicator.hide();
							} else {
								var valCheck = 0;
								if (oData.Advoffairamt == "0.00") {
									valCheck = 1;
								}

								oData.Advoffairamt = bModel.oData.results[0].sinput;
								oData.Advoffairamt = oData.Advoffairamt.toString();
								oModelSave.setHeaders({
									"Accept": "application/json"
								});
								oModelSave.setHeaders({
									"X-Requested-With": "X"
								});
								var pValue = "/DmafSet(Tentid='IBS',Dmno='" + oData.Dmno + "')";
								oModelSave.update(pValue, oData, null, function() {
										sap.ui.core.BusyIndicator.hide();
										// that.getView().byId("idMarketing").setIconColor("Positive");
										// this.BudgEnable();
										if (oData.Advoffairamt !== "0") {
											dealMemoDetailModel.setProperty("/marketTabColor", "Positive");
											dealMemoDetailModel.setProperty("/progTabColor", "Positive");
										} else {
											dealMemoDetailModel.setProperty("/marketTabColor", "Critical");
											dealMemoDetailModel.setProperty("/progTabColor", "Critical");
										}
										dealMemoDetailModel.refresh(true);
										sap.m.MessageToast.show(that.getView().getModel("i18n").getResourceBundle().getText("msg_maktbudsave"));
									},
									function(oData) {
										sap.ui.core.BusyIndicator.hide();
										var errMsg = JSON.parse(oData.response.body);
										if (errMsg !== '') {
											var stext = errMsg.error.innererror.errordetails[0].message;
											sap.m.MessageBox.show(stext, {
												icon: sap.m.MessageBox.Icon.ERROR,
												title: "{i18n>Error}"
											});
										} else {
											sap.ui.core.BusyIndicator.hide();
											sap.m.MessageBox.show(that.getView().getModel("i18n").getResourceBundle().getText("msg_maktbudsavefail"), {
												icon: sap.m.MessageBox.Icon.ERROR,
												title: "{i18n>Error}"
											});
										}
									});
							}
						}
					}, function() {
						sap.ui.core.BusyIndicator.hide();
					});
				} else {
					sap.ui.core.BusyIndicator.hide();
					if (state == "Error") {
						sap.m.MessageBox.show(that.getView().getModel("i18n").getResourceBundle().getText("msg_highlighterror"), {
							icon: sap.m.MessageBox.Icon.ERROR,
							title: "{i18n>Error}"
						});
					} else {
						sap.m.MessageBox.show(that.getView().getModel("i18n").getResourceBundle().getText("msg_filladvcost"), {
							icon: sap.m.MessageBox.Icon.ERROR,
							title: "{i18n>Error}"
						});
					}
				}

			},

			loadMarketingTab: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				sap.ui.core.BusyIndicator.show(0);
				var bModel = this.getView().byId("marketTable").getModel();
				var dmNo = dealMemoDetailInfo.Dmno
				var srvUrl = "/sap/opu/odata/IBSCMS/DEALMEMO_SRV/";
				var oModelSav = new sap.ui.model.odata.ODataModel(srvUrl, true, "", "");
				var pValue = "/DmafSet(Tentid='IBS',Dmno='" + dmNo + "')";
				oModelSav.read(pValue, null, null, true, function(oData) {
					sap.ui.core.BusyIndicator.hide();
					if (bModel.oData.results.length > 0) {
						if (oData.Advoffairamt !== "0.00") {
							dealMemoDetailModel.setProperty("/marketTabColor", "Positive");
							dealMemoDetailModel.setProperty("/progTabColor", "Positive");
						} else {
							dealMemoDetailModel.setProperty("/marketTabColor", "Critical");
							dealMemoDetailModel.setProperty("/progTabColor", "Critical");
						}

						bModel.oData.results[0].sinput = oData.Advoffairamt;
						bModel.oData.results[0].curr = dealMemoDetailInfo.Waers;
					}
					bModel.refresh();
					dealMemoDetailModel.refresh(true);
				}, function() {
					//	alert("fail");
					sap.ui.core.BusyIndicator.hide();
					if (bModel.oData.results.length > 0) {
						bModel.oData.results[0].sinput = dealMemoDetailInfo.Dmaf.Advoffairamt;
						bModel.oData.results[0].curr = dealMemoDetailInfo.Waers;
					}
					bModel.refresh();
				});
			},
			calcMarket: function(oEvent) {
				var val = oEvent.getSource().getValue();
				var bModel = this.getView().byId("marketTable").getModel();
				bModel.oData.results[0].sinput1 = val.toString();
				bModel.refresh();
				var pattern1 = /^[1-9]\d*((,\d{3}){1})(((,\d{3}){1})?(\.\d{0,2})?)$/; // values like 000,000,000.00
				var pattern2 = /^\d{1,9}(\.\d{1,2})?$/;
				if (val.match(pattern1) || val == "") {
					oEvent.getSource().setValueState("None");

				} else if (val.match(pattern2)) {
					oEvent.getSource().setValueState("None");
				} else {
					oEvent.getSource().setValueState("Error");
					oEvent.getSource().setValueStateText(this.getView().getModel("i18n").getResourceBundle().getText("msg_tooltipamount"));
				}
			},
			//ProgPL tab in dealmemo
			loadProgPL: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				sap.ui.core.BusyIndicator.show(0);
				var dmNo = dealMemoDetailInfo.Dmno
					// this.getView().byId("idPl").setIconColor("Positive");
					// this.getView().byId("btnSave").setEnabled(false);
				var intDataModelUrl = "/sap/opu/odata/IBSCMS/DEALMEMO_SRV/";
				var oModelSav = new sap.ui.model.odata.ODataModel(intDataModelUrl, true, "", "");
				var pValue = "/DmafSet(Tentid='IBS',Dmno='" + dmNo + "')"; //aModel.oData.Dmno
				oModelSav.read(pValue, null, null, true, function(oData) {
					sap.ui.core.BusyIndicator.hide();
					this.calcProgPL(oData)

				}.bind(this), function() {});
			},
			calcProgPL: function(oData) {
				sap.ui.core.BusyIndicator.show(0);
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				// var coreModel = sap.ui.getCore().getModel("modelForDm");
				var netbcrevag = +oData.Netbcrevaftagcom; //+oData.Avgbcrevamt;commented on 24-10-2019
				var slots = +oData.Noofslots;
				var advoffair = +oData.Advoffairamt;
				var totothrevamt = +oData.Totothrevamt;
				var Estavgrtng = +oData.Estavgrtng;
				var costamramt = +dealMemoDetailInfo.Amrtpercost; //CNTAMRTAMT

				if (dealMemoDetailInfo.Totdmamt != 0.000) {
					var totalDmcost = dealMemoDetailInfo.Totdmamt;
					var val3 = totalDmcost;
					val3 = val3.toString();
					val3 = Number(val3.replace(/[^0-9\.]+/g, ""));
					totalDmcost = val3;
				} else {
					var totalDmcost = dealMemoDetailInfo.Totdmamt;
					var val3 = totalDmcost;
					val3 = val3.toString();
					val3 = Number(val3.replace(/[^0-9\.]+/g, ""));
					totalDmcost = val3;
				}
				//Per 30 min
				var bModel = that.getView().byId("prog30Table").getModel();
				var netOthrev = +oData.Netothrev; //totothrevamt / slots;commented on 24-10-2019
				var amrContCost = +oData.Cntamrtamt; //totalDmcost / slots * costamramt; //totDmCost/slots*Amrtpercost ;commented on 24-10-2019
				var contbefoffair = +oData.Contribefoffairmakt; // (netbcrevag + netOthrev) - amrContCost; //CNTAMRTAMT  ;commented on 24-10-2019
				var lessmakt = +oData.Lessmaktamt; //advoffair / slots;commented on 24-10-2019
				var contaftoffair = +oData.Contriaftoffairmakt; //contbefoffair - lessmakt;commented on 24-10-2019
				var contper = +oData.Contriper; //(contaftoffair / netbcrevag) * 100;commented on 24-10-2019

				netbcrevag = netbcrevag.toFixed(2);
				netOthrev = netOthrev.toFixed(2);
				amrContCost = amrContCost.toFixed(2);
				contbefoffair = contbefoffair.toFixed(2);
				lessmakt = lessmakt.toFixed(2);
				contaftoffair = contaftoffair.toFixed(2);
				contper = contper.toFixed(2);

				bModel.oData.results[0].sinput1 = netbcrevag;
				bModel.oData.results[1].sinput1 = netOthrev;
				bModel.oData.results[2].sinput1 = amrContCost;
				bModel.oData.results[3].sinput1 = contbefoffair;
				bModel.oData.results[4].sinput1 = lessmakt;
				bModel.oData.results[5].sinput1 = contaftoffair;
				bModel.oData.results[6].sinput1 = contper;
				bModel.oData.results[0].curr = oData.Waers;
				bModel.oData.results[1].curr = bModel.oData.results[2].curr = bModel.oData.results[0].curr;
				bModel.oData.results[3].curr = bModel.oData.results[4].curr = bModel.oData.results[0].curr;
				bModel.oData.results[5].curr = bModel.oData.results[6].curr = bModel.oData.results[0].curr;
				/*---------------------------slot budgets for per 30 min----------------------------------------*/

				var slotbudavgbcrevamt = +oData.Bnetbcrevaftagcom;
				var slotbudnetothrev = +oData.Bnetothrev;
				var slotbudcontamrcost = +oData.Bcntamrtamt;
				var slotbudcontrbef = +oData.Bcontribefoffairmakt;
				var slotbudlessmakt = +oData.Blessmaktamt;
				var slotbudcontraft = +oData.Bcontriaftoffairmakt;
				var slotbudcontper = +oData.Bcontriper;
				//EOA: by Lakshmana on 16.06.2020

				slotbudavgbcrevamt = slotbudavgbcrevamt.toFixed(2);
				slotbudnetothrev = slotbudnetothrev.toFixed(2);
				slotbudcontamrcost = slotbudcontamrcost.toFixed(2);
				slotbudcontrbef = slotbudcontrbef.toFixed(2);
				slotbudlessmakt = slotbudlessmakt.toFixed(2);
				slotbudcontraft = slotbudcontraft.toFixed(2);
				slotbudcontper = slotbudcontper.toFixed(2);

				bModel.oData.results[0].sinput2 = slotbudavgbcrevamt;
				bModel.oData.results[1].sinput2 = slotbudnetothrev;
				//	bModel.oData.results[2].sinput2 = amrContCost //slotbudcontamrcost;				//Deleted by Lakshmana on 16.06.2020
				bModel.oData.results[2].sinput2 = slotbudcontamrcost; //Added by Lakshmana on 16.06.2020
				bModel.oData.results[3].sinput2 = slotbudcontrbef;
				bModel.oData.results[4].sinput2 = slotbudlessmakt;
				bModel.oData.results[5].sinput2 = slotbudcontraft;
				bModel.oData.results[6].sinput2 = slotbudcontper;

				bModel.refresh();

				//per TRP
				var cModel = that.getView().byId("progTRPTable").getModel();

				var lessmaktTrp = +oData.Trplessmaktamt; //(advoffair / slots) / Estavgrtng;//commented on 25-10-2019
				var contaftairmktTrp = +oData.Trpcontriaftoffairmakt; //contrbefoffairTrp - lessmaktTrp;//commented on 25-10-2019

				var netrevaftcomm = +oData.Trpnetbcrevaftcom; //Added by Lakshmana for P&L Table changes
				var amrcontcosttrp = +oData.Trpcntamrtamt; //Added by Lakshmana for P&L Table changes
				var contrbefoffairTrp = +oData.Trpcontribefoffairmakt; //Added by Lakshmana for P&L Table changes

				netrevaftcomm = netrevaftcomm.toFixed(2);
				amrcontcosttrp = amrcontcosttrp.toFixed(2);
				contrbefoffairTrp = contrbefoffairTrp.toFixed(2);
				lessmaktTrp = lessmaktTrp.toFixed(2);
				contaftairmktTrp = contaftairmktTrp.toFixed(2);

				cModel.oData.results[0].sinput1 = netrevaftcomm;
				cModel.oData.results[1].sinput1 = amrcontcosttrp;
				cModel.oData.results[2].sinput1 = contrbefoffairTrp;
				cModel.oData.results[3].sinput1 = lessmaktTrp;
				cModel.oData.results[4].sinput1 = contaftairmktTrp;

				/*---------------------------slot budgets for per 30 min----------------------------------------*/

				var slotnetrevaftcommTrp = +oData.Btrpnetbcrevaftcom;
				var slotbudcontcostTrp = +oData.Btrpcntamrtamt;
				var slotbudcontribefTrp = +oData.Btrpcontribefoffairmakt;
				var slotbudlessmaktTrp = +oData.Btrplessmaktamt;
				var slotbudcontraftTrp = +oData.Btrpcontriaftoffairmakt;
				//EOA: by Lakshmana on 16.06.2020

				slotnetrevaftcommTrp = slotnetrevaftcommTrp.toFixed(2);
				slotbudcontcostTrp = slotbudcontcostTrp.toFixed(2);
				slotbudcontribefTrp = slotbudcontribefTrp.toFixed(2);
				slotbudlessmaktTrp = slotbudlessmaktTrp.toFixed(2);
				slotbudcontraftTrp = slotbudcontraftTrp.toFixed(2);

				cModel.oData.results[0].sinput2 = slotnetrevaftcommTrp;

				cModel.oData.results[1].sinput2 = slotbudcontcostTrp; //Added by Lakshmana on 16.06.2020
				cModel.oData.results[2].sinput2 = slotbudcontribefTrp;
				cModel.oData.results[3].sinput2 = slotbudlessmaktTrp;
				cModel.oData.results[4].sinput2 = slotbudcontraftTrp;
				cModel.oData.results[0].curr = oData.Waers;
				cModel.oData.results[1].curr = cModel.oData.results[2].curr = cModel.oData.results[0].curr;
				cModel.oData.results[3].curr = cModel.oData.results[4].curr = cModel.oData.results[0].curr;
				cModel.refresh();
				sap.ui.core.BusyIndicator.hide();
			},
			// 	// Comment Tab
			loadComment: function() {
				that.getView().byId("commentInner").setSelectedKey("synopsis");
				this.getComment();
				this.getDataForComm();
			},
			getComment: function() {
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var aflag = 0;
				this.assignConcept(aflag);
				this.assignSynopsis(aflag);
				this.getTabList();
			},
			getDataForComm: function() {
				sap.ui.core.BusyIndicator.show(0);
				var dealMemoDetailModel = that.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var Dmno = dealMemoDetailInfo.Dmno;
				var Dmver = dealMemoDetailInfo.Dmver;
				var intDataModelUrl = "/sap/opu/odata/IBSCMS/DEALMEMO_SRV/";
				var oModelSav = new sap.ui.model.odata.ODataModel(intDataModelUrl, true, "", "");
				var pValue1 = "/DmHeaderSet(Tentid='IBS',Dmno='" + Dmno + "',Dmver='" + Dmver + "',Transtp='D')?&$expand=DmtxtSet";

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
			getTabList: function() {

				//******************************** condition for adding inner tabs in comments tab**********************	
				var dealMemoDetailModel = that.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				status = dealMemoDetailInfo.Dmst;
				var TabFlag = that.getView().byId("lblCommentStatus").getText();
				if (TabFlag === "0") { //if tabs doesn't exist
					that.setTabList();

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
				}
				//if (TabFlag === "0")
			},
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
						sap.m.MessageToast.show(that.getView().getModel("i18n").getResourceBundle().getText("msg_commsave"));

					},
					function() {
						sap.ui.core.BusyIndicator.hide();
						sap.m.MessageBox.show(that.getView().getModel("i18n").getResourceBundle().getText("msg_commcreatefail"), {
							icon: sap.m.MessageBox.Icon.ERROR,
							title: "{i18n>Error}"
						});
					});

			},
			onFeedPost: function(that) {
				var Key = this.getView().byId("commentInner").getSelectedKey();
				this.saveComments(Key, that);
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
			//*****************************************Function For adding inner tabs**********************************
			setTabList: function() {
				sap.ui.core.BusyIndicator.show(0);
				var dealMemoDetailModel = that.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var Dmno = dealMemoDetailInfo.Dmno;
				var Dmver = dealMemoDetailInfo.Dmver;
				var intDataModelUrl = "/sap/opu/odata/IBSCMS/DEALMEMO_SRV/";
				var oModelSav = new sap.ui.model.odata.ODataModel(intDataModelUrl, true, "", "");
				var pValue = "/RsmpSet?$filter=Tentid eq'IBS' and  Dmno eq '" + Dmno + "' and Dmver eq '" + Dmver + "' and Uname eq ''";
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
											that.onFeedPost();
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
							if (tkey == "INIT") {
								item.mProperties.text = "Comments";
							}
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
					that.assignConcept(that, aflag);
					that.assignSynopsis(that, aflag);
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
			saveComments: function(Key) {

				if (Key === 'synopsis') {
					var kValue = "";
					var valS = that.getView().byId("synopsisTxt").getValue();
					if (valS !== "") {
						kValue = "SYNOPSIS";
						that.saveCommData(that, valS);
						that.appendTxt(that, kValue);
						that.assignSynopsis(that);
						that.getView().byId("synopsisTxt").setValue("");
					}
					var valC = that.getView().byId("conceptTxt").getValue();
					if (valC !== "") {
						kValue = "CONCEPT";
						that.saveCommData(that, valC);
						that.appendTxt(that, kValue);
						that.assignConcept(that);
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
						that.saveCommData(that, val);
						that.appendTxt(that, Key);
						sap.ui.getCore().byId(Inpid).setValue("");
						//	that.setComments(that,Key);
					}
				}
				that.setComments(that, Key);

			},
			oncommentInnerSelect: function(oEvent) {

				var Key = this.getView().byId("commentInner").getSelectedKey();
				this.setComments(that, Key);

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
			assignConcept: function(aflag) {
				sap.ui.core.BusyIndicator.show(0);
				var dealMemoDetailModel = that.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var Dmno = dealMemoDetailInfo.Dmno;
				var Dmver = dealMemoDetailInfo.Dmver;
				var intDataModelUrl = "/sap/opu/odata/IBSCMS/DEALMEMO_SRV/";
				var oModelSav = new sap.ui.model.odata.ODataModel(intDataModelUrl, true, "", "");
				var pValue1 = "/DmtxtSet?$filter=Tentid eq'IBS' and  Dmno eq '" + Dmno + "' and Dmver eq '" + Dmver +
					"' and Txtsuffix eq 'CONCEPT'";
				oModelSav.read(pValue1, null, null, true, conceptSucc, conceptFail);

				function conceptSucc(oData) {
					sap.ui.core.BusyIndicator.hide();

					if (oData.results.length) {
						dealMemoDetailModel.setProperty("/commentTabColor", "Positive");
					} else {
						dealMemoDetailModel.setProperty("/commentTabColor", "Critical");
					}
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
							that.getView().byId("btnSaveDM").setEnabled(false);
						} else {
							that.getView().byId("btnSaveDM").setEnabled(true);
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
			assignSynopsis: function(aflag) {
				sap.ui.core.BusyIndicator.show(0);
				var dealMemoDetailModel = that.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var Dmno = dealMemoDetailInfo.Dmno;
				var Dmver = dealMemoDetailInfo.Dmver;
				var intDataModelUrl = "/sap/opu/odata/IBSCMS/DEALMEMO_SRV/";
				var oModelSav = new sap.ui.model.odata.ODataModel(intDataModelUrl, true, "", "");
				var pValue1 = "/DmtxtSet?$filter=Tentid eq'IBS' and  Dmno eq '" + Dmno + "' and Dmver eq '" + Dmver +
					"' and Txtsuffix eq 'SYNOPSIS'";
				oModelSav.read(pValue1, null, null, true, synopsisSucc, synopsisFail);

				function synopsisSucc(oData) {
					sap.ui.core.BusyIndicator.hide();
					if (oData.results.length) {
						dealMemoDetailModel.setProperty("/commentTabColor", "Positive");
					} else {
						dealMemoDetailModel.setProperty("/commentTabColor", "Critical");
					}
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
							that.getView().byId("btnSaveDM").setEnabled(false);
						} else {
							that.getView().byId("btnSaveDM").setEnabled(true);
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
					that.assignConcept(that, aflag);
					that.assignSynopsis(that, aflag);
				} else {
					var id = key + "comment"; //id of Comment List 
					var idL = key + "customl"; //id of CustomListItem
					// var DealM = that.getDealMNo();

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
					var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
					var dealMemoDetailInfo = dealMemoDetailModel.getData();
					var Dmno = dealMemoDetailInfo.Dmno;
					var Dmver = dealMemoDetailInfo.Dmver;
					//sModel.loadData("json/comments.json", "", false);
					sap.ui.getCore().getControl(id).setModel(sModel);
					sap.ui.getCore().getControl(id).addStyleClass("sapUiMediumMarginTop , sapUiTinyMarginBottom");
					sap.ui.getCore().getControl(idL).addStyleClass("sapUiSmallMarginTop , sapUiSmallMarginBottom");
					sap.ui.core.BusyIndicator.show(0);
					// service to fetch comments of particular tab
					var intDataModelUrl = "/sap/opu/odata/IBSCMS/DEALMEMO_SRV/";
					var oModelSav = new sap.ui.model.odata.ODataModel(intDataModelUrl, true, "", "");
					var pValue = "/DmtxtSet?$filter=Tentid eq'IBS' and  Dmno eq '" + Dmno + "' and Dmver eq '" + Dmver + "' and Txtsuffix eq '" +
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
								var content = that.splitHeader(header[count]); // function to get date and name
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
			oneditSynopsis: function(oEvent) {
				var id = oEvent.getSource().getId();
				var aflag = 1;
				id = id.split("--");
				if (id[2] == "conceptBtn") {
					that.assignConcept(aflag);
					//	sap.ui.controller('DealMemo.controller.Custom1').assignSynopsis(that,aflag);
				} else if (id[2] == "synopsisBtn") {
					that.assignSynopsis(aflag);
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
			/************** Vendor Contract Code ********************/
			toVendorContractCreate: function() {
				var oRouter = this.getOwnerComponent().getRouter();
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				oRouter.navTo("VendorContract", {
					"Dmno": dealMemoDetailInfo.Dmno,
					"Dmver": dealMemoDetailInfo.Dmver,
					"Contno": "new",
					"Contver": "new"
				});
			},
			toVendorContractDisplay: function(oEvent) {
				var oRouter = this.getOwnerComponent().getRouter();
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var oContractItem = oEvent.getParameters()['listItem'].getBindingContext("dealMemoDetailModel").getObject();
				oRouter.navTo("VendorContract", {
					"Dmno": dealMemoDetailInfo.Dmno,
					"Dmver": dealMemoDetailInfo.Dmver,
					"Contno": oContractItem.Contno,
					"Contver": oContractItem.Contver
				});
			},

			/************** Vendor Contract Code *******************/

			/*********** Artist Contract *******************/

			toArtistContract: function(oEvent) {
				var oRouter = this.getOwnerComponent().getRouter();
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				var oContractItem = oEvent.getParameters()['listItem'].getBindingContext("dealMemoDetailModel").getObject();
				oRouter.navTo("ArtistContract", {
					"Dmno": dealMemoDetailInfo.Dmno,
					"Dmver": dealMemoDetailInfo.Dmver,
					"Contno": oContractItem.Contno,
					"Contver": oContractItem.Contver
				});
			},
			toArtistContractCreate: function() {
				var oRouter = this.getOwnerComponent().getRouter();
				var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
				var dealMemoDetailInfo = dealMemoDetailModel.getData();
				oRouter.navTo("ArtistContract", {
					"Dmno": dealMemoDetailInfo.Dmno,
					"Dmver": dealMemoDetailInfo.Dmver,
					"Contno": "new",
					"Contver": "new"
				});
			}

		});
	});