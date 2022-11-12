//     var displayDefaultMeasurements = [
//         {"key": "Vol", "title": "Voltage", "checked": true},
//         {"key": "Cur", "title": "Corrent", "checked": true},
//         {"key": "Pwr", "title": "Power", "checked": true},
//         {"key": "Cap", "title": "Capacity", "checked": false},
//         {"key": "Ene", "title": "Energy", "checked": true},
//         {"key": "DMinPlus", "title": "Data lines voltage", "checked": false},
//         {"key": "Price", "title": "Price per kWh", "checked": false},
//         {"key": "Cost", "title": "Cost", "checked": false},
//         {"key": "Freq", "title": "Frequency", "checked": false},
//         {"key": "PowFact", "title": "Power Factor", "checked": false},
//         {"key": "Temp", "title": "Temperature", "checked": false},
//         {"key": "Time", "title": "Time", "checked": true}
//     ]
    
//     let arr1 = [
//     { id: "abdc4051", date: "2017-01-24" },
//     { id: "abdc4052", date: "2017-01-22" }
// ];

// let arr2 = [
//     { id: "abdc4051", name: "ab" },
//     { id: "abdc4052", name: "abc" }
// ];

// const mergeById = (a1, a2) =>
//     a1.map(itm => ({
//         ...a2.find((item) => (item.id === itm.id) && item),
//         ...itm
//     }));

// console.log(mergeById(arr1, arr2));


class pageSettingsModel extends ModelBase {
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
        
        this.elementsToReset = []
    }
    
    createPage = () => {
        this.apb = MUI.CreateAppBar("Settings", "arrow_back", "autorenew");
        this.apb.SetOnMenuTouch( ()=>{ OnBack() })
        this.apb.SetOnControlTouch(
            (text, index)=>{
                if(index == 0){
                    var dlg = MUI.CreateDialog("Reset settings to defaults?", "", "OKay", "Cancel operation")
                    dlg.SetOnTouch(
                        (isOkay, isError) => {
                            if(isOkay){
                                this.controller.resetSettings()
                            }
                        }
                    )
                    dlg.Show()
                }
            }
        )
        

        var scr = app.CreateScroller(1, 1, "FillXY,NoScrollBar,ScrollFade")
    
        var contentLay = app.CreateLayout("Linear", "VCenter")
        contentLay.SetSize(1, -1)
        contentLay.SetPadding(0, this.apb.GetHeight(), 0, 0)
        contentLay.SetChildMargins(0, 0.02, 0, 0.02)
        
        
        // simulate hardware settings
        contentLay.AddChild( this.settingsRowItem(
            // this.SimulateHardware,
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
        this.ChartDurationList.forEach(e=>{vals.push(e[0])})
        contentLay.AddChild(this.settingsRowItem(
            // this.ShowChart,
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
                "preset": this.controller.getConfigValueIfExists("ChartDurationIndex") !== undefined ? this.ChartDurationList[this.controller.getConfigValueIfExists("ChartDurationIndex")][0] : undefined, 
                "cb": (value, index)=>{
                    this.controller.notifySettingsChange("ChartDurationIndex", index)
                },
                "key": "ChartDurationIndex"
            }
        ))
        
        
        // energy units: kWh or Wh
        contentLay.AddChild(this.settingsRowItem(
            // this.Units,
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
        contentLay.AddChild(this.settingsRowItem(
            "[fa-list-ol]",
            "Order and visibility",
            "Select the measurement elements that you would like to see in main page and hide irrelevant",
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
                var spn = app.AddSpinner(texts, "", "", "", "FillX,Bold" );
                spn.SetTextSize(18)
                if(spinner.cb) spn.SetOnChange(I(function(v,i){ spinner.cb(v,i) }) )
                spn.SetList(spinner.list)
                spn.SetText( spinner.preset ? spinner.preset : spinner.list.split(",")[spinner.default] )
                if(spinner.key) this.controller.setDefault(spinner.key, spinner.default)
                // element.Spinner = spn
                this.elementsToReset.push( ()=>{spn.SetText(spinner.list.split(",")[spinner.default])})
            }
            
            if(buttons){
                var btnItems = app.AddLayout(texts, "Linear", "Left,Horizontal,FillX")
                buttons.forEach((button, index) => {
                    var btn = app.AddButton(btnItems, button.name )
                    if(button.cb) btn.SetOnTouch( I(function(v){ button.cb() }) )
                    // element.Button[index] = btn
                })
            }
            
        if(toggle){
            var tgl = app.CreateCheckBox("")
            tgl.SetScale(2, 2)
            tgl.SetChecked(toggle.preset ? toggle.preset : toggle.default)
            if(toggle.cb) tgl.SetOnTouch( I(function(v){ toggle.cb(v) }) )
            tgl.SetPadding(0, 0.01)
            if(toggle.key) this.controller.setDefault(toggle.key, toggle.default)
            rowItem.AddChild( tgl )
            this.elementsToReset.push( ()=>{tgl.SetChecked(toggle.default)})
        }
        else
            app.AddText(rowItem, "", 0.1)       // empty space
        
        return rowItem
    }
    
    setDefaults = () => {
        this.elementsToReset.forEach(el=>{el()})

    }

}

class pageSettingsController extends ControllerBase {
    constructor(model, view) {
        super(model, view)
        
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
        return this.view.ChartDurationList[this.getSettingsValue("ChartDurationIndex")][1]
    }
    
    resetSettings = () => {
        // this.model.config = {}
        // this.model._saveSettingsFile()
        this.view.setDefaults()
        // OnBack()
        
    }
    
    buildOrderAndVisibilityWindow = () => {
        app.Alert("Settings1")
    }
}

