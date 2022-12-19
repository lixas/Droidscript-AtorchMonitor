app.LoadPlugin( "BluetoothLE" );

class pageMainModel extends ModelBase {
    constructor() {
        super()
        this.BufferUart=""      // temporary buffer for UART data
        this.deviceType = ""    // device ttype according to UART data
        
        // event.on("ChartDurationIndex_Changed", ()=>{
        //     var value = pageSettings.getChartDuration()
        //     app.Alert("Show Chart Duration Index Changed. Value is "+value, "Event")
        // })
        
        this.sim = {}
        this.sim.Active = false
        this.sim.Voltage = 5
        this.sim.Current = 2
        this.sim.Power = 0
        this.sim.Capacity = 0
        this.sim.Energy = 0
        this.sim.Temp = 23
        this.sim.TempChange = 0.1
        this.sim.Time = 0
        this.meterHistory = new FixedLenArray(pageSettings.getChartDuration())
        // this.meterHistory = new FixedLenArray(60)
        
        this.ble = app.CreateBluetoothLE();
        this.ble.state = false
        this.ble.SetOnSelect( (name, adr) => {
            this._OnBleSelect(name, adr)
        })
        this.ble.SetOnConnect( () => {
            this._OnBleConnected()
        })
        this.ble.SetUartIds(
            "0000FFE0-0000-1000-8000-00805F9B34FB",  //Svc
            "0000FFE2-0000-1000-8000-00805F9B34FB",  //Tx
            "0000FFE1-0000-1000-8000-00805F9B34FB"   //Rx
        )
        this.ble.SetUartMode( "Hex" );
        this.ble.SetOnUartReceive( this._OnBleUartReceive );
        
        //if settings chart time has changed
        event.on("Settings_ChartDurationIndex_Changed", ()=>{
            this.meterHistory.resize(pageSettings.getChartDuration())
        })
        
    }
    
    //ble after select connect to device
    _OnBleSelect = (name, address) => {
        this.ble.Connect( address, "UART" );
    };
    
    //after connected to ble device
    _OnBleConnected = ()=> {
        app.ShowPopup( "Connected!" )
        this.ble.state = true
    }
    
    //of UART receive- glue to string and pass for processing
    _OnBleUartReceive = (data) => {
        if (data == 'FF' && this.BufferUart.length >=36*2 ) {

            if( this.deviceType != this.BufferUart.substring(6, 8)){
                app.Alert("DeviceTypeChanged")
                this.deviceType = this.BufferUart.substring(6, 8)
                event.emit("DeviceTypeChanged", this.deviceType)
            }
            
            switch(this.BufferUart.substring(4, 6)){
                case '01':  //Data
                    var parsed = this._ParseUartData(this.BufferUart, this.deviceType)
                    this.addItemToChartHistory(parsed)
                    this.controller.displayDataOnScreen(parsed)
                    break;
                case '11':  //Command
                    app.Alert("command");
                    break;
                case '02':  //Acknowledgement
                    app.Alert("ack");
                    break;
            }
            this.BufferUart = data;
        }
        else
            this.BufferUart += data
    };
    
    // send UART command to device
    sendUart = (data) => {
        if(this.ble.state){
            this.ble.SendUart( data )
            return true
        }
        else return "NotConnected"
    };
    
    // parse uarsd string, different for USB and Mains type devices
    _ParseUartData = (bfr, deviceType="03") => {
        var meter = [];
        meter.Time      = []
        if(deviceType == "03") {        // usb tester
            meter.Vol       = parseInt(bfr.substring( 8, 14), 16)/100
            meter.Cur       = parseInt(bfr.substring(14, 20), 16)/100
            meter.Pwr       = (meter.Vol * meter.Cur).toFixed(3)
            meter.Cap       = parseInt(bfr.substring(20, 26), 16)
            meter.Ene       = parseInt(bfr.substring(26, 34), 16)/100
            meter.DMin      = parseInt(bfr.substring(34, 38), 16)/100
            meter.DPlus     = parseInt(bfr.substring(38, 42), 16)/100
            meter.Price     = null
            meter.Cost      = null
            meter.Freq      = null
            meter.PowFact   = null
            meter.Temp      = parseInt(bfr.substring(44, 46), 16)
            meter.Time.h    = parseInt(bfr.substring(48, 50), 16)
            meter.Time.m    = parseInt(bfr.substring(50, 52), 16)
            meter.Time.s    = parseInt(bfr.substring(52, 54), 16)
        }
        if(deviceType == "01") {        // mains power
            meter.Vol       = parseInt(bfr.substring( 8, 14), 16)/10
            meter.Cur       = parseInt(bfr.substring(14, 20), 16)/1000
            meter.Pwr       = parseInt(bfr.substring(20, 26), 16)/10
            meter.Cap       = null
            meter.Ene       = parseInt(bfr.substring(26, 34), 16)/100
            meter.DMin      = null
            meter.DPlus     = null
            meter.Price     = parseInt(bfr.substring(34, 40), 16)/100
            meter.Cost      = (meter.Price * meter.Ene).toFixed(3)
            meter.Freq      = parseInt(bfr.substring(40, 44), 16)/10
            meter.PowFact   = parseInt(bfr.substring(44, 48), 16)/1000
            meter.Temp      = parseInt(bfr.substring(50, 52), 16)
            meter.Time.h    = parseInt(bfr.substring(52, 56), 16)
            meter.Time.m    = parseInt(bfr.substring(56, 58), 16)
            meter.Time.s    = parseInt(bfr.substring(58, 60), 16)
        }
        return meter
    };
    
