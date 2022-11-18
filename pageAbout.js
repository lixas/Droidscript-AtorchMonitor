
class pageAboutModel extends ModelBase {
    constructor() {
        super()
    }
}

class pageAboutView  extends ViewBase {
    constructor(){
        super()
        
        
        var apb = MUI.CreateAppBar("About application", "arrow_back");
        apb.SetOnMenuTouch( ()=>{
            OnBack()    // from main page
        })
        
        var scr = app.CreateScroller(1, 1, "FillXY,NoScrollBar,ScrollFade")
            
            var contentLay = app.CreateLayout("Linear", "VCenter")
            contentLay.SetSize(1, -1)
            contentLay.SetPadding(0, apb.GetHeight(), 0, 0)
            contentLay.SetChildMargins(0.01, 0.01, 0.01, 0.01)
                
                var text1 = app.AddText( contentLay, "If you have one of these Atorch power meters, equiped with bluetooth- this application is expected to work.", "", "", "Left,Multiline" )
                text1.SetTextSize("15")
                
                app.AddImage( contentLay, "Img/Dev_UD24.png", 0.7 )
                app.AddText( contentLay, "UD-24\n\n\n", "", "", "Multiline" )
                
                app.AddImage( contentLay, "Img/Dev_UD18.png", 0.7 )
                app.AddText( contentLay, "UD-18\n\n\n", "", "", "Multiline" )

                app.AddImage( contentLay, "Img/Dev_DT24.png", 0.7 )
                app.AddText( contentLay, "DT-24\n\n\n", "", "", "Multiline" )
                
                var text2 =app.AddText( contentLay, "Tested only with first one (UD24). \n \
        Click plug [ [fa-plug] ] icon in main screen and select your device. It may be named UD24, UD18 or something similar, depending on your device. If device is compatible- application should begin showing values on the screen\n \
        If you have another Atorch device and would like to help me integrate into this application- please contact me via my website.", -1, "", "Left,Multiline,FontAwesome" )
                text2.SetTextSize("15")
                
            scr.AddChild(contentLay)
            
            this.pageLay = app.CreateLayout("Absolute", "FillXY")
            this.pageLay.Hide()
            this.pageLay.AddChild(scr)
            this.pageLay.AddChild(apb)
            
            
        app.AddLayout(this.pageLay)
    }
}

class pageAboutController extends ControllerBase {
    constructor(model, view) {
        super(model, view)

    }
}
