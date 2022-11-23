class pageSettingsModel extends ModelBase {
/*
    Availablle settings:
    Bool:   SimulateHardware
    Bool:   ShowChart
    Int:    ChartDurationIndex
    Bool:   Use-kWh
    Array:  Measurements
    
    
*/
    constructor() {
        super()
        this.config = {}
        this.defaults = {}
        
        try{
            var path = app.GetPrivateFolder( "configs" )
            var fileContents = app.ReadFile( path+"/settings.json" );
            this.config = JSON.parse(fileContents);
        }
        catch (e) {
            var msg = "Error reading settings file or file is corrupted.\nDefault settings will be used";
            app.Alert(msg)
            this.config = {}
            this._saveSettingsFile()
        }
        
        this.ChartDurationList = [
            ["1 minute",    1*60], 
            ["5 minutes",   5*60],
            ["10 Minutes",  10*60],
            ["30 minutes",  30*60],
            ["1 hour",      1*60*60],
            ["2 hours",     2*60*60],
            ["6 hours",     6*60*60],
            ["12 hours",    12*60*60],
            ["24 hours",    24*60*60]
        ]
        
        this.defaultMeasurements = [
            {"key": "Vol",      "checked": true,    "title": "Voltage"},
            {"key": "Cur",      "checked": true,    "title": "Current"},
            {"key": "Pwr",      "checked": true,    "title": "Power"},
            {"key": "Cap",      "checked": false,   "title": "Capacity"},
            {"key": "Ene",      "checked": true,    "title": "Energy"},
            {"key": "DMinPlus", "checked": false,   "title": "Data lines voltage"},
            {"key": "Price",    "checked": false,   "title": "Price per kWh"},
            {"key": "Cost",     "checked": false,   "title": "Cost"},
            {"key": "Freq",     "checked": false,   "title": "Frequency"},
            {"key": "PowFact",  "checked": false,   "title": "Power Factor"},
            {"key": "Temp",     "checked": false,   "title": "Temperature"},
            {"key": "Time",     "checked": true,    "title": "Time"}
        ]
        
        if(this.config.Measurements){
            const mergeById = (a1, a2) =>
                a1.map(itm => ({
                    ...a2.find((item) => (item.key === itm.key) && item),
                    ...itm
                }));
            
            this.config.Measurements = mergeById(this.config.Measurements, this.defaultMeasurements)
            this.config.Measurements.sort((a,b) => (a.index > b.index) ? 1 : ((b.index > a.index) ? -1 : 0))
            // console.log("merge", this.config.Measurements);
        }
        else{
            this.config.Measurements = this.defaultMeasurements
        }
    }
    
    _saveSettingsFile = () =>{
        var path = app.GetPrivateFolder( "configs" )
        app.WriteFile(path+"/settings.json", JSON.stringify(this.config))
        app.ShowPopup("Data saved");
    }
    
    handleSettingsChange = (k, v) => {
        this.config[k] = v
        this._saveSettingsFile()
    }
    
    handleDefaults = (k, v) => {
        console.log("handleDefaults", k, v)
        this.defaults[k] = v
    }
    
    getSettingsValue = (k) => {
        return (typeof this.config[k] !== "undefined") ? this.config[k] : this.defaults[k]
    }

}

class pageSettingsView  extends ViewBase {
    constructor(){
        super()
        this.elementsToReset = []
    }
    