    //stop simulation
    StopSimulator = () =>{
        this.sim.Active = false
    }
    
    //start simulation
    StartSimulator = () => {
        this.sim.TimeStarted = Date.now()
        this.sim.Active = true
        this._Simulate()
    }
    
    // simulate values
    _Simulate = () => {
        var StepStarted = performance.now()
        function decimalToHex(d, padding) {
            var hex = Number(d).toString(16);
            padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;
            while (hex.length < padding) {
                hex = "0" + hex;
            }
            return hex.toUpperCase();
        }
        // Voltage
        this.sim.Voltage = (Math.floor(Math.random() * (600 - 400 + 1)) + 400)/100;

        // Current
        this.sim.Current = (Math.floor(Math.random() * (220 - 180 + 1)) + 180)/100;
        
        // Power
        this.sim.Power = this.sim.Voltage * this.sim.Current
        
        // Capacity
        this.sim.Capacity += this.sim.Current*1000/3600
        
        // Energy
        this.sim.Energy += ( this.sim.Power / 36 )
        
        // time hour
        var s = Date.now() - this.sim.TimeStarted
        
        var hour = new Date(s).toISOString().substr(11, 2);
        var minute = new Date(s).toISOString().substr(14, 2);
        var secod = new Date(s).toISOString().substr(17, 2);
        
        var UART = ["FF", "55",  "01", "03",
            ...decimalToHex(parseInt(this.sim.Voltage*100), 6).match(/.{1,2}/g),    // voltage
            ...decimalToHex(parseInt(this.sim.Current*100), 6).match(/.{1,2}/g),    // current
            ...decimalToHex(parseInt(this.sim.Capacity), 6).match(/.{1,2}/g),       // capacity
            ...decimalToHex(parseInt(this.sim.Energy), 8).match(/.{1,2}/g),         // energy
            ...decimalToHex(parseInt(0), 14).match(/.{1,2}/g),                      // d- d+ and space
            
            ...decimalToHex(parseInt(hour), 2).match(/.{1,2}/g),            // time
            ...decimalToHex(parseInt(minute), 2).match(/.{1,2}/g),          // time
            ...decimalToHex(parseInt(secod), 2).match(/.{1,2}/g),           // time
            
        ]

        var parsed = this._ParseUartData(UART.join(""), "03")
        this.addItemToChartHistory(parsed)
        this.controller.displayDataOnScreen(parsed)
        
        if(this.sim.Active)
            setTimeout(this._Simulate, 1000 - (performance.now() - StepStarted))
        else    // clean history
            this.meterHistory.clean()
    }
    
    addItemToChartHistory = (data)=> {
        var time = new Date()
        this.meterHistory.addItem([time, data.Vol, data.Cur])
    }
    
    getHistoricalData = () => {
        return this.meterHistory.data
    }
}

class pageMainView extends ViewBase {
    constructor(){
        super()
        this.ItemInMeasurementsLay = []   // have named array to access element later if reorder needed
    }
    
