class ModelBase {
    constructor() {
        this.controller = {}
    }
}
class ViewBase {
    constructor() {
        this.controller = {}
    }
}
class ControllerBase {
    constructor(model, view) {
        this.model = model
        this.view = view
    }
    
    navShowPage = () => {
        // this.view.pageLay.Animate("SlideFromTop")
        this.view.pageLay.Show()
    }
    
    navHidePage = () => {
        // this.view.pageLay.Animate("SlideToBottom")
        this.view.pageLay.Hide()
    }
}

class FixedLenArray{
    constructor(len) {
        /*
        infinite size if len=0
        */
        this.maxLen = len
        this.arr = []
    }

    _trimHead = () => {            // private
        if( this.lenArray >= this.maxLen && this.maxLen > 0 ){
            this.arr.shift()
        }
    }

    addItem = (num) => {
        this._trimHead()
        this.arr.push(num)
    }

    avg = (acc=2) => {
        sum = 0
        if (this.lenArray == 0){
            return false
        }

        let sum = 0;
        
        for (let i = 0; i < this.lenArray; i++) {
            sum += this.arr[i];
        }
        
        return round(sum / this.lenArray, 2)
    }

    clean = () => {
        this.arr = []
    }

    minItem = () => {
        try {
            return Math.min(this.arr)
        }
        catch (error){
            //pass
        }

    }
    
    maxItem = () => {
        try {
            return Math.max(this.arr)
        }
        catch (error){
            //pass
        }
    }
    
    get lenArray() {
        return this.arr.length
    }
    
    get data(){
        return this.arr
    }
    
    resize = (len) =>{
        this.maxLen = len
        this.arr = this.arr.slice(-1*len)
    }
}

class MyEventEmitter {
    constructor() {
        this._events = {};
    }
    
    on(name, listener) {
        if (!this._events[name]) {
            this._events[name] = [];
        }
        
        this._events[name].push(listener);
    }
    
    removeListener(name, listenerToRemove) {
        if (!this._events[name]) {
            throw new Error(`Can't remove a listener. Event "${name}" doesn't exits.`);
        }
    
        const filterListeners = (listener) => listener !== listenerToRemove;
    
        this._events[name] = this._events[name].filter(filterListeners);
    }
    
    emit(name, data, ignoreNoExist=false) {
        if (!this._events[name]) {
            if(ignoreNoExist)
                return
            throw new Error(`Can't emit an event. Event "${name}" doesn't exits.`);
        }
    
        const fireCallbacks = (callback) => {
            callback(data);
        };
        
        this._events[name].forEach(fireCallbacks);
    }

}

function simpleMovingAverage(prices, window = 5) {
  if (!prices || prices.length < window) {
    return [];
  }

  let index = window - 1;
  const length = prices.length + 1;

  const simpleMovingAverages = [];

  while (++index < length) {
    const windowSlice = prices.slice(index - window, index);
    const sum = windowSlice.reduce((prev, curr) => prev + curr, 0);
    simpleMovingAverages.push(sum / window);
  }

  return simpleMovingAverages;
}

function exponentialMovingAverage(prices, window = 5) {
  if (!prices || prices.length < window) {
    return [];
  }

  let index = window - 1;
  let previousEmaIndex = 0;
  const length = prices.length;
  const smoothingFactor = 2 / (window + 1);

  const exponentialMovingAverages = [];

  const [sma] = simpleMovingAverage(prices, window, 1);
  exponentialMovingAverages.push(sma);

  while (++index < length) {
    const value = prices[index];
    const previousEma = exponentialMovingAverages[previousEmaIndex++];
    const currentEma = (value - previousEma) * smoothingFactor + previousEma;
    exponentialMovingAverages.push(currentEma);
  }

  return exponentialMovingAverages;
}

function groupAverage(arr, n) {
    // var result = [];
    // for (var i = 0; i < arr.length;) {
    //     var sum = 0;
    //     for(var j = 0; j< n; j++){
    //         // Check if value is numeric. If not use default value as 0
    //         sum += +arr[i++] || 0
    //     }
    //     result.push(sum/n);
    // }
    // return result
    if (!arr || !n) {
        return false;
    }
    let groups = [];
    while (arr.length) {
        groups.push(arr.splice(0, n));
    }
    
    return groups.map(
        group =>
        
        // here we use Math.round() to round
        // the calculated number:
        group.reduce(
          (a, b) => a + b
        ) / group.length
    );
}

function addZero(dgt) {
    return dgt <= 9 ? "0"+dgt : dgt
}

//  /////////////////////////////////////////////////////////////////////////////////////
var _chart_is_debug = false

app.LoadChartJS = function(path) {
    this.version = 1.07
    this.GetVersion = function() {
        return this.version
    }
    this.CreateChart = function(data, type, width, height, options) {
        return new ChartJS(data, type, width, height, options)
    }
    return this
}

function ChartJS(data, type, width, height, options) {
    var plugDir
    
    var webView = app.CreateWebView(width, height, "IgnoreErrors");
    webView.type = type;
    webView.data = data;
    webView.options = options || {
        scales: {
            yAxes: [{
                ticks: {
                    beginAtZero: true
                }
            }]
        }
    };

    var config = {
        type: webView.type,
        data: webView.data,
        options: webView.options
    }
    
    // if(!_chart_is_debug)
    //     plugDir = app.GetPrivateFolder("Plugins")+"/chartjs"
    // else
        // plugDir = app.GetAppPath()
    plugDir = "."
    
    var html = app.ReadFile(plugDir+'/Html/chartjs-webview.html')
    html = html.replace('@CHARTJS_SOURCE@', plugDir+'/Html/chartjs.min-2.9.4.js')
    html = html.replace('@CONFIG_OPTIONS@', JSON.stringify(config))
    
    
    webView.LoadHtml(html);

    // update works only for updating data. It cannot update the options
    webView.updateData = function(data) {
        data = data || this.data
        this.Execute("updateData('"+JSON.stringify(data)+"')")
    }
    webView.update = function(data) {
        this.Execute("update('"+JSON.stringify(data||this.data)+"')")
    }
    webView.updateBackgroundColor = function(colors) {
        this.Execute("updateBackgroundColor('"+JSON.stringify(colors)+"')")
    }
    webView.render = function() {
        this.Execute("chart.render();")
    }
    webView.stop = function() {
        this.Execute("chart.stop();")
    }
    webView.clear = function() {
        this.Execute("chart.clear();")
    }
    webView.addDataset = function(dataset) {
        this.Execute("addDataset('"+JSON.stringify(dataset)+"')")
    }
    webView.removeDataset = function(index) {
        if(index >=0 ) this.Execute("removeDataset("+index+")")
    }
    return webView
}