    createPage = () => {
        this.apb = MUI.CreateAppBar("Settings", "arrow_back", "autorenew");
        this.apb.SetOnMenuTouch( ()=>{ OnBack() })
        this.apb.SetOnControlTouch( (text, index)=>{
            if(index == 0){
                var dlg = MUI.CreateDialog("Reset settings to defaults?", "", "OKay", "Cancel operation")
                dlg.SetOnTouch( (isOkay, isError)=>{
                    if(isOkay){
                        this.controller.resetSettings()
                    }
                })
                dlg.Show()
            }
        })
        

        var scr = app.CreateScroller(1, 1, "FillXY,NoScrollBar,ScrollFade")
    
        var contentLay = app.CreateLayout("Linear", "VCenter")
        contentLay.SetSize(1, -1)
        contentLay.SetPadding(0, this.apb.GetHeight(), 0, 0)
        contentLay.SetChildMargins(0, 0.02, 0, 0.02)
        
        
        // simulate hardware settings
        contentLay.AddChild( this.settingsRowItem(
            "[fa-microchip]",
            "Simulate harwdare",
            "If you dont have required hardware but still want to check application, you can use in-app hardware simulator. Still you have to \"connect\"",
            {
                "default": false,
                "preset": this.controller.getConfigValueIfExists("SimulateHardware"), 
                "cb": (value)=>{ 
                    this.controller.notifySettingsChange("SimulateHardware", value)
                },
                "key": "SimulateHardware"
            }
        ))
        
        
        // chart display and other settings
        var vals=[]
        this.controller.ChartDurationList.forEach(e=>{vals.push(e[0])})
        contentLay.AddChild(this.settingsRowItem(
            "[fa-line-chart]",
            "Show chart",
            "Show line chart on main screen for historical data, while you are connected to device. Choose how much data you wish to see. NOTE: historical data is not saved on device",
            {
                "default": true,
                "preset": this.controller.getConfigValueIfExists("ShowChart"), 
                "cb": (value)=>{ this.controller.notifySettingsChange("ShowChart", value) },
                "key": "ShowChart"
            },
            {
                "list": vals.join(","),
                "default": 0,
                "preset": this.controller.getConfigValueIfExists("ChartDurationIndex") !== undefined ? this.controller.ChartDurationList[this.controller.getConfigValueIfExists("ChartDurationIndex")][0] : undefined, 
                "cb": (value, index)=>{
                    this.controller.notifySettingsChange("ChartDurationIndex", index)
                },
                "key": "ChartDurationIndex"
            }
        ))
        
        
        // energy units: kWh or Wh
        contentLay.AddChild(this.settingsRowItem(
            "[fa-balance-scale]",
            "??Higher measurement units",
            "Energy units: use kilo-Watt-hours insted of watt-hours, and amper-hours instead on mili-amper-hours if checked",
            {
                "default": false,
                "preset": this.controller.getConfigValueIfExists("Use-kWh"), 
                "cb": (value)=>{ this.controller.notifySettingsChange("Use-kWh", value) },
                "key": "Use-kWh"
            }
        ))
        
        // elements ordder and visibility
        this.controller.setDefault("Measurements", this.controller.defaultMeasurements)
        contentLay.AddChild(this.settingsRowItem(
            "[fa-list-ol]",
            "Order and visibility",
            "Select the order of elements that you would like to see and hide irrelevant",
            false,
            false,
            [
                {"name": "Button 1", "cb": ()=>{
                    this.controller.buildOrderAndVisibilityWindow()
                }}
            ]
        ))
        
    
        scr.AddChild(contentLay)

        this.pageLay = app.CreateLayout("Absolute", "FillXY")
        this.pageLay.Hide()
        this.pageLay.AddChild(scr)
        this.pageLay.AddChild(this.apb)
            
        app.AddLayout(this.pageLay)
    }
    
    settingsRowItem = (faIcon=false, titleText, bodyText=false, toggle=false, spinner=false, buttons=false) => {
        /*
                    object, that will be used to access inside components
                    "Icon: [fa-microchip]",
                    "Title: Simulate harware",
                    "Comment: If you dont have required hardware but still want to check application, you can use in-app hardware simulator",
                    {"default": false, "preset": false, "cb": (i)=>{app.Alert("Toggle: "+i)} },
                    {"list": "Bilbo,Frodo,Gandalf", "default": "Frodo", "preset": "Gandalf", "cb": (i)=>{app.Alert("Spinner: "+i)} },
                    [
                        {"name": "Button 1", "cb": ()=>{app.Alert("Settings1")} },
                        {"name": "Button 2", "cb": ()=>{app.Alert("Settings2")} },
                        {"name": "Button 3", "cb": ()=>{app.Alert("Settings3")} },
                        {"name": "Button 4", "cb": ()=>{app.Alert("Settings4")} }
                    ]
        */
        
        var rowItem = app.CreateLayout("Linear", "Horizontal,FillX")

            var ico = app.AddText(rowItem, faIcon, 0.1, -1, "FontAwesome")
            ico.SetTextSize(28)
            ico.SetPadding(0, 0.01, 0, 0.01)

        var texts = app.AddLayout(rowItem, "Linear", -1, -1, "Vertical,FillX")
        texts.SetSize(0.8)

            var title = app.AddText(texts, titleText, "", "", "Left,Bold,FillX")
            title.SetEllipsize( "end" );
            title.SetTextSize(22)
            if(bodyText){
                var body = app.AddText(texts, bodyText, "", "", "Multiline,Left")
                body.SetTextSize(13)
            }

            if(spinner){
                var spn = app.AddSpinner(texts, "", "", "", "FillX,Bold");
                spn.SetTextSize(18)
                if (spinner.cb) spn.SetOnChange(
                    I(function(v, i) {
                        spinner.cb(v, i)
                }))
                spn.SetList(spinner.list)
                spn.SetText(spinner.preset ? spinner.preset : spinner.list.split(",")[spinner.default])
                if (spinner.key) this.controller.setDefault(spinner.key, spinner.default)
                // add to reset sequence
                this.elementsToReset.push(
                    () => {
                        spn.SetText(spinner.list.split(",")[spinner.default])
                        this.controller.notifySettingsChange(spinner.key, spinner.default)
                })
            }
            
            if(buttons){
                var btnItems = app.AddLayout(texts, "Linear", "Left,Horizontal,FillX")
                buttons.forEach((button, index) => {
                    var btn = app.AddButton(btnItems, button.name )
                    if(button.cb) btn.SetOnTouch( I(function(v){ button.cb() }) )
                })
            }
            
            if(toggle){
                var tgl = app.CreateCheckBox("")
                tgl.SetScale(2, 2)
                tgl.SetChecked(toggle.preset ? toggle.preset : toggle.default)
                if(toggle.cb) tgl.SetOnTouch(
                    I(function(v) { 
                        toggle.cb(v)
                }))
                tgl.SetPadding(0, 0.01)
                if(toggle.key) this.controller.setDefault(toggle.key, toggle.default)
                rowItem.AddChild( tgl )
                // add to reset sequence
                this.elementsToReset.push( ()=>{
                    tgl.SetChecked(toggle.default)
                    this.controller.notifySettingsChange(toggle.key, toggle.default)
                })
            }
            else
                app.AddText(rowItem, "", 0.1)       // empty space
        
        return rowItem
    }
    
}