    pageCreate = () => {
        
        
        var apb = MUI.CreateAppBar("Atorch power monitor", "menu", "power");
        apb.SetOnMenuTouch( ()=>{
            app.OpenDrawer( "left" )
        })
        apb.SetOnControlTouch( (text, index)=>{
            this.onControlTouch(text, index)
        })

        var scr = app.CreateScroller(1, 1, "FillXY,NoScrollBar,ScrollFade")
    
            var contentLay = app.CreateLayout("Linear", "VCenter")
            contentLay.SetSize(1, -1)
            contentLay.SetPadding(0, apb.GetHeight(), 0, 0)
                
            this.meterChart = this.ChartCreate()
            contentLay.AddChild( this.meterChart )
            
            var MeasurementsLay = app.CreateLayout("Linear", "VCenter")
            contentLay.AddChild(MeasurementsLay)

            // draw measurements in order predefined in configuration
            pageSettings.getSettingsValue("Measurements").forEach((el)=>{

                //Voltage
                if(el.key == "Vol"){
                    var layVoltage = app.CreateLayout( "Linear", "Left,Horizontal,FillXY" )
                    if (!el.checked) layVoltage.Gone()
                    layVoltage.SetPadding(0.02)
                    layVoltage.AddChild( MUI.CreateTextH3("Voltage", 0.4, -1 ) )
                    this.meterValueVoltage = MUI.CreateTextH2( "", 0.3, -1 );
                    layVoltage.AddChild( this.meterValueVoltage )
                    layVoltage.AddChild( MUI.CreateTextH3( "V", -1, -1 ) )
                    MeasurementsLay.AddChild(layVoltage)
                    this.ItemInMeasurementsLay["Vol"] = layVoltage
                    return
                }

                //Current
                if (el.key == "Cur"){
                    var layCurrent = app.CreateLayout( "Linear", "Left,Horizontal,FillXY" )
                    if(!el.checked) layCurrent.Gone()
                    layCurrent.SetPadding(0.02)
                    layCurrent.AddChild( MUI.CreateTextH3("Current", 0.4, -1 ) )
                    this.meterValueCurrent = MUI.CreateTextH2( "", 0.3, -1 )
                    layCurrent.AddChild( this.meterValueCurrent )
                    layCurrent.AddChild( MUI.CreateTextH3( "A", -1, -1 ) )
                    MeasurementsLay.AddChild(layCurrent)
                    this.ItemInMeasurementsLay["Cur"] = layCurrent
                    return
                }

                //Power
                if (el.key == "Pwr"){
                    var layPower = app.CreateLayout( "Linear", "Left,Horizontal,FillXY" )
                    if(!el.checked) layPower.Gone()
                    layPower.SetPadding(0.02)
                    layPower.AddChild( MUI.CreateTextH3("Power", 0.4, -1 ) )
                    this.meterValuePower = MUI.CreateTextH2( "", 0.3, -1 )
                    layPower.AddChild( this.meterValuePower )
                    layPower.AddChild( MUI.CreateTextH3( "W", -1, -1 ) )
                    MeasurementsLay.AddChild(layPower)
                    this.ItemInMeasurementsLay["Pwr"] = layPower
                    return
                }

                //Capacity
                if (el.key == "Cap"){
                    var layCapacity = app.CreateLayout( "Linear", "Left,Horizontal,FillXY" )
                    if(!el.checked) layCapacity.Gone()
                    layCapacity.SetPadding(0.02);
                    layCapacity.AddChild( MUI.CreateTextH3("Capacity", 0.4, -1 ) )
                    this.meterValueCapacity = MUI.CreateTextH2( "", 0.3, -1 )
                    layCapacity.AddChild( this.meterValueCapacity );
    
                    var capacityUnits = MUI.CreateTextH3( pageSettings.getSettingsValue("Use-kWh") ? "Ah" : "mAh", 0.2, -1 )
                    // var capacityUnits = MUI.CreateTextH3( false ? "Ah" : "mAh", 0.2, -1 )
                    event.on("Settings_Use-kWh_Changed", ()=>{
                        capacityUnits.SetText( pageSettings.getSettingsValue("Use-kWh") ? "Ah" : "mAh" )
                        // capacityUnits.SetText( false ? "Ah" : "mAh" )
                    })
                    layCapacity.AddChild( capacityUnits )
                    
                    var rst = app.CreateText( "[fa-repeat]", -1, -1, "FontAwesome" )
                    rst.SetTextSize(15)
                    rst.SetMargins(0, 0.02)
                    rst.SetOnTouchUp(()=>{
                        this.controller.SendUartCommand("resetCapacity")
                    })
                    event.on("DeviceTypeChanged", (devType)=>{
                        app.Alert(devType);
                        (devType=="03") ? rst.Show() : rst.Hide()
                    })
                    rst.Hide()
                    layCapacity.AddChild( rst )
                    MeasurementsLay.AddChild(layCapacity)
                    this.ItemInMeasurementsLay["Cap"] = layCapacity
                    return
                }
                
                //Energy
                if (el.key == "Ene"){
                    var layEnergy = app.CreateLayout( "Linear", "Left,Horizontal,FillXY" )
                    if(!el.checked) layEnergy.Gone()
                    layEnergy.SetPadding(0.02)
                    layEnergy.AddChild( MUI.CreateTextH3("Energy", 0.4, -1 ) )
                    this.meterValueEnergy = MUI.CreateTextH2( "", 0.3, -1 )
                    layEnergy.AddChild( this.meterValueEnergy )
                    
                    var energyUnits = MUI.CreateTextH3( pageSettings.getSettingsValue("Use-kWh") ? "kWh" : "Wh", 0.2, -1 )
                    // var energyUnits = MUI.CreateTextH3( false ? "kWh" : "Wh", 0.2, -1 )
                    event.on("Settings_Use-kWh_Changed", ()=>{
                        energyUnits.SetText( pageSettings.getSettingsValue("Use-kWh") ? "kWh" : "Wh" )
                        // energyUnits.SetText( false ? "kWh" : "Wh" )
                    })
                    layEnergy.AddChild( energyUnits )
                    
                    var rst = app.CreateText( "[fa-repeat]", -1, -1, "FontAwesome" )
                    rst.SetTextSize(15)
                    rst.SetMargins(0, 0.02)
                    rst.SetOnTouchUp(()=>{
                        this.controller.SendUartCommand("resetEnergy")
                    })
                    layEnergy.AddChild( rst )
                    MeasurementsLay.AddChild(layEnergy)
                    this.ItemInMeasurementsLay["Ene"] = layEnergy
                    return
                }
                
                //Data lines Voltage
                if (el.key == "DMinPlus"){
                    var layDVoltage = app.CreateLayout( "Linear", "Left,Horizontal,FillXY" )
                    if(!el.checked) layDVoltage.Gone()
                    layDVoltage.SetPadding(0.02)
                    layDVoltage.AddChild( MUI.CreateTextH3("Data lines volt.", 0.4, -1 ) )
                    this.meterValueDVoltage = MUI.CreateTextH2( "", 0.3, -1 )
                    layDVoltage.AddChild( this.meterValueDVoltage )
                    layDVoltage.AddChild( MUI.CreateTextH3( "V", -1, -1 ) )
                    MeasurementsLay.AddChild(layDVoltage)
                    this.ItemInMeasurementsLay["DMinPlus"] = layDVoltage
                    return
                }
                
                //Price
                if (el.key == "Price"){
                    var layPrice = app.CreateLayout( "Linear", "Left,Horizontal,FillXY" )
                    if(!el.checked) layPrice.Gone()
                    layPrice.SetPadding(0.02)
                    layPrice.AddChild( MUI.CreateTextH3("Price", 0.4, -1 ) )
                    this.meterValuePrice = MUI.CreateTextH2( "", 0.3, -1 )
                    layPrice.AddChild( this.meterValuePrice )
                    layPrice.AddChild( MUI.CreateTextH3( "¤/kWh", -1, -1 ) )
                    MeasurementsLay.AddChild(layPrice)
                    this.ItemInMeasurementsLay["Price"] = layPrice
                    return
                }
                
                //Cost
                if (el.key == "Cost"){
                    var layCost = app.CreateLayout( "Linear", "Left,Horizontal,FillXY" )
                    if(!el.checked) layCost.Gone()
                    layCost.SetPadding(0.02)
                    layCost.AddChild( MUI.CreateTextH3("Cost", 0.4, -1 ) )
                    this.meterValueCost = MUI.CreateTextH2( "", 0.3, -1 )
                    layCost.AddChild( this.meterValueCost )
                    layCost.AddChild( MUI.CreateTextH3( "¤", -1, -1 ) )
                    MeasurementsLay.AddChild(layCost)
                    this.ItemInMeasurementsLay["Cost"] = layCost
                    return
                }
                
                //Frequency
                if (el.key == "Freq"){
                    var layFreq = app.CreateLayout( "Linear", "Left,Horizontal,FillXY" )
                    if(!el.checked) layFreq.Gone()
                    layFreq.SetPadding(0.02)
                    layFreq.AddChild( MUI.CreateTextH3("Frequency", 0.4, -1 ) )
                    this.meterValueFreq = MUI.CreateTextH2( "", 0.3, -1 )
                    layFreq.AddChild( this.meterValueFreq )
                    layFreq.AddChild( MUI.CreateTextH3( "Hz", -1, -1 ) )
                    MeasurementsLay.AddChild(layFreq)
                    this.ItemInMeasurementsLay["Freq"] = layFreq
                    return
                }
                
                //PowerFactor
                if (el.key == "PowFact"){
                    var layPowFact = app.CreateLayout( "Linear", "Left,Horizontal,FillXY" )
                    if(!el.checked) layPowFact.Gone()
                    layPowFact.SetPadding(0.02)
                    layPowFact.AddChild( MUI.CreateTextH3("Power Factor", 0.4, -1 ) )
                    this.meterValuePowFact = MUI.CreateTextH2( "", 0.3, -1 )
                    layPowFact.AddChild( this.meterValuePowFact )
                    layPowFact.AddChild( MUI.CreateTextH3( "", -1, -1 ) )
                    MeasurementsLay.AddChild(layPowFact)
                    this.ItemInMeasurementsLay["PowFact"] = layPowFact
                    return
                }
                
                //Temperature
                if (el.key == "Temp"){
                    var layTemp = app.CreateLayout( "Linear", "Left,Horizontal,FillXY" )
                    if(!el.checked) layTemp.Gone()
                    layTemp.SetPadding(0.02)
                    layTemp.AddChild( MUI.CreateTextH3("Temperature", 0.4, -1 ) )
                    this.meterValueTemperature = MUI.CreateTextH2( "", 0.3, -1 )
                    layTemp.AddChild( this.meterValueTemperature )
                    layTemp.AddChild( MUI.CreateTextH3( "°C/°F", -1, -1 ) )
                    MeasurementsLay.AddChild(layTemp)
                    this.ItemInMeasurementsLay["Temp"] = layTemp
                    return
                }
                
                //Time
                if (el.key == "Time"){
                    var layTime = app.CreateLayout( "Linear", "Left,Horizontal,FillXY" )
                    if(!el.checked) layTime.Gone()
                    layTime.SetPadding(0.02)
                    layTime.AddChild( MUI.CreateTextH3("Time", 0.4, -1 ) )
                    this.meterValueTime = MUI.CreateTextH2( "", 0.5, -1 )
                    layTime.AddChild( this.meterValueTime )
                    var rst = app.CreateText( "[fa-repeat]", -1, -1, "FontAwesome" )
                    rst.SetTextSize(15)
                    rst.SetMargins(0, 0.02)
                    rst.SetOnTouchUp(()=>{
                        this.controller.SendUartCommand("resetTime")
                    })
                    layTime.AddChild( rst )
                    MeasurementsLay.AddChild(layTime)
                    this.ItemInMeasurementsLay["Time"] = layTime
                    return
                }
            }) // foreach
            
            event.on("Settings_Measurements_Changed", () => {
                //make array copy and reverse to insert items into front of layout
                pageSettings.getSettingsValue("Measurements").slice().reverse().forEach((el)=>{
                    MeasurementsLay.RemoveChild( this.ItemInMeasurementsLay[el.key] )
                    
                    el.checked ? this.ItemInMeasurementsLay[el.key].Show() : this.ItemInMeasurementsLay[el.key].Gone()
                    MeasurementsLay.AddChild(this.ItemInMeasurementsLay[el.key], 0)
                })
                
            })

            
            //Buttons
            var layButtons = app.CreateLayout( "Linear", "Horizontal,FillXY,VCenter" )
            layButtons.SetPadding(0, 0.02)
            var devBtnSetup = MUI.CreateButtonElegant("[fa-android] Setup")
                devBtnSetup.SetOnTouch( ()=>{
                    this.controller.SendUartCommand("btnSetup")
                })
                layButtons.AddChild( devBtnSetup )
            
            var devBtnMinus = MUI.CreateButtonElegant("[fa-minus]")
                devBtnMinus.SetOnTouch( ()=>{
                    this.controller.SendUartCommand("btnMinus")
                })
                layButtons.AddChild( devBtnMinus )
            
            var devBtnPlus = MUI.CreateButtonElegant("[fa-plus]")
                devBtnPlus.SetOnTouch( ()=>{
                    this.controller.SendUartCommand("btnPlus")
                })
                layButtons.AddChild( devBtnPlus )
                
            var devBtnEnter = MUI.CreateButtonElegant("[fa-android] Enter")
                devBtnEnter.SetOnTouch( ()=>{
                    this.controller.SendUartCommand("btnEnter")
                })
                layButtons.AddChild( devBtnEnter )
            
            var devInfotext = app.CreateText("[fa-info]", -1, -1, "FontAwesome")
            devInfotext.SetTextSize(15)
            devInfotext.SetPadding(0.1)
            devInfotext.SetOnTouchUp( ()=>{
                var text = "Using these buttons you can control device. You must have visual with the device to see what you are doing."
                app.Alert(text, "Information")
            });
            layButtons.AddChild( devInfotext )
            contentLay.AddChild(layButtons)
                
            scr.AddChild(contentLay)
    
            this.pageLay = app.CreateLayout("Absolute", "FillXY")
            this.pageLay.AddChild(scr)
            this.pageLay.AddChild(apb)
            
        // lay.AddChild()
        app.AddLayout(this.pageLay)

        this.DrawerCreate()
    }
    
