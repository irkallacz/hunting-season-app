Geo = {  
  'CONST':{
    'picture' : {'width': 1560, 'height': 2044}, //px
    'map' : {'width': 5090, 'height': 6210}, //m 
    'zero' : {'lon': 15.0628712, 'lat': 50.8582945}, //left top
    'max' :  {'lon': 15.150971, 'lat': 50.7846468}, //right bottom 
    'positionOption' : {'enableHighAccuracy': true, 'timeout': 30000, 'maximumAge': 5000},
    'R' :  6371000,
    'rest' : 'http://geo.irkalla.cz/rest/' 
    //'rest' : 'http://localhost/geo/rest/'          
  },
  
  'login' : function(){
    var user = window.prompt('Zadejte uživatelské jméno');
    var password = window.prompt('Zadejte heslo');
    
    if ((user!=null)&&(password!=null)){
      localStorage['geo.auth.in'] = 'true';
      localStorage['geo.auth.user'] = user;
      localStorage['geo.auth.password'] = password;
      return true; 
    }else {
      alert('Musíte zadat přihlašovací jméno a heslo');
      return false;
    }
  },
  'updateLocation' : function(callback){
    if (navigator.geolocation){
      navigator.geolocation.getCurrentPosition(function(position){
          localStorage['geo.location.latitude'] = position.coords.latitude;
          localStorage['geo.location.longitude'] = position.coords.longitude;
          localStorage['geo.location.accuracy'] = position.coords.accuracy;
          localStorage['geo.location.timestamp'] = position.timestamp;
          
          callback();
        },function(positionError){
          alert('Nemohl jsem načíst polohu');
          //alert(positionError.message);
          $.mobile.loading('hide');
        },Geo.CONST.positionOption
      );
    }else{
      alert('Není podpora pro geolokaci');
      return false;
    }
  },
  'buildRequest' : function(location,append){
      request = {"mail" : localStorage['geo.auth.user']};
      jQuery.extend(request, append);

      if (location == true){
        request.location = {
          "lon" : localStorage['geo.location.longitude'],
          "lat" : localStorage['geo.location.latitude'],
          "acc" : localStorage['geo.location.accuracy']
        }
      };
      
      var hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256,CryptoJS.MD5(localStorage['geo.auth.password']).toString());
      hmac.update(JSON.stringify(request));    
      var hash = hmac.finalize();
      request.hash = hash.toString();
      
      return request;  
  },
  'ajax' : function(request,callback,url){
    
    url = url || '';
    
    var jqxhr = $.ajax({
      'url': Geo.CONST.rest+url,
      'dataType': 'json',
      'data' : request,
      'timeout' : 10000,
      'crossDomain' : true
    })
    .done(function(data) {
      callback(data);
    })
    .fail(function(jqXHR,textStatus,errorThrown){
      $.mobile.loading('hide');
      text = (jqXHR.status ? jqXHR.status : '')+' '+jqXHR.statusText+'\n';       
      if (jqXHR.responseText) text += jqXHR.responseText;
      alert(text)
    })
  },
  'action' : {
    'logout' : function(){
      localStorage.clear();
    },
    'markPoint' : function(){
      Geo.draw.loader();
      if (localStorage['geo.auth.in'] != 'true') loginResult = Geo.login();
  
      if (localStorage['geo.auth.in'] == 'true'){
        Geo.updateLocation(function(){ 
          request = Geo.buildRequest(true);
          Geo.ajax(request,function(data){
            localStorage['geo.data'] = JSON.stringify(data);
            Geo.draw.all();
            $.mobile.loading('hide');
          });
        });
      }
    },  
    'markUser' : function(){
      if (localStorage['geo.auth.in'] != 'true') loginResult = Geo.login();
  
      if (localStorage['geo.auth.in'] == 'true'){
          
          var user = window.prompt('Zadejte tajné slovo týmu');
          if (user) {
            request = Geo.buildRequest(false,{"secret" : user});
            Geo.draw.loader();

            Geo.ajax(request,function(response){
              $.mobile.loading('hide'); 
              console.log(response);
              
              var data = JSON.parse(localStorage['geo.data']);

              if (data.players[response.target].isTaken == 'false'){
                data.players[response.target].isTaken = 'true';
                data.players[response.target].count = data.players[response.target].count +1;
                localStorage['geo.data'] = JSON.stringify(data);
                Geo.draw.all();
              }

              alert(response.message);
            });
          }
      }
    },  
    'refresh' : function(){
      Geo.draw.loader();
      if (localStorage['geo.auth.in'] != 'true') loginResult = Geo.login();
      
      if (localStorage['geo.auth.in'] == 'true'){
        Geo.updateLocation(function(){ 
          request = Geo.buildRequest(false);
          Geo.ajax(request,function(data){
            localStorage['geo.data'] = JSON.stringify(data);
            Geo.draw.all();
            $.mobile.loading('hide');
          });
        });
      }
    },
    'redraw' : function(){
      Geo.draw.loader();
      Geo.updateLocation(function(){
        Geo.draw.all();
        $.mobile.loading('hide');
      }); 
    },
    'showPoint' : function(id){
      $.mobile.changePage('#home');
      setTimeout(function(){
        window.scrollTo(0,document.getElementById(id).offsetTop);
        document.getElementById('map').scrollLeft = document.getElementById(id).offsetLeft - (window.innerWidth / 2);
      },1000);
    }
  },  
  'timer' : { 
    'everyMinute' : function() {
      Geo.draw.footer();
      Geo.draw.list();
      var time = new Date();
      if (time.getMinutes() == 30 || time.getMinutes() == 0) {
        navigator.notification.beep(2);
        navigator.notification.vibrate(1000);  
      }
    },
    'runInterval' : function() {
      var time = new Date();
      if (time.getSeconds() == 0) {
        Geo.timer.everyMinute();
        window.clearInterval(secondInterval);
        minuteIterval = window.setInterval(Geo.timer.everyMinute,60000);
      } 
    }
  },
  'draw' : {
    'map' : function() {
      var z = $('#zoom').val();
      var top = $('#picture').height();
      var left = $('#picture').width();
      
      Geo.draw.picture(z);
      Geo.draw.mapPoints();

      var top = $('#picture').height() - top;
      var left = $('#picture').width() - left;
      

      window.scrollTo(0,window.pageYOffset + (0.5*top));
      document.getElementById('map').scrollLeft = document.getElementById('map').scrollLeft + (0.5*left);
    },
    'footer' : function(){  
      if (localStorage['geo.location.latitude'] != null) {
        
        var date = new XDate();
        var time = new XDate(0,0,0,0,date.getMinutes(),date.getSeconds(),0);
        var date = new XDate(0,0,0,0,0,0,0).addMilliseconds(-1*time.getTime());
        if (date.getMinutes() >= 30) date.addMinutes(-30);
        
        var data = JSON.parse(localStorage['geo.data']);
                  
        $('.footer-coords').text(Geo.algo.GPS({'latitude' : localStorage['geo.location.latitude'], 'longitude' : localStorage['geo.location.longitude']}));    
        if (data != null) $('.footer-time').text('+'+date.toString('mm:ss')+' '+Geo.algo.timeDiff(data.players[data.user].datetime));
        $('.footer-acc').text('±'+localStorage['geo.location.accuracy']+'m');
      }
    },
    'list' : function(){
      var data = JSON.parse(localStorage['geo.data']);
      if (data != null) { 
        $('#body').empty();
        
        for (var id in data.points) {
          var point = data.points[id];
          var list = $('<div data-role="collapsible">').appendTo('#body');
          
          if (point.isTaken == 'true') list.addClass('taken');
          
          list.append('<h3><span class="circle point">'+id+'</span>'+Geo.algo.dist(point)+'m '+Geo.algo.angle(point)+'° <span class=ui-li-count>'+point.count
          +'</span></h3><p class="text-center">'+Geo.algo.GPS(point)
          +'<br><a href=javascript:Geo.action.showPoint("point'+id+'") class="ui-link ui-btn">Ukázat na mapě</a>'
          +'</p>');
          list.collapsible();    
        }
        
        $('#hraci').empty();
        
        for (var id in data.players) {
          var player = data.players[id];
          var list = $('<div data-role="collapsible">').appendTo('#hraci');

          if (player.isTaken == 'true') list.addClass('taken');
          
          var meters = Geo.algo.dist(player); 
          
          var text = '<h3><span class="circle player">'+id+'</span>';
          if (meters) text = text + meters+'m '+Geo.algo.angle(player)+'° '; 
          
          if (id == data.user) list.addClass('current');
          if (player.accuracy != null) text = text+'(±'+player.accuracy+'m)';
          
          list.append(text+' '+Geo.algo.timeDiff(player.datetime)+'<span class=ui-li-count>'+player.count
          +'</span></h3><p class="text-center">'+Geo.algo.GPS(player)+'<br>'
          +new XDate(player.datetime).toString('HH:mm:ss')
          +'<br><a href=javascript:Geo.action.showPoint("player'+id+'") class="ui-link ui-btn">Ukázat na mapě</a>'
          +'</p>');
          list.collapsible();         
        }
      }
    },
     'mapPoints' : function(){
      var data = JSON.parse(localStorage['geo.data']);
      if (data != null){
        $('#map .circle').remove();
        
        $('#map').append('<div id="location" class="circle" style="'+Geo.draw.location()+'">+</div>');
        
        for (var id in data.points) {
          var point = data.points[id];
          var list = $('<div id="point'+id+'" class="circle point" style="'+Geo.draw.point(point)+'">'+id+'</div>').appendTo('#map');
  
          if (point.isTaken == 'true') list.addClass('taken');
        }
        
        for (var id in data.players) {
          var player = data.players[id];
          var list = $('<div id="player'+id+'" class="circle player" style="'+Geo.draw.point(player)+'">'+id+'</div>').appendTo('#map');
          
          if (id == data.user) list.addClass('current');    
          if (player.isTaken == 'true') list.addClass('taken');
        }
      } 
    },
    'picture' : function(zoom){
      if (zoom == undefined) zoom = 100;

      $('#picture').width((Geo.CONST.picture.width/100)*zoom);
      $('#picture').height((Geo.CONST.picture.height/100)*zoom);

     },
    'all' : function(){
      Geo.draw.list();
      Geo.draw.footer();
      Geo.draw.map();
    },
    'point' : function(point){
        var width = $('#picture').width();
        var height = $('#picture').height();
        
        var h = Geo.CONST.zero.lat - Geo.CONST.max.lat; 
        var w = Geo.CONST.max.lon - Geo.CONST.zero.lon;
        
        return 'top:'+(height-(((point.latitude-Geo.CONST.max.lat) / h)*height))+'px;left:'+(((point.longitude-Geo.CONST.zero.lon) / w)*width)+'px;';
    },
    'location' : function(){
        var style = Geo.draw.point({'latitude' : localStorage['geo.location.latitude'], 'longitude' : localStorage['geo.location.longitude']});
        var accuracy = localStorage['geo.location.accuracy'];
        var accuracy = ($('#picture').width() / Geo.CONST.map.width) * accuracy;         
        return style+'width:'+2*accuracy+'px;height:'+2*accuracy+'px;line-height:'+2*accuracy+'px;margin-left:-'+accuracy+'px;margin-top:-'+accuracy+'px; border-radius:'+accuracy+'px;'; 
    },
    'loader' : function(){
      $.mobile.loading('show', {
        text: 'Pracuji',
        textVisible: true,
        theme: 'b',
        html: ''
      });
    }
  },
  'algo' : {
    'timeDiff' : function(datetime){  
      var diff = new XDate().addMilliseconds(-1* new XDate(datetime).getTime()).addHours(-1);
      return diff.toString((diff.getHours() > 0) ? '-HH:mm:ss' : '-mm:ss');
    },    
    'deg2rad' : function(angle) {
      return (angle / 180) * Math.PI;
    },
    'dist' : function(point){      
      var x = (Geo.algo.deg2rad(point.longitude) - Geo.algo.deg2rad(localStorage['geo.location.longitude'])) * 
        Math.cos((Geo.algo.deg2rad(localStorage['geo.location.latitude'])+Geo.algo.deg2rad(point.latitude))/2);
      var y = (Geo.algo.deg2rad(point.latitude) - Geo.algo.deg2rad(localStorage['geo.location.latitude']));
      return Math.round(Math.sqrt(Math.pow(x,2) + Math.pow(y,2))*Geo.CONST.R);
    },
    'angle' : function(point){
      var a = Math.round(Math.atan2(point.longitude - localStorage['geo.location.longitude'], point.latitude - localStorage['geo.location.latitude']) * 180 / Math.PI); 
      return a > 0 ? a : 360+a;  
    },
    'GPS' : function(point){
      var lond = new Number((point.longitude % 1)*60);
      var latd = new Number((point.latitude % 1)*60);
       
      return Math.floor(point.latitude)+'°'+Math.floor(latd)+"'"+new Number((latd % 1)*60).toFixed(3)+'"N '
        +Math.floor(point.longitude)+'°'+Math.floor(lond)+"'"+new Number((lond % 1)*60).toFixed(3)+'"E'
    }
  }
}