class pageSettingsController extends ControllerBase {
    constructor(model, view) {
        super(model, view)
        // attributes
        this.view.controller.ChartDurationList = this.model.ChartDurationList
        this.view.controller.config = this.model.config
        
        // functions
        this.view.controller.notifySettingsChange = this._notifySettingsChange
        this.view.controller.setDefault = this.model.handleDefaults
        this.view.controller.resetSettings = this.resetSettings
        this.view.controller.getSettingsValue = this.getSettingsValue
        this.view.controller.getConfigValueIfExists = this.getConfigValueIfExists
        this.view.controller.buildOrderAndVisibilityWindow = this.buildOrderAndVisibilityWindow

        this.view.createPage()
    }
    
    _notifySettingsChange = (key, value) =>{
        console.log("Settings saved", key, value)
        this.model.handleSettingsChange(key, value)
        event.emit("Settings_"+key+"_Changed", value, true)
    }

    getSettingsValue = (k) =>{
        return this.model.getSettingsValue(k)
    }
    
    getConfigValueIfExists = (key) =>{
        return typeof this.model.config[key] !== "undefined" ? this.getSettingsValue(key) : undefined
    }
    
    getChartDuration = () => {
        return this.model.ChartDurationList[this.getSettingsValue("ChartDurationIndex")][1]
    }
    
    resetSettings = () => {
        this.view.elementsToReset.forEach(el=>{el()})
        this.model.config = {}
        this.model._saveSettingsFile()
        
        this.model.config.Measurements = this.model.defaultMeasurements
        // OnBack()
    }
    
    buildOrderAndVisibilityWindow = () => {
        var webZoom = 2.4
        var modal = UI.CreateModal("Modal title", "", "PROCEED", "CANCEL", false)
        //Add custom controls to your modal
        var modalLay = modal.GetLayout()
        
        //Create a web control.
	    var webView = app.CreateWebView( 0.8, 0.2, "AutoZoom", webZoom*100 )
	    
	    var html = app.ReadFile(app.GetAppPath() +'/Html/sort.html') 
        webView.LoadHtml(html);
        webView.SetOnProgress((percent)=>{
            if(percent ==  100){
                webView.Execute("buildmenu("+JSON.stringify(this.getConfigValueIfExists("Measurements"))+")")
                webView.Execute("getContentSize()", ulElementHeight => {
                    webView.SetSize(
                        720,
                        Math.min((ulElementHeight+15)*webZoom, app.GetDisplayHeight()*0.8),
                        "px")
                })
            }
        })
    	modalLay.AddChild( webView )
    	modal.SetOnTouch((isOk, btnText)=>{
            if(isOk){
                webView.Execute("getSortedList()", value => {
                    this._notifySettingsChange("Measurements", value)
                })
            }
    	})
    	modal.Show()
    }
}