    ChartCreate = () => {
        var chart = app.LoadChartJS()
        var chartData = {
            labels: [],
            datasets: [
                {
                    label: 'Voltage',
                    yAxisID: 'A',
                    // backgroundColor: "#5E35B1",
                    borderColor: "#5E35B1",
                    data: [],
                    // borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.5
                },
                {
                    label: 'Current',
                    yAxisID: 'B',
                    borderColor: "#FFA500",
                    data: [],
                    pointRadius: 0,
                    fill: false,
                    tension: 0.5
                },
            ]
        }
        
        var chartConfig = {
            animation: {
                duration : 0
            },
            scales: {
                yAxes: [{
                    id: 'A',
                    type: 'linear',
                    position: 'left',
                    ticks: {
                        min: 0
                    },
                    scaleLabel: {
                        display: true,
                        labelString: "Voltage"
                    }
                }, {
                    id: 'B',
                    type: 'linear',
                    position: 'right',
                    ticks: {
                        min: 0
                    },
                    scaleLabel: {
                        display: true,
                        labelString: "Current"
                    }
                }]
            }
        }
        
        
        var mlineChart = chart.CreateChart(chartData, 'line', 0.98, 0.4, chartConfig)
        // app.Alert(dump2(mlineChart))
        mlineChart.SetBackColor('#424242')
        mlineChart.SetBackColor('White')
        pageSettings.getSettingsValue("ShowChart") ? mlineChart.Show() : mlineChart.Gone()
        // true ? mlineChart.Show() : mlineChart.Gone()
        event.on("Settings_ShowChart_Changed", ()=>{
            pageSettings.getSettingsValue("ShowChart") ? mlineChart.Show() : mlineChart.Gone()
            // true ? mlineChart.Show() : mlineChart.Gone()
            
        })
        
        
        
        return mlineChart
    }
    
