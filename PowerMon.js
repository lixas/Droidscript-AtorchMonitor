app.ShowProgress( " Loading..." ); 

app.LoadScript( "utils.js" )

app.LoadScript("pageMain.js")
app.LoadScript("pageSettings.js")
app.LoadScript("pageAbout.js")


cfg.Dark
cfg.MUI

UpdaterRootURL = "http://ws.bukys.eu/android/";
PowerMonRelease = 0.2

NavigationHistory = []

function OnStart() {    
    event = new MyEventEmitter();
    app.EnableBackKey( false );
    
    pageAbout = new pageAboutController(new pageAboutModel(), new pageAboutView())
    pageSettings = new pageSettingsController(new pageSettingsModel(), new pageSettingsView())
    pageMain = new pageMainController(new pageMainModel(), new pageMainView())
    NavigationHistory = [pageMain]
    
    app.HideProgress();
}


function SwitchPage(page){
    NavigationHistory[0].navHidePage()
    NavigationHistory = [page, ...NavigationHistory]    // prepend page into navigation history
    page.navShowPage()
}


function OnBack() {
    if(app.GetDrawerState("left") == "Open") {
        app.CloseDrawer( "left" );
    }
    else if( NavigationHistory.length == 1 && NavigationHistory[0] == pageMain ){
        var yesNo = app.CreateYesNoDialog( "Exit App?" );
        yesNo.SetOnTouch( (result) => {
            if( result=="Yes" )
                app.Exit();
        });
        yesNo.Show();
    }
    else{
        NavigationHistory[0].navHidePage()
        NavigationHistory[1].navShowPage()
        NavigationHistory.shift()
    }
}


//Called when hardware menu key pressed.
function OnMenu( name ) {  
   app.OpenDrawer()
}

// helper functions
function dump(obj) {
    var out = '';
    for (var i in obj) {
        out += i + ": " + obj[i] + "\n";
    }

    return out;
}

function dump2(v, howDisplay, recursionLevel) {
/*
dump() displays the contents of a variable like var_dump() does in PHP. dump() is
better than typeof, because it can distinguish between array, null and object.  
Parameters:
  v:              The variable
  howDisplay:     "none", "body", "alert" (default)
  recursionLevel: Number of times the function has recursed when entering nested
                  objects or arrays. Each level of recursion adds extra space to the 
                  output to indicate level. Set to 0 by default.
Return Value:
  A string of the variable's contents 
Limitations:
  Can't pass an undefined variable to dump(). 
  dump() can't distinguish between int and float.
  dump() can't tell the original variable type of a member variable of an object.
  These limitations can't be fixed because these are *features* of JS. However, dump()
*/
    
    /* repeatString() returns a string which has been repeated a set number of times */ 
    function repeatString(str, num) {
        out = '';
        for (var i = 0; i < num; i++) {
            out += str; 
        }
        return out;
    }
    
    howDisplay = (typeof howDisplay === 'undefined') ? "none" : howDisplay;
    recursionLevel = (typeof recursionLevel !== 'number') ? 0 : recursionLevel;


    var vType = typeof v;
    var out = vType;

    switch (vType) {
        case "number":
            /* there is absolutely no way in JS to distinguish 2 from 2.0
            so 'number' is the best that you can do. The following doesn't work:
            var er = /^[0-9]+$/;
            if (!isNaN(v) && v % 1 === 0 && er.test(3.0))
                out = 'int';*/
        case "boolean":
            out += ": " + v;
            break;
        case "string":
            out += "(" + v.length + '): "' + v + '"';
            break;
        case "object":
            //check if null
            if (v === null) {
                out = "null";

            }
            //If using jQuery: if ($.isArray(v))
            //If using IE: if (isArray(v))
            //this should work for all browsers according to the ECMAScript standard:
            else if (Object.prototype.toString.call(v) === '[object Array]') {  
                out = 'array(' + v.length + '): {\n';
                for (var i = 0; i < v.length; i++) {
                    out += repeatString('   ', recursionLevel) + "   [" + i + "]:  " + 
                        dump2(v[i], "none", recursionLevel + 1) + "\n";
                        // arguments.callee(v[i], "none", recursionLevel + 1) + "\n";
                        // console.log("Arguments: "+arguments.callee.toString());
                }
                out += repeatString('   ', recursionLevel) + "}";
            }
            else { //if object    
                sContents = "{\n";
                cnt = 0;
                for (var member in v) {
                    //No way to know the original data type of member, since JS
                    //always converts it to a string and no other way to parse objects.
                    sContents += repeatString('   ', recursionLevel) + "   " + member +
                        ":  " + dump2(v[member], "none", recursionLevel + 1) + "\n";
                        // ":  " + arguments.callee(v[member], "none", recursionLevel + 1) + "\n";
                    cnt++;
                }
                sContents += repeatString('   ', recursionLevel) + "}";
                out += "(" + cnt + "): " + sContents;
            }
            break;
    }

    if (howDisplay == 'body') {
        var pre = document.createElement('pre');
        pre.innerHTML = out;
        document.body.appendChild(pre);
    }
    else if (howDisplay == 'alert') {
        alert(out);
    }

    return out;
}