sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device",
    "sap/ui/core/IconColor"
    
], 
    /**
     * provide app-view type models (as in the first "V" in MVVC)
     * 
     * @param {typeof sap.ui.model.json.JSONModel} JSONModel
     * @param {typeof sap.ui.Device} Device
     * 
     * @returns {Function} createDeviceModel() for providing runtime info for the device the UI5 app is running on
     */
    function (JSONModel, Device, IconColor) {
        "use strict";

        return {
           formatDealMemoStatus:function(oVal){
        	   if (oVal == "01") {
					return "Warning";
				}
				if (oVal == "02") {
					return "Warning";
				}
				if (oVal == "03") {
					return "Error";
				}
				if (oVal == "04") {
					return "Success";
				}
				if (oVal == "05") {
					return "Warning";
				}
           },
           formatDateVal:function(oVal){
        	   
        	   var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                   pattern: "dd-MM-YYYY"
               });

               return dateFormat.format(new Date(oVal));
               
           },
		   formatDateTime: function(oVal) {
			var dateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
				pattern : "dd-MM-yyyy" 
			})
			dateFormat.format(oVal);
		   },
           formateDate:function(oVal){
        	   var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                   pattern: "dd-MM-yyyy"
               });

               return dateFormat.format(oVal);
           },
           formatDateValForBackend:function(oVal){
        	 
        	   var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                   pattern: "yyyy-MM-dd"
               });

        	   oVal = dateFormat.format(new Date(oVal));
        	   if(oVal){
        		   var tdDt = new Date();
	   				var h = tdDt.getUTCHours();
	   				var min = tdDt.getUTCMinutes() + 1;
	   				var sec = tdDt.getUTCSeconds() + 1;
	   				var outDate = oVal + "T" + h + ":" + min + ":" + sec;
	   				return outDate;
        	   }	
        	  
           },
           formatTimeDuration:function(oVal){
        	   if(oVal){
	        	   var timeFormat = sap.ui.core.format.DateFormat.getTimeInstance({
	        			pattern: "HH:mm:ss"
	        		});
	        		var TZOffsetMs = new Date(0).getTimezoneOffset() * 60 * 1000;
	        		return timeFormat.format(new Date(oVal.ms + TZOffsetMs));
        	   }
           },
           formatTimeDurationDt:function(oVal){
        	   if(oVal){
	        	   var timeFormat = sap.ui.core.format.DateFormat.getTimeInstance({
	        			pattern: "HH:mm:ss"
	        		});
	        		var TZOffsetMs = new Date(0).getTimezoneOffset() * 60 * 1000;
	        		return (new Date(oVal.ms + TZOffsetMs));
        	   }
           },
           formatTimeValForBackend:function(oVal){
        	   if(oVal){
        		   var spliitedVal = oVal.split(":");
        		   return  'PT' + spliitedVal[0] + 'H' + spliitedVal[1] + 'M' + spliitedVal[2] + 'S';
        	   }
        	   
           },
           formatIconTabColor:function(oVal){
        	   if(oVal && oVal !== null && oVal !== undefined){
        		   return "Positive";
        	   }
        	   return  "Neutral";
           },
           enableChannelPerc:function(secChanl){
        	   if(secChanl !== ""){
        		   return true;
        	   }
        	   else{
        		   var dealMemoDetailModel = this.getView().getModel("dealMemoDetailModel");
        		   var dealMemoDetailInfo = dealMemoDetailModel.getData();
        		   dealMemoDetailInfo.SecondPerc = "0.00";
        		   dealMemoDetailInfo.OwnchnlPerc = "100.00";
        		   dealMemoDetailModel.refresh(true);
        		   return false;
        	   }
        	   
           },
           formatEditableStatus:function(Dmst){
        	   if(Dmst === "01" || Dmst === undefined || Dmst === "" || Dmst === null ){
        		   return true;
        	   }
        	   else{
        		   return false;
        	   }
           },
            formatEditableContStatus:function(Contstat){
        	   if(Contstat === "01" || Contstat === undefined || Contstat === "" || Contstat === null || Contstat === "03" ) {
        		   return true;
        	   }
        	   else{
        		   return false;
        	   }
           },
           formatLabelContentBased:function(lblName,ContType){
        	   //var oSourceBundle = this.getView().getModel("i18n").getResourceBundle();
        	   var oSourceBundle = sap.ui.component(sap.ui.core.Component.getOwnerIdFor(this.getView())).getModel('i18n').getResourceBundle();
        	   return oSourceBundle.getText(lblName + ContType);
        	  
           }
          
           
    };
});