    ChartUpdate = () =>{
        if(pageSettings.getSettingsValue("ShowChart")){
        
            this.meterChart.data.labels = []
            this.meterChart.data.datasets[0].data = []
            this.meterChart.data.datasets[1].data = []
    
            
            this.controller.getHistoricalData().forEach((itm)=>{
                var d = new Date(itm[0])
                this.meterChart.data.labels.push(addZero(d.getHours())+":"+addZero(d.getMinutes())+":"+addZero(d.getSeconds()))
                this.meterChart.data.datasets[0].data.push(itm[1])
                this.meterChart.data.datasets[1].data.push(itm[2])
            })
    
            this.meterChart.update()
        }
    }
    
    DrawerCreate = () => {
        var drawerWidth = 0.5;
        //Create a layout for the drawer.
        //(Here we also put it inside a scroller to allow for long menus)
        var drawerScroll = app.CreateScroller( drawerWidth, -1, "FillY" )
        drawerScroll.SetBackColor( "Black" )
        var layDrawer = app.CreateLayout( "Linear", "Left" )
        drawerScroll.AddChild( layDrawer )
        
        //Create layout for top of drawer.
        var layDrawerTop = app.CreateLayout( "Absolute" )
        layDrawerTop.SetBackground( "Img/GreenBack.jpg" )
        layDrawerTop.SetSize( drawerWidth, 0.23 )
        layDrawer.AddChild( layDrawerTop )
        
        //Add an icon to top layout.
        var img = app.CreateImage( "Img/logo.png", drawerWidth*0.8 )
        img.SetPosition( drawerWidth*0.06, 0.03 )
        layDrawerTop.AddChild( img )
        
        //Add user name to top layout.
        var txtUser = app.CreateText( "Ignas Bukys", -1, -1, "Bold")
        txtUser.SetPosition( drawerWidth*0.07, 0.155 )
        txtUser.SetTextColor( "White" )
        txtUser.SetTextSize( 13.7, "dip" )
        layDrawerTop.AddChild( txtUser )
        
        //Add website to top layout.
        var txtAddress = app.CreateText( "http://www.bukys.eu")
        txtAddress.SetPosition( drawerWidth*0.07, 0.185 )
        txtAddress.SetTextColor( "#bbffffff" )
        txtAddress.SetTextSize( 14, "dip" )
        txtAddress.SetOnTouchUp(() => {
            app.OpenUrl("http://www.bukys.eu")
        })
        layDrawerTop.AddChild( txtAddress )
        
        //Create menu layout.
        var layMenu = app.CreateLayout( "Linear", "Left" )
        layDrawer.AddChild( layMenu )
    	
        //Add a list to menu layout (with the menu style option).
        var listItems = "Connect / Disconect::[fa-plug],Settings::[fa-cog],About::[fa-question-circle]";
        var lstMenu1 = app.CreateList( listItems, drawerWidth, -1, "Expand,Menu" )
        lstMenu1.SetColumnWidths( -1, 0.35, 0.18 )
        lstMenu1.SetTextSize( 16, "dip" )
        lstMenu1.SetTextColor("White")
        //lstMenu1.SelectItemByIndex( 0, true )
        //lstMenu1.SetItemByIndex( 0, "Meter", 21 )
        lstMenu1.SetOnTouch( this.DrawerMenu1Touch )
        layMenu.AddChild( lstMenu1 )
        
        //Add seperator to menu layout.
        var sep = app.CreateImage( null, drawerWidth, 0.001, "fix", 2, 2 )
        sep.SetSize( -1, 1, "px" )
        sep.SetColor( "White" )
        layMenu.AddChild( sep )
        
        //Add title between menus.
        // var txtTitle = app.CreateText( "Additional",-1,-1,"Left")
        // txtTitle.SetTextColor( "White" )
        // txtTitle.SetMargins( 16,12,0,0, "dip" )
        // txtTitle.SetTextSize( 14, "dip" )
        // layMenu.AddChild( txtTitle )
    	
        //Add a second list to menu layout.
        var listItems = "About Me::[fa-id-card-o],Website::[fa-external-link]";
        var lstMenu2 = app.CreateList( listItems, drawerWidth, -1, "Menu,Expand" )
        lstMenu2.SetColumnWidths( -1, 0.35, 0.18 )
        lstMenu2.SetTextColor("White")
        lstMenu2.SetOnTouch( this.DrawerMenu2Touch )
        layMenu.AddChild( lstMenu2 )
        
        app.AddDrawer( drawerScroll, "left", drawerWidth )
        
        event.on("UpdateIsAvailable", (updateJSON)=>{
            if(updateJSON != false){
                var txtTitle = app.CreateText( "Update is available...",-1,-1,"Left")
                txtTitle.SetTextColor( "White" )
                txtTitle.SetMargins( 16,12,0,0, "dip" )
                txtTitle.SetTextSize( 20, "dip" )
                txtTitle.SetOnTouchUp(()=>{
                    var dlg = MUI.CreateDialog("Update is available. Version: "+updateJSON.version, updateJSON.changelog, "Procced", "Calcel", true)
                    dlg.SetOnTouch((okBtn)=>{
                        if(okBtn)
                            this.controller.downloadAndInstall(UpdaterRootURL + updateJSON.url)
                    })
                    dlg.Show()
                })
                layMenu.AddChild( txtTitle )
            }
        })
        this.controller.isUpdateAvailable()
        
    }
    
