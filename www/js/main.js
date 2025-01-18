var debug = false;

async function loadSettings(){
    settingJSON = window.localStorage.getItem('setting');
    setting = JSON.parse(settingJSON)

    if(typeof(setting)==="null" || !setting)
    {
        setting = {};
    }
    return setting;
}

var setting,cache;

async function init(){
    setting = await loadSettings();
    await initCache()

    if(debug) console.log('inited',setting,cache)
}

function openHomepage(){
    //Neutralino.os.open(setting.host);
}

function openLoadingDialog(){
    $('#loadingModal').modal('show');
    if(debug) console.log('openLoadingDialog');
}

function closeLoadingDialog(){
    
    $('#loadingModal').modal('hide');
    if(debug) console.log('closeLoadingDialog');
}

function openDetail(){
    /*
    Neutralino.app.open({
        "url": "file:///"+NL_CWD+"/resources/detail.html"
    });
    */
   window.location.href='detail.html';
}

function initUpdateBtn(){}