class API{
    constructor(){
        this.loadCredentials()
    }

    loadCredentials(){
        this.host = "";
        this.token = "";

        if(setting)
        {
            this.host = setting.host;
            this.token = setting.token;
        }
        else 
        {

        }
    }
    
    setCredentials(host,token){
        this.host = host;
        this.token = token;
    }

    
    async makeAPICallAsync(type,method,data){
        if(this.host=="") return false;

        var result = {};
        var headers = {
            'Authorization': 'Bearer ' + this.token,
        };

        $.ajax({
            async: false,
            url: this.host+method,
            type: type.toUpperCase(),
            crossDomain: true,
            headers: headers,
            contentType: 'application/json; charset=utf-8;',
            data: JSON.stringify(data),
            success: function(resp){
                result = resp;
            },
            error: function(xhr, status, error){
                //console.log('API Async error1',JSON.stringify(xhr));
                //console.log('API Async error2',JSON.stringify(error));
                if(typeof(xhr.responseJSON)!=="undefined") result = xhr.responseJSON;
                //if(typeof(xhr)!=="undefined") result = xhr;
            }
        }).then(function(){
            result = ''
        })
        return result;
    }
    
    makeAPICall(type,method,data){
        if(this.host=="") return false;

        var result = {};

        var headers = {
            'Authorization': 'Bearer ' + this.token,
        };

        $.ajax({
            async: false,
            url: this.host+method,
            type: type.toUpperCase(),
            crossDomain: true,
            headers: headers,
            contentType: 'application/json; charset=utf-8;',
            data: JSON.stringify(data),
            success: function(resp){
                result = resp;
            },
            error: function(xhr, status, error){
                //console.log('API error1',JSON.stringify(xhr));
                //console.log('API error2',JSON.stringify(error));
                if(typeof(xhr.responseJSON)!=="undefined") result = xhr.responseJSON;

                //console.log('API result',result);
            }
        }).then(function(){
            result = ''
        })
        return result;
    }
    
    testConnection(){
        if(this.host=="") return false;
        
        var ret = '';
        var result = this.makeAPICall("get","/api/version")
        if(typeof(result.version)!=="undefined") ret = result.version;
        return ret;
    }

}