    // iškelt į kontrollerį
    //Handle menu item selection.
    DrawerMenu1Touch = ( title, body, type, index ) => {
        switch(index){
            case 0:    //connect to device
                this.onControlTouch("", 0)
                break;
            case 1:    //settings page
                if (typeof pageSettings === 'undefined'){
                    app.Alert("pageSettings NOT defined")
                    app.LoadScript("pageSettings.js", ()=>{
                        var pageSettings = new pageSettingsController(new pageSettingsModel(), new pageSettingsView())
                        SwitchPage(pageSettings)
                    })
                }
                else{
                    SwitchPage(pageSettings)
                }

                break;
            case 2:    //About page
                if (typeof pageAbout === 'undefined'){
                    app.LoadScript("pageAbout.js", ()=>{
                        var pageAbout = new pageAboutController(new pageAboutModel(), new pageAboutView())
                        SwitchPage(pageAbout)
                    })
                } 
                else {
                    SwitchPage(pageAbout)
                }
                break;
            default:
                app.ShowPopup( title )
        }
        //Close the drawer.
        app.CloseDrawer( "left" )
        
    }
    
    //iš
    DrawerMenu2Touch = ( title, body, type, index ) => {
        //Close the drawer.
        app.CloseDrawer( "left" )
        switch(index){
            case 0:    //About me
                app.OpenUrl( "http://bukys.eu/me/start" );
                break;
            case 1:    // Website
                app.OpenUrl( "http://bukys.eu" );
                break;
            default:
                app.ShowPopup( title )
        
        }
    }
    
    onControlTouch = (text, index) => {
        if (index == 0) {
            if(pageSettings.getSettingsValue("SimulateHardware") || this.controller.getSimulatorState()){
                this.controller.toggleSimulator()
            }
            else
                this.controller.ShowBleDevices()
        }
    }

}

class pageMainController extends ControllerBase {
    constructor(model, view) {
        super(model, view)
        
        this.model.controller.displayDataOnScreen = this.updateDataOnScreen
        
        this.view.controller.ShowBleDevices = this.onShowBleDevices
        this.view.controller.SendUartCommand = this.onSendCommand
        this.view.controller.toggleSimulator = this.toggleSimulator
        this.view.controller.getSimulatorState = this.getSimulatorState
        this.view.controller.getHistoricalData = this.model.getHistoricalData
        this.view.controller.isUpdateAvailable = this.isUpdateAvailable
        this.view.controller.downloadAndInstall = this.downloadAndInstall
        

        this.view.pageCreate()
    };
    
    onShowBleDevices = () => {
        this.model.ble.Select();
        // this.model.ble.Connect( "22:02:14:13:53:A9", "UART" );
    };
    
    updateDataOnScreen = (mtr) => {
        app.SetDebug(false)
        try { this.view.meterValueVoltage.SetText(mtr.Vol) } catch { /*pass*/ }
        try { this.view.meterValueCurrent.SetText(mtr.Cur) } catch { /*pass*/ }
        try { this.view.meterValuePower.SetText(mtr.Pwr) } catch { /*pass*/ }
        try { this.view.meterValueCapacity.SetText(pageSettings.getSettingsValue("Use-kWh") ? (mtr.Cap/1000 || 0).toFixed(3) : mtr.Cap || "") } catch { /*pass*/ }
        try { this.view.meterValueEnergy.SetText( pageSettings.getSettingsValue("Use-kWh") ? (mtr.Ene/1000 || 0).toFixed(3) : mtr.Ene) } catch { /*pass*/ }
        try { this.view.meterValueDVoltage.SetText(`${mtr.DMin || ""} / ${mtr.DPlus || ""}` || "") } catch { /*pass*/ }
        try { this.view.meterValuePrice.SetText(mtr.Price || "") } catch { /*pass*/ }
        try { this.view.meterValueCost.SetText(mtr.Cost || "") } catch { /*pass*/ }
        try { this.view.meterValueFreq.SetText(mtr.Freq || "") } catch { /*pass*/ }
        try { this.view.meterValuePowFact.SetText(mtr.PowFact || "") } catch { /*pass*/ }
        try { this.view.meterValueTemperature.SetText(`${mtr.Temp} / ${(mtr.Temp*9/5+32).toFixed(0)}`) } catch { /*pass*/ }
        try { this.view.meterValueTime.SetText(`${addZero(mtr.Time.h)}:${addZero(mtr.Time.m)}:${addZero(mtr.Time.s)}`) } catch { /*pass*/ }

        app.SetDebug("console")
        
        this.view.ChartUpdate()
        
    
    };
    
    onSendCommand = (cmd) => {
        var hex
        switch(cmd){
            // top bar menu choices
            case "resetCapacity":  // capacity
                if(this.getSimulatorState()){
                    this.model.sim.Capacity = 0
                    return
                }
                hex = "FF,55,11,03,02,00,00,00,00,52"
                break

            case "resetEnergy": // energy
                if(this.getSimulatorState()){
                    this.model.sim.Energy = 0
                    return
                }
                hex = "FF,55,11,03,01,00,00,00,00,51"
                break

            case "resetTime": // Time
                if(this.getSimulatorState()){
                    this.model.sim.TimeStarted = Date.now()
                    return
                }
                hex = "FF,55,11,03,03,00,00,00,00,53"
                break

            case "resetAll": // All (does not work)
                hex = "FF,55,11,03,05,00,00,00,00,5D"
                break

            // buttons on main screen
            case "btnSetup":
                hex = "FF,55,11,03,31,00,00,00,00,01"
                break

            case "btnMinus":
                hex = "FF,55,11,03,34,00,00,00,00,0C"
                break

            case "btnPlus":
                hex = "FF,55,11,03,33,00,00,00,00,03"
                break

            case "btnEnter":
                hex = "FF,55,11,03,32,00,00,00,00,02"
                break
        }
        if(!hex)
            return app.Alert("Incorrect command", "Error")
        var response = this.model.sendUart(hex)
        if (response !== true)
            app.Alert(response, "Error")
    };

    toggleSimulator = () => {
        if(!this.model.sim.Active) {
            app.ShowPopup( "Hardware simulation started" )
            this.model.StartSimulator()
        }
        else {
            this.model.StopSimulator()
        }
    };

    getSimulatorState = () => {
        return this.model.sim.Active
    };
    
    isUpdateAvailable = () => {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", UpdaterRootURL+"update.json", true);
        xhr.ontimeout = () => {
            console.error("The request for update timed out.");
        };
        xhr.onload = e => {
            if (xhr.status == 200){
                // dont fail if JSON arse fails
                try { JSON.parse(xhr.responseText) } catch { return }
                if( parseFloat(JSON.parse(xhr.responseText).powermon.version) > parseFloat(app.GetVersion())  ){
                    event.emit("UpdateIsAvailable", JSON.parse(xhr.responseText).powermon, true)
                    return
                }
                else {
                    return
                }
            }
            else 
                console.error( "Error: " + httpRequest.status + httpRequest.responseText);
        };
        xhr.timeout = 5000;
        xhr.send();
        
    };
    
    downloadAndInstall = (srcPath) => {
        var targetDir = app.GetPrivateFolder( "downloads" )
        var installSource = targetDir + "/recent.apk"
        
        // delete file if exists before downloading
        if(app.FileExists(installSource)) {
            app.DeleteFile(installSource)
        }
        
        // download and install
        var down = app.CreateDownloader();
        down.SetOnComplete( () =>{
            app.InstallApp( installSource, ()=>{app.Alert("Install finished")})
        } );
        down.Download( srcPath, targetDir, "recent.apk" );
    };